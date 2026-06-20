'use client';

import PixelStreamingPlayer from "@/components/PixelStreamingPlayer";
import StreamPixelPlayer from "@/components/StreamPixelPlayer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Gift, Send, Menu, X, Monitor, Play, Volume2, WalletCards } from "lucide-react";
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Product, Supplier } from "@/lib/types";
import { getProductById, getSupplierById, getProductsBySupplier } from "@/lib/db";
import ProductCard from "@/components/overlay/ProductCard";
import CatalogueOverlay from "@/components/overlay/CatalogueOverlay";
import PavilionExposition from "@/components/overlay/PavilionExposition";
import WelcomeControls from "@/components/overlay/WelcomeControls";
import TranslatableText from "@/components/chat/TranslatableText";
import BrandLogo from "@/components/BrandLogo";
import { getPavilionById, parseEnterPavilionMessage, type Pavilion as PavilionInfo } from "@/lib/pavilions";
import MobileControls from "@/components/pixelstreaming/MobileControls";
import MarketplaceCrosshair from "@/components/pixelstreaming/MarketplaceCrosshair";
import SensitivitySlider from "@/components/pixelstreaming/SensitivitySlider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { clearServerAuthSession } from "@/lib/auth/browser";
import { getUserRole, type AppAuthRole } from "@/lib/auth/shared";
import { AppLanguage, getLocalizedProduct } from "@/lib/i18n";
import { readSupplierChatApiResponse } from "@/lib/supplierChat";
import { useUnrealEventBridge } from "@/hooks/useUnrealEventBridge";
import { GamerDashboard, ShopperDashboard, SupplierDashboard } from "@/components/dashboards/RoleDashboards";
import { GAME_RULES } from "@/lib/unreal/gameRules";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
    getQuestCompletionPercent,
    getQuestDefinition,
    getQuestObjectiveText,
    getQuestRewardText,
    getQuestText,
    type QuestEventInput,
} from "@/lib/quests";
import { playSferaUiSound } from "@/lib/ui/sound";

type MobileInputMode = 'joystick' | 'touch';
type ToStreamerHandler = (messageData?: Array<number | string>) => void;
type PixelStreamingWindow = Window & {
    ps?: {
        toStreamerHandlers?: Map<string, ToStreamerHandler>;
        videoElementParent?: HTMLElement;
        config?: {
            setFlagEnabled?: (flagName: string, enabled: boolean) => void;
        };
        emitUIInteraction?: (descriptor: string | Record<string, unknown>) => void;
        _webRtcController?: {
            streamController?: {
                audioElement?: HTMLMediaElement | null;
            };
        };
    };
};
const DEFAULT_MOUSE_SENSITIVITY = 0.5;
// Module-level suppression — avoids any React ref/closure timing issues.
let _suppressProductSelectionUntil = 0;

const COMMON_KEY_CODES_TO_RELEASE = [87, 65, 83, 68, 38, 37, 40, 39, 32, 16, 17, 18, 88, 70, 84];
const NORMALIZED_CENTER = 32768;

const releaseAllInputs = () => {
    const psWindow = window as PixelStreamingWindow;
    const handlers = psWindow.ps?.toStreamerHandlers;
    const keyUpHandler = handlers?.get('KeyUp');
    const mouseUpHandler = handlers?.get('MouseUp');
    const mouseLeaveHandler = handlers?.get('MouseLeave');

    if (keyUpHandler) {
        for (const keyCode of COMMON_KEY_CODES_TO_RELEASE) {
            keyUpHandler([keyCode]);
        }
    }

    if (mouseUpHandler) {
        mouseUpHandler([0, NORMALIZED_CENTER, NORMALIZED_CENTER]);
        mouseUpHandler([1, NORMALIZED_CENTER, NORMALIZED_CENTER]);
        mouseUpHandler([2, NORMALIZED_CENTER, NORMALIZED_CENTER]);
    }

    mouseLeaveHandler?.();
};


const sendUnrealUiInteraction = (descriptor: Record<string, unknown>) => {
    const psWindow = window as PixelStreamingWindow;

    try {
        psWindow.ps?.emitUIInteraction?.(descriptor);
    } catch { /* best-effort */ }

    const handler = psWindow.ps?.toStreamerHandlers?.get('UIInteraction')
        ?? psWindow.ps?.toStreamerHandlers?.get('uiInteraction')
        ?? psWindow.ps?.toStreamerHandlers?.get('Message');

    if (handler) {
        try {
            handler([JSON.stringify(descriptor)]);
        } catch { /* best-effort */ }
    }
};

const sendUnrealKeyPress = (keyCode: number) => {
    const psWindow = window as PixelStreamingWindow;
    const keyDownHandler = psWindow.ps?.toStreamerHandlers?.get('KeyDown');
    const keyUpHandler = psWindow.ps?.toStreamerHandlers?.get('KeyUp');

    if (keyDownHandler && keyUpHandler) {
        keyDownHandler([keyCode, 0]);
        keyUpHandler([keyCode]);
        return;
    }

    const keyString = String.fromCharCode(keyCode);
    const isLetter = /^[A-Z]$/.test(keyString);
    const keyboardEventInit: KeyboardEventInit = {
        key: isLetter ? keyString.toLowerCase() : keyString,
        code: isLetter ? `Key${keyString}` : `Digit${keyString}`,
        bubbles: true,
        cancelable: true,
    };

    document.dispatchEvent(new KeyboardEvent('keydown', keyboardEventInit));
    document.dispatchEvent(new KeyboardEvent('keyup', keyboardEventInit));
};

type ChatMessage = {
    id: string;
    role: 'assistant' | 'user' | 'supplier';
    text: string;
    timestamp: number;
    originalText?: string;
    isTranslated?: boolean;
};

type ChatApiResponse = {
    success?: boolean;
    assistantMessage?: {
        text?: string;
        timestamp?: number;
    };
};

type LiveActivityKind = 'enter' | 'exit' | 'message' | 'catalogue' | 'product' | 'booking' | 'market';

type LiveActivityTemplate = {
    kind: LiveActivityKind;
    message: string;
};

type LiveActivityToast = LiveActivityTemplate & {
    id: number;
};

const LIVE_ACTIVITY_INITIAL_DELAY_MS = 2800;
const LIVE_ACTIVITY_INTERVAL_MS = 7600;
const LIVE_ACTIVITY_VISIBLE_MS = 11800;

const LIVE_ACTIVITY_LABEL: Record<AppLanguage, string> = {
    en: 'Live activity',
    ru: 'Активность',
    zh: '实时动态',
};

const LIVE_ACTIVITY_NOW_LABEL: Record<AppLanguage, string> = {
    en: 'now',
    ru: 'сейчас',
    zh: '刚刚',
};

const CUTSCENE_COPY: Record<AppLanguage, { skip: string; startWithSound: string; pressAnyKey: string; soundHint: string; closeMenu: string }> = {
    en: {
        skip: 'Skip',
        startWithSound: 'Start with sound',
        pressAnyKey: 'Press any key to start',
        soundHint: 'Starts the cinematic with sound before entering the hall',
        closeMenu: 'Close menu',
    },
    ru: {
        skip: 'Пропустить',
        startWithSound: 'Начать со звуком',
        pressAnyKey: 'Нажмите любую клавишу, чтобы начать',
        soundHint: 'Запускает ролик со звуком перед входом в холл',
        closeMenu: 'Закрыть меню',
    },
    zh: {
        skip: '跳过',
        startWithSound: '开启声音',
        pressAnyKey: '按任意键开始',
        soundHint: '进入大厅前开启有声影片',
        closeMenu: '关闭菜单',
    },
};

const SCENE_HUD_COPY: Record<AppLanguage, {
    playerMode: string;
    shopperMode: string;
    location: string;
    game: string;
    score: string;
    health: string;
    coins: string;
    combo: string;
    rank: string;
    threat: string;
    backToCity: string;
    returnPortalHint: string;
    playerModeRequired: string;
    playerModeRequiredBody: string;
    overwhelmed: string;
    cancel: string;
    switchMode: string;
    roleSelection: string;
    playerDashboard: string;
    shopperDashboard: string;
    businessDashboard: string;
    typeSupplier: string;
    quest: string;
    nextObjective: string;
    reward: string;
    questComplete: string;
    earnedReward: string;
    rewardTerminal: string;
    openTerminal: string;
    withdrawalUnavailable: string;
    withdrawalMessage: string;
    giftCodePending: string;
    giftCodeMessage: string;
    unavailable: string;
    guideTitle: string;
    guideBody: string;
    guideSteps: readonly [string, string, string];
    locations: Record<string, string>;
}> = {
    en: {
        playerMode: 'Player Mode',
        shopperMode: 'Shopper Mode',
        location: 'Location',
        game: 'Game',
        score: 'Score',
        health: 'Health',
        coins: 'Coins',
        combo: 'Combo',
        rank: 'Rank',
        threat: 'Threat',
        backToCity: 'Back to City',
        returnPortalHint: 'Use the return portal in the game world.',
        playerModeRequired: 'Player Mode required',
        playerModeRequiredBody: 'Switch to Player Mode to enter game zones.',
        overwhelmed: 'You were overwhelmed',
        cancel: 'Cancel',
        switchMode: 'Switch mode',
        roleSelection: 'Role Selection',
        playerDashboard: 'Player Dashboard',
        shopperDashboard: 'Shopper Dashboard',
        businessDashboard: 'Business Dashboard',
        typeSupplier: 'Type message to supplier...',
        quest: 'Active quest',
        nextObjective: 'Next objective',
        reward: 'Reward',
        questComplete: 'Quest complete',
        earnedReward: 'Earned reward',
        rewardTerminal: 'Reward ATM',
        openTerminal: 'Open terminal',
        withdrawalUnavailable: 'Withdrawal unavailable',
        withdrawalMessage: 'We are working on the conditions and rules for safe reward withdrawals. Withdrawals are not available yet.',
        giftCodePending: 'Game gift codes pending',
        giftCodeMessage: 'Steam or other game-store codes can be issued after partner/code inventory is connected.',
        unavailable: 'Unavailable',
        guideTitle: 'What to do now',
        guideBody: 'You are in a 3D city. Follow the quest: visit Sfera Hall, enter Zombie Arena, then claim the reward.',
        guideSteps: ['Visit Sfera Hall', 'Enter Zombie Arena', 'Claim reward'],
        locations: {
            city: 'City',
            sferaHall: 'Sfera Hall',
            zombieArena: 'Zombie Arena',
            racingZone: 'Racing Zone',
        },
    },
    ru: {
        playerMode: 'Режим игрока',
        shopperMode: 'Режим покупателя',
        location: 'Локация',
        game: 'Игра',
        score: 'Счет',
        health: 'Здоровье',
        coins: 'Монеты',
        combo: 'Комбо',
        rank: 'Ранг',
        threat: 'Угроза',
        backToCity: 'Назад в город',
        returnPortalHint: 'Используйте портал возврата в игровом мире.',
        playerModeRequired: 'Нужен режим игрока',
        playerModeRequiredBody: 'Переключитесь в режим игрока, чтобы войти в игровые зоны.',
        overwhelmed: 'Вас окружили',
        cancel: 'Отмена',
        switchMode: 'Сменить режим',
        roleSelection: 'Выбор роли',
        playerDashboard: 'Панель игрока',
        shopperDashboard: 'Панель покупателя',
        businessDashboard: 'Панель бизнеса',
        typeSupplier: 'Напишите поставщику...',
        quest: 'Активный квест',
        nextObjective: 'Следующая цель',
        reward: 'Награда',
        questComplete: 'Квест завершен',
        earnedReward: 'Получена награда',
        rewardTerminal: 'Банкомат наград',
        openTerminal: 'Открыть терминал',
        withdrawalUnavailable: 'Вывод средств недоступен',
        withdrawalMessage: 'Мы работаем над тем, чтобы создать условия для безопасного вывода наград. Сейчас вывод средств недоступен.',
        giftCodePending: 'Подарочные коды в работе',
        giftCodeMessage: 'Коды Steam или других игровых площадок можно будет выдавать после подключения партнерской программы или склада кодов.',
        unavailable: 'Недоступно',
        guideTitle: 'Что делать сейчас',
        guideBody: 'Вы в 3D-городе. Следуйте квесту: посетите Sfera Hall, войдите в Zombie Arena, затем получите награду.',
        guideSteps: ['Посетить Sfera Hall', 'Войти в Zombie Arena', 'Получить награду'],
        locations: {
            city: 'Город',
            sferaHall: 'Sfera Hall',
            zombieArena: 'Zombie Arena',
            racingZone: 'Гоночная зона',
        },
    },
    zh: {
        playerMode: '玩家模式',
        shopperMode: '买家模式',
        location: '位置',
        game: '游戏',
        score: '分数',
        health: '生命值',
        coins: '金币',
        combo: '连击',
        rank: '段位',
        threat: '威胁',
        backToCity: '返回城市',
        returnPortalHint: '请使用游戏世界中的返回传送门。',
        playerModeRequired: '需要玩家模式',
        playerModeRequiredBody: '请切换到玩家模式后进入游戏区域。',
        overwhelmed: '你被击败了',
        cancel: '取消',
        switchMode: '切换模式',
        roleSelection: '角色选择',
        playerDashboard: '玩家仪表盘',
        shopperDashboard: '买家仪表盘',
        businessDashboard: '商务仪表盘',
        typeSupplier: '给供应商发送消息...',
        quest: '进行中的任务',
        nextObjective: '下一目标',
        reward: '奖励',
        questComplete: '任务完成',
        earnedReward: '已获得奖励',
        rewardTerminal: '奖励 ATM',
        openTerminal: '打开终端',
        withdrawalUnavailable: '提现暂不可用',
        withdrawalMessage: '我们正在制定安全提现奖励的条件和规则。当前暂不支持提现。',
        giftCodePending: '游戏礼品码待接入',
        giftCodeMessage: '接入合作伙伴或礼品码库存后，可发放 Steam 或其他游戏平台代码。',
        unavailable: '不可用',
        guideTitle: '现在要做什么',
        guideBody: '你在 3D 城市中。跟随任务：访问 Sfera Hall，进入 Zombie Arena，然后领取奖励。',
        guideSteps: ['访问 Sfera Hall', '进入 Zombie Arena', '领取奖励'],
        locations: {
            city: '城市',
            sferaHall: 'Sfera Hall',
            zombieArena: 'Zombie Arena',
            racingZone: '竞速区',
        },
    },
};

const LIVE_ACTIVITY_TEMPLATES: Record<AppLanguage, LiveActivityTemplate[]> = {
    en: [
        { kind: 'enter', message: 'Aryan just entered Youbo' },
        { kind: 'market', message: '20 people are viewing Youbo' },
        { kind: 'message', message: 'Chen texted the Youbo supplier' },
        { kind: 'catalogue', message: 'Sofia requested the Double Lin catalogue' },
        { kind: 'market', message: '14 visitors are browsing Double Lin' },
        { kind: 'product', message: 'Maya is viewing Mira pendant lights' },
        { kind: 'exit', message: 'Noah exited the Youbo pavilion' },
        { kind: 'enter', message: 'Li Wei joined the Double Lin booth' },
        { kind: 'product', message: 'Elena saved a Youbo product' },
        { kind: 'booking', message: 'Omar booked a supplier follow-up' },
        { kind: 'market', message: 'Nina opened the marketplace overlay' },
        { kind: 'product', message: '6 buyers are comparing Youbo products' },
        { kind: 'product', message: 'Dmitri is comparing 3 product specs' },
    ],
    ru: [
        { kind: 'enter', message: 'Ариан только что вошел в Youbo' },
        { kind: 'market', message: '20 человек смотрят Youbo' },
        { kind: 'message', message: 'Чен написал поставщику Youbo' },
        { kind: 'catalogue', message: 'София запросила каталог Double Lin' },
        { kind: 'market', message: '14 посетителей смотрят Double Lin' },
        { kind: 'product', message: 'Майя смотрит светильники Mira' },
        { kind: 'exit', message: 'Ной вышел из павильона Youbo' },
        { kind: 'enter', message: 'Ли Вэй вошел на стенд Double Lin' },
        { kind: 'product', message: 'Елена сохранила товар Youbo' },
        { kind: 'booking', message: 'Омар назначил встречу с поставщиком' },
        { kind: 'market', message: 'Нина открыла маркетплейс' },
        { kind: 'product', message: '6 покупателей сравнивают товары Youbo' },
        { kind: 'product', message: 'Дмитрий сравнивает 3 товара' },
    ],
    zh: [
        { kind: 'enter', message: 'Aryan 刚进入 Youbo' },
        { kind: 'market', message: '20 人正在浏览 Youbo' },
        { kind: 'message', message: 'Chen 给 Youbo 供应商发了消息' },
        { kind: 'catalogue', message: 'Sofia 请求了 Double Lin 目录' },
        { kind: 'market', message: '14 位访客正在浏览 Double Lin' },
        { kind: 'product', message: 'Maya 正在查看 Mira 吊灯' },
        { kind: 'exit', message: 'Noah 离开了 Youbo 展馆' },
        { kind: 'enter', message: '李伟 进入 Double Lin 展位' },
        { kind: 'product', message: 'Elena 收藏了 Youbo 产品' },
        { kind: 'booking', message: 'Omar 预约了供应商跟进' },
        { kind: 'market', message: 'Nina 打开了商城' },
        { kind: 'product', message: '6 位买家正在对比 Youbo 产品' },
        { kind: 'product', message: 'Dmitri 正在对比 3 个产品参数' },
    ],
};

const LIVE_ACTIVITY_ACCENTS: Record<LiveActivityKind, string> = {
    enter: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
    exit: 'bg-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.75)]',
    message: 'bg-[#66d9cb] shadow-[0_0_10px_rgba(102,217,203,0.9)]',
    catalogue: 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.85)]',
    product: 'bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.85)]',
    booking: 'bg-fuchsia-300 shadow-[0_0_10px_rgba(240,171,252,0.78)]',
    market: 'bg-indigo-300 shadow-[0_0_10px_rgba(165,180,252,0.82)]',
};

const createClientChatMessage = (role: ChatMessage['role'], text: string): ChatMessage => ({
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    timestamp: Date.now(),
});

const EXPERIENCE_COPY: Record<
    AppLanguage,
    {
        welcome: string;
        fallbackReply: string;
        connectionIssue: string;
        focusedTemplate: (name: string, price: string, availability: string, supplier: string) => string;
        focusedPrompt: string;
        statusOnline: string;
        instruction: string;
        zombieInstruction: string;
        chatToggleShow: string;
        chatToggleHide: string;
        menuNavigation: string;
        menuProducts: string;
        menuSupplier: string;
        menuLogin: string;
        menuExit: string;
        assistantTitle: string;
        assistantSubtitle: string;
        close: string;
        typing: string;
        inputPlaceholder: string;
        rotateDevice: string;
        landscapeRequired: string;
        rotateHint: string;
        addToCart: (name: string) => string;
        startSupplierChat: (name: string) => string;
        chatPrefill: (name: string, product: string) => string;
        inStock: string;
        outOfStock: string;
        originalLabel: string;
        translatedLabel: string;
        tapToStart: string;
        clickToResume: string;
        livePreview: string;
    }
> = {
    en: {
        welcome: 'Connected. Tap any product in the scene to inspect details, or ask for specs and pricing.',
        fallbackReply: 'Message received. Select a product to get detailed pricing and specs.',
        connectionIssue: 'Connection issue. Please retry. You can still select a product to inspect details.',
        focusedTemplate: (name, price, availability, supplier) =>
            `Focused on ${name}. Price ${price}, ${availability}, supplied by ${supplier}.`,
        focusedPrompt: 'Ask for specs or compatibility details.',
        statusOnline: 'System Online',
        instruction: 'Long press T to speak with avatars, press F to open doors, X to exit inspection mode.',
        zombieInstruction: 'Zombie Arena: move with WASD, aim with mouse, press P to fire, use the return portal to leave.',
        chatToggleShow: 'Chat',
        chatToggleHide: 'Hide Chat',
        menuNavigation: 'Navigation',
        menuProducts: 'Products',
        menuSupplier: 'About Supplier',
        menuLogin: 'Supplier Login',
        menuExit: 'Exit Experience',
        assistantTitle: 'AI Concierge',
        assistantSubtitle: 'Ask about product pricing, specs, stock, or supplier details.',
        close: 'Close',
        typing: 'AI is typing...',
        inputPlaceholder: 'Ask about products, specs, and pricing...',
        rotateDevice: 'Rotate Device',
        landscapeRequired: 'Landscape Required',
        rotateHint: 'Rotate your phone horizontally to continue the Pixel Streaming experience.',
        addToCart: (name) => `Added ${name} to cart!`,
        startSupplierChat: (name) => `Starting direct chat channel with ${name}...`,
        chatPrefill: (name, product) => `@${name} I have a question about ${product}...`,
        inStock: 'in stock',
        outOfStock: 'out of stock',
        originalLabel: 'Original',
        translatedLabel: 'Translated',
        tapToStart: 'Tap anywhere to start experience',
        clickToResume: 'Click to resume',
        livePreview: 'Live Preview',
    },
    ru: {
        welcome: 'Подключено. Нажмите на товар в сцене, чтобы открыть детали, или спросите цену и характеристики.',
        fallbackReply: 'Сообщение получено. Выберите товар для подробной цены и характеристик.',
        connectionIssue: 'Проблема с подключением. Попробуйте снова. Вы можете выбрать товар в сцене.',
        focusedTemplate: (name, price, availability, supplier) =>
            `В фокусе: ${name}. Цена ${price}, ${availability}, поставщик: ${supplier}.`,
        focusedPrompt: 'Спросите характеристики или совместимость.',
        statusOnline: 'Система онлайн',
        instruction: 'Удерживайте T для разговора с аватарами, F для открытия дверей, X для выхода из режима осмотра.',
        zombieInstruction: 'Zombie Arena: WASD \u0434\u043B\u044F \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F, \u043C\u044B\u0448\u044C\u044E \u0446\u0435\u043B\u044C\u0442\u0435\u0441\u044C, P \u0434\u043B\u044F \u0441\u0442\u0440\u0435\u043B\u044C\u0431\u044B, \u0432\u044B\u0445\u043E\u0434 \u0447\u0435\u0440\u0435\u0437 \u043F\u043E\u0440\u0442\u0430\u043B.',
        chatToggleShow: 'Чат',
        chatToggleHide: 'Скрыть чат',
        menuNavigation: 'Навигация',
        menuProducts: 'Товары',
        menuSupplier: 'О поставщике',
        menuLogin: 'Вход поставщика',
        menuExit: 'Выйти из режима',
        assistantTitle: 'AI-консьерж',
        assistantSubtitle: 'Спросите цену, характеристики, наличие или информацию о поставщике.',
        close: 'Закрыть',
        typing: 'AI печатает...',
        inputPlaceholder: 'Спросите о товарах, характеристиках и цене...',
        rotateDevice: 'Поверните устройство',
        landscapeRequired: 'Нужен альбомный режим',
        rotateHint: 'Поверните телефон горизонтально, чтобы продолжить Pixel Streaming.',
        addToCart: (name) => `${name} добавлен в корзину!`,
        startSupplierChat: (name) => `Открываем прямой чат с ${name}...`,
        chatPrefill: (name, product) => `@${name}, у меня вопрос по товару ${product}...`,
        inStock: 'в наличии',
        outOfStock: 'нет в наличии',
        originalLabel: 'Оригинал',
        translatedLabel: 'Перевод',
        tapToStart: 'Нажмите в любом месте, чтобы начать',
        clickToResume: 'Нажмите для продолжения',
        livePreview: 'Предпросмотр',
    },
    zh: {
        welcome: '已连接。点击场景中的产品查看详情，或直接询问参数与价格。',
        fallbackReply: '消息已发送。请选择产品以获取详细价格和规格。',
        connectionIssue: '连接异常，请重试。你仍可先在场景中选择产品。',
        focusedTemplate: (name, price, availability, supplier) =>
            `当前聚焦：${name}。价格 ${price}，${availability}，供应商：${supplier}。`,
        focusedPrompt: '可继续询问规格参数或兼容性。',
        statusOnline: '系统在线',
        instruction: '长按 T 与角色对话，按 F 开门，按 X 退出检视模式。',
        zombieInstruction: 'Zombie Arena: WASD \u79FB\u52A8, \u9F20\u6807\u7784\u51C6, \u6309 P \u5C04\u51FB, \u4F7F\u7528\u4F20\u9001\u95E8\u79BB\u5F00.',
        chatToggleShow: '聊天',
        chatToggleHide: '隐藏聊天',
        menuNavigation: '导航',
        menuProducts: '产品',
        menuSupplier: '供应商信息',
        menuLogin: '供应商登录',
        menuExit: '退出体验',
        assistantTitle: 'AI 助理',
        assistantSubtitle: '可询问价格、规格、库存或供应商信息。',
        close: '关闭',
        typing: 'AI 正在输入...',
        inputPlaceholder: '询问产品、规格和价格...',
        rotateDevice: '请旋转设备',
        landscapeRequired: '需要横屏',
        rotateHint: '请将手机横向放置以继续 Pixel Streaming 体验。',
        addToCart: (name) => `已将 ${name} 加入购物车！`,
        startSupplierChat: (name) => `正在与 ${name} 建立直接聊天...`,
        chatPrefill: (name, product) => `@${name} 我想咨询一下 ${product}...`,
        inStock: '有现货',
        outOfStock: '缺货',
        originalLabel: '原文',
        translatedLabel: '翻译',
        tapToStart: '点击任意位置开始体验',
        clickToResume: '点击以继续',
        livePreview: '实时预览',
    },
};

const FASTVIEW_LAUNCH_COPY: Record<
    AppLanguage,
    {
        eyebrow: string;
        loadingTitle: string;
        loadingBody: string;
        readyTitle: string;
        readyBody: string;
        connectingCta: string;
        enterCta: string;
        assistantTitle: string;
        assistantHint: (key: string) => string;
        assistantCta: (key: string) => string;
        errorTitle: string;
        errorBody: string;
        retryCta: string;
    }
> = {
    en: {
        eyebrow: 'FastView Access',
        loadingTitle: 'Preparing your live showroom',
        loadingBody: 'We are waking the stream and loading controls. This usually takes a few moments.',
        readyTitle: 'Your session is ready',
        readyBody: 'Enter once to enable audio, language sync, and interactive controls.',
        connectingCta: 'Connecting...',
        enterCta: 'Enter FastView',
        assistantTitle: 'Ask an Assistant',
        assistantHint: (key) => `Press ${key} to call the Assistant avatar and ask questions.`,
        assistantCta: (key) => `Call Assistant (${key})`,
        errorTitle: 'Unable to start FastView',
        errorBody: 'Refresh the page to request a new session and try again.',
        retryCta: 'Refresh page',
    },
    ru: {
        eyebrow: '\u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0432\u0445\u043E\u0434',
        loadingTitle: '\u0413\u043E\u0442\u043E\u0432\u0438\u043C \u0432\u0430\u0448 \u043E\u043D\u043B\u0430\u0439\u043D-\u0448\u043E\u0443\u0440\u0443\u043C',
        loadingBody: '\u0417\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u043C \u0441\u0442\u0440\u0438\u043C \u0438 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435. \u041E\u0431\u044B\u0447\u043D\u043E \u044D\u0442\u043E \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434.',
        readyTitle: '\u0421\u0435\u0430\u043D\u0441 \u0433\u043E\u0442\u043E\u0432',
        readyBody: '\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A, \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E \u044F\u0437\u044B\u043A\u0430 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435.',
        connectingCta: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u043C...',
        enterCta: '\u0412\u043E\u0439\u0442\u0438 \u0432 FastView',
        assistantTitle: '\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u0435 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u0430',
        assistantHint: (key) => `\u041D\u0430\u0436\u043C\u0438\u0442\u0435 ${key}, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u0430\u0432\u0430\u0442\u0430\u0440\u0430-\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u0430 \u0438 \u0437\u0430\u0434\u0430\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441.`,
        assistantCta: (key) => `\u0412\u044B\u0437\u0432\u0430\u0442\u044C \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u0430 (${key})`,
        errorTitle: '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C FastView',
        errorBody: '\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u0441\u0435\u0430\u043D\u0441 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430.',
        retryCta: '\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443',
    },
    zh: {
        eyebrow: '\u5FEB\u901F\u8FDB\u5165',
        loadingTitle: '\u6B63\u5728\u51C6\u5907\u4F60\u7684\u76F4\u64AD\u5C55\u5385',
        loadingBody: '\u6211\u4EEC\u6B63\u5728\u5524\u9192\u6D41\u5A92\u4F53\u5E76\u52A0\u8F7D\u4EA4\u4E92\u63A7\u4EF6\u3002\u8FD9\u901A\u5E38\u53EA\u9700\u51E0\u79D2\u949F\u3002',
        readyTitle: '\u4F1A\u8BDD\u5DF2\u5C31\u7EEA',
        readyBody: '\u70B9\u51FB\u4E00\u6B21\u5373\u53EF\u542F\u7528\u97F3\u9891\u3001\u8BED\u8A00\u540C\u6B65\u548C\u4EA4\u4E92\u63A7\u5236\u3002',
        connectingCta: '\u8FDE\u63A5\u4E2D...',
        enterCta: '\u8FDB\u5165 FastView',
        assistantTitle: '\u8BE2\u95EE\u52A9\u7406',
        assistantHint: (key) => `\u6309 ${key} \u547C\u53EB\u52A9\u7406\u865A\u62DF\u4EBA\u5E76\u63D0\u95EE\u3002`,
        assistantCta: (key) => `\u547C\u53EB\u52A9\u7406 (${key})`,
        errorTitle: '\u65E0\u6CD5\u542F\u52A8 FastView',
        errorBody: '\u8BF7\u5237\u65B0\u9875\u9762\u4EE5\u7533\u8BF7\u65B0\u4F1A\u8BDD\u5E76\u91CD\u8BD5\u3002',
        retryCta: '\u5237\u65B0\u9875\u9762',
    },
};

const extractProductIdFromUnrealPayload = (payload: unknown): string | null => {
    if (typeof payload === 'string') {
        const value = payload.trim();
        return value.length > 0 ? value : null;
    }

    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const data = payload as Record<string, unknown>;
    const preferredKeys = ['id', 'productId', 'product_id', 'tag', 'productTag', 'objectId', 'itemId', 'name'];

    for (const key of preferredKeys) {
        const value = data[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }

    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.trim().length > 0) {
            const normalizedKey = key.toLowerCase();
            if (
                normalizedKey === 'id' ||
                normalizedKey.endsWith('id') ||
                normalizedKey.includes('tag')
            ) {
                return value.trim();
            }
        }
    }

    const nestedData = data.data;
    if (nestedData && typeof nestedData === 'object') {
        return extractProductIdFromUnrealPayload(nestedData);
    }

    return null;
};

const resolveDefaultSignalingUrl = () => {
    const remoteDefaultHost = 'avastatesarah.com';
    const fromEnv = process.env.NEXT_PUBLIC_PIXELSTREAM_SIGNALING_URL?.trim();
    if (fromEnv) return fromEnv;

    const port = process.env.NEXT_PUBLIC_PIXELSTREAM_SIGNALING_PORT;
    const withOptionalPort = (protocol: 'ws' | 'wss', host: string) =>
        port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;

    // `window` is only available in the browser; fall back to production host for prerender.
    if (typeof window === 'undefined') {
        return withOptionalPort('wss', remoteDefaultHost);
    }

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('ps_url')?.trim();
    if (fromQuery) return fromQuery;
    return withOptionalPort('wss', remoteDefaultHost);
};

const DEFAULT_FASTVIEW_APP_ID = '69d615b641d102927ca911f3';
const SFERA_HALL_CUTSCENE_SRC: Record<AppLanguage, string> = {
    en: '/cutscenes/englishsphere.MP4',
    ru: '/cutscenes/russiansphere.MP4',
    zh: '/cutscenes/chinesesphere.MOV',
};
const FASTVIEW_CUTSCENE_FADE_MS = 700;

const buildStreamPixelPreviewUrl = (appId: string) => `https://share.streampixel.io/${appId}`;

const extractAppIdFromStreamPixelUrl = (input: string) => {
    if (!input) return '';

    try {
        return new URL(input).pathname.replace(/^\/+|\/+$/g, '');
    } catch {
        return '';
    }
};

const resolveDefaultFastViewAppId = () =>
    process.env.NEXT_PUBLIC_FASTVIEW_APP_ID?.trim() ||
    extractAppIdFromStreamPixelUrl(process.env.NEXT_PUBLIC_FASTVIEW_STREAM_URL?.trim() || '') ||
    DEFAULT_FASTVIEW_APP_ID;

const detectMobileDevice = () => {
    if (typeof window === 'undefined') return false;

    const legacyWindow = window as Window & { opera?: string; MSStream?: unknown };
    const userAgent = navigator.userAgent || navigator.vendor || legacyWindow.opera || '';
    const isForceMobile = new URLSearchParams(window.location.search).get('force_mobile') === 'true';

    return Boolean(
        isForceMobile ||
        /android/i.test(userAgent) ||
        (/iPad|iPhone|iPod/.test(userAgent) && !legacyWindow.MSStream)
    );
};

// Block every function key from reaching UE. The engine's built-in
// CheatManager binds debug viewmodes (F4=Lit, F5=ShaderComplexity, etc.)
// and stat overlays to these in Development builds, so any stray press
// toggles a debug overlay on top of the stream. Gameplay uses WASD / F /
// T / X — no function keys — so this is zero-risk.
const BLOCKED_UNREAL_KEY_CODES = [
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
];


type FrontendCinematic = {
    id: number;
    eyebrow: string;
    title: string;
    description: string;
    destinationLabel: string;
};
type SceneDashboardOverlay = 'player' | 'shopper' | 'business';
type SceneMode = 'player' | 'shopper';
type AppSessionResponse = {
    success?: boolean;
    user?: {
        email?: string | null;
        role?: AppAuthRole | null;
    };
};

const resolveRequestedSceneMode = (mode: string | null): SceneMode | null => {
    if (mode === 'player' || mode === 'gamer') return 'player';
    if (mode === 'shopper') return 'shopper';
    return null;
};

const FRONTEND_CINEMATIC_DURATION_MS = 3200;
const RETURN_TO_CITY_CINEMATIC_DURATION_MS = 5600;

const resolveFrontendCinematic = (event: unknown): Omit<FrontendCinematic, 'id'> | null => {
    if (!event || typeof event !== 'object') return null;

    const payload = event as Record<string, unknown>;

    if (payload.event === 'portal_entered' && payload.portal === 'SferaHall') {
        return {
            eyebrow: 'Entering marketplace',
            title: 'Opening Sfera Hall',
            description: 'Crossing from the city streets into the shared mall and pavilion floor.',
            destinationLabel: 'Sfera Hall',
        };
    }

    if (payload.event === 'game_entered' && payload.game === 'ZombieArena') {
        return {
            eyebrow: 'Player Mode gateway',
            title: 'Loading Zombie Arena',
            description: 'Preparing the arena HUD, score rules, health state, and reward preview.',
            destinationLabel: 'Zombie Arena',
        };
    }

    if (payload.event === 'returned_to_city') {
        return {
            eyebrow: 'Returning to city',
            title: 'Rebuilding city view',
            description: 'Syncing the website state back to the main marketplace world.',
            destinationLabel: 'Main City',
        };
    }

    return null;
};

export default function ExperiencePage() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isFastViewRoute = pathname === '/fastview';
    const { language } = useLanguage();
    const ui = EXPERIENCE_COPY[language];
    const sceneHud = SCENE_HUD_COPY[language];
    const fastViewLaunch = FASTVIEW_LAUNCH_COPY[language];
    const cutsceneCopy = CUTSCENE_COPY[language];
    const sferaHallCutsceneSrc = SFERA_HALL_CUTSCENE_SRC[language];
    const liveActivityLabel = LIVE_ACTIVITY_LABEL[language];
    const liveActivityNowLabel = LIVE_ACTIVITY_NOW_LABEL[language];
    const accountLabel =
        language === 'ru'
            ? '\u0412\u044B \u0432\u043E\u0448\u043B\u0438 \u043A\u0430\u043A'
            : language === 'zh'
              ? '\u5F53\u524D\u8D26\u53F7'
              : 'Signed in as';
    const accountSignOutLabel =
        language === 'ru'
            ? '\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430'
            : language === 'zh'
              ? '\u9000\u51FA\u767B\u5F55'
              : 'Sign out';
    const returnHomeLabel =
        language === 'ru'
            ? '\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E'
            : language === 'zh'
              ? '\u8FD4\u56DE\u9996\u9875'
              : 'Back to Home';
    const backToSceneLabel =
        language === 'ru'
            ? '\u041D\u0430\u0437\u0430\u0434 \u0432 \u0441\u0446\u0435\u043D\u0443'
            : language === 'zh'
              ? '\u8FD4\u56DE\u573A\u666F'
              : 'Back to scene';
    const unrealBridge = useUnrealEventBridge();
    const isZombieArenaActive =
        unrealBridge.currentGame === 'ZombieArena' ||
        unrealBridge.currentLocation === 'zombieArena';
    const sceneInstruction = isZombieArenaActive ? ui.zombieInstruction : ui.instruction;
    const emitQuestEvent = useCallback((event: QuestEventInput) => {
        unrealBridge.handleUnrealResponse(JSON.stringify(event));
    }, [unrealBridge]);
    const [frontendCinematic, setFrontendCinematic] = useState<FrontendCinematic | null>(null);
    const [signalingServerUrl] = useState<string>(() => resolveDefaultSignalingUrl());
    const [fastViewAppId] = useState<string>(() => resolveDefaultFastViewAppId());
    const [chatInput, setChatInput] = useState('');
    const [isChatFocused, setIsChatFocused] = useState(false);
    const [chatMode, setChatMode] = useState<'ai' | 'supplier'>('ai');
    const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([
        {
            id: 'assistant-welcome',
            role: 'assistant',
            text: ui.welcome,
            timestamp: Date.now(),
        },
    ]);
    const [supplierChatMessages, setSupplierChatMessages] = useState<ChatMessage[]>([]);
    const [isSendingChat, setIsSendingChat] = useState(false);
    const [isSyncingSupplierChat, setIsSyncingSupplierChat] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [mouseSensitivity, setMouseSensitivity] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_MOUSE_SENSITIVITY;
        const stored = localStorage.getItem('ps_mouse_sensitivity');
        if (stored) {
            const parsed = parseFloat(stored);
            if (Number.isFinite(parsed) && parsed >= 0.1 && parsed <= 2.0) return parsed;
        }
        return DEFAULT_MOUSE_SENSITIVITY;
    });
    const [isMobile, setIsMobile] = useState(() => detectMobileDevice());
    const [isLandscape, setIsLandscape] = useState(true);
    const [mobileInputMode] = useState<MobileInputMode>('joystick');
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
    const [isDesktopChatOpen, setIsDesktopChatOpen] = useState(() => !isFastViewRoute);
    const [viewerEmail, setViewerEmail] = useState<string | null>(null);
    const [viewerRole, setViewerRole] = useState<AppAuthRole | null>(null);
    const [isViewerSessionLoading, setIsViewerSessionLoading] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [needsPointerResume, setNeedsPointerResume] = useState(false);
    const [isStreamPixelOpen, setIsStreamPixelOpen] = useState(false);
    const [fastViewError, setFastViewError] = useState<string | null>(null);
    const [isPlayerModePromptDismissed, setIsPlayerModePromptDismissed] = useState(false);
    const [hasStartedSferaHallCutsceneSound, setHasStartedSferaHallCutsceneSound] = useState(false);
    const [dashboardOverlay, setDashboardOverlay] = useState<SceneDashboardOverlay | null>(null);
    const [liveActivityToasts, setLiveActivityToasts] = useState<LiveActivityToast[]>([]);
    const liveActivityIndexRef = useRef(0);
    const liveActivityRemovalTimersRef = useRef<number[]>([]);
    const hasAppliedInitialModeRef = useRef(false);
    const chatFeedRef = useRef<HTMLDivElement | null>(null);

    const handleSensitivityChange = useCallback((value: number) => {
        setMouseSensitivity(value);
        try { localStorage.setItem('ps_mouse_sensitivity', String(value)); } catch {}
    }, []);

    useEffect(() => {
        setIsMobile(detectMobileDevice());
    }, []);

    useEffect(() => {
        const cinematic = resolveFrontendCinematic(unrealBridge.lastUnrealEvent);
        if (!cinematic) return;

        if (unrealBridge.lastUnrealEvent &&
            typeof unrealBridge.lastUnrealEvent === 'object' &&
            'event' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.event === 'portal_entered' &&
            'portal' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.portal === 'SferaHall') {
            setIsSferaHallCutsceneVisible(true);
        }

        const id = Date.now();
        setFrontendCinematic({ ...cinematic, id });

        const duration = unrealBridge.lastUnrealEvent &&
            typeof unrealBridge.lastUnrealEvent === 'object' &&
            'event' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.event === 'returned_to_city'
            ? RETURN_TO_CITY_CINEMATIC_DURATION_MS
            : FRONTEND_CINEMATIC_DURATION_MS;

        const timer = window.setTimeout(() => {
            setFrontendCinematic((current) => (current?.id === id ? null : current));
        }, duration);

        return () => window.clearTimeout(timer);
    }, [unrealBridge.lastUnrealEvent]);


    useEffect(() => {
        const updateOrientation = () => {
            setIsLandscape(window.innerWidth >= window.innerHeight);
        };

        updateOrientation();
        window.addEventListener('resize', updateOrientation);
        window.addEventListener('orientationchange', updateOrientation);

        return () => {
            window.removeEventListener('resize', updateOrientation);
            window.removeEventListener('orientationchange', updateOrientation);
        };
    }, []);

    useEffect(() => {
        if (!isMobile) return;

        type OrientationLock =
            | 'any'
            | 'natural'
            | 'landscape'
            | 'portrait'
            | 'portrait-primary'
            | 'portrait-secondary'
            | 'landscape-primary'
            | 'landscape-secondary';

        const orientationApi = window.screen.orientation as ScreenOrientation & {
            lock?: (orientation: OrientationLock) => Promise<void>;
        };

        if (!orientationApi?.lock) return;
        orientationApi.lock('landscape').catch(() => {
            // Ignore: many mobile browsers require fullscreen or deny lock requests.
        });
    }, [isMobile]);

    useEffect(() => {
        let isMounted = true;

        const loadViewerSession = async () => {
            const applySignedOutState = () => {
                setViewerEmail(null);
                setViewerRole(null);
            };

            try {
                const supabase = getSupabaseBrowserClient();
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!isMounted) return;
                if (session) {
                    setViewerEmail(session.user.email ?? null);
                    setViewerRole(getUserRole(session.user));
                    setIsViewerSessionLoading(false);
                    return;
                }
            } catch {
                if (!isMounted) return;
            }

            try {
                const response = await fetch('/api/auth/session', {
                    cache: 'no-store',
                    credentials: 'same-origin',
                });

                if (!isMounted) return;

                if (!response.ok) {
                    applySignedOutState();
                    setIsViewerSessionLoading(false);
                    return;
                }

                const payload = (await response.json()) as AppSessionResponse;
                const role = payload.user?.role === 'supplier' ? 'supplier' : 'buyer';
                setViewerEmail(payload.user?.email ?? null);
                setViewerRole(role);
                setIsViewerSessionLoading(false);
            } catch {
                if (!isMounted) return;
                applySignedOutState();
                setIsViewerSessionLoading(false);
            }
        };

        void loadViewerSession();

        return () => {
            isMounted = false;
        };
    }, []);

    // Product Interaction State
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [activeSupplier, setActiveSupplier] = useState<Supplier | undefined>(undefined);

    // Catalogue State
    const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
    const [catalogueProducts, setCatalogueProducts] = useState<Product[]>([]);

    // Pavilion Exposition State — opened when Unreal sends `entered_pavilion:<id>`.
    const [activePavilion, setActivePavilion] = useState<PavilionInfo | null>(null);
    const [isRewardTerminalOpen, setIsRewardTerminalOpen] = useState(false);
    const [seenRewardTerminalRewardId, setSeenRewardTerminalRewardId] = useState<string | null>(null);
    const localizedActiveProduct = useMemo(
        () => (activeProduct ? getLocalizedProduct(activeProduct, language) : null),
        [activeProduct, language]
    );
    const localizedCatalogueProducts = useMemo(
        () => catalogueProducts.map((product) => getLocalizedProduct(product, language)),
        [catalogueProducts, language]
    );

    // Video Element Reference for Mobile Controls
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [hasStartedExperience, setHasStartedExperience] = useState(false);
    // True once UE is actually producing video frames — used to keep a
    // transition overlay visible between the user's "enter" click and the
    // first frame so they don't see a black screen while UE unpauses.
    const [isVideoStreamingFrames, setIsVideoStreamingFrames] = useState(false);
    const [hasCompletedFastViewCutscene, setHasCompletedFastViewCutscene] = useState(true);
    const [isFastViewCutsceneExiting, setIsFastViewCutsceneExiting] = useState(false);
    const [hasStartedFastViewCutscene, setHasStartedFastViewCutscene] = useState(() => !isFastViewRoute);
    const [hasEndedFastViewCutscene, setHasEndedFastViewCutscene] = useState(() => !isFastViewRoute);
    const fastViewCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const [isSferaHallCutsceneVisible, setIsSferaHallCutsceneVisible] = useState(false);
    const sferaHallCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const fastViewCutsceneExitTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!hasStartedExperience || !unrealBridge.lastUnrealEvent) return;

        switch (unrealBridge.lastUnrealEvent.event) {
            case 'mode_changed':
            case 'portal_entered':
            case 'game_entered':
                playSferaUiSound('progress');
                break;
            case 'returned_to_city':
                playSferaUiSound('open');
                break;
            case 'game_access_denied':
                playSferaUiSound('warning');
                break;
            default:
                break;
        }
    }, [hasStartedExperience, unrealBridge.lastUnrealEvent]);

    useEffect(() => {
        if (!hasStartedExperience || !unrealBridge.lastCompletedQuestId) return;
        playSferaUiSound('reward');
    }, [hasStartedExperience, unrealBridge.lastCompletedQuestId]);

    useEffect(() => {
        if (!isRewardTerminalOpen) return;
        playSferaUiSound('open');
    }, [isRewardTerminalOpen]);


    useEffect(() => {
        if (!isFastViewRoute || !hasStartedExperience) return;

        const targetMode = resolveRequestedSceneMode(searchParams.get('mode'));
        if (!targetMode) {
            hasAppliedInitialModeRef.current = false;
            return;
        }
        if (hasAppliedInitialModeRef.current && unrealBridge.currentMode === targetMode) return;

        const shouldSendInitialGameModeToggle =
            targetMode === 'player' &&
            unrealBridge.currentMode !== 'player';

        hasAppliedInitialModeRef.current = true;
        sendUnrealUiInteraction({ type: 'set_mode', mode: targetMode });
        sendUnrealUiInteraction({ event: 'mode_changed', mode: targetMode });
        if (shouldSendInitialGameModeToggle) {
            sendUnrealKeyPress(71);
        }
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'mode_changed', mode: targetMode }));
    }, [hasStartedExperience, isFastViewRoute, searchParams, unrealBridge]);

    useEffect(() => {
        if (isFastViewRoute) return;
        setHasCompletedFastViewCutscene(true);
        setIsFastViewCutsceneExiting(false);
        setHasStartedFastViewCutscene(true);
        setHasEndedFastViewCutscene(true);
    }, [isFastViewRoute]);

    useEffect(() => {
        return () => {
            if (fastViewCutsceneExitTimerRef.current !== null) {
                window.clearTimeout(fastViewCutsceneExitTimerRef.current);
            }
        };
    }, []);

    const handleStartExperience = useCallback(() => {
        if (hasStartedExperience) return;
        if (isFastViewRoute && !videoElement) return;

        playSferaUiSound('start');

        // Flip the library's StartVideoMuted flag so that any subsequent
        // playStream() / play() calls inside the library no longer re-mute.
        try {
            const psWindow = window as PixelStreamingWindow;
            psWindow.ps?.config?.setFlagEnabled?.('StartVideoMuted', false);
        } catch { /* best-effort */ }

        // Unmute all media elements currently in the DOM.
        const unmuteAllDOM = () => {
            document.querySelectorAll('video, audio').forEach((el) => {
                if (el instanceof HTMLElement && el.dataset.cutsceneVideo === 'true') return;
                const m = el as HTMLMediaElement;
                m.muted = false;
                m.volume = 1.0;
                m.play().catch(() => {});
            });
        };
        unmuteAllDOM();

        // The Epic Games UE 5.4 Pixel Streaming library creates an <audio> element
        // (StreamController.audioElement) that is never appended to the DOM.
        // Its srcObject is set asynchronously when the WebRTC audio track arrives
        // via ontrack, which may happen BEFORE or AFTER this user click.
        // We poll briefly to catch both cases.
        const ensureAudioPlaying = () => {
            try {
                const psWindow = window as PixelStreamingWindow;
                const audioEl =
                    psWindow.ps?._webRtcController?.streamController?.audioElement;
                if (audioEl instanceof HTMLMediaElement) {
                    if (!document.body.contains(audioEl)) {
                        audioEl.style.display = 'none';
                        document.body.appendChild(audioEl);
                    }
                    audioEl.muted = false;
                    audioEl.volume = 1.0;
                    if (audioEl.srcObject) {
                        audioEl.play().catch(() => {});
                    }
                }
            } catch { /* best-effort */ }
            // Also catch any new DOM media elements the library may have added.
            unmuteAllDOM();
        };

        // Run immediately, then poll every 500ms for 5 seconds to catch
        // late-arriving audio tracks.
        ensureAudioPlaying();
        let attempts = 0;
        const audioPoller = window.setInterval(() => {
            attempts++;
            ensureAudioPlaying();
            if (attempts >= 10) window.clearInterval(audioPoller);
        }, 500);

        const psWindow = window as PixelStreamingWindow;

        // Epic PS: lock pointer manually on start.
        // FastView: let the SDK handle the first lock on the user's next
        // click so we can capture the exact element via pointerlockchange.
        if (!isFastViewRoute) {
            try {
                const parent = psWindow.ps?.videoElementParent;
                if (parent && typeof parent.requestPointerLock === 'function') {
                    parent.requestPointerLock();
                } else if (videoElement && typeof videoElement.requestPointerLock === 'function') {
                    videoElement.requestPointerLock();
                }
            } catch (err) {
                console.warn('Could not automatically lock pointer:', err);
            }
        }

        setHasStartedExperience(true);
    }, [hasStartedExperience, videoElement, isFastViewRoute]);

    const handleStartFastViewCutscene = useCallback(() => {
        if (
            !isFastViewRoute ||
            hasCompletedFastViewCutscene ||
            hasStartedFastViewCutscene ||
            isFastViewCutsceneExiting
        ) {
            return;
        }

        setHasStartedFastViewCutscene(true);

        const cutsceneVideo = fastViewCutsceneVideoRef.current;
        if (!cutsceneVideo) return;

        cutsceneVideo.muted = false;
        cutsceneVideo.volume = 1;
        cutsceneVideo.play().catch(() => {
            cutsceneVideo.muted = true;
            cutsceneVideo.play().catch(() => {});
        });
    }, [
        hasCompletedFastViewCutscene,
        hasStartedFastViewCutscene,
        isFastViewCutsceneExiting,
        isFastViewRoute,
    ]);

    const beginFastViewCutsceneExit = useCallback(() => {
        if (!isFastViewRoute || hasCompletedFastViewCutscene || isFastViewCutsceneExiting) return;

        setIsFastViewCutsceneExiting(true);
        if (fastViewCutsceneExitTimerRef.current !== null) {
            window.clearTimeout(fastViewCutsceneExitTimerRef.current);
        }

        fastViewCutsceneExitTimerRef.current = window.setTimeout(() => {
            setHasCompletedFastViewCutscene(true);
            setIsFastViewCutsceneExiting(false);
            fastViewCutsceneExitTimerRef.current = null;
        }, FASTVIEW_CUTSCENE_FADE_MS);
    }, [hasCompletedFastViewCutscene, isFastViewCutsceneExiting, isFastViewRoute]);

    const handleCompleteFastViewCutscene = useCallback(() => {
        if (!isFastViewRoute || hasCompletedFastViewCutscene) return;

        setHasEndedFastViewCutscene(true);

        if (videoElement && !fastViewError) {
            handleStartExperience();
        }

        if (isVideoStreamingFrames) {
            beginFastViewCutsceneExit();
        }
    }, [
        beginFastViewCutsceneExit,
        fastViewError,
        handleStartExperience,
        hasCompletedFastViewCutscene,
        isFastViewRoute,
        isVideoStreamingFrames,
        videoElement,
    ]);

    const handleStartSferaHallCutsceneWithSound = useCallback(() => {
        const video = sferaHallCutsceneVideoRef.current;
        if (!video) return;

        setHasStartedSferaHallCutsceneSound(true);
        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    }, []);

    useEffect(() => {
        if (!isFastViewRoute || hasCompletedFastViewCutscene || fastViewError || hasStartedFastViewCutscene) return;
        const startFromKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            handleStartFastViewCutscene();
        };
        window.addEventListener('keydown', startFromKey);
        return () => window.removeEventListener('keydown', startFromKey);
    }, [fastViewError, handleStartFastViewCutscene, hasCompletedFastViewCutscene, hasStartedFastViewCutscene, isFastViewRoute]);

    useEffect(() => {
        if (!isSferaHallCutsceneVisible || hasStartedSferaHallCutsceneSound) return;
        const startFromKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            handleStartSferaHallCutsceneWithSound();
        };
        window.addEventListener('keydown', startFromKey);
        return () => window.removeEventListener('keydown', startFromKey);
    }, [handleStartSferaHallCutsceneWithSound, hasStartedSferaHallCutsceneSound, isSferaHallCutsceneVisible]);

    const handleSkipFastViewCutscene = useCallback(() => {
        if (!isFastViewRoute || hasCompletedFastViewCutscene) return;

        if (videoElement && !fastViewError) {
            handleStartExperience();
        }

        beginFastViewCutsceneExit();
    }, [
        beginFastViewCutsceneExit,
        fastViewError,
        handleStartExperience,
        hasCompletedFastViewCutscene,
        isFastViewRoute,
        videoElement,
    ]);

    useEffect(() => {
        if (
            !isFastViewRoute ||
            !hasCompletedFastViewCutscene ||
            hasStartedExperience ||
            fastViewError ||
            !videoElement
        ) {
            return;
        }

        handleStartExperience();
    }, [
        fastViewError,
        handleStartExperience,
        hasCompletedFastViewCutscene,
        hasStartedExperience,
        isFastViewRoute,
        videoElement,
    ]);

    useEffect(() => {
        if (
            !isFastViewRoute ||
            !hasEndedFastViewCutscene ||
            hasCompletedFastViewCutscene ||
            fastViewError ||
            !isVideoStreamingFrames
        ) {
            return;
        }

        beginFastViewCutsceneExit();
    }, [
        beginFastViewCutsceneExit,
        fastViewError,
        hasCompletedFastViewCutscene,
        hasEndedFastViewCutscene,
        isFastViewRoute,
        isVideoStreamingFrames,
    ]);

    useEffect(() => {
        if (!unrealBridge.accessDeniedMessage) {
            setIsPlayerModePromptDismissed(false);
        }
    }, [unrealBridge.accessDeniedMessage]);

    const switchUnrealMode = useCallback((mode: 'player' | 'shopper') => {
        sendUnrealUiInteraction({ type: 'set_mode', mode });
        sendUnrealUiInteraction({ event: 'mode_changed', mode });
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'mode_changed', mode }));
        sendUnrealKeyPress(71);
    }, [unrealBridge]);

    const toggleUnrealMode = useCallback(() => {
        switchUnrealMode(unrealBridge.currentMode === 'player' ? 'shopper' : 'player');
    }, [switchUnrealMode, unrealBridge.currentMode]);

    const handleSwitchToPlayerMode = useCallback(() => {
        if (!hasStartedExperience) {
            handleStartExperience();
        }

        switchUnrealMode('player');
        setIsPlayerModePromptDismissed(true);
    }, [handleStartExperience, hasStartedExperience, switchUnrealMode]);

    useEffect(() => {
        if (!hasStartedExperience || isChatFocused || activeProduct || isCatalogueOpen || activePavilion || isMenuOpen) return;

        const handleModeHotkey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isEditableTarget = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
            if (isEditableTarget || event.repeat || event.key.toLowerCase() !== 'g') return;

            toggleUnrealMode();
        };

        document.addEventListener('keydown', handleModeHotkey, true);
        return () => document.removeEventListener('keydown', handleModeHotkey, true);
    }, [activePavilion, activeProduct, isCatalogueOpen, isChatFocused, isMenuOpen, hasStartedExperience, toggleUnrealMode]);

    const usingMobileJoysticks = isMobile && isLandscape && mobileInputMode === 'joystick';
    const streamPixelPreviewUrl = useMemo(
        () => process.env.NEXT_PUBLIC_FASTVIEW_STREAM_URL?.trim() || buildStreamPixelPreviewUrl(fastViewAppId),
        [fastViewAppId]
    );
    const activeSupplierId = activeSupplier?.id;
    const chatMessages = chatMode === 'ai' ? aiChatMessages : supplierChatMessages;
    const isSupplierMode = chatMode === 'supplier';
    const chatTitle = isSupplierMode ? `${ui.menuSupplier}` : ui.assistantTitle;
    const chatSubtitle = isSupplierMode
        ? (activeSupplier ? `${activeSupplier.name}` : ui.assistantSubtitle)
        : ui.assistantSubtitle;
    const chatPlaceholder = isSupplierMode
        ? sceneHud.typeSupplier
        : ui.inputPlaceholder;
    const isChatPanelOpen = isMobile ? isMobileChatOpen : isDesktopChatOpen;
    const showFastViewCutscene = isFastViewRoute && !hasCompletedFastViewCutscene && !fastViewError;
    const showFastViewLaunchOverlay =
        isFastViewRoute &&
        !showFastViewCutscene &&
        (!hasStartedExperience || Boolean(fastViewError));
    const showExperienceHud = !isFastViewRoute || (!showFastViewCutscene && !showFastViewLaunchOverlay);
    const shouldRunLiveActivity = showExperienceHud && hasStartedExperience && !fastViewError;
    const showLiveActivityToasts =
        shouldRunLiveActivity &&
        liveActivityToasts.length > 0 &&
        !activeProduct &&
        !activePavilion &&
        !isCatalogueOpen &&
        !isChatPanelOpen &&
        !isMenuOpen &&
        !isRewardTerminalOpen &&
        !isStreamPixelOpen;
    const canEnterFastView = Boolean(videoElement) && !fastViewError;
    const fastViewLaunchTitle = fastViewError
        ? fastViewLaunch.errorTitle
        : canEnterFastView
          ? fastViewLaunch.readyTitle
          : fastViewLaunch.loadingTitle;
    const fastViewLaunchDescription = fastViewError
        ? fastViewLaunch.errorBody
        : canEnterFastView
          ? fastViewLaunch.readyBody
          : fastViewLaunch.loadingBody;
    const requestedSceneMode = resolveRequestedSceneMode(searchParams.get('mode'));
    const effectiveSceneMode = requestedSceneMode ?? unrealBridge.currentMode;
    const isGamerScene =
        effectiveSceneMode === 'player' ||
        unrealBridge.currentGame === 'ZombieArena';
    const shouldShowSupplierLogin = !viewerEmail && !isGamerScene;
    const activeSceneDashboard: SceneDashboardOverlay =
        isGamerScene
            ? 'player'
            : viewerRole === 'supplier'
              ? 'business'
              : 'shopper';
    const activeSceneDashboardLabel =
        activeSceneDashboard === 'business'
            ? sceneHud.businessDashboard
            : activeSceneDashboard === 'player'
              ? sceneHud.playerDashboard
              : sceneHud.shopperDashboard;
    const activeSceneDashboardLoginHref = '/login?role=player&next=%2Ffastview%3Fresume%3Dscene%26mode%3Dplayer';
    const shouldPromptPlayerLogin =
        activeSceneDashboard === 'player' &&
        !viewerEmail &&
        !isViewerSessionLoading;
    const isPlayerModeAccessDenied =
        Boolean(unrealBridge.accessDeniedMessage) &&
        unrealBridge.lastUnrealEvent?.event === 'game_access_denied';
    const shouldShowPlayerModePrompt =
        isPlayerModeAccessDenied &&
        !isPlayerModePromptDismissed &&
        effectiveSceneMode !== 'player';

    useEffect(() => {
        if (!isPlayerModeAccessDenied || effectiveSceneMode !== 'player') return;

        sendUnrealUiInteraction({ type: 'set_mode', mode: 'player' });
        sendUnrealUiInteraction({ event: 'mode_changed', mode: 'player' });
        sendUnrealKeyPress(71);
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'mode_changed', mode: 'player' }));
        setIsPlayerModePromptDismissed(true);
    }, [effectiveSceneMode, isPlayerModeAccessDenied, unrealBridge]);

    useEffect(() => {
        liveActivityRemovalTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        liveActivityRemovalTimersRef.current = [];
        setLiveActivityToasts([]);

        if (!shouldRunLiveActivity) return;

        const templates = LIVE_ACTIVITY_TEMPLATES[language];

        const pushLiveActivity = () => {
            const nextIndex = liveActivityIndexRef.current;
            const template = templates[nextIndex % templates.length];
            const id = Date.now() + nextIndex;
            liveActivityIndexRef.current = nextIndex + 1;

            setLiveActivityToasts((previous) => [{ ...template, id }, ...previous].slice(0, 3));

            const removalTimer = window.setTimeout(() => {
                setLiveActivityToasts((previous) => previous.filter((toast) => toast.id !== id));
                liveActivityRemovalTimersRef.current = liveActivityRemovalTimersRef.current.filter(
                    (timerId) => timerId !== removalTimer
                );
            }, LIVE_ACTIVITY_VISIBLE_MS);

            liveActivityRemovalTimersRef.current.push(removalTimer);
        };

        const initialTimer = window.setTimeout(pushLiveActivity, LIVE_ACTIVITY_INITIAL_DELAY_MS);
        const intervalTimer = window.setInterval(pushLiveActivity, LIVE_ACTIVITY_INTERVAL_MS);

        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalTimer);
            liveActivityRemovalTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
            liveActivityRemovalTimersRef.current = [];
        };
    }, [language, shouldRunLiveActivity]);

    const handleReloadPage = () => {
        window.location.reload();
    };

    const toggleChatPanel = () => {
        if (isMobile) {
            setIsMobileChatOpen((previous) => !previous);
            return;
        }

        setIsDesktopChatOpen((previous) => !previous);
    };

    const closeChatPanel = () => {
        if (isMobile) {
            setIsMobileChatOpen(false);
            return;
        }

        setIsDesktopChatOpen(false);
    };

    const handleSignOut = async () => {
        if (isSigningOut) return;

        setIsSigningOut(true);

        try {
            const supabase = getSupabaseBrowserClient();
            await supabase.auth.signOut();
        } catch {
            // Ignore and still clear the server cookie.
        }

        try {
            await clearServerAuthSession();
        } catch {
            // Ignore and still redirect.
        }

        setViewerEmail(null);
        setViewerRole(null);
        window.location.assign('/login?role=user');
    };

    const syncSupplierMessages = useCallback(async () => {
        if (!activeSupplierId) return;
        setIsSyncingSupplierChat(true);

        try {
            const response = await fetch(`/api/supplier-chat?supplierId=${encodeURIComponent(activeSupplierId)}&viewerLanguage=${encodeURIComponent(language)}`, {
                cache: 'no-store',
            });
            const data = await readSupplierChatApiResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Unable to load supplier messages.');
            }

            const nextMessages = (data.messages ?? []).map((message) => ({
                id: `supplier-${message.id}`,
                role: message.senderRole === 'supplier' ? 'supplier' : 'user',
                text: message.text,
                timestamp: message.createdAt,
                originalText: message.originalText,
                isTranslated: message.isTranslated,
            })) satisfies ChatMessage[];

            setSupplierChatMessages(nextMessages);
        } catch {
            setSupplierChatMessages((previous) =>
                previous.length > 0
                    ? previous
                    : [createClientChatMessage('assistant', ui.connectionIssue)]
            );
        } finally {
            setIsSyncingSupplierChat(false);
        }
    }, [activeSupplierId, language, ui.connectionIssue]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = chatInput.trim();
        if (!trimmed || isSendingChat) return;

        setChatInput('');
        setIsSendingChat(true);

        if (isSupplierMode && activeSupplierId) {
            setSupplierChatMessages((previous) => [
                ...previous,
                createClientChatMessage('user', trimmed),
            ]);

            try {
                const response = await fetch('/api/supplier-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        supplierId: activeSupplierId,
                        senderRole: 'buyer',
                        senderName: 'Guest',
                        text: trimmed,
                        senderLanguage: language,
                    }),
                });

                const data = await readSupplierChatApiResponse(response);
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Unable to send message.');
                }

                await syncSupplierMessages();
            } catch {
                setSupplierChatMessages((previous) => [
                    ...previous,
                    createClientChatMessage('assistant', ui.connectionIssue),
                ]);
            } finally {
                setIsSendingChat(false);
            }

            return;
        }

        setAiChatMessages((previous) => [...previous, createClientChatMessage('user', trimmed)]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user: 'Guest',
                    text: trimmed,
                    productId: activeProduct?.id,
                    language,
                }),
            });

            if (!response.ok) {
                throw new Error('Unable to send message.');
            }

            const data = (await response.json()) as ChatApiResponse;
            const replyText =
                typeof data.assistantMessage?.text === 'string' && data.assistantMessage.text.trim().length > 0
                    ? data.assistantMessage.text.trim()
                    : ui.fallbackReply;

            setAiChatMessages((previous) => [...previous, createClientChatMessage('assistant', replyText)]);
        } catch {
            setAiChatMessages((previous) => [
                ...previous,
                createClientChatMessage(
                    'assistant',
                    ui.connectionIssue
                ),
            ]);
        } finally {
            setIsSendingChat(false);
        }
    };

    useEffect(() => {
        const feed = chatFeedRef.current;
        if (!feed) return;
        feed.scrollTo({
            top: feed.scrollHeight,
            behavior: 'smooth',
        });
    }, [chatMessages]);

    useEffect(() => {
        setAiChatMessages((previous) =>
            previous.map((message) =>
                message.id === 'assistant-welcome'
                    ? { ...message, text: ui.welcome }
                    : message
            )
        );
    }, [ui.welcome]);

    useEffect(() => {
        if (!isSupplierMode || !activeSupplierId) return;

        void syncSupplierMessages();
        const interval = window.setInterval(() => {
            void syncSupplierMessages();
        }, 3000);

        return () => {
            window.clearInterval(interval);
        };
    }, [isSupplierMode, activeSupplierId, syncSupplierMessages]);



    useEffect(() => {
        if (!localizedActiveProduct) return;

        const supplier = getSupplierById(localizedActiveProduct.supplierId);
        const locale =
            language === 'ru' ? 'ru-RU' : language === 'zh' ? 'zh-CN' : 'en-US';
        const price = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: localizedActiveProduct.currency,
            maximumFractionDigits: 2,
        }).format(localizedActiveProduct.price);
        const availability =
            localizedActiveProduct.status === 'out_of_stock'
                ? ui.outOfStock
                : ui.inStock;
        const supplierName =
            supplier?.name ??
            (language === 'ru'
                ? 'поставщик'
                : language === 'zh'
                  ? '供应商'
                  : 'supplier');

        setAiChatMessages((previous) => [
            ...previous,
            createClientChatMessage(
                'assistant',
                `${ui.focusedTemplate(
                    localizedActiveProduct.name,
                    price,
                    availability,
                    supplierName
                )} ${ui.focusedPrompt}`
            ),
        ]);
    }, [localizedActiveProduct, language, ui]);

    // Simulate receiving a "Click" from Unreal
    const simulateUnrealClick = useCallback((id: string) => {
        const now = Date.now();
        if (now < _suppressProductSelectionUntil) {
            console.info(`[suppress] blocked "${id}" (${Math.round(_suppressProductSelectionUntil - now)}ms left)`);
            return;
        }

        const product = getProductById(id);
        if (product) {
            // Gracefully unlock the mouse so the user can actually interact with the React Product UI
            try { document.exitPointerLock?.(); } catch {}

            setActiveProduct(product);
            // Fetch supplier
            const supplier = getSupplierById(product.supplierId);
            setActiveSupplier(supplier);
            emitQuestEvent({
                event: 'product_viewed',
                productId: product.id,
                supplierId: product.supplierId,
                productName: product.name,
            });
            return;
        }

        console.warn('No product mapping found for Unreal ID:', id);
    }, [emitQuestEvent]);

    const handleChatWithSupplier = () => {
        if (!activeSupplier) return;
        const fallbackProductName =
            language === 'ru' ? 'товару' : language === 'zh' ? '该产品' : 'product';
        setChatMode('supplier');
        setIsMobileChatOpen(true);
        setIsDesktopChatOpen(true);
        setSupplierChatMessages((previous) =>
            previous.length > 0
                ? previous
                : [createClientChatMessage('assistant', ui.startSupplierChat(activeSupplier.name))]
        );
        setChatInput(
            ui.chatPrefill(
                activeSupplier.name,
                localizedActiveProduct?.name ?? activeProduct?.name ?? fallbackProductName
            )
        );
        emitQuestEvent({
            event: 'supplier_chat_opened',
            supplierId: activeSupplier.id,
        });
        void syncSupplierMessages();
    };

    const handleViewCatalogue = () => {
        if (!activeSupplier) return;
        const products = getProductsBySupplier(activeSupplier.id);
        setCatalogueProducts(products);
        setIsCatalogueOpen(true);
        emitQuestEvent({
            event: 'catalogue_opened',
            supplierId: activeSupplier.id,
        });
    };

    const sendUnrealExitFocus = useCallback(() => {
        const psWindow = window as PixelStreamingWindow;
        const keyDownHandler = psWindow.ps?.toStreamerHandlers?.get('KeyDown');
        const keyUpHandler = psWindow.ps?.toStreamerHandlers?.get('KeyUp');

        if (keyDownHandler && keyUpHandler) {
            keyDownHandler([88, 0]); // KeyX down
            keyUpHandler([88]); // KeyX up
            return;
        }

        // Fallback: trigger document keyboard listeners if direct handlers are unavailable.
        const keyboardEventInit: KeyboardEventInit = {
            key: 'x',
            code: 'KeyX',
            bubbles: true,
            cancelable: true,
        };
        document.dispatchEvent(new KeyboardEvent('keydown', keyboardEventInit));
        document.dispatchEvent(new KeyboardEvent('keyup', keyboardEventInit));
    }, []);

    const handleCloseProductCard = useCallback(() => {
        _suppressProductSelectionUntil = Date.now() + 3000;
        console.info(`[suppress] armed for 3s (until ${_suppressProductSelectionUntil})`);
        setActiveProduct(null);
        sendUnrealExitFocus();
        setNeedsPointerResume(true);
    }, [sendUnrealExitFocus]);

    // Flip isVideoStreamingFrames true once UE actually starts painting the
    // video element. We watch for `playing` + `timeupdate` with currentTime
    // advancing; this bridges the gap between the SDK reporting "video
    // initialized" and real frames arriving after the user click.
    useEffect(() => {
        if (!videoElement) {
            setIsVideoStreamingFrames(false);
            return;
        }

        let lastTime = videoElement.currentTime;
        let confirmed = false;
        const markPlaying = () => {
            if (confirmed) return;
            confirmed = true;
            setIsVideoStreamingFrames(true);
        };
        const onTimeUpdate = () => {
            if (videoElement.currentTime > lastTime + 0.01) {
                markPlaying();
            }
            lastTime = videoElement.currentTime;
        };
        const onPlaying = () => {
            // Fallback: `playing` fires even before timeupdate on some
            // browsers — accept it as a readiness signal.
            markPlaying();
        };

        videoElement.addEventListener('timeupdate', onTimeUpdate);
        videoElement.addEventListener('playing', onPlaying);
        return () => {
            videoElement.removeEventListener('timeupdate', onTimeUpdate);
            videoElement.removeEventListener('playing', onPlaying);
        };
    }, [videoElement]);

    // Auto-hide click-to-resume overlay when the SDK re-locks the pointer.
    useEffect(() => {
        if (!isFastViewRoute || !needsPointerResume) return;
        const onLock = () => {
            if (document.pointerLockElement) setNeedsPointerResume(false);
        };
        document.addEventListener('pointerlockchange', onLock);
        return () => document.removeEventListener('pointerlockchange', onLock);
    }, [isFastViewRoute, needsPointerResume]);

    const handleResumePointer = useCallback(() => {
        setNeedsPointerResume(false);
        try {
            const psWindow = window as PixelStreamingWindow;
            const parent = psWindow.ps?.videoElementParent;
            if (parent && typeof parent.requestPointerLock === 'function') {
                parent.requestPointerLock();
            }
        } catch { /* best-effort */ }
    }, []);

    // Sync inspection mode exit with Unreal when the user presses 'X'
    useEffect(() => {
        if (!activeProduct) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'x') {
                handleCloseProductCard();
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [activeProduct, handleCloseProductCard]);

    // Release all held keys/mouse buttons whenever an overlay takes focus.
    // This prevents the "running forward forever" bug caused by keyup events
    // being swallowed when a product card, menu, or chat input opens.
    useEffect(() => {
        if (activeProduct || isMenuOpen || isCatalogueOpen || isChatFocused || activePavilion) {
            releaseAllInputs();
        }
    }, [activeProduct, isMenuOpen, isCatalogueOpen, isChatFocused, activePavilion]);

    // Ensure Unreal Engine state matches React state on video connection/reconnection
    // If the user's connection dropped while inspecting, Unreal remains stuck in inspection
    // while React resets to `activeProduct: null` and the Info Tab vanishes.
    // Sending an 'X' (exit focus) immediately upon video initialization forcefully clears
    // any residual inspection state in Unreal.
    useEffect(() => {
        if (videoElement) {
            sendUnrealExitFocus();
        }
    }, [videoElement, sendUnrealExitFocus]);

    const handlePixelStreamingResponse = (jsonString: string) => {
        const normalizedUnrealEvent = unrealBridge.handleUnrealResponse(jsonString);
        if (normalizedUnrealEvent) return;

        if (process.env.NODE_ENV === 'development') {
            console.info('[UE→Web] raw response:', jsonString);
        }

        // Pavilion entry messages arrive as plain strings: "entered_pavilion:youbo"
        // or "entered_pavilion:doublelin". Handle them before JSON parsing so
        // the payload isn't mangled.
        if (typeof jsonString === 'string') {
            const pavilionId = parseEnterPavilionMessage(jsonString);
            if (pavilionId) {
                const now = Date.now();
                if (now < _suppressProductSelectionUntil) {
                    console.info(`[suppress] blocked pavilion "${pavilionId}" (${Math.round(_suppressProductSelectionUntil - now)}ms left)`);
                    return;
                }
                const pavilion = getPavilionById(pavilionId);
                if (pavilion) {
                    // Release held inputs and unlock the mouse so the overlay UI
                    // is actually interactive.
                    releaseAllInputs();
                    try { document.exitPointerLock?.(); } catch {}
                    setActivePavilion(pavilion);
                    emitQuestEvent({
                        event: 'pavilion_entered',
                        pavilionId,
                    });
                }
                return;
            }
        }

        let payload: unknown = jsonString;

        try {
            payload = JSON.parse(jsonString);
        } catch {
            // Some integrations emit plain string IDs instead of JSON.
        }

        const productId = extractProductIdFromUnrealPayload(payload);
        if (productId) {
            simulateUnrealClick(productId);
            return;
        }

        console.warn('Unrecognized Unreal payload shape:', payload);
    };

    const activeSceneQuest = useMemo(() => {
        if (!isGamerScene) return null;

        for (const progress of unrealBridge.questProgress) {
            const quest = getQuestDefinition(progress.questId);
            if (quest?.role === 'player' && progress.status === 'active') {
                return { progress, quest };
            }
        }

        return null;
    }, [isGamerScene, unrealBridge.questProgress]);
    const activeSceneQuestText = activeSceneQuest ? getQuestText(activeSceneQuest.quest, language) : null;
    const activeSceneQuestPercent = activeSceneQuest ? getQuestCompletionPercent(activeSceneQuest.progress) : 0;
    const activeSceneQuestNextObjective = activeSceneQuest
        ? Object.entries(activeSceneQuest.progress.objectives).find(([, objective]) => !objective.completed)
        : null;
    const sceneLocationLabel = sceneHud.locations[unrealBridge.currentLocation] ?? unrealBridge.currentLocation;
    const zombieCoinsPreview = unrealBridge.zombieCoins || Math.floor(unrealBridge.zombieScore / GAME_RULES.zombieArena.zombieKillPoints) * GAME_RULES.zombieArena.coinsPerKill;
    const latestPlayerReward = useMemo(
        () => [...unrealBridge.questRewards]
            .reverse()
            .find((reward) => getQuestDefinition(reward.questId)?.role === 'player') ?? null,
        [unrealBridge.questRewards]
    );
    const latestPlayerRewardQuest = latestPlayerReward ? getQuestDefinition(latestPlayerReward.questId) : null;
    const latestPlayerRewardQuestText = latestPlayerRewardQuest ? getQuestText(latestPlayerRewardQuest, language) : null;

    useEffect(() => {
        if (!hasStartedExperience || !isGamerScene || !latestPlayerReward) return;
        if (seenRewardTerminalRewardId === latestPlayerReward.id) return;

        setSeenRewardTerminalRewardId(latestPlayerReward.id);
        setIsRewardTerminalOpen(true);
    }, [hasStartedExperience, isGamerScene, latestPlayerReward, seenRewardTerminalRewardId]);

    const handleClosePavilionExposition = useCallback(() => {
        _suppressProductSelectionUntil = Date.now() + 3000;
        setActivePavilion(null);
        // Mirror handleCloseProductCard: fire X so the Unreal blueprint leaves
        // inspection/pavilion-focus mode and re-enables player input.
        sendUnrealExitFocus();
        setNeedsPointerResume(true);
    }, [sendUnrealExitFocus]);

    return (
        <div className="relative h-screen w-screen bg-gray-900 overflow-hidden font-sans">
            {/* Video Container (Pixel Streaming) */}
            <div id="player-container" className="absolute inset-0 z-0">
                {isFastViewRoute ? (
                    <StreamPixelPlayer
                        appId={fastViewAppId}
                        onPixelStreamingResponse={handlePixelStreamingResponse}
                        onVideoInitialized={setVideoElement}
                        onConnectionError={setFastViewError}
                        mobileInputMode={isMobile ? mobileInputMode : 'joystick'}
                        isMobileDevice={isMobile}
                        keyboardInputEnabled={!isChatFocused}
                        blockedKeyboardCodes={BLOCKED_UNREAL_KEY_CODES}
                        mouseSensitivity={mouseSensitivity}
                    />
                ) : (
                    <>
                        {/* Default to UE Pixel Streaming signaling server on loopback: ws://127.0.0.1 */}
                        <PixelStreamingPlayer
                            signalingServerUrl={signalingServerUrl}
                            onPixelStreamingResponse={handlePixelStreamingResponse}
                            onVideoInitialized={setVideoElement}
                            mobileInputMode={isMobile ? mobileInputMode : 'joystick'}
                            isMobileDevice={isMobile}
                            keyboardInputEnabled={!isChatFocused}
                            blockedKeyboardCodes={BLOCKED_UNREAL_KEY_CODES}
                            mouseSensitivity={mouseSensitivity}
                        />
                    </>
                )}
            </div>

            {showFastViewCutscene && (
                <div
                    className={`absolute inset-0 z-[130] bg-[#05070b] transition-opacity duration-700 ${
                        isFastViewCutsceneExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    onClick={hasStartedFastViewCutscene ? undefined : handleStartFastViewCutscene}
                >
                    <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden sm:top-20">
                        <video
                            ref={fastViewCutsceneVideoRef}
                            className={`h-full w-full object-cover transition-[filter,transform] duration-700 ${
                                hasEndedFastViewCutscene && !isVideoStreamingFrames ? 'scale-[1.01] brightness-75' : ''
                            }`}
                            key={sferaHallCutsceneSrc}
                            src={sferaHallCutsceneSrc}
                            data-cutscene-video="true"
                            muted={!hasStartedFastViewCutscene}
                            playsInline
                            preload="auto"
                            onEnded={handleCompleteFastViewCutscene}
                            onError={handleCompleteFastViewCutscene}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),transparent_26%,rgba(0,0,0,0.16))]" />
                    </div>

                    <header className="absolute inset-x-0 top-0 z-20 border-b border-[#66d9cb]/20 bg-[#02070b]/[0.82] shadow-[0_10px_40px_rgba(0,0,0,0.32)] backdrop-blur-md">
                        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-slate-950/45 px-3 py-2 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.16)] backdrop-blur-md"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-sm font-black text-cyan-200">S</span><span className="text-sm font-black uppercase tracking-[0.18em]">3DSFERA</span></div>
                                </div>
                                <div className="mt-1 hidden w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300 sm:flex">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                                    {ui.statusOnline}
                                </div>
                            </div>

                            <p className="hidden max-w-[34rem] text-center text-[10px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-[#9fcfdf] md:block">
                                {sceneInstruction}
                            </p>

                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleSkipFastViewCutscene();
                                }}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/30 hover:bg-white/[0.14] sm:h-11 sm:px-4"
                                aria-label={cutsceneCopy.skip}
                            >
                                <X className="h-4 w-4" />
                                <span className="hidden sm:inline">{cutsceneCopy.skip}</span>
                            </button>
                        </div>
                    </header>

                    {!hasStartedFastViewCutscene && (
                        <div className="absolute inset-x-4 bottom-0 top-16 z-10 flex items-center justify-center sm:top-20">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleStartFastViewCutscene();
                                }}
                                className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl border border-[#66d9cb]/35 bg-black/55 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/[0.16] sm:px-6"
                            >
                                <Play className="h-4 w-4 shrink-0 text-[#66d9cb]" />
                                <span className="truncate">{cutsceneCopy.pressAnyKey}</span>
                                <Volume2 className="h-4 w-4 shrink-0 text-[#66d9cb]" />
                            </button>
                            <p className="mt-3 max-w-md text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300/80">{cutsceneCopy.soundHint}</p>
                        </div>
                    )}

                    {hasEndedFastViewCutscene && !isVideoStreamingFrames && (
                        <div className="pointer-events-none absolute inset-x-4 bottom-5 z-10 flex justify-center sm:bottom-6">
                            <div className="flex max-w-full items-center gap-3 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 shadow-[0_14px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
                                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#66d9cb] shadow-[0_0_10px_rgba(102,217,203,0.85)]" />
                                <span className="truncate">{fastViewLaunch.connectingCta}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isSferaHallCutsceneVisible && showExperienceHud && (
                <div className="absolute inset-0 z-[125] bg-[#05070b]">
                    <video
                        ref={sferaHallCutsceneVideoRef}
                        className="h-full w-full object-cover"
                        key={sferaHallCutsceneSrc}
                        src={sferaHallCutsceneSrc}
                        data-cutscene-video="true"
                        autoPlay
                        muted={!hasStartedSferaHallCutsceneSound}
                        playsInline
                        preload="auto"
                        onEnded={() => setIsSferaHallCutsceneVisible(false)}
                        onError={() => setIsSferaHallCutsceneVisible(false)}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.25),transparent_34%,rgba(0,0,0,0.62))]" />
                    {!hasStartedSferaHallCutsceneSound && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center px-4" onClick={handleStartSferaHallCutsceneWithSound}>
                            <button type="button" className="rounded-3xl border border-[#66d9cb]/35 bg-black/60 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_22px_80px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:border-[#66d9cb]/65 hover:bg-[#66d9cb]/15">
                                <span className="block text-[#9ff4ec]">{cutsceneCopy.pressAnyKey}</span>
                                <span className="mt-2 block text-[11px] font-semibold text-slate-300">{cutsceneCopy.soundHint}</span>
                            </button>
                        </div>
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 border-b border-[#66d9cb]/20 bg-[#02070b]/[0.82] px-4 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.32)] backdrop-blur-md sm:px-6 lg:px-8">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-slate-950/45 px-3 py-2 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.16)] backdrop-blur-md"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-sm font-black text-cyan-200">S</span><span className="text-sm font-black uppercase tracking-[0.18em]">3DSFERA Hall</span></div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleStartSferaHallCutsceneWithSound}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#66d9cb]/30 bg-[#66d9cb]/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/[0.18] sm:px-4"
                            >
                                <Volume2 className="h-4 w-4" />
                                <span className="hidden sm:inline">{cutsceneCopy.startWithSound}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSferaHallCutsceneVisible(false)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/30 hover:bg-white/[0.14] sm:px-4"
                                aria-label={cutsceneCopy.skip}
                            >
                                <X className="h-4 w-4" />
                                <span className="hidden sm:inline">{cutsceneCopy.skip}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {frontendCinematic && showExperienceHud && (
                <div className="pointer-events-none absolute inset-0 z-[90] flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(102,217,203,0.18),rgba(2,6,23,0.76)_52%,rgba(2,6,23,0.92))] px-6 backdrop-blur-sm">
                    <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#66d9cb]/30 bg-slate-950/82 p-6 text-center text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#66d9cb] to-transparent animate-[shimmer_1.4s_linear_infinite]" />
                        <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#66d9cb]">{frontendCinematic.eyebrow}</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">{frontendCinematic.title}</h2>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">{frontendCinematic.description}</p>
                        <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border border-[#66d9cb]/30 bg-[#66d9cb]/10 shadow-[0_0_50px_rgba(102,217,203,0.25)]">
                            <span className="h-12 w-12 animate-pulse rounded-full bg-[#66d9cb]/30 shadow-[0_0_35px_rgba(102,217,203,0.7)]" />
                        </div>
                        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Destination</p>
                            <p className="mt-1 text-lg font-semibold text-white">{frontendCinematic.destinationLabel}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* FastView launch overlay */}
            {showFastViewLaunchOverlay && (
                // Scrollable container — on small phones the welcome panel
                // is taller than the viewport, so we need overflow-y-auto on
                // the wrapper. items-start (instead of items-center) keeps
                // the panel anchored to the top so the user can scroll down
                // through the controls + pedestal hint.
                <div className="absolute inset-0 z-[120] flex items-start sm:items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(102,217,203,0.16),transparent_42%),linear-gradient(160deg,rgba(3,8,14,0.92),rgba(6,13,24,0.78))] px-4 py-6">
                    {/* Ambient animated glows behind the panel */}
                    <div className="pointer-events-none absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-[#66d9cb]/10 blur-[120px] drift" />
                    <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/5 blur-[120px] drift" />

                    <div className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,rgba(5,10,18,0.94),rgba(10,18,31,0.86))] shadow-[0_32px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#66d9cb]">
                                {fastViewLaunch.eyebrow}
                            </p>
                            {!fastViewError && (
                                <div className="flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${canEnterFastView ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                                        {canEnterFastView ? 'READY' : 'CONNECTING'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-6 sm:px-8 sm:py-8">
                            {fastViewError ? (
                                <>
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 h-11 w-11 shrink-0 rounded-2xl border border-amber-300/45 bg-amber-400/10 shadow-[0_0_30px_rgba(251,191,36,0.22)]" />
                                        <div>
                                            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                                                {fastViewLaunchTitle}
                                            </h2>
                                            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300 sm:text-[15px]">
                                                {fastViewLaunchDescription}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                                            {fastViewLaunch.errorTitle}
                                        </p>
                                        <p className="mt-2 break-words text-amber-50/90">{fastViewError}</p>
                                    </div>
                                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={handleReloadPage}
                                            className="inline-flex items-center justify-center rounded-2xl bg-[#66d9cb] px-5 py-3 text-sm font-semibold text-[#04110f] transition hover:bg-[#84e7dd]"
                                        >
                                            {fastViewLaunch.retryCta}
                                        </button>
                                        <Link
                                            href="/"
                                            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                        >
                                            {returnHomeLabel}
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <WelcomeControls
                                        title={fastViewLaunchTitle}
                                        subtitle={fastViewLaunchDescription}
                                        progress={canEnterFastView ? 1 : null}
                                    />

                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={handleStartExperience}
                                            disabled={!canEnterFastView}
                                            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#66d9cb] px-5 py-3 text-sm font-semibold text-[#04110f] transition hover:bg-[#84e7dd] disabled:cursor-wait disabled:bg-[#66d9cb]/40 disabled:text-[#04110f]/70"
                                        >
                                            {canEnterFastView ? fastViewLaunch.enterCta : fastViewLaunch.connectingCta}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
            </div>
            )}

            {!isFastViewRoute && videoElement && !hasStartedExperience && (
                <div
                    className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] cursor-pointer pointer-events-auto transition-opacity duration-1000"
                    onClick={handleStartExperience}
                >
                    <div className="text-center animate-pulse">
                        <div className="text-white text-xl md:text-2xl font-light tracking-[0.2em] uppercase">{ui.tapToStart}</div>
                    </div>
                </div>
            )}

            {/* Post-click transition: launch overlay is gone but UE hasn't
                produced a real video frame yet, so the viewport would be
                black. Keep a branded animated cover up until isVideoStreamingFrames
                flips. Fades out smoothly once frames arrive. */}
            {isFastViewRoute && hasStartedExperience && !fastViewError && (
                <div
                    className={`absolute inset-0 z-[115] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(102,217,203,0.16),transparent_42%),linear-gradient(160deg,rgba(3,8,14,0.96),rgba(6,13,24,0.92))] transition-opacity duration-700 ${isVideoStreamingFrames ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-none'}`}
                    aria-hidden={isVideoStreamingFrames}
                >
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative h-16 w-16">
                            <span className="absolute inset-0 rounded-2xl border border-[#66d9cb]/40 animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                            <span className="absolute inset-1 rounded-xl border border-[#66d9cb]/60" />
                            <span className="absolute inset-0 rounded-2xl bg-[#66d9cb]/10 shadow-[0_0_40px_rgba(102,217,203,0.35)]" />
                            <span className="absolute inset-[30%] rounded-full bg-[#66d9cb] shadow-[0_0_20px_rgba(102,217,203,0.8)] animate-pulse" />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-mono uppercase tracking-[0.2em] text-slate-300 animate-pulse">
                                {fastViewLaunch.connectingCta}
                            </div>
                        </div>
                        <div className="relative h-1 w-48 overflow-hidden rounded-full bg-white/5">
                            <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#66d9cb] to-transparent animate-[shimmer_1.4s_linear_infinite]" />
                        </div>
                    </div>
                </div>
            )}

            {/* Click-to-Resume Overlay.
                Epic PS: pointer-events-auto catches click, manually re-locks.
                FastView: pointer-events-none — click passes to SDK for re-lock,
                suppression blocks UE product selection, overlay auto-hides on
                pointerlockchange. */}
            {needsPointerResume && hasStartedExperience && !activeProduct && (
                <div
                    className={`absolute inset-0 z-[5] ${isFastViewRoute ? 'pointer-events-none' : 'cursor-pointer pointer-events-auto'}`}
                    onClick={isFastViewRoute ? undefined : handleResumePointer}
                >
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 animate-pulse">
                        <span className="text-xs font-mono text-gray-300 uppercase tracking-[0.16em]">{ui.clickToResume}</span>
                    </div>
                </div>
            )}

            {showExperienceHud && unrealBridge.currentGame === 'ZombieArena' && unrealBridge.arenaMoments.length > 0 && (
                <div className="pointer-events-none absolute right-4 top-32 z-40 flex w-[min(92vw,22rem)] flex-col gap-2 md:right-6 md:top-40">
                    {unrealBridge.arenaMoments.slice(0, 3).map((moment) => (
                        <div key={moment.id} className="rounded-2xl border border-[#66d9cb]/25 bg-slate-950/78 p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
                            <div className="flex items-start gap-3">
                                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#66d9cb] shadow-[0_0_14px_rgba(102,217,203,0.9)]" />
                                <div>
                                    <p className="text-sm font-bold">{moment.title}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-300">{moment.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* StreamPixel Live Preview Overlay */}
            {!isFastViewRoute && isStreamPixelOpen && (
                <div className="absolute inset-0 z-[200] flex flex-col bg-black">
                    <div className="flex items-center justify-between px-4 py-3 bg-black/90 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Monitor size={16} className="text-[#66d9cb]" />
                            <span className="text-sm font-semibold text-white uppercase tracking-wider">{ui.livePreview}</span>
                        </div>
                        <button
                            onClick={() => setIsStreamPixelOpen(false)}
                            className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:border-white/25 hover:bg-white/10"
                        >
                            <X size={16} className="text-gray-300" />
                        </button>
                    </div>
                    <iframe
                        src={streamPixelPreviewUrl}
                        className="flex-1 w-full border-0"
                        allow="autoplay; fullscreen; microphone; camera; clipboard-write"
                        allowFullScreen
                    />
                </div>
            )}

            {/* Overlay UI (Z-Index 10) */}
            {showExperienceHud && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {/* UE in-viewport debug banners ("LIGHTING NEEDS TO BE REBUILT",
                        "REFLECTION CAPTURES NEED TO BE REBUILT") are painted by the
                        engine into the streamed video frames and cannot be disabled
                        from web without a blueprint change or a server-side
                        -PixelStreamingAllowConsoleCommands launch arg. We mask them
                        with a branded frosted panel in the top-left corner that
                        fades into the video. Pointer-events off so it never steals
                        clicks. z-[2] sits above video (z-0) but below the header
                        (z-50), so the 3DSFERA logo remains crisp on top. */}
                    <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 pointer-events-none z-[2] w-[clamp(22rem,48vw,56rem)] h-[clamp(6rem,14vh,10rem)] backdrop-blur-md"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(3,8,14,0.97) 0%, rgba(4,10,18,0.9) 45%, rgba(6,13,24,0.55) 75%, rgba(6,13,24,0) 100%)',
                            maskImage:
                                'linear-gradient(135deg, black 0%, black 50%, rgba(0,0,0,0.4) 80%, transparent 100%)',
                            WebkitMaskImage:
                                'linear-gradient(135deg, black 0%, black 50%, rgba(0,0,0,0.4) 80%, transparent 100%)',
                        }}
                    />

                    <MarketplaceCrosshair />
                    {shouldShowPlayerModePrompt && (
                        <div className="absolute left-1/2 top-1/2 z-[70] w-[min(calc(100vw-2rem),26rem)] -translate-x-1/2 -translate-y-1/2 pointer-events-auto" role="dialog" aria-live="assertive" aria-label={sceneHud.playerModeRequired}>
                            <div className="rounded-3xl border border-amber-300/35 bg-slate-950/90 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">{sceneHud.playerModeRequired}</p>
                                <p className="mt-3 text-sm leading-6 text-slate-200">{sceneHud.playerModeRequiredBody}</p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPlayerModePromptDismissed(true)}
                                        className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/10"
                                    >
                                        {sceneHud.cancel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSwitchToPlayerMode}
                                        className="rounded-2xl bg-[linear-gradient(135deg,#66d9cb,#d9fff9)] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:scale-[1.01]"
                                    >
                                        {sceneHud.switchMode}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col h-full justify-between p-3 md:p-4 lg:p-5">

                    {/* Header */}
                    <header className="flex justify-between items-start pointer-events-none w-full z-50">
                        <div className="group cursor-default">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/38 px-2.5 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md">
                                    <BrandLogo size="sm" imageClassName="h-6 w-[8.75rem]" />
                                </div>
                            </div>

                            {/* System Status Indicator */}
                            <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-black/35 border border-white/5 rounded-full w-fit backdrop-blur-md">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">{ui.statusOnline}</span>
                            </div>

                            <div className="mt-2 grid w-fit max-w-[min(92vw,22rem)] gap-2 rounded-xl border border-white/10 bg-black/30 p-2 text-[11px] text-slate-200 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-[#66d9cb]/15 px-3 py-1 font-semibold text-[#66d9cb]">
                                        {effectiveSceneMode === 'player' ? sceneHud.playerMode : sceneHud.shopperMode}
                                    </span>
                                    <span className="rounded-full border border-white/10 px-3 py-1">{sceneHud.location}: {sceneLocationLabel}</span>
                                    {unrealBridge.currentGame && <span className="rounded-full border border-white/10 px-3 py-1">{sceneHud.game}: {unrealBridge.currentGame}</span>}
                                </div>
                                {unrealBridge.currentGame === 'ZombieArena' && (
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-lg bg-white/[0.07] p-2"><span className="block text-[9px] uppercase text-slate-400">{sceneHud.score}</span><strong>{unrealBridge.zombieScore}</strong></div>
                                        <div className="rounded-lg bg-white/[0.07] p-2"><span className="block text-[9px] uppercase text-slate-400">{sceneHud.health}</span><strong>{unrealBridge.zombieHealth}</strong></div>
                                        <div className="rounded-lg bg-white/[0.07] p-2"><span className="block text-[9px] uppercase text-slate-400">{sceneHud.coins}</span><strong>{zombieCoinsPreview}</strong></div>
                                        <div className="rounded-lg bg-amber-300/12 p-2"><span className="block text-[9px] uppercase text-amber-100">{sceneHud.combo}</span><strong>{unrealBridge.zombieCombo}x</strong></div>
                                        <div className="rounded-lg bg-white/[0.07] p-2"><span className="block text-[9px] uppercase text-slate-400">{sceneHud.rank}</span><strong>{unrealBridge.zombieRank}</strong></div>
                                        <div className="rounded-lg bg-white/[0.07] p-2"><span className="block text-[9px] uppercase text-slate-400">{sceneHud.threat}</span><strong>{unrealBridge.zombieThreatLevel}</strong></div>
                                    </div>
                                )}
                                {unrealBridge.zombieGameOver && <p className="text-red-300">{sceneHud.overwhelmed}</p>}

                                {unrealBridge.currentLocation !== 'city' && (
                                    <div>
                                        <button type="button" className="rounded-full border border-white/15 px-3 py-1 font-semibold text-white/90">{sceneHud.backToCity}</button>
                                        <p className="mt-1 text-[10px] text-slate-400">{sceneHud.returnPortalHint}</p>
                                    </div>
                                )}
                            </div>
                            {isGamerScene && activeSceneQuest && (
                                <div className="sfera-guide-enter mt-2 w-[min(92vw,22rem)] rounded-xl border border-cyan-300/18 bg-[#041018]/70 px-3 py-2.5 text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.28)] backdrop-blur-md">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100">{sceneHud.guideTitle}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-300">{sceneHud.guideBody}</p>
                                    <div className="mt-2 grid gap-1.5">
                                        {sceneHud.guideSteps.map((step, index) => (
                                            <div key={step} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1.5">
                                                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-[10px] font-black text-cyan-100">
                                                    {index + 1}
                                                </span>
                                                <span className="min-w-0 truncate text-[11px] font-semibold text-slate-200">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activeSceneQuest && activeSceneQuestText && (
                                <div className="sfera-quest-glow mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-amber-300/24 bg-[linear-gradient(145deg,rgba(7,10,15,0.82),rgba(18,14,8,0.58))] text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.36)] backdrop-blur-md">
                                    <div className="flex items-center justify-between gap-3 border-b border-amber-300/10 bg-amber-300/[0.04] px-3 py-2.5">
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200">{sceneHud.quest}</p>
                                            <h2 className="mt-0.5 truncate text-sm font-black leading-tight text-white">{activeSceneQuestText.title}</h2>
                                            {activeSceneQuestText.sponsor && (
                                                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
                                                    {activeSceneQuestText.sponsor}
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-amber-300/22 bg-black/32">
                                            <span className="font-mono text-xs font-black text-amber-100">{activeSceneQuestPercent}%</span>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2.5">
                                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#f5c766,#66d9cb)] shadow-[0_0_18px_rgba(245,199,102,0.5)]" style={{ width: `${activeSceneQuestPercent}%` }} />
                                        </div>
                                        {activeSceneQuestNextObjective && (
                                            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-100/78">{sceneHud.nextObjective}</p>
                                                <p className="mt-1 truncate text-xs font-semibold leading-5 text-white">
                                                    {getQuestObjectiveText(activeSceneQuest.quest, activeSceneQuestNextObjective[0], language)}
                                                    <span className="ml-2 font-mono text-xs text-white/45">
                                                        {activeSceneQuestNextObjective[1].current}/{activeSceneQuestNextObjective[1].target}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                        <div className="hidden">
                                            {Object.entries(activeSceneQuest.progress.objectives).map(([objectiveId, objective], index) => (
                                                <div key={objectiveId} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-xs">
                                                    <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black ${
                                                        objective.completed
                                                            ? 'border-[#66d9cb]/70 bg-[#66d9cb]/20 text-[#9ff4ec]'
                                                            : 'border-white/15 bg-white/[0.035] text-white/45'
                                                    }`}>
                                                        {objective.completed ? '✓' : index + 1}
                                                    </span>
                                                    <span className={`min-w-0 truncate ${objective.completed ? 'text-white/70 line-through decoration-white/30' : 'text-slate-200'}`}>
                                                        {getQuestObjectiveText(activeSceneQuest.quest, objectiveId, language)}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-white/38">{objective.current}/{objective.target}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 truncate rounded-lg border border-amber-300/16 bg-amber-300/[0.06] px-2.5 py-1.5 text-[10px] leading-5 text-amber-50">
                                            <span className="font-black uppercase tracking-[0.14em] text-amber-200">{sceneHud.reward}: </span>
                                            {getQuestRewardText(activeSceneQuest.quest.reward, activeSceneQuest.quest.id, language)}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {latestPlayerReward && latestPlayerRewardQuestText && (
                                <button
                                    type="button"
                                    onClick={() => setIsRewardTerminalOpen(true)}
                                    className="sfera-reward-pop mt-2 flex w-[min(92vw,22rem)] items-center gap-3 rounded-xl border border-emerald-300/24 bg-[#03100d]/72 px-3 py-2.5 text-left text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-md transition hover:border-emerald-200/45 hover:bg-emerald-300/[0.08]"
                                >
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-emerald-300/24 bg-emerald-300/10 text-emerald-100">
                                        <Gift className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100">{sceneHud.questComplete}</span>
                                        <span className="mt-0.5 block truncate text-sm font-black text-white">{getQuestRewardText(latestPlayerReward, latestPlayerReward.questId, language)}</span>
                                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">{latestPlayerRewardQuestText.title}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full border border-emerald-300/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100">
                                        {sceneHud.openTerminal}
                                    </span>
                                </button>
                            )}
                            {showLiveActivityToasts && (
                                <div className="mt-2 flex w-[min(92vw,22rem)] flex-col gap-1.5" aria-live="polite">
                                    {liveActivityToasts.map((toast, index) => (
                                        <div
                                            key={toast.id}
                                            className={`overflow-hidden rounded-xl border border-white/10 bg-[#03080e]/64 px-3 py-2.5 text-white shadow-[0_16px_46px_rgba(0,0,0,0.28)] backdrop-blur-md transition ${
                                                index > 1 ? 'hidden md:block' : ''
                                            }`}
                                            style={{ opacity: Math.max(0.68, 1 - index * 0.14) }}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Activity className="h-3.5 w-3.5 shrink-0 text-[#66d9cb]" />
                                                    <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[#9fcfdf]">
                                                        {liveActivityLabel}
                                                    </span>
                                                </div>
                                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                                                    {liveActivityNowLabel}
                                                </span>
                                            </div>
                                            <div className="mt-1.5 flex items-start gap-2.5">
                                                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${LIVE_ACTIVITY_ACCENTS[toast.kind]}`} />
                                                <p className="min-w-0 text-xs font-medium leading-5 text-slate-100">
                                                    {toast.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-start gap-3 pointer-events-auto">
                            <p className="hidden max-w-[34rem] pt-1 text-right text-[10px] uppercase tracking-[0.14em] text-[#9fcfdf] md:block">
                                {sceneInstruction}
                            </p>

                            <button
                                onClick={toggleChatPanel}
                                className="group relative px-4 py-2 bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/5 rounded-lg transition overflow-hidden"
                            >
                                <span className="text-[10px] font-mono text-gray-400 group-hover:text-emerald-300 uppercase tracking-wider transition">
                                    {isChatPanelOpen ? ui.chatToggleHide : ui.chatToggleShow}
                                </span>
                            </button>

                            {/* Sensitivity Slider */}
                            <SensitivitySlider value={mouseSensitivity} onChange={handleSensitivityChange} />

                            {/* Menu Button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="group relative p-3 bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/5 rounded-full transition overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition duration-300" />
                                {isMenuOpen ? <X size={20} className="text-white relative z-10" /> : <Menu size={20} className="text-white relative z-10" />}
                            </button>
                        </div>
                    </header>

                    {/* Side Menu (Conditional). Products/About-Supplier removed —
                        they weren't wired to anything and confused visitors. */}
                    {isMenuOpen && (
                        <div className="absolute top-24 right-6 pointer-events-auto w-64 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-2 animate-in slide-in-from-right-10 fade-in duration-200">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">{ui.menuNavigation}</div>
                            {!isFastViewRoute && (
                                <button
                                    onClick={() => { setIsStreamPixelOpen(true); setIsMenuOpen(false); }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#66d9cb] hover:bg-[#66d9cb]/10 transition flex items-center gap-2"
                                >
                                    <Monitor size={16} /> {ui.livePreview}
                                </button>
                            )}
                            {shouldShowSupplierLogin && (
                                <a href="/login?role=supplier" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-[#66d9cb] hover:bg-[#66d9cb]/10 transition">
                                    {ui.menuLogin}
                                </a>
                            )}
                            {viewerEmail && (
                                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                                    <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                        {accountLabel}
                                    </span>
                                    <span className="mt-1 block break-all text-sm text-white">
                                        {viewerEmail}
                                    </span>
                                </div>
                            )}
                            {viewerEmail && (
                                <button
                                    onClick={() => void handleSignOut()}
                                    disabled={isSigningOut}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-amber-200 hover:bg-amber-500/10 transition disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {accountSignOutLabel}
                                </button>
                            )}
                            <div className="h-px bg-white/10 my-2"></div>
                            <Link href="/roles?returnTo=/fastview" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-[#66d9cb] hover:bg-[#66d9cb]/10 transition">
                                {sceneHud.roleSelection}
                            </Link>
                            {shouldPromptPlayerLogin ? (
                                <Link href={activeSceneDashboardLoginHref} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/10 transition">
                                    {activeSceneDashboardLabel}
                                </Link>
                            ) : (
                                <button type="button" onClick={() => { setDashboardOverlay(activeSceneDashboard); setIsMenuOpen(false); }} disabled={activeSceneDashboard === 'player' && isViewerSessionLoading} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/10 transition disabled:cursor-wait disabled:opacity-50">
                                    {activeSceneDashboardLabel}
                                </button>
                            )}
                            <button type="button" onClick={() => { setDashboardOverlay(null); setIsMenuOpen(false); router.replace('/fastview?resume=scene', { scroll: false }); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-[#66d9cb] hover:bg-[#66d9cb]/10 transition">
                                {backToSceneLabel}
                            </button>
                        </div>
                    )}


                    {dashboardOverlay && (
                        <div className="absolute inset-0 z-[85] overflow-y-auto bg-[#02060b]/76 p-2 text-white backdrop-blur-sm pointer-events-auto md:p-5" role="dialog" aria-modal="true" aria-label="Dashboard overlay">
                            <div className="sticky top-3 z-10 mx-auto mb-3 flex max-w-6xl justify-end">
                                <button
                                    type="button"
                                    onClick={() => setDashboardOverlay(null)}
                                    className="rounded-full border border-white/15 bg-black/68 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white shadow-xl backdrop-blur-md transition hover:border-[#66d9cb]/45 hover:text-[#9ff4ec]"
                                >
                                    {cutsceneCopy.closeMenu}
                                </button>
                            </div>
                            <div className="mx-auto max-w-6xl pb-6">
                                {dashboardOverlay === 'player' && <GamerDashboard embedded bridge={unrealBridge} />}
                                {dashboardOverlay === 'shopper' && <ShopperDashboard embedded bridge={unrealBridge} />}
                                {dashboardOverlay === 'business' && <SupplierDashboard embedded />}
                            </div>
                        </div>
                    )}

                    {isRewardTerminalOpen && latestPlayerReward && (
                        <div className="absolute inset-0 z-[90] grid place-items-center bg-[#02060b]/72 p-4 text-white backdrop-blur-sm pointer-events-auto" role="dialog" aria-modal="true" aria-label={sceneHud.rewardTerminal}>
                            <section className="sfera-reward-pop relative w-[min(100%,32rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0a1018]/96 shadow-[0_34px_120px_rgba(0,0,0,0.55)]">
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(102,217,203,0.18),transparent_34%),radial-gradient(circle_at_12%_100%,rgba(245,199,102,0.16),transparent_30%)]" />
                                <div className="relative border-b border-white/10 p-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsRewardTerminalOpen(false)}
                                        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/25 text-slate-300 transition hover:border-white/25 hover:text-white"
                                        aria-label={cutsceneCopy.closeMenu}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    <div className="flex items-center gap-3 pr-10">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                                            <WalletCards className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">{sceneHud.rewardTerminal}</p>
                                            <h2 className="mt-1 text-xl font-black leading-tight text-white">{sceneHud.earnedReward}</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative grid gap-3 p-4">
                                    <div className="rounded-xl border border-emerald-300/16 bg-emerald-300/[0.06] p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">{sceneHud.questComplete}</p>
                                        <p className="mt-1 text-base font-black text-white">{getQuestRewardText(latestPlayerReward, latestPlayerReward.questId, language)}</p>
                                        <p className="mt-1 text-sm text-slate-400">{latestPlayerRewardQuestText?.title ?? latestPlayerReward.questId}</p>
                                    </div>

                                    <div className="rounded-xl border border-rose-300/16 bg-rose-300/[0.055] p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-black text-white">{sceneHud.withdrawalUnavailable}</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-300">{sceneHud.withdrawalMessage}</p>
                                            </div>
                                            <span className="shrink-0 rounded-full border border-rose-300/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-100">
                                                {sceneHud.unavailable}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-amber-300/16 bg-amber-300/[0.055] p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-black text-white">{sceneHud.giftCodePending}</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-300">{sceneHud.giftCodeMessage}</p>
                                            </div>
                                            <Gift className="h-5 w-5 shrink-0 text-amber-100" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Product Card Overlay */}
                    {activeProduct && !isCatalogueOpen && (
                        <div className="pointer-events-none">
                            <ProductCard
                                product={localizedActiveProduct ?? activeProduct}
                                supplier={activeSupplier}
                                onClose={handleCloseProductCard}
                                onAddToCart={() => {
                                    emitQuestEvent({
                                        event: 'product_saved',
                                        productId: activeProduct.id,
                                        supplierId: activeProduct.supplierId,
                                    });
                                    alert(
                                        ui.addToCart(
                                            localizedActiveProduct?.name ?? activeProduct.name
                                        )
                                    );
                                }}
                                onChatWithSupplier={handleChatWithSupplier}
                                onViewCatalogue={handleViewCatalogue}
                            />
                        </div>
                    )}

                    {/* Pavilion Exposition Overlay (fires on entered_pavilion:<id>) */}
                    {activePavilion && (
                        <PavilionExposition
                            pavilion={activePavilion}
                            onClose={handleClosePavilionExposition}
                            onQuestEvent={emitQuestEvent}
                        />
                    )}

                    {/* Catalogue Overlay */}
                    {isCatalogueOpen && activeSupplier && (
                        <CatalogueOverlay
                            supplier={activeSupplier}
                            products={localizedCatalogueProducts}
                            onClose={() => setIsCatalogueOpen(false)}
                            onSelectProduct={(product) => {
                                setActiveProduct(product);
                                setActiveSupplier(getSupplierById(product.supplierId));
                                emitQuestEvent({
                                    event: 'product_viewed',
                                    productId: product.id,
                                    supplierId: product.supplierId,
                                    productName: product.name,
                                });
                                setIsCatalogueOpen(false); // Close catalogue and show product card
                            }}
                        />
                    )}

                    {/* Chat / Interaction Area */}
                    <div className="flex justify-end pointer-events-none gap-3">
                        {/* Chat Box */}
                        {isChatPanelOpen && (
                            <div className={`pointer-events-auto w-full md:max-w-lg rounded-2xl border border-[#66d9cb]/30 bg-[linear-gradient(160deg,rgba(5,10,18,0.9),rgba(12,18,28,0.82))] p-4 text-white shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl ${isMobile ? 'max-w-[min(92vw,560px)] mx-auto' : ''} ${usingMobileJoysticks ? 'mb-28' : ''}`}>
                                <div className="mb-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#66d9cb]">{chatTitle}</p>
                                        <button
                                            onClick={closeChatPanel}
                                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-white/35 bg-white/10 px-2 text-white transition hover:bg-white/20"
                                            aria-label={ui.close}
                                            title={ui.close}
                                        >
                                            <X size={12} />
                                            <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-wider">{ui.close}</span>
                                        </button>
                                    </div>
                                    <div>
                                        <p className="mt-1 text-xs text-[#bbc6d4]">
                                            {chatSubtitle}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                onClick={() => setChatMode('ai')}
                                                className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${chatMode === 'ai'
                                                    ? 'border-[#66d9cb]/50 bg-[#66d9cb]/20 text-[#66d9cb]'
                                                    : 'border-white/15 text-gray-300 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                AI
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!activeSupplierId) return;
                                                    setChatMode('supplier');
                                                    void syncSupplierMessages();
                                                }}
                                                disabled={!activeSupplierId}
                                                className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${chatMode === 'supplier'
                                                    ? 'border-[#66d9cb]/50 bg-[#66d9cb]/20 text-[#66d9cb]'
                                                    : 'border-white/15 text-gray-300 hover:bg-white/10 hover:text-white'
                                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                            >
                                                {ui.menuSupplier}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div ref={chatFeedRef} className="mb-3 h-36 space-y-3 overflow-y-auto pr-1 md:h-56">
                                    {chatMessages.map((message) => (
                                        <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {message.role !== 'user' && (
                                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold tracking-wide ${message.role === 'supplier'
                                                    ? 'border-indigo-300/35 bg-indigo-300/15 text-indigo-200'
                                                    : 'border-[#66d9cb]/35 bg-[#66d9cb]/15 text-[#66d9cb]'
                                                    }`}>
                                                    {message.role === 'supplier' ? 'SUP' : 'AI'}
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-[84%] rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === 'assistant'
                                                    ? 'rounded-tl-none border border-[#66d9cb]/20 bg-black/35 text-gray-100'
                                                    : message.role === 'supplier'
                                                        ? 'rounded-tl-none border border-indigo-300/30 bg-indigo-400/15 text-indigo-100'
                                                        : 'rounded-tr-none bg-[#66d9cb] font-semibold text-[#03100f]'
                                                    }`}
                                            >
                                                <TranslatableText
                                                    text={message.text}
                                                    tone={message.role === 'user' ? 'onLight' : 'onDark'}
                                                    hideAction={message.id.startsWith('user-') || message.id.startsWith('assistant-')}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {isSendingChat && (
                                        <div className="flex items-center gap-2 text-xs text-[#9db1c7]">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#66d9cb]" />
                                            {isSupplierMode ? ui.menuSupplier : ui.typing}
                                        </div>
                                    )}
                                    {!isSendingChat && isSupplierMode && isSyncingSupplierChat && (
                                        <div className="flex items-center gap-2 text-xs text-[#9db1c7]">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300" />
                                            Syncing supplier chat...
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={sendMessage} className="relative">
                                    <div className="relative flex items-center gap-2 rounded-xl border border-[#66d9cb]/20 bg-black/30 p-1 transition focus-within:ring-2 focus-within:ring-[#66d9cb]/40">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onFocus={() => setIsChatFocused(true)}
                                            onBlur={() => setIsChatFocused(false)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            onKeyUp={(e) => e.stopPropagation()}
                                            placeholder={chatPlaceholder}
                                            className="w-full border-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#70839a] focus:ring-0"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!chatInput.trim() || isSendingChat}
                                            className="rounded-lg bg-[#66d9cb] p-2 text-[#04110f] transition hover:bg-[#84e7dd] disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            )}

            {/* Mobile Controls (Z-Index 50 - Topmost) */}
            {showExperienceHud && isMobile && isLandscape && mobileInputMode === 'joystick' && (
                <MobileControls videoElement={videoElement} lookSensitivity={mouseSensitivity} />
            )}

            {isMobile && !isLandscape && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 text-center text-white">
                    <div className="max-w-xs">
                        <p className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-300">{ui.rotateDevice}</p>
                        <h2 className="mt-3 text-xl font-semibold">{ui.landscapeRequired}</h2>
                        <p className="mt-2 text-sm text-gray-300">
                            {ui.rotateHint}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

