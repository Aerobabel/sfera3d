'use client';

import PixelStreamingPlayer from "@/components/PixelStreamingPlayer";
import StreamPixelPlayer from "@/components/StreamPixelPlayer";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Activity, ChevronDown, Coins, Droplets, Gamepad2, Gift, KeyRound, ListChecks, LockKeyhole, Monitor, Play, RotateCw, Send, ShoppingCart, Sparkles, Ticket, Trophy, Volume2, WalletCards, X, Zap, Menu } from "lucide-react";
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
import { fadeOutCutsceneAudio, resetCutsceneAudio, softenCutsceneAudioTail } from "@/lib/ui/cutsceneAudio";
import {
    getQuestCompletionPercent,
    getQuestDefinition,
    getQuestObjectiveText,
    getQuestRewardText,
    getQuestText,
    type QuestEventInput,
} from "@/lib/quests";
import { playSferaUiSound } from "@/lib/ui/sound";
import type { WalletTransaction } from "@/lib/unreal/types";

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
    try { window.dispatchEvent(new Event('sfera:stream-input-reset')); } catch {}
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

const setNonCutsceneMediaMuted = (muted: boolean) => {
    if (typeof window === 'undefined') return;

    document.querySelectorAll('video, audio').forEach((el) => {
        if (el instanceof HTMLElement && el.dataset.cutsceneVideo === 'true') return;
        const media = el as HTMLMediaElement;
        media.muted = muted;
        if (!muted) {
            media.volume = 1.0;
            media.play().catch(() => {});
        }
    });

    try {
        const psWindow = window as PixelStreamingWindow;
        const audioEl = psWindow.ps?._webRtcController?.streamController?.audioElement;
        if (audioEl instanceof HTMLMediaElement) {
            audioEl.muted = muted;
            if (!muted) {
                audioEl.volume = 1.0;
                if (audioEl.srcObject) {
                    audioEl.play().catch(() => {});
                }
            }
        }
    } catch { /* best-effort */ }
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
    walletBalance: string;
    recentWinnings: string;
    noWinnings: string;
    guideTitle: string;
    guideBody: string;
    guideSteps: readonly string[];
    arenaTrainingTitle: string;
    arenaTrainingSteps: readonly [string, string, string, string];
    questDetailsOpen: string;
    questDetailsClose: string;
    questHint: string;
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
        walletBalance: 'Wallet balance',
        recentWinnings: 'Recent winnings',
        noWinnings: 'Arcade prizes and quest money will appear here.',
        guideTitle: 'What to do now',
        guideBody: 'Your goal is simple and weirdly urgent: buy water. Start at the locked dispenser, get J2 and B3 from suppliers, open Zombie Hall, win the water code and coins, then come back for EVIAN.',
        guideSteps: ['Try the locked water dispenser', 'Find Zombie Hall code J2 and B3', 'Win Zombie Hall for the water code', 'Buy EVIAN water'],
        arenaTrainingTitle: 'Zombie Arena controls',
        arenaTrainingSteps: ['WASD to move', 'Mouse to aim', 'P to fire', 'Leave through the return portal'],
        questDetailsOpen: 'Show full checklist',
        questDetailsClose: 'Hide checklist',
        questHint: 'Follow the next objective. Open the full checklist if you lose the thread.',
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
        walletBalance: 'Баланс кошелька',
        recentWinnings: 'Последние выигрыши',
        noWinnings: 'Выигрыши из аркады и денежные награды появятся здесь.',
        guideTitle: 'Что делать сейчас',
        guideBody: 'Вы в 3D-городе. Посетите Sfera Hall, изучите один павильон, затем войдите в Zombie Arena и получите награду.',
        guideSteps: ['Изучить Sfera Hall', 'Войти в Zombie Arena', 'Получить награду'],
        arenaTrainingTitle: 'Управление на арене',
        arenaTrainingSteps: ['WASD: движение', 'Мышь: прицел', 'P: стрельба', 'Выход: портал возврата'],
        questDetailsOpen: 'Весь список',
        questDetailsClose: 'Скрыть список',
        questHint: 'Идите по следующей цели. Если сбились, откройте весь список.',
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
        walletBalance: '钱包余额',
        recentWinnings: '最近奖金',
        noWinnings: '街机奖金和任务现金会显示在这里。',
        guideTitle: '现在要做什么',
        guideBody: '你在 3D 城市中。访问 Sfera Hall，探索一个展馆，然后进入 Zombie Arena 并领取奖励。',
        guideSteps: ['探索 Sfera Hall', '进入 Zombie Arena', '领取奖励'],
        arenaTrainingTitle: '僵尸竞技场操作',
        arenaTrainingSteps: ['WASD 移动', '鼠标瞄准', 'P 射击', '传送门返回'],
        questDetailsOpen: '显示完整清单',
        questDetailsClose: '收起清单',
        questHint: '按下一个目标推进。迷路时打开完整清单。',
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
        loadingTitle: '\u0413\u043E\u0442\u043E\u0432\u0438\u043C \u0432\u0430\u0448\u0435 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E',
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
const FASTVIEW_START_CUTSCENE_PLAYLIST: Record<AppLanguage, string[]> = {
    en: ['/cutscenes/maincutscene.MOV', '/cutscenes/gamecutscene.MOV', '/cutscenes/gameagain.MOV'],
    ru: ['/cutscenes/maincutscene-ru.MP4', '/cutscenes/gamecutscene-ru.MOV', '/cutscenes/gameagain.MOV'],
    zh: ['/cutscenes/maincutscene-zh.MP4', '/cutscenes/gamecutscene-zh.MOV', '/cutscenes/gameagain.MOV'],
};
const WATER_WIN_CUTSCENE_SRC = '/cutscenes/wincut.MOV';
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
const ARCADE_CONTROL_KEY_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];


type FrontendCinematic = {
    id: number;
    eyebrow: string;
    title: string;
    description: string;
    destinationKicker: string;
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

const FRONTEND_CINEMATIC_COPY: Record<AppLanguage, {
    destinationKicker: string;
    sferaHall: Omit<FrontendCinematic, 'id' | 'destinationKicker'>;
    zombieArena: Omit<FrontendCinematic, 'id' | 'destinationKicker'>;
    city: Omit<FrontendCinematic, 'id' | 'destinationKicker'>;
}> = {
    en: {
        destinationKicker: 'Destination',
        sferaHall: {
            eyebrow: 'Entering marketplace',
            title: 'Opening Sfera Hall',
            description: 'Crossing from the city streets into the shared mall and pavilion floor.',
            destinationLabel: 'Sfera Hall',
        },
        zombieArena: {
            eyebrow: 'Player Mode gateway',
            title: 'Loading Zombie Arena',
            description: 'Preparing the arena HUD, score rules, health state, and reward preview.',
            destinationLabel: 'Zombie Arena',
        },
        city: {
            eyebrow: 'Returning to city',
            title: 'Rebuilding city view',
            description: 'Syncing the website state back to the main marketplace world.',
            destinationLabel: 'Main City',
        },
    },
    ru: {
        destinationKicker: '\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435',
        sferaHall: {
            eyebrow: '\u0412\u0445\u043e\u0434 \u0432 \u043c\u0430\u0440\u043a\u0435\u0442\u043f\u043b\u0435\u0439\u0441',
            title: '\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c Sfera Hall',
            description: '\u041f\u0435\u0440\u0435\u0445\u043e\u0434 \u0438\u0437 \u0433\u043e\u0440\u043e\u0434\u0441\u043a\u0438\u0445 \u0443\u043b\u0438\u0446 \u0432 \u043e\u0431\u0449\u0438\u0439 \u0442\u043e\u0440\u0433\u043e\u0432\u044b\u0439 \u0445\u043e\u043b\u043b \u0438 \u0437\u043e\u043d\u0443 \u043f\u0430\u0432\u0438\u043b\u044c\u043e\u043d\u043e\u0432.',
            destinationLabel: 'Sfera Hall',
        },
        zombieArena: {
            eyebrow: '\u0412\u0445\u043e\u0434 \u0440\u0435\u0436\u0438\u043c\u0430 \u0438\u0433\u0440\u043e\u043a\u0430',
            title: '\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c Zombie Arena',
            description: '\u0413\u043e\u0442\u043e\u0432\u0438\u043c HUD \u0430\u0440\u0435\u043d\u044b, \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0441\u0447\u0435\u0442\u0430, \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435 \u0438 \u043f\u0440\u0435\u0432\u044c\u044e \u043d\u0430\u0433\u0440\u0430\u0434.',
            destinationLabel: 'Zombie Arena',
        },
        city: {
            eyebrow: '\u0412\u043e\u0437\u0432\u0440\u0430\u0442 \u0432 \u0433\u043e\u0440\u043e\u0434',
            title: '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u0430\u0432\u043b\u0438\u0432\u0430\u0435\u043c \u0432\u0438\u0434 \u0433\u043e\u0440\u043e\u0434\u0430',
            description: '\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u0443\u0435\u043c \u0441\u0430\u0439\u0442 \u0441 \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u043c \u043c\u0438\u0440\u043e\u043c \u043c\u0430\u0440\u043a\u0435\u0442\u043f\u043b\u0435\u0439\u0441\u0430.',
            destinationLabel: '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0433\u043e\u0440\u043e\u0434',
        },
    },
    zh: {
        destinationKicker: '\u76ee\u7684\u5730',
        sferaHall: {
            eyebrow: '\u8fdb\u5165\u5e02\u573a',
            title: '\u6b63\u5728\u6253\u5f00 Sfera Hall',
            description: '\u4ece\u57ce\u5e02\u8857\u9053\u8fdb\u5165\u5171\u4eab\u5546\u573a\u548c\u5c55\u9986\u533a\u57df\u3002',
            destinationLabel: 'Sfera Hall',
        },
        zombieArena: {
            eyebrow: '\u73a9\u5bb6\u6a21\u5f0f\u5165\u53e3',
            title: '\u6b63\u5728\u52a0\u8f7d Zombie Arena',
            description: '\u6b63\u5728\u51c6\u5907\u7ade\u6280\u573a HUD\u3001\u8ba1\u5206\u89c4\u5219\u3001\u751f\u547d\u503c\u548c\u5956\u52b1\u9884\u89c8\u3002',
            destinationLabel: 'Zombie Arena',
        },
        city: {
            eyebrow: '\u8fd4\u56de\u57ce\u5e02',
            title: '\u6b63\u5728\u91cd\u5efa\u57ce\u5e02\u89c6\u56fe',
            description: '\u6b63\u5728\u5c06\u7f51\u7ad9\u72b6\u6001\u540c\u6b65\u56de\u4e3b\u5e02\u573a\u4e16\u754c\u3002',
            destinationLabel: '\u4e3b\u57ce\u5e02',
        },
    },
};

const resolveFrontendCinematic = (event: unknown, language: AppLanguage): Omit<FrontendCinematic, 'id'> | null => {
    if (!event || typeof event !== 'object') return null;

    const payload = event as Record<string, unknown>;
    const copy = FRONTEND_CINEMATIC_COPY[language];

    if (payload.event === 'portal_entered' && payload.portal === 'SferaHall') {
        return { ...copy.sferaHall, destinationKicker: copy.destinationKicker };
    }

    if (payload.event === 'game_entered' && payload.game === 'ZombieArena') {
        return { ...copy.zombieArena, destinationKicker: copy.destinationKicker };
    }

    if (payload.event === 'returned_to_city') {
        return { ...copy.city, destinationKicker: copy.destinationKicker };
    }

    return null;
};

const formatMoney = (amountCents: number) =>
    `${amountCents.toLocaleString('en-US')} coins`;

const WATER_PRODUCTS = [
    'EVIAN Still Water 0.5L',
    'EVIAN Still Water 0.75L',
    'EVIAN Still Water 1L',
    'EVIAN Sport Cap 0.75L',
    'EVIAN Glass Bottle 0.33L',
    'EVIAN Glass Bottle 0.75L',
    'EVIAN Prestige 0.5L',
    'EVIAN Prestige 1L',
    'EVIAN Kids 0.33L',
    'EVIAN Mineral Water 1.5L',
    'EVIAN Natural Spring 0.5L',
    'EVIAN Natural Spring 1L',
    'EVIAN Multipack 6 x 0.5L',
    'EVIAN Multipack 12 x 0.5L',
    'EVIAN Multipack 6 x 1L',
    'EVIAN Still Water 0.33L',
    'EVIAN Still Water 0.25L',
    'EVIAN Glass Still 0.5L',
    'EVIAN Premium Glass 1L',
    'EVIAN Hydration Pack 4 x 0.5L',
    'EVIAN Office Pack 24 x 0.5L',
    'EVIAN Fridge Pack 8 x 0.5L',
    'EVIAN Mini 0.2L',
    'EVIAN On The Go 0.5L',
    'EVIAN Family 1.5L',
    'EVIAN Compact 0.75L',
    'EVIAN Sports Bundle 6 x 0.75L',
    'EVIAN Event Pack 12 x 0.75L',
    'EVIAN Hall Pack 18 x 0.5L',
    'EVIAN First Buyer Pack 24 x 0.5L',
].slice(0, GAME_RULES.water.productsToShow).map((name, index) => ({
    id: `evian-${index + 1}`,
    name,
    priceCoins: index === 0 ? GAME_RULES.water.bottlePriceCoins : GAME_RULES.water.bottlePriceCoins + Math.ceil((index + 1) * 7 / 10) * 10,
}));

type ArcadeGameId = 'pulse-runner' | 'signal-match' | 'vault-drop';

type ArcadeCopy = {
    title: string;
    eyebrow: string;
    subtitle: string;
    wallet: string;
    cashAdded: string;
    chooseGame: string;
    close: string;
    play: string;
    stop: string;
    lock: string;
    claim: string;
    bonusReward: string;
    nearPerfect: string;
    tryAgain: string;
    recent: string;
    emptyRecent: string;
    playsLeft: string;
    limitReached: string;
    signalTimeLeft: string;
    runnerHint: string;
    games: Record<ArcadeGameId, { title: string; tag: string; body: string; mechanic: string }>;
};

const ARCADE_GAME_ORDER: ArcadeGameId[] = ['pulse-runner', 'vault-drop', 'signal-match'];

type GridPoint = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';
type Pipe = { x: number; gapY: number; passed: boolean };
type Brick = { id: number; x: number; y: number; alive: boolean };

const SNAKE_GRID_SIZE = 14;
const SNAKE_START: GridPoint[] = [
    { x: 6, y: 7 },
    { x: 5, y: 7 },
    { x: 4, y: 7 },
];
const FLAPPY_HEIGHT = 64;
const FLAPPY_GAP = 20;
const BREAKER_ROWS = 4;
const BREAKER_COLUMNS = 7;

const createSnakeFood = (snake: GridPoint[]): GridPoint => {
    const available: GridPoint[] = [];
    for (let y = 0; y < SNAKE_GRID_SIZE; y += 1) {
        for (let x = 0; x < SNAKE_GRID_SIZE; x += 1) {
            if (!snake.some((segment) => segment.x === x && segment.y === y)) {
                available.push({ x, y });
            }
        }
    }
    return available[Math.floor(Math.random() * available.length)] ?? { x: 10, y: 7 };
};

const createBreakerBricks = (): Brick[] =>
    Array.from({ length: BREAKER_ROWS * BREAKER_COLUMNS }, (_, index) => ({
        id: index,
        x: index % BREAKER_COLUMNS,
        y: Math.floor(index / BREAKER_COLUMNS),
        alive: true,
    }));

const ARCADE_COPY: Record<AppLanguage, ArcadeCopy> = {
    en: {
        title: 'Sfera Arcade',
        eyebrow: 'Prize cabinets',
        subtitle: 'Quick skill games with small wallet credits. Frontend arcade wins are capped for the session.',
        wallet: 'Wallet',
        cashAdded: 'Credit added',
        chooseGame: 'Choose a cabinet',
        close: 'Close arcade',
        play: 'Play',
        stop: 'Stop',
        lock: 'Lock timing',
        claim: 'Claim win',
        bonusReward: 'Bonus reward',
        nearPerfect: 'Clean win',
        tryAgain: 'No prize this round',
        recent: 'Recent wallet activity',
        emptyRecent: 'Wins from arcade games will appear here.',
        playsLeft: 'Plays left',
        limitReached: 'Play limit reached for this arcade visit',
        signalTimeLeft: 'Circuit cools in',
        runnerHint: 'Green $ and amber x2 are safe prizes. Avoid the red ! lane, then press Dash.',
        games: {
            'pulse-runner': {
                title: 'Snake Cabinet',
                tag: 'Classic snake',
                body: 'Steer the neon snake, eat Sfera coins, and avoid the walls and your own trail.',
                mechanic: 'Use arrow keys, WASD, or the direction buttons. Reach 5 coins for a clean payout.',
            },
            'signal-match': {
                title: 'Brick Breaker',
                tag: 'Paddle arcade',
                body: 'Move the paddle, keep the ball alive, and clear neon bricks from the cabinet.',
                mechanic: 'Use left/right keys or the paddle buttons. Clear bricks for the bonus payout.',
            },
            'vault-drop': {
                title: 'Flappy Sfera',
                tag: 'Tap flyer',
                body: 'Pilot the Sfera orb through moving gates with short, precise taps.',
                mechanic: 'Tap flap or press Space. Pass 4 gates for a clean payout.',
            },
        },
    },
    ru: {
        title: 'Sfera Arcade',
        eyebrow: 'Игровые автоматы',
        subtitle: 'Короткие игры на реакцию и память. Выигрывайте деньги сессии, и они сразу появляются в кошельке.',
        wallet: 'Кошелек',
        cashAdded: 'Начислено',
        chooseGame: 'Выберите автомат',
        close: 'Закрыть аркаду',
        play: 'Играть',
        stop: 'Стоп',
        lock: 'Поймать момент',
        claim: 'Забрать выигрыш',
        bonusReward: 'Бонусная награда',
        nearPerfect: 'Чистая победа',
        tryAgain: 'В этом раунде без приза',
        recent: 'Последние операции',
        emptyRecent: 'Выигрыши из аркадных игр появятся здесь.',
        playsLeft: 'Попыток осталось',
        limitReached: 'Лимит попыток на этот заход исчерпан',
        signalTimeLeft: 'Цепь остынет через',
        runnerHint: 'Зеленый $ и янтарный x2 дают приз. Избегайте красной ! дорожки, затем жмите Dash.',
        games: {
            'pulse-runner': {
                title: 'Snake Cabinet',
                tag: 'Классическая змейка',
                body: 'Управляйте неоновой змейкой, собирайте монеты Sfera и не врезайтесь в стены или собственный хвост.',
                mechanic: 'Используйте стрелки, WASD или кнопки направления. Соберите 5 монет для выплаты.',
            },
            'signal-match': {
                title: 'Brick Breaker',
                tag: 'Аркада с платформой',
                body: 'Двигайте платформу, удерживайте шар в игре и разбивайте неоновые блоки.',
                mechanic: 'Используйте стрелки влево/вправо, A/D или кнопки платформы. Разбейте блоки для бонусной выплаты.',
            },
            'vault-drop': {
                title: 'Flappy Sfera',
                tag: 'Полет через ворота',
                body: 'Проведите шар Sfera через движущиеся ворота короткими точными нажатиями.',
                mechanic: 'Нажимайте Space или кнопку Flap, чтобы подпрыгивать. Пройдите 4 ворот для выплаты.',
            },
        },
    },
    zh: {
        title: 'Sfera Arcade',
        eyebrow: '奖金机台',
        subtitle: '快速技巧小游戏。赢取会话奖金，并立即进入钱包。',
        wallet: '钱包',
        cashAdded: '已入账',
        chooseGame: '选择机台',
        close: '关闭街机',
        play: '开始',
        stop: '停止',
        lock: '锁定时机',
        claim: '领取奖金',
        bonusReward: '额外奖励',
        nearPerfect: '漂亮获胜',
        tryAgain: '本轮无奖励',
        recent: '最近钱包动态',
        emptyRecent: '街机获胜记录会显示在这里。',
        playsLeft: '剩余次数',
        limitReached: '本次进入的游玩次数已用完',
        signalTimeLeft: '电路冷却倒计时',
        runnerHint: '绿色 $ 和琥珀 x2 是奖励。避开红色 ! 路线，然后点击 Dash。',
        games: {
            'pulse-runner': {
                title: 'Snake Cabinet',
                tag: '经典贪吃蛇',
                body: '控制霓虹蛇收集 Sfera 硬币，避开墙壁和自己的轨迹。',
                mechanic: '使用方向键、WASD 或方向按钮。收集 5 枚硬币即可获得奖励。',
            },
            'signal-match': {
                title: 'Brick Breaker',
                tag: '挡板街机',
                body: '移动挡板，让球保持在场内并击碎霓虹砖块。',
                mechanic: '使用左/右方向键、A/D 或挡板按钮。清除砖块即可获得额外奖励。',
            },
            'vault-drop': {
                title: 'Flappy Sfera',
                tag: '穿越闸门',
                body: '用短促精准的点击操控 Sfera 球穿过移动闸门。',
                mechanic: '按 Space 或点击 Flap。通过 4 道闸门即可获得奖励。',
            },
        },
    },
};

function ArenaPasswordOverlay({
    pieces,
    onClose,
    onSubmit,
}: {
    pieces: string[];
    onClose: () => void;
    onSubmit: (password: string) => void;
}) {
    const [password, setPassword] = useState('');
    const normalized = password.trim().toUpperCase().replace(/\s+/g, '');
    const expected = GAME_RULES.keys.arenaPassword;
    const matchedCount = normalized
        .split('')
        .filter((char, index) => expected[index] === char).length;
    const progress = Math.min(100, Math.round((matchedCount / expected.length) * 100));
    const isComplete = normalized === expected;

    return (
        <div className="absolute inset-0 z-[96] grid place-items-center bg-[#02060b]/76 p-4 text-white backdrop-blur-sm pointer-events-auto" role="dialog" aria-modal="true" aria-label="Arena password">
            <section className="sfera-reward-pop relative w-[min(100%,34rem)] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#071018]/96 p-5 shadow-[0_34px_120px_rgba(0,0,0,0.6)]">
                <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/25 text-slate-300 transition hover:text-white" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 pr-10">
                    <span className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                        <LockKeyhole className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">Zombie Arena Access</p>
                        <h2 className="mt-1 text-2xl font-black">Enter supplier key</h2>
                    </div>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs leading-5 text-slate-300">Known fragments</p>
                    <div className="mt-2 flex gap-2">
                        {[GAME_RULES.keys.firstHalf, GAME_RULES.keys.secondHalf].map((piece) => (
                            <span key={piece} className={`rounded-lg border px-3 py-2 font-mono text-sm font-black ${pieces.includes(piece) ? 'border-emerald-300/40 bg-emerald-300/12 text-emerald-100' : 'border-white/10 bg-black/25 text-white/30'}`}>
                                {pieces.includes(piece) ? piece : '??'}
                            </span>
                        ))}
                    </div>
                </div>
                <form
                    className="mt-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit(password);
                    }}
                >
                    <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value.toUpperCase())}
                        autoFocus
                        maxLength={8}
                        placeholder="J2 B3"
                        className="w-full rounded-xl border border-cyan-300/22 bg-black/35 px-4 py-4 font-mono text-2xl font-black uppercase tracking-[0.3em] text-white outline-none transition focus:border-cyan-200/70"
                    />
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.7)]' : 'bg-cyan-300/80'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#66d9cb,#d8fff9)] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:scale-[1.01]">
                        <KeyRound className="h-4 w-4" />
                        Unlock Arena
                    </button>
                </form>
            </section>
        </div>
    );
}

function WaterDispenserOverlay({
    walletBalanceCents,
    hasArenaAccess,
    waterKey,
    waterPurchased,
    onClose,
    onAttempt,
    onBuy,
    onOpenPassword,
}: {
    walletBalanceCents: number;
    hasArenaAccess: boolean;
    waterKey: string | null;
    waterPurchased: boolean;
    onClose: () => void;
    onAttempt: () => void;
    onBuy: () => void;
    onOpenPassword: () => void;
}) {
    const canAfford = walletBalanceCents >= GAME_RULES.water.bottlePriceCoins;
    const hasWaterKey = Boolean(waterKey);
    const canBuy = hasWaterKey && canAfford && !waterPurchased;
    const lockHint = !hasArenaAccess
        ? 'The dispenser stays locked. Get J2 and B3 from suppliers, then enter that code at Zombie Hall.'
        : !hasWaterKey
            ? 'Zombie Hall is open now. Win the fight to receive the water code for this dispenser.'
            : `Need ${GAME_RULES.water.bottlePriceCoins - walletBalanceCents} more coins.`;

    return (
        <div className="absolute inset-0 z-[94] grid place-items-center bg-[#02060b]/72 p-4 text-white backdrop-blur-sm pointer-events-auto" role="dialog" aria-modal="true" aria-label="Water dispenser">
            <section className="sfera-reward-pop grid max-h-[calc(100vh-2rem)] w-[min(100%,66rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#071018]/96 shadow-[0_34px_130px_rgba(0,0,0,0.62)] lg:grid-cols-[0.9fr_1.2fr]">
                <div className="relative overflow-hidden border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                    <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-slate-300 transition hover:text-white" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(102,217,203,0.22),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(245,199,102,0.14),transparent_30%)]" />
                    <div className="relative">
                        <span className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                            <Droplets className="h-6 w-6" />
                        </span>
                        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Water dispenser</p>
                        <h2 className="mt-2 text-3xl font-black leading-tight">Buy water</h2>
                        <p className="mt-3 text-sm leading-6 text-slate-300">Cheapest item: {GAME_RULES.water.bottleName}. Price EUR {GAME_RULES.water.bottlePriceEuro.toFixed(2)} = {GAME_RULES.water.bottlePriceCoins} coins.</p>
                        <div className="mt-5 grid gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Balance</span>
                                <span className="font-mono text-lg font-black text-white">{formatMoney(walletBalanceCents)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Zombie Hall code</span>
                                <span className={hasArenaAccess ? 'text-emerald-200' : 'text-amber-200'}>{hasArenaAccess ? 'accepted' : 'required'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Water code</span>
                                <span className={hasWaterKey ? 'text-emerald-200' : 'text-amber-200'}>{hasWaterKey ? waterKey : 'locked'}</span>
                            </div>
                        </div>
                        {!hasArenaAccess && (
                            <button type="button" onClick={onOpenPassword} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/24 bg-amber-300/10 px-4 py-3 text-sm font-black uppercase tracking-[0.13em] text-amber-100 transition hover:bg-amber-300/16">
                                <KeyRound className="h-4 w-4" />
                                Enter Zombie Hall code
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                onAttempt();
                                if (canBuy) onBuy();
                            }}
                            disabled={waterPurchased}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#66d9cb,#d8fff9)] px-4 py-3 text-sm font-black uppercase tracking-[0.13em] text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            {waterPurchased ? 'Water bought' : canBuy ? 'Buy EVIAN 0.5L' : 'Try to buy'}
                        </button>
                        {!canBuy && !waterPurchased && (
                            <p className="mt-3 text-xs leading-5 text-amber-100/90">
                                {lockHint}
                            </p>
                        )}
                    </div>
                </div>
                <div className="min-h-0 overflow-y-auto p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {WATER_PRODUCTS.map((product, index) => (
                            <div key={product.id} className={`rounded-xl border p-3 ${index === 0 ? 'border-cyan-300/28 bg-cyan-300/[0.075]' : 'border-white/10 bg-white/[0.035]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 text-sm font-black text-white">{product.name}</p>
                                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 font-mono text-[11px] text-cyan-100">{product.priceCoins}</span>
                                </div>
                                {index === 0 && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Cheapest water</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

function WheelOverlay({
    spinsRemaining,
    coupon,
    onClose,
    onSpin,
}: {
    spinsRemaining: number;
    coupon: string | null;
    onClose: () => void;
    onSpin: () => void;
}) {
    const [isSpinning, setIsSpinning] = useState(false);

    const spin = () => {
        if (spinsRemaining <= 0 || isSpinning) return;
        setIsSpinning(true);
        window.setTimeout(() => {
            setIsSpinning(false);
            onSpin();
        }, 1800);
    };

    return (
        <div className="absolute inset-0 z-[95] grid place-items-center bg-[#02060b]/76 p-4 text-white backdrop-blur-sm pointer-events-auto" role="dialog" aria-modal="true" aria-label="Wheel of Fortune">
            <section className="sfera-reward-pop relative w-[min(100%,44rem)] overflow-hidden rounded-2xl border border-amber-300/20 bg-[#0a1018]/96 p-5 text-center shadow-[0_34px_130px_rgba(0,0,0,0.62)]">
                <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-slate-300 transition hover:text-white" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">First buyer bonus</p>
                <h2 className="mt-2 text-3xl font-black">Wheel of Fortune</h2>
                <div className="mx-auto mt-5 grid h-[min(62vw,22rem)] w-[min(62vw,22rem)] place-items-center">
                    <img src="/wheeloffortune.jpg" alt="Wheel of Fortune" className={`h-full w-full rounded-full object-cover shadow-[0_0_80px_rgba(245,199,102,0.26)] ${isSpinning ? 'animate-spin' : ''}`} />
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                        <Ticket className="h-4 w-4" />
                        {coupon ?? 'Coupon required'}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                        {spinsRemaining} try left
                    </span>
                </div>
                <button type="button" onClick={spin} disabled={spinsRemaining <= 0 || isSpinning || !coupon} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f5c766,#66d9cb)] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45">
                    <RotateCw className="h-4 w-4" />
                    {spinsRemaining > 0 ? 'Spin once' : 'Already played'}
                </button>
            </section>
        </div>
    );
}

function ArcadeOverlay({
    copy,
    walletBalanceCents,
    transactions,
    playsRemaining,
    setPlaysRemaining,
    onClose,
    onPrize,
}: {
    copy: ArcadeCopy;
    walletBalanceCents: number;
    transactions: WalletTransaction[];
    playsRemaining: number;
    setPlaysRemaining: Dispatch<SetStateAction<number>>;
    onClose: () => void;
    onPrize: (amountCents: number, gameTitle: string) => void;
}) {
    const [activeGame, setActiveGame] = useState<ArcadeGameId>('pulse-runner');
    const [snake, setSnake] = useState<GridPoint[]>(SNAKE_START);
    const [snakeFood, setSnakeFood] = useState<GridPoint>(() => createSnakeFood(SNAKE_START));
    const [snakeDirection, setSnakeDirection] = useState<Direction>('right');
    const [snakeRunning, setSnakeRunning] = useState(false);
    const [snakeScore, setSnakeScore] = useState(0);
    const [snakeGameOver, setSnakeGameOver] = useState(false);
    const [flappyY, setFlappyY] = useState(28);
    const [flappyVelocity, setFlappyVelocity] = useState(0);
    const [flappyPipes, setFlappyPipes] = useState<Pipe[]>([
        { x: 68, gapY: 22, passed: false },
        { x: 108, gapY: 34, passed: false },
    ]);
    const [flappyRunning, setFlappyRunning] = useState(false);
    const [flappyScore, setFlappyScore] = useState(0);
    const [flappyGameOver, setFlappyGameOver] = useState(false);
    const [breakerPaddle, setBreakerPaddle] = useState(42);
    const [breakerBall, setBreakerBall] = useState({ x: 50, y: 74, vx: 1.6, vy: -1.7 });
    const [breakerBricks, setBreakerBricks] = useState<Brick[]>(() => createBreakerBricks());
    const [breakerRunning, setBreakerRunning] = useState(false);
    const [breakerScore, setBreakerScore] = useState(0);
    const [breakerGameOver, setBreakerGameOver] = useState(false);
    const [result, setResult] = useState<{ label: string; amountCents: number } | null>(null);

    const award = useCallback((amountCents: number, label: string) => {
        if (playsRemaining <= 0) {
            setResult({ amountCents: 0, label: copy.limitReached });
            return;
        }

        setPlaysRemaining((current) => Math.max(0, current - 1));
        setResult({ amountCents, label });
        if (amountCents > 0) {
            onPrize(amountCents, copy.games[activeGame].title);
        }
    }, [activeGame, copy.games, copy.limitReached, onPrize, playsRemaining, setPlaysRemaining]);

    const endSnake = useCallback((score: number) => {
        setSnakeRunning(false);
        setSnakeGameOver(true);
        const amount = score >= 8
            ? GAME_RULES.arcade.games[0].bonusCents
            : score >= 5
              ? GAME_RULES.arcade.games[0].prizeCents * 2
              : score > 0
                ? GAME_RULES.arcade.games[0].prizeCents
                : 0;
        award(amount, amount >= GAME_RULES.arcade.games[0].bonusCents ? copy.bonusReward : amount > 0 ? copy.nearPerfect : copy.tryAgain);
    }, [award, copy.bonusReward, copy.nearPerfect, copy.tryAgain]);

    const resetSnake = (start = false) => {
        setSnake(SNAKE_START);
        setSnakeFood(createSnakeFood(SNAKE_START));
        setSnakeDirection('right');
        setSnakeScore(0);
        setSnakeGameOver(false);
        setSnakeRunning(start);
        setResult(null);
    };

    const setSnakeMove = (direction: Direction) => {
        setSnakeDirection((current) => {
            if ((current === 'up' && direction === 'down') || (current === 'down' && direction === 'up')) return current;
            if ((current === 'left' && direction === 'right') || (current === 'right' && direction === 'left')) return current;
            return direction;
        });
    };

    useEffect(() => {
        if (activeGame !== 'pulse-runner' || !snakeRunning || snakeGameOver) return;

        const timer = window.setInterval(() => {
            setSnake((currentSnake) => {
                const head = currentSnake[0];
                const nextHead = {
                    x: head.x + (snakeDirection === 'left' ? -1 : snakeDirection === 'right' ? 1 : 0),
                    y: head.y + (snakeDirection === 'up' ? -1 : snakeDirection === 'down' ? 1 : 0),
                };
                const hitWall = nextHead.x < 0 || nextHead.x >= SNAKE_GRID_SIZE || nextHead.y < 0 || nextHead.y >= SNAKE_GRID_SIZE;
                const hitBody = currentSnake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
                if (hitWall || hitBody) {
                    endSnake(snakeScore);
                    return currentSnake;
                }

                const ateFood = nextHead.x === snakeFood.x && nextHead.y === snakeFood.y;
                const nextSnake = ateFood ? [nextHead, ...currentSnake] : [nextHead, ...currentSnake.slice(0, -1)];
                if (ateFood) {
                    const nextScore = snakeScore + 1;
                    setSnakeScore(nextScore);
                    setSnakeFood(createSnakeFood(nextSnake));
                    if (nextScore >= 10) {
                        window.setTimeout(() => endSnake(nextScore), 0);
                    }
                }
                return nextSnake;
            });
        }, 145);

        return () => window.clearInterval(timer);
    }, [activeGame, endSnake, snakeDirection, snakeFood, snakeGameOver, snakeRunning, snakeScore]);

    const resetFlappy = (start = false) => {
        setFlappyY(28);
        setFlappyVelocity(0);
        setFlappyPipes([
            { x: 68, gapY: 22, passed: false },
            { x: 108, gapY: 34, passed: false },
        ]);
        setFlappyScore(0);
        setFlappyGameOver(false);
        setFlappyRunning(start);
        setResult(null);
    };

    const endFlappy = useCallback((score: number) => {
        setFlappyRunning(false);
        setFlappyGameOver(true);
        const amount = score >= 7
            ? GAME_RULES.arcade.games[2].bonusCents
            : score >= 4
              ? GAME_RULES.arcade.games[2].prizeCents * 2
              : score > 0
                ? GAME_RULES.arcade.games[2].prizeCents
                : 0;
        award(amount, amount >= GAME_RULES.arcade.games[2].bonusCents ? copy.bonusReward : amount > 0 ? copy.nearPerfect : copy.tryAgain);
    }, [award, copy.bonusReward, copy.nearPerfect, copy.tryAgain]);

    const flap = () => {
        if (activeGame !== 'vault-drop' || playsRemaining <= 0) return;
        if (!flappyRunning || flappyGameOver) {
            resetFlappy(true);
            return;
        }
        setFlappyVelocity(-4.7);
    };

    useEffect(() => {
        if (activeGame !== 'vault-drop' || !flappyRunning || flappyGameOver) return;

        const timer = window.setInterval(() => {
            setFlappyVelocity((velocity) => velocity + 0.62);
            setFlappyY((currentY) => {
                const nextY = currentY + flappyVelocity * 0.32;
                if (nextY < 0 || nextY > FLAPPY_HEIGHT - 6) {
                    endFlappy(flappyScore);
                    return Math.max(0, Math.min(FLAPPY_HEIGHT - 6, nextY));
                }
                return nextY;
            });
            setFlappyPipes((pipes) => pipes.map((pipe) => {
                const nextX = pipe.x - 2.2;
                if (nextX < -10) {
                    return { x: 108, gapY: 12 + Math.random() * 34, passed: false };
                }
                if (!pipe.passed && nextX < 22) {
                    setFlappyScore((score) => score + 1);
                    return { ...pipe, x: nextX, passed: true };
                }
                return { ...pipe, x: nextX };
            }));
        }, 48);

        return () => window.clearInterval(timer);
    }, [activeGame, endFlappy, flappyGameOver, flappyRunning, flappyScore, flappyVelocity]);

    useEffect(() => {
        if (activeGame !== 'vault-drop' || !flappyRunning || flappyGameOver) return;

        const hitPipe = flappyPipes.some((pipe) => {
            const nearBird = pipe.x < 27 && pipe.x > 13;
            const outsideGap = flappyY < pipe.gapY || flappyY > pipe.gapY + FLAPPY_GAP;
            return nearBird && outsideGap;
        });
        if (hitPipe) {
            window.setTimeout(() => endFlappy(flappyScore), 0);
        }
    }, [activeGame, endFlappy, flappyGameOver, flappyPipes, flappyRunning, flappyScore, flappyY]);

    const resetBreaker = (start = false) => {
        setBreakerPaddle(42);
        setBreakerBall({ x: 50, y: 74, vx: 1.6, vy: -1.7 });
        setBreakerBricks(createBreakerBricks());
        setBreakerScore(0);
        setBreakerGameOver(false);
        setBreakerRunning(start);
        setResult(null);
    };

    const endBreaker = useCallback((score: number, cleared = false) => {
        setBreakerRunning(false);
        setBreakerGameOver(true);
        const amount = cleared || score >= 18
            ? GAME_RULES.arcade.games[1].bonusCents
            : score >= 10
              ? GAME_RULES.arcade.games[1].prizeCents * 2
              : score > 0
                ? GAME_RULES.arcade.games[1].prizeCents
                : 0;
        award(amount, amount >= GAME_RULES.arcade.games[1].bonusCents ? copy.bonusReward : amount > 0 ? copy.nearPerfect : copy.tryAgain);
    }, [award, copy.bonusReward, copy.nearPerfect, copy.tryAgain]);

    const movePaddle = (delta: number) => {
        setBreakerPaddle((current) => Math.max(0, Math.min(84, current + delta)));
    };

    useEffect(() => {
        if (activeGame !== 'signal-match' || !breakerRunning || breakerGameOver) return;

        const timer = window.setInterval(() => {
            setBreakerBall((ball) => {
                let next = { ...ball, x: ball.x + ball.vx, y: ball.y + ball.vy };
                if (next.x <= 2 || next.x >= 98) next = { ...next, vx: -next.vx };
                if (next.y <= 4) next = { ...next, vy: Math.abs(next.vy) };

                const hitPaddle = next.y >= 82 && next.y <= 88 && next.x >= breakerPaddle && next.x <= breakerPaddle + 16;
                if (hitPaddle) {
                    const paddleCenter = breakerPaddle + 8;
                    next = { ...next, vy: -Math.abs(next.vy), vx: (next.x - paddleCenter) / 4 };
                }

                if (next.y > 98) {
                    endBreaker(breakerScore);
                    return ball;
                }

                const hitBrick = breakerBricks.find((brick) => {
                    if (!brick.alive) return false;
                    const left = 8 + brick.x * 12;
                    const top = 10 + brick.y * 7;
                    return next.x >= left && next.x <= left + 9 && next.y >= top && next.y <= top + 4.5;
                });

                if (hitBrick) {
                    setBreakerBricks((bricks) => bricks.map((brick) => brick.id === hitBrick.id ? { ...brick, alive: false } : brick));
                    const nextScore = breakerScore + 1;
                    setBreakerScore(nextScore);
                    next = { ...next, vy: Math.abs(next.vy) };
                    if (nextScore >= BREAKER_ROWS * BREAKER_COLUMNS) {
                        window.setTimeout(() => endBreaker(nextScore, true), 0);
                    }
                }

                return next;
            });
        }, 42);

        return () => window.clearInterval(timer);
    }, [activeGame, breakerBall, breakerBricks, breakerGameOver, breakerPaddle, breakerRunning, breakerScore, endBreaker]);

    const handleArcadeKeyboardInput = (key: string, code: string) => {
        const normalizedKey = key.toLowerCase();

        if (activeGame === 'pulse-runner') {
            if (key === 'ArrowUp' || normalizedKey === 'w') setSnakeMove('up');
            if (key === 'ArrowDown' || normalizedKey === 's') setSnakeMove('down');
            if (key === 'ArrowLeft' || normalizedKey === 'a') setSnakeMove('left');
            if (key === 'ArrowRight' || normalizedKey === 'd') setSnakeMove('right');
            return true;
        }
        if (activeGame === 'vault-drop' && code === 'Space') {
            flap();
            return true;
        }
        if (activeGame === 'signal-match') {
            if (key === 'ArrowLeft' || normalizedKey === 'a') {
                movePaddle(-7);
                return true;
            }
            if (key === 'ArrowRight' || normalizedKey === 'd') {
                movePaddle(7);
                return true;
            }
        }

        return false;
    };

    useEffect(() => {
        const stopArcadeKeysFromReachingStreamer = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

            const isArcadeControlKey =
                ARCADE_CONTROL_KEY_CODES.includes(event.code) ||
                ARCADE_CONTROL_KEY_CODES.includes(event.key);
            if (!isArcadeControlKey) return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (event.type === 'keydown') {
                handleArcadeKeyboardInput(event.key, event.code);
            }
        };

        document.addEventListener('keydown', stopArcadeKeysFromReachingStreamer, true);
        document.addEventListener('keyup', stopArcadeKeysFromReachingStreamer, true);
        return () => {
            document.removeEventListener('keydown', stopArcadeKeysFromReachingStreamer, true);
            document.removeEventListener('keyup', stopArcadeKeysFromReachingStreamer, true);
        };
    });

    const activeCopy = copy.games[activeGame];
    const visibleTransactions = transactions.slice(0, 4);

    return (
        <div className="absolute inset-0 z-[92] flex items-center justify-center bg-[#02060b]/78 p-3 text-white backdrop-blur-md pointer-events-auto" role="dialog" aria-modal="true" aria-label={copy.title}>
            <section className="sfera-reward-pop relative grid max-h-[calc(100vh-1.5rem)] w-[min(100%,68rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#060b12]/96 shadow-[0_34px_140px_rgba(0,0,0,0.62)] lg:grid-cols-[0.92fr_1.4fr]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(102,217,203,0.18),transparent_28%),radial-gradient(circle_at_86%_26%,rgba(245,199,102,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_42%)]" />
                <aside className="relative border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/30 text-slate-300 transition hover:border-white/25 hover:text-white"
                        aria-label={copy.close}
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#66d9cb]">{copy.eyebrow}</p>
                    <h2 className="mt-2 pr-10 text-3xl font-black tracking-tight text-white">{copy.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{copy.subtitle}</p>

                    <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">{copy.wallet}</p>
                                <p className="mt-1 text-3xl font-black text-white">{formatMoney(walletBalanceCents)}</p>
                            </div>
                            <WalletCards className="h-7 w-7 text-emerald-100" />
                        </div>
                    </div>

                    <div className={`mt-3 rounded-xl border p-3 ${playsRemaining > 0 ? 'border-cyan-300/18 bg-cyan-300/[0.06]' : 'border-rose-300/20 bg-rose-300/[0.07]'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{copy.playsLeft}</p>
                            <p className={`font-mono text-xl font-black ${playsRemaining > 0 ? 'text-cyan-100' : 'text-rose-100'}`}>
                                {playsRemaining}/{GAME_RULES.arcade.maxPlaysPerOpen}
                            </p>
                        </div>
                        {playsRemaining <= 0 && (
                            <p className="mt-2 text-xs leading-5 text-rose-100/85">{copy.limitReached}</p>
                        )}
                    </div>

                    <div className="mt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{copy.chooseGame}</p>
                        <div className="mt-2 grid gap-2">
                            {ARCADE_GAME_ORDER.map((gameId) => {
                                const game = copy.games[gameId];
                                const isActive = activeGame === gameId;
                                return (
                                    <button
                                        key={gameId}
                                        type="button"
                                        onClick={() => {
                                            setActiveGame(gameId);
                                            setSnakeRunning(false);
                                            setFlappyRunning(false);
                                            setBreakerRunning(false);
                                            setResult(null);
                                        }}
                                        className={`rounded-xl border px-3 py-3 text-left transition ${
                                            isActive
                                                ? 'border-[#66d9cb]/45 bg-[#66d9cb]/12 text-white'
                                                : 'border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'
                                        }`}
                                    >
                                        <span className="block text-xs font-black uppercase tracking-[0.14em] text-[#9ff4ec]">{game.tag}</span>
                                        <span className="mt-1 block text-base font-black">{game.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                <main className="relative min-h-0 overflow-y-auto p-4">
                    <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">{activeCopy.tag}</p>
                                <h3 className="mt-1 text-2xl font-black text-white">{activeCopy.title}</h3>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{activeCopy.body}</p>
                            </div>
                            <Gamepad2 className="h-8 w-8 shrink-0 text-[#66d9cb]" />
                        </div>

                        <div
                            className="mt-5 min-h-[16rem] rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(102,217,203,0.06),rgba(245,199,102,0.05),rgba(255,255,255,0.03))] p-4 outline-none focus:border-[#66d9cb]/35"
                            tabIndex={0}
                        >
                            {activeGame === 'pulse-runner' && (
                                <div className="grid gap-5">
                                    <div className="rounded-2xl border border-cyan-300/15 bg-[#031018] p-3 shadow-[inset_0_0_70px_rgba(34,211,238,0.08)]">
                                        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                            <span>{snakeRunning ? 'Live run' : snakeGameOver ? 'Run ended' : 'Ready'}</span>
                                            <span>{snakeScore} coins</span>
                                        </div>
                                        <div className="mx-auto grid aspect-square max-w-[24rem] grid-cols-[repeat(14,minmax(0,1fr))] gap-1 rounded-xl border border-white/10 bg-black/35 p-2">
                                            {Array.from({ length: SNAKE_GRID_SIZE * SNAKE_GRID_SIZE }, (_, index) => {
                                                const x = index % SNAKE_GRID_SIZE;
                                                const y = Math.floor(index / SNAKE_GRID_SIZE);
                                                const isHead = snake[0]?.x === x && snake[0]?.y === y;
                                                const isBody = snake.some((segment, segmentIndex) => segmentIndex > 0 && segment.x === x && segment.y === y);
                                                const isFood = snakeFood.x === x && snakeFood.y === y;
                                                return (
                                                    <span
                                                        key={`${x}-${y}`}
                                                        className={`aspect-square rounded-[3px] border ${
                                                            isHead
                                                                ? 'border-white/70 bg-[#66d9cb] shadow-[0_0_14px_rgba(102,217,203,0.8)]'
                                                                : isBody
                                                                  ? 'border-cyan-300/20 bg-cyan-300/35'
                                                                  : isFood
                                                                    ? 'border-amber-200/80 bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.72)]'
                                                                    : 'border-white/[0.035] bg-white/[0.025]'
                                                        }`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <p className="text-sm leading-6 text-slate-300">{activeCopy.mechanic}</p>
                                    <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                                        <div className="grid grid-cols-3 gap-2">
                                            <span />
                                            <button type="button" onClick={() => setSnakeMove('up')} className="rounded-xl border border-white/12 bg-white/[0.055] px-3 py-2 text-sm font-black text-white">Up</button>
                                            <span />
                                            <button type="button" onClick={() => setSnakeMove('left')} className="rounded-xl border border-white/12 bg-white/[0.055] px-3 py-2 text-sm font-black text-white">Left</button>
                                            <button type="button" onClick={() => setSnakeMove('down')} className="rounded-xl border border-white/12 bg-white/[0.055] px-3 py-2 text-sm font-black text-white">Down</button>
                                            <button type="button" onClick={() => setSnakeMove('right')} className="rounded-xl border border-white/12 bg-white/[0.055] px-3 py-2 text-sm font-black text-white">Right</button>
                                        </div>
                                        <button type="button" onClick={() => resetSnake(true)} disabled={playsRemaining <= 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#66d9cb] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#03110f] transition hover:bg-[#8df0e6] disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-900">
                                            <Zap className="h-4 w-4" />
                                            {snakeRunning ? copy.stop : copy.play}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeGame === 'signal-match' && (
                                <div className="grid gap-5">
                                    <div className="relative mx-auto aspect-[4/3] w-full max-w-[34rem] overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#050914] shadow-[inset_0_0_80px_rgba(102,217,203,0.08)]">
                                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
                                        {breakerBricks.map((brick) => brick.alive && (
                                            <span
                                                key={brick.id}
                                                className="absolute rounded-md border border-white/20 bg-[linear-gradient(135deg,#66d9cb,#f6ba4f)] shadow-[0_0_14px_rgba(102,217,203,0.32)]"
                                                style={{
                                                    left: `${8 + brick.x * 12}%`,
                                                    top: `${10 + brick.y * 7}%`,
                                                    width: '9%',
                                                    height: '4.5%',
                                                }}
                                            />
                                        ))}
                                        <span
                                            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white shadow-[0_0_24px_rgba(255,255,255,0.82)]"
                                            style={{ left: `${breakerBall.x}%`, top: `${breakerBall.y}%` }}
                                        />
                                        <span
                                            className="absolute bottom-[8%] h-3 rounded-full border border-cyan-100/50 bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.55)]"
                                            style={{ left: `${breakerPaddle}%`, width: '16%' }}
                                        />
                                        <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                                            {breakerScore}/{BREAKER_ROWS * BREAKER_COLUMNS} bricks
                                        </div>
                                    </div>
                                    <p className="text-sm leading-6 text-slate-300">{activeCopy.mechanic}</p>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        <button type="button" onClick={() => movePaddle(-8)} className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/[0.09]">Left</button>
                                        <button type="button" onClick={() => resetBreaker(true)} disabled={playsRemaining <= 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#66d9cb] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#03110f] transition hover:bg-[#8df0e6] disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-900">
                                            <Sparkles className="h-4 w-4" />
                                            {breakerRunning ? copy.stop : copy.play}
                                        </button>
                                        <button type="button" onClick={() => movePaddle(8)} className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/[0.09]">Right</button>
                                    </div>
                                </div>
                            )}

                            {activeGame === 'vault-drop' && (
                                <div className="grid gap-5">
                                    <div className="relative mx-auto aspect-[16/10] w-full max-w-[34rem] overflow-hidden rounded-2xl border border-white/10 bg-[#050914] shadow-[inset_0_0_80px_rgba(102,217,203,0.08)]">
                                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(102,217,203,0.2),transparent_22%),radial-gradient(circle_at_82%_45%,rgba(251,191,36,0.14),transparent_24%)]" />
                                        <span
                                            className="absolute left-[20%] z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/55 bg-[radial-gradient(circle_at_35%_28%,#ffffff,#9ff4ec_32%,#08a7a5_68%,#075b65)] text-[10px] font-black text-[#03110f] shadow-[0_0_28px_rgba(102,217,203,0.95)]"
                                            style={{ top: `${(flappyY / FLAPPY_HEIGHT) * 100}%` }}
                                        >
                                            3D
                                        </span>
                                        {flappyPipes.map((pipe, index) => (
                                            <div key={`${pipe.x}-${index}`}>
                                                <span
                                                    className="absolute top-0 w-10 rounded-b-xl border border-emerald-200/20 bg-emerald-300/45 shadow-[0_0_22px_rgba(52,211,153,0.25)]"
                                                    style={{ left: `${pipe.x}%`, height: `${(pipe.gapY / FLAPPY_HEIGHT) * 100}%` }}
                                                />
                                                <span
                                                    className="absolute bottom-0 w-10 rounded-t-xl border border-emerald-200/20 bg-emerald-300/45 shadow-[0_0_22px_rgba(52,211,153,0.25)]"
                                                    style={{
                                                        left: `${pipe.x}%`,
                                                        height: `${((FLAPPY_HEIGHT - pipe.gapY - FLAPPY_GAP) / FLAPPY_HEIGHT) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                                            {flappyScore} gates
                                        </div>
                                    </div>
                                    <p className="text-sm leading-6 text-slate-300">{activeCopy.mechanic}</p>
                                    <button type="button" onClick={flap} disabled={playsRemaining <= 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-900">
                                        <Trophy className="h-4 w-4" />
                                        {flappyRunning ? 'Flap' : copy.play}
                                    </button>
                                </div>
                            )}
                        </div>
                        {result && (
                            <div className={`mt-4 rounded-xl border p-3 ${result.amountCents > 0 ? 'border-emerald-300/24 bg-emerald-300/[0.07]' : 'border-white/10 bg-white/[0.04]'}`}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-black text-white">{result.label}</p>
                                        <p className="mt-1 text-sm text-slate-300">
                                            {result.amountCents > 0 ? `${copy.cashAdded}: ${formatMoney(result.amountCents)}` : activeCopy.mechanic}
                                        </p>
                                    </div>
                                    <Coins className={result.amountCents > 0 ? 'h-6 w-6 text-emerald-100' : 'h-6 w-6 text-slate-500'} />
                                </div>
                            </div>
                        )}
                    </div>

                    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{copy.recent}</p>
                        {visibleTransactions.length === 0 ? (
                            <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">{copy.emptyRecent}</p>
                        ) : (
                            <div className="mt-3 grid gap-2">
                                {visibleTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300/14 bg-emerald-300/[0.055] px-3 py-2">
                                        <span className="min-w-0 truncate text-sm font-bold text-white">{transaction.label}</span>
                                        <span className="font-mono text-sm font-black text-emerald-100">+{formatMoney(transaction.amountCents)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </section>
        </div>
    );
}

function CutsceneSiteHeader({
    statusOnline,
    instruction,
    skipLabel,
    onSkip,
    startLabel,
    onStart,
}: {
    statusOnline: string;
    instruction: string;
    skipLabel: string;
    onSkip: () => void;
    startLabel?: string;
    onStart?: () => void;
}) {
    return (
        <header className="absolute inset-x-0 top-0 z-[80] border-b border-white/15 bg-[#090b10]/95 shadow-[0_16px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <BrandLogo size="md" priority />
                    <div className="hidden w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300 sm:flex">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                        {statusOnline}
                    </div>
                </div>

                <p className="hidden max-w-[34rem] text-center text-[10px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-[#9fcfdf] md:block">
                    {instruction}
                </p>

                <div className="flex items-center gap-2">
                    {startLabel && onStart && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onStart();
                            }}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#66d9cb]/30 bg-[#66d9cb]/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/[0.18] sm:px-4"
                        >
                            <Volume2 className="h-4 w-4" />
                            <span className="hidden sm:inline">{startLabel}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onSkip();
                        }}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/30 hover:bg-white/[0.14] sm:px-4"
                        aria-label={skipLabel}
                    >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">{skipLabel}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}

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
        if (
            (event.event === 'supplier_chat_opened' || event.event === 'pavilion_product_viewed') &&
            (event.pavilionId === 'youbo' || event.pavilionId === 'doublelin')
        ) {
            const piece = event.pavilionId === 'youbo'
                ? GAME_RULES.keys.firstHalf
                : GAME_RULES.keys.secondHalf;
            unrealBridge.handleUnrealResponse(JSON.stringify({
                event: 'arena_key_piece_found',
                piece,
                pavilionId: event.pavilionId,
            }));
        }
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
    const isStreamAudioSuppressedRef = useRef(false);
    const chatFeedRef = useRef<HTMLDivElement | null>(null);

    const handleSensitivityChange = useCallback((value: number) => {
        setMouseSensitivity(value);
        try { localStorage.setItem('ps_mouse_sensitivity', String(value)); } catch {}
    }, []);

    useEffect(() => {
        setIsMobile(detectMobileDevice());
    }, []);

    useEffect(() => {
        const cinematic = resolveFrontendCinematic(unrealBridge.lastUnrealEvent, language);
        if (!cinematic) return;

        if (unrealBridge.lastUnrealEvent &&
            typeof unrealBridge.lastUnrealEvent === 'object' &&
            'event' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.event === 'portal_entered' &&
            'portal' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.portal === 'SferaHall') {
            setHasStartedSferaHallCutsceneSound(false);
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
    }, [language, unrealBridge.lastUnrealEvent]);


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
    const [isArcadeOpen, setIsArcadeOpen] = useState(false);
    const [isWaterDispenserOpen, setIsWaterDispenserOpen] = useState(false);
    const [isArenaPasswordOpen, setIsArenaPasswordOpen] = useState(false);
    const [isWheelOpen, setIsWheelOpen] = useState(false);
    const [arcadePlaysRemaining, setArcadePlaysRemaining] = useState<number>(GAME_RULES.arcade.maxPlaysPerOpen);
    const [isQuestChecklistOpen, setIsQuestChecklistOpen] = useState(false);
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
    const [needsFastViewAudioUnlock, setNeedsFastViewAudioUnlock] = useState(false);
    // True once UE is actually producing video frames — used to keep a
    // transition overlay visible between the user's "enter" click and the
    // first frame so they don't see a black screen while UE unpauses.
    const [isVideoStreamingFrames, setIsVideoStreamingFrames] = useState(false);
    const [hasCompletedFastViewCutscene, setHasCompletedFastViewCutscene] = useState(() => !isFastViewRoute);
    const [isFastViewCutsceneExiting, setIsFastViewCutsceneExiting] = useState(false);
    const [hasStartedFastViewCutscene, setHasStartedFastViewCutscene] = useState(() => !isFastViewRoute);
    const [hasEndedFastViewCutscene, setHasEndedFastViewCutscene] = useState(() => !isFastViewRoute);
    const [fastViewCutsceneIndex, setFastViewCutsceneIndex] = useState(0);
    const fastViewCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const [isSferaHallCutsceneVisible, setIsSferaHallCutsceneVisible] = useState(false);
    const sferaHallCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const [isWaterWinCutsceneVisible, setIsWaterWinCutsceneVisible] = useState(false);
    const waterWinCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const fastViewCutsceneExitTimerRef = useRef<number | null>(null);
    const fastViewCutscenePlaylist = FASTVIEW_START_CUTSCENE_PLAYLIST[language] ?? FASTVIEW_START_CUTSCENE_PLAYLIST.en;
    const fastViewCutsceneSrc = fastViewCutscenePlaylist[fastViewCutsceneIndex] ?? fastViewCutscenePlaylist[0];
    const fastViewCutsceneStepLabel = `${Math.min(fastViewCutsceneIndex + 1, fastViewCutscenePlaylist.length)}/${fastViewCutscenePlaylist.length}`;

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
        if (!isArcadeOpen) return;
        playSferaUiSound('open');
    }, [isArcadeOpen]);

    useEffect(() => {
        if (!hasStartedExperience || !unrealBridge.lastUnrealEvent) return;

        switch (unrealBridge.lastUnrealEvent.event) {
            case 'terminal_nearby':
                setIsArcadeOpen(false);
                setIsWaterDispenserOpen(false);
                setIsWheelOpen(false);
                setIsRewardTerminalOpen(true);
                break;
            case 'terminal_left':
                setIsRewardTerminalOpen(false);
                break;
            case 'water_nearby':
                setIsRewardTerminalOpen(false);
                setIsArcadeOpen(false);
                setIsWheelOpen(false);
                setIsWaterDispenserOpen(true);
                break;
            case 'water_left':
                setIsWaterDispenserOpen(false);
                break;
            case 'arcade_nearby':
                setIsRewardTerminalOpen(false);
                setIsWaterDispenserOpen(false);
                setIsWheelOpen(false);
                setIsArcadeOpen(true);
                break;
            case 'arcade_left':
                setIsArcadeOpen(false);
                break;
            case 'wheel':
                setIsRewardTerminalOpen(false);
                setIsArcadeOpen(false);
                setIsWaterDispenserOpen(false);
                setIsWheelOpen(true);
                break;
            case 'wheel_left':
                setIsWheelOpen(false);
                break;
            default:
                break;
        }
    }, [hasStartedExperience, unrealBridge.lastUnrealEvent]);

    const handleArcadePrize = useCallback((amountCents: number, gameTitle: string) => {
        unrealBridge.handleUnrealResponse(JSON.stringify({
            event: 'arcade_prize_won',
            amountCents,
            gameTitle,
        }));
        playSferaUiSound('reward');
    }, [unrealBridge]);

    const handleArenaPasswordSubmit = useCallback((password: string) => {
        const normalized = password.trim().toUpperCase().replace(/\s+/g, '');
        const success = normalized === GAME_RULES.keys.arenaPassword;
        unrealBridge.handleUnrealResponse(JSON.stringify({
            event: 'arena_password_submitted',
            password: normalized,
            success,
        }));
        sendUnrealUiInteraction({
            type: 'arena_password_submitted',
            password: normalized,
            success,
        });
        if (success) {
            sendUnrealUiInteraction({ type: 'arena_access_granted', destination: 'ZombieArena' });
            sendUnrealUiInteraction({ type: 'set_mode', mode: 'player' });
            unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'mode_changed', mode: 'player' }));
            sendUnrealKeyPress(71);
            setIsArenaPasswordOpen(false);
            playSferaUiSound('reward');
        } else {
            playSferaUiSound('warning');
        }
    }, [unrealBridge]);

    const handleWaterPurchaseAttempt = useCallback(() => {
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'water_purchase_attempted' }));
        sendUnrealUiInteraction({ type: 'water_purchase_attempted' });
    }, [unrealBridge]);

    const handleWaterPurchase = useCallback(() => {
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'water_purchased' }));
        sendUnrealUiInteraction({
            type: 'water_purchased',
            item: GAME_RULES.water.bottleName,
            priceCoins: GAME_RULES.water.bottlePriceCoins,
        });
        setIsWaterDispenserOpen(false);
        setIsWaterWinCutsceneVisible(true);
        playSferaUiSound('reward');
    }, [unrealBridge]);

    const handleWheelSpin = useCallback(() => {
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'wheel_spun' }));
        sendUnrealUiInteraction({ type: 'wheel_spun' });
        playSferaUiSound('reward');
    }, [unrealBridge]);

    const blockedUnrealKeyboardCodes = useMemo(
        () => (isArcadeOpen ? [...BLOCKED_UNREAL_KEY_CODES, ...ARCADE_CONTROL_KEY_CODES] : BLOCKED_UNREAL_KEY_CODES),
        [isArcadeOpen]
    );


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

    const handleStartExperience = useCallback((options?: { withAudio?: boolean }) => {
        if (hasStartedExperience) return;
        if (isFastViewRoute && !videoElement) return;
        const shouldStartWithAudio = options?.withAudio ?? true;

        if (shouldStartWithAudio) {
            playSferaUiSound('start');
        }

        // Flip the library's StartVideoMuted flag so that any subsequent
        // playStream() / play() calls inside the library no longer re-mute.
        try {
            const psWindow = window as PixelStreamingWindow;
            psWindow.ps?.config?.setFlagEnabled?.('StartVideoMuted', !shouldStartWithAudio);
        } catch { /* best-effort */ }

        // Unmute all media elements currently in the DOM.
        const syncDomMediaPlayback = () => {
            const muted = isStreamAudioSuppressedRef.current || !shouldStartWithAudio;
            document.querySelectorAll('video, audio').forEach((el) => {
                if (el instanceof HTMLElement && el.dataset.cutsceneVideo === 'true') return;
                const m = el as HTMLMediaElement;
                m.muted = muted;
                if (!muted) {
                    m.volume = 1.0;
                }
                m.play().catch(() => {});
            });
        };
        syncDomMediaPlayback();

        // The Epic Games UE 5.4 Pixel Streaming library creates an <audio> element
        // (StreamController.audioElement) that is never appended to the DOM.
        // Its srcObject is set asynchronously when the WebRTC audio track arrives
        // via ontrack, which may happen BEFORE or AFTER this user click.
        // We poll briefly to catch both cases.
        const ensureAudioPlaying = () => {
            const muted = isStreamAudioSuppressedRef.current || !shouldStartWithAudio;

            try {
                const psWindow = window as PixelStreamingWindow;
                const audioEl =
                    psWindow.ps?._webRtcController?.streamController?.audioElement;
                if (audioEl instanceof HTMLMediaElement) {
                    if (!document.body.contains(audioEl)) {
                        audioEl.style.display = 'none';
                        document.body.appendChild(audioEl);
                    }
                    audioEl.muted = muted;
                    if (!muted) {
                        audioEl.volume = 1.0;
                    }
                    if (audioEl.srcObject) {
                        audioEl.play().catch(() => {});
                    }
                }
            } catch { /* best-effort */ }
            // Also catch any new DOM media elements the library may have added.
            syncDomMediaPlayback();
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
        setNeedsFastViewAudioUnlock(isFastViewRoute && !shouldStartWithAudio);
    }, [hasStartedExperience, videoElement, isFastViewRoute]);

    useEffect(() => {
        if (!isFastViewRoute || !hasStartedExperience || !needsFastViewAudioUnlock) return;

        const unlockAudio = () => {
            try {
                const psWindow = window as PixelStreamingWindow;
                psWindow.ps?.config?.setFlagEnabled?.('StartVideoMuted', false);
            } catch { /* best-effort */ }

            setNonCutsceneMediaMuted(false);
            setNeedsFastViewAudioUnlock(false);
        };

        window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
        window.addEventListener('keydown', unlockAudio, { once: true, capture: true });

        return () => {
            window.removeEventListener('pointerdown', unlockAudio, true);
            window.removeEventListener('keydown', unlockAudio, true);
        };
    }, [hasStartedExperience, isFastViewRoute, needsFastViewAudioUnlock]);

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
        resetCutsceneAudio(cutsceneVideo);
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

        if (fastViewCutsceneIndex < fastViewCutscenePlaylist.length - 1) {
            setFastViewCutsceneIndex((current) =>
                Math.min(current + 1, fastViewCutscenePlaylist.length - 1)
            );
            return;
        }

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
        fastViewCutsceneIndex,
        fastViewCutscenePlaylist.length,
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
        resetCutsceneAudio(video);
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    }, []);

    const completeSferaHallCutsceneClose = useCallback(() => {
        const video = sferaHallCutsceneVideoRef.current;
        if (video) {
            video.pause();
            try {
                video.currentTime = 0;
            } catch { /* best-effort */ }
            resetCutsceneAudio(video);
        }

        setIsSferaHallCutsceneVisible(false);
        setHasStartedSferaHallCutsceneSound(false);
    }, []);

    const handleCloseSferaHallCutscene = useCallback((fadeAudio = false) => {
        const video = sferaHallCutsceneVideoRef.current;

        if (fadeAudio && video && !video.ended && !video.error) {
            fadeOutCutsceneAudio(video, completeSferaHallCutsceneClose);
            return;
        }

        completeSferaHallCutsceneClose();
    }, [completeSferaHallCutsceneClose]);

    useEffect(() => {
        if (!isSferaHallCutsceneVisible) {
            isStreamAudioSuppressedRef.current = false;
            return;
        }

        isStreamAudioSuppressedRef.current = true;
        setNonCutsceneMediaMuted(true);

        return () => {
            isStreamAudioSuppressedRef.current = false;
            if (hasStartedExperience) {
                setNonCutsceneMediaMuted(false);
            }
        };
    }, [hasStartedExperience, isSferaHallCutsceneVisible]);

    useEffect(() => {
        if (!isWaterWinCutsceneVisible) return;

        isStreamAudioSuppressedRef.current = true;
        setNonCutsceneMediaMuted(true);

        return () => {
            isStreamAudioSuppressedRef.current = false;
            if (hasStartedExperience) {
                setNonCutsceneMediaMuted(false);
            }
        };
    }, [hasStartedExperience, isWaterWinCutsceneVisible]);

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

        fadeOutCutsceneAudio(fastViewCutsceneVideoRef.current, () => {
            if (videoElement && !fastViewError) {
                handleStartExperience();
            }

            beginFastViewCutsceneExit();
        });
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

        handleStartExperience({ withAudio: false });
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
        if (!hasStartedExperience || isChatFocused || activeProduct || isCatalogueOpen || activePavilion || isMenuOpen || isRewardTerminalOpen || isArcadeOpen || isWaterDispenserOpen || isArenaPasswordOpen || isWheelOpen) return;

        const handleModeHotkey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isEditableTarget = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
            if (isEditableTarget || event.repeat || event.key.toLowerCase() !== 'g') return;

            toggleUnrealMode();
        };

        document.addEventListener('keydown', handleModeHotkey, true);
        return () => document.removeEventListener('keydown', handleModeHotkey, true);
    }, [activePavilion, activeProduct, isArcadeOpen, isArenaPasswordOpen, isCatalogueOpen, isChatFocused, isMenuOpen, isRewardTerminalOpen, isWaterDispenserOpen, isWheelOpen, hasStartedExperience, toggleUnrealMode]);

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
    const showExperienceHud =
        !isFastViewRoute ||
        (!showFastViewCutscene && !showFastViewLaunchOverlay && isVideoStreamingFrames);
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
        !isArcadeOpen &&
        !isWaterDispenserOpen &&
        !isArenaPasswordOpen &&
        !isWheelOpen &&
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
    const isArenaKeyAccessDenied =
        isPlayerModeAccessDenied &&
        Boolean(
            unrealBridge.lastUnrealEvent &&
            'reason' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.reason === 'arena_key_required'
        );
    const shouldShowPlayerModePrompt =
        isPlayerModeAccessDenied &&
        !isPlayerModePromptDismissed &&
        (effectiveSceneMode !== 'player' || isArenaKeyAccessDenied);

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

    // Flip isVideoStreamingFrames true once UE is painting visible pixels.
    // Media events like `playing` can fire while the SDK/decoder is alive but
    // the frame is still black, so sample a tiny canvas until the image has
    // enough luminance or channel variation to be a real rendered frame.
    useEffect(() => {
        if (!videoElement) {
            setIsVideoStreamingFrames(false);
            return;
        }

        let visibleFrameStreak = 0;
        let blackFrameStreak = 0;
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 54;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const markPlaying = () => {
            setIsVideoStreamingFrames(true);
        };
        const markBlack = () => {
            setIsVideoStreamingFrames(false);
        };
        const hasVisibleFrame = () => {
            if (!context || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
                return false;
            }

            try {
                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
                let litPixels = 0;
                let variedPixels = 0;
                let totalLuma = 0;
                const pixelCount = data.length / 4;
                const tileColumns = 6;
                const tileRows = 3;
                const tileStats = Array.from({ length: tileColumns * tileRows }, () => ({
                    lit: 0,
                    varied: 0,
                    luma: 0,
                    total: 0,
                }));

                for (let index = 0; index < data.length; index += 4) {
                    const pixelIndex = index / 4;
                    const x = pixelIndex % canvas.width;
                    const y = Math.floor(pixelIndex / canvas.width);
                    const red = data[index];
                    const green = data[index + 1];
                    const blue = data[index + 2];
                    const max = Math.max(red, green, blue);
                    const min = Math.min(red, green, blue);
                    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
                    const isLit = luma > 18 || max > 42;
                    const isVaried = max - min > 10;
                    const tileColumn = Math.min(tileColumns - 1, Math.floor((x / canvas.width) * tileColumns));
                    const tileRow = Math.min(tileRows - 1, Math.floor((y / canvas.height) * tileRows));
                    const tile = tileStats[tileRow * tileColumns + tileColumn];

                    totalLuma += luma;
                    if (isLit) litPixels++;
                    if (isVaried) variedPixels++;
                    tile.luma += luma;
                    tile.total++;
                    if (isLit) tile.lit++;
                    if (isVaried) tile.varied++;
                }

                const litRatio = litPixels / pixelCount;
                const variedRatio = variedPixels / pixelCount;
                const averageLuma = totalLuma / pixelCount;
                const activeOuterTiles = tileStats.filter((tile, index) => {
                    const column = index % tileColumns;
                    const row = Math.floor(index / tileColumns);
                    const isCenterReticleTile = row === 1 && (column === 2 || column === 3);
                    if (isCenterReticleTile || tile.total === 0) return false;

                    const tileAverageLuma = tile.luma / tile.total;
                    const tileLitRatio = tile.lit / tile.total;
                    const tileVariedRatio = tile.varied / tile.total;
                    return tileAverageLuma > 16 || tileLitRatio > 0.08 || tileVariedRatio > 0.08;
                }).length;

                return (
                    averageLuma > 26 ||
                    litRatio > 0.34 ||
                    variedRatio > 0.24 ||
                    activeOuterTiles >= 4
                );
            } catch {
                return false;
            }
        };
        const onTimeUpdate = () => {
            if (hasVisibleFrame()) {
                visibleFrameStreak++;
                blackFrameStreak = 0;
                if (visibleFrameStreak >= 4) {
                    markPlaying();
                }
                return;
            }

            visibleFrameStreak = 0;
            blackFrameStreak++;
            if (blackFrameStreak >= 6) {
                markBlack();
            }
        };
        const onPlaying = () => {
            // Events are just prompts to sample; the pixel check decides.
            onTimeUpdate();
        };

        onTimeUpdate();
        const sampleTimer = window.setInterval(onTimeUpdate, 120);

        videoElement.addEventListener('timeupdate', onTimeUpdate);
        videoElement.addEventListener('playing', onPlaying);
        videoElement.addEventListener('loadeddata', onPlaying);
        videoElement.addEventListener('canplay', onPlaying);
        return () => {
            window.clearInterval(sampleTimer);
            videoElement.removeEventListener('timeupdate', onTimeUpdate);
            videoElement.removeEventListener('playing', onPlaying);
            videoElement.removeEventListener('loadeddata', onPlaying);
            videoElement.removeEventListener('canplay', onPlaying);
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
        if (activeProduct || isMenuOpen || isCatalogueOpen || isChatFocused || activePavilion || isRewardTerminalOpen || isArcadeOpen || isWaterDispenserOpen || isArenaPasswordOpen || isWheelOpen) {
            releaseAllInputs();
        }
    }, [activeProduct, isArcadeOpen, isArenaPasswordOpen, isMenuOpen, isCatalogueOpen, isChatFocused, activePavilion, isRewardTerminalOpen, isWaterDispenserOpen, isWheelOpen]);

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
            const rawEventName = jsonString.trim().replace(/^"|"$/g, '');
            const rawEventMap: Record<string, QuestEventInput> = {
                water_nearby: { event: 'water_nearby' },
                water_left: { event: 'water_left' },
                dog_mad: { event: 'dog_mad' },
                dog_calm: { event: 'dog_calm' },
                wheel: { event: 'wheel' },
                wheel_left: { event: 'wheel_left' },
            };
            const rawEvent = rawEventMap[rawEventName];
            if (rawEvent) {
                unrealBridge.handleUnrealResponse(JSON.stringify(rawEvent));
                return;
            }

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
        for (const progress of unrealBridge.questProgress) {
            const quest = getQuestDefinition(progress.questId);
            if (quest?.role === 'player' && progress.status === 'active') {
                return { progress, quest };
            }
        }

        return null;
    }, [unrealBridge.questProgress]);
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
    const walletBalanceCents = unrealBridge.walletBalanceCents;
    const recentWalletTransactions = unrealBridge.walletTransactions.slice(0, 5);
    const hasWalletActivity = walletBalanceCents > 0 || recentWalletTransactions.length > 0;

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
        <div className="relative h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(102,217,203,0.16),transparent_42%),linear-gradient(160deg,#04070d,#09111c)] font-sans">
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
                        keyboardInputEnabled={!isChatFocused && !isArcadeOpen && !isWaterDispenserOpen && !isArenaPasswordOpen && !isWheelOpen}
                        blockedKeyboardCodes={blockedUnrealKeyboardCodes}
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
                            keyboardInputEnabled={!isChatFocused && !isArcadeOpen && !isWaterDispenserOpen && !isArenaPasswordOpen && !isWheelOpen}
                            blockedKeyboardCodes={blockedUnrealKeyboardCodes}
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
                            key={fastViewCutsceneSrc}
                            src={fastViewCutsceneSrc}
                            data-cutscene-video="true"
                            muted={!hasStartedFastViewCutscene}
                            autoPlay
                            playsInline
                            preload="auto"
                            onTimeUpdate={(event) => softenCutsceneAudioTail(event.currentTarget)}
                            onEnded={handleCompleteFastViewCutscene}
                            onError={handleCompleteFastViewCutscene}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),transparent_26%,rgba(0,0,0,0.16))]" />
                    </div>

                    <CutsceneSiteHeader
                        statusOnline={ui.statusOnline}
                        instruction={`${sceneInstruction} · Cutscene ${fastViewCutsceneStepLabel}`}
                        skipLabel={cutsceneCopy.skip}
                        onSkip={handleSkipFastViewCutscene}
                    />

                    {!hasStartedFastViewCutscene && (
                        <div className="absolute inset-x-4 bottom-0 top-16 z-10 flex flex-col items-center justify-center sm:top-20">
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
                    <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden sm:top-20">
                        <video
                            ref={sferaHallCutsceneVideoRef}
                            className="h-full w-full object-cover"
                            key={sferaHallCutsceneSrc}
                            src={sferaHallCutsceneSrc}
                            data-cutscene-video="true"
                            muted={!hasStartedSferaHallCutsceneSound}
                            playsInline
                            preload="auto"
                            onTimeUpdate={(event) => softenCutsceneAudioTail(event.currentTarget)}
                            onEnded={() => handleCloseSferaHallCutscene()}
                            onError={() => handleCloseSferaHallCutscene()}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.25),transparent_34%,rgba(0,0,0,0.62))]" />
                    </div>
                    {!hasStartedSferaHallCutsceneSound && (
                        <div className="absolute inset-x-4 bottom-0 top-16 z-10 flex items-center justify-center sm:top-20">
                            <button
                                type="button"
                                onClick={handleStartSferaHallCutsceneWithSound}
                                className="max-w-full rounded-2xl border border-[#66d9cb]/35 bg-black/60 px-4 py-4 text-center text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_22px_80px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:border-[#66d9cb]/65 hover:bg-[#66d9cb]/15 sm:rounded-3xl sm:px-6 sm:tracking-[0.16em]"
                            >
                                <span className="block text-[#9ff4ec]">{cutsceneCopy.startWithSound}</span>
                                <span className="mt-2 block text-[11px] font-semibold text-slate-300">{cutsceneCopy.soundHint}</span>
                            </button>
                        </div>
                    )}
                    <CutsceneSiteHeader
                        statusOnline={ui.statusOnline}
                        instruction={sceneInstruction}
                        skipLabel={cutsceneCopy.skip}
                        onSkip={() => handleCloseSferaHallCutscene(true)}
                        startLabel={!hasStartedSferaHallCutsceneSound ? cutsceneCopy.startWithSound : undefined}
                        onStart={!hasStartedSferaHallCutsceneSound ? handleStartSferaHallCutsceneWithSound : undefined}
                    />
                </div>
            )}

            {isWaterWinCutsceneVisible && showExperienceHud && (
                <div className="absolute inset-0 z-[126] bg-[#05070b]">
                    <video
                        ref={waterWinCutsceneVideoRef}
                        className="h-full w-full object-cover"
                        src={WATER_WIN_CUTSCENE_SRC}
                        data-cutscene-video="true"
                        autoPlay
                        playsInline
                        preload="auto"
                        onLoadedData={(event) => {
                            event.currentTarget.muted = false;
                            resetCutsceneAudio(event.currentTarget);
                            event.currentTarget.play().catch(() => {
                                event.currentTarget.muted = true;
                                event.currentTarget.play().catch(() => {});
                            });
                        }}
                        onTimeUpdate={(event) => softenCutsceneAudioTail(event.currentTarget)}
                        onEnded={() => setIsWaterWinCutsceneVisible(false)}
                        onError={() => setIsWaterWinCutsceneVisible(false)}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.18),transparent_34%,rgba(0,0,0,0.5))]" />
                    <CutsceneSiteHeader
                        statusOnline={ui.statusOnline}
                        instruction="Water secured. Wheel coupon unlocked in Sfera Hall."
                        skipLabel={cutsceneCopy.skip}
                        onSkip={() => {
                            fadeOutCutsceneAudio(waterWinCutsceneVideoRef.current, () => setIsWaterWinCutsceneVisible(false));
                        }}
                    />
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
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{frontendCinematic.destinationKicker}</p>
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
                                            onClick={() => handleStartExperience()}
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
                    onClick={() => handleStartExperience()}
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

            {showExperienceHud && unrealBridge.lastDogMood === 'mad' && (
                <div className="pointer-events-none absolute left-1/2 top-28 z-[45] w-[min(92vw,26rem)] -translate-x-1/2">
                    <div className="sfera-reward-pop rounded-2xl border border-amber-300/30 bg-[#160f05]/86 p-3 text-center text-white shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-md">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">Focus check</p>
                        <p className="mt-1 text-sm font-black">heyy be focused hahah, doggy is mad</p>
                    </div>
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
                        <div className="absolute left-1/2 top-1/2 z-[70] w-[min(calc(100vw-2rem),26rem)] -translate-x-1/2 -translate-y-1/2 pointer-events-auto" role="dialog" aria-live="assertive" aria-label={isArenaKeyAccessDenied ? 'Arena key required' : sceneHud.playerModeRequired}>
                            <div className="rounded-3xl border border-amber-300/35 bg-slate-950/90 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">{isArenaKeyAccessDenied ? 'Arena key required' : sceneHud.playerModeRequired}</p>
                                <p className="mt-3 text-sm leading-6 text-slate-200">{isArenaKeyAccessDenied ? unrealBridge.accessDeniedMessage : sceneHud.playerModeRequiredBody}</p>
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
                                        onClick={isArenaKeyAccessDenied ? () => {
                                            setIsArenaPasswordOpen(true);
                                            setIsPlayerModePromptDismissed(true);
                                        } : handleSwitchToPlayerMode}
                                        className="rounded-2xl bg-[linear-gradient(135deg,#66d9cb,#d9fff9)] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:scale-[1.01]"
                                    >
                                        {isArenaKeyAccessDenied ? 'Enter key' : sceneHud.switchMode}
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
                            {isZombieArenaActive && (
                                <div className="mt-2 w-[min(92vw,22rem)] rounded-xl border border-rose-300/28 bg-[linear-gradient(145deg,rgba(69,10,10,0.86),rgba(8,13,22,0.78))] p-3 text-white shadow-[0_20px_60px_rgba(127,29,29,0.28)] backdrop-blur-md">
                                    <div className="flex items-center gap-2">
                                        <Gamepad2 className="h-4 w-4 shrink-0 text-rose-100" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-100">{sceneHud.arenaTrainingTitle}</p>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                                        {sceneHud.arenaTrainingSteps.map((step) => (
                                            <div key={step} className="rounded-lg border border-white/10 bg-white/[0.055] px-2 py-1.5 text-[11px] font-bold text-slate-100">
                                                {step}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activeSceneQuest && (
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
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsQuestChecklistOpen((current) => !current)}
                                                className="pointer-events-auto grid h-11 w-11 place-items-center rounded-lg border border-amber-300/22 bg-black/32 text-amber-100 transition hover:border-amber-200/45 hover:bg-amber-300/10"
                                                aria-label={isQuestChecklistOpen ? sceneHud.questDetailsClose : sceneHud.questDetailsOpen}
                                                title={isQuestChecklistOpen ? sceneHud.questDetailsClose : sceneHud.questDetailsOpen}
                                            >
                                                <ChevronDown className={`h-4 w-4 transition ${isQuestChecklistOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <div className="grid h-11 w-11 place-items-center rounded-lg border border-amber-300/22 bg-black/32">
                                                <span className="font-mono text-xs font-black text-amber-100">{activeSceneQuestPercent}%</span>
                                            </div>
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
                                        <p className="mt-2 text-[11px] leading-5 text-slate-300">{sceneHud.questHint}</p>
                                        {isQuestChecklistOpen && (
                                        <div className="mt-2 grid gap-1.5 rounded-lg border border-white/10 bg-black/22 p-2">
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/78">
                                                <ListChecks className="h-3.5 w-3.5" />
                                                {sceneHud.questDetailsOpen}
                                            </div>
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
                                        )}
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
                            {hasWalletActivity && (
                                <button
                                    type="button"
                                    onClick={() => setIsRewardTerminalOpen(true)}
                                    className="sfera-reward-pop mt-2 flex w-[min(92vw,22rem)] items-center gap-3 rounded-xl border border-cyan-300/20 bg-[#031018]/72 px-3 py-2.5 text-left text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.08]"
                                >
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-300/24 bg-cyan-300/10 text-cyan-100">
                                        <WalletCards className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100">{sceneHud.walletBalance}</span>
                                        <span className="mt-0.5 block truncate text-lg font-black text-white">{formatMoney(walletBalanceCents)}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full border border-cyan-300/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                                        {sceneHud.openTerminal}
                                    </span>
                                </button>
                            )}
                            {unrealBridge.waterPurchased && unrealBridge.wheelCoupon && (
                                <button
                                    type="button"
                                    onClick={() => setIsWheelOpen(true)}
                                    className="sfera-reward-pop mt-2 flex w-[min(92vw,22rem)] items-center gap-3 rounded-xl border border-amber-300/24 bg-[#171006]/72 px-3 py-2.5 text-left text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-md transition hover:border-amber-200/45 hover:bg-amber-300/[0.08]"
                                >
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-amber-300/24 bg-amber-300/10 text-amber-100">
                                        <Ticket className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-100">Wheel unlocked</span>
                                        <span className="mt-0.5 block truncate text-sm font-black text-white">Go back to Sfera Hall for 1 spin</span>
                                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">{unrealBridge.wheelCoupon}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full border border-amber-300/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
                                        {unrealBridge.wheelSpinsRemaining} try
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

                    {isRewardTerminalOpen && (
                        <div className="absolute inset-0 z-[90] grid place-items-center bg-[#02060b]/72 p-4 text-white backdrop-blur-sm pointer-events-auto" role="dialog" aria-modal="true" aria-label={sceneHud.rewardTerminal}>
                            <section className="sfera-reward-pop relative max-h-[calc(100vh-2rem)] w-[min(100%,36rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a1018]/96 shadow-[0_34px_120px_rgba(0,0,0,0.55)]">
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
                                            <h2 className="mt-1 text-xl font-black leading-tight text-white">{sceneHud.walletBalance}</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative grid gap-3 p-4">
                                    <div className="rounded-xl border border-emerald-300/16 bg-emerald-300/[0.06] p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">{sceneHud.walletBalance}</p>
                                                <p className="mt-1 text-4xl font-black text-white">{formatMoney(walletBalanceCents)}</p>
                                            </div>
                                            <Coins className="h-7 w-7 text-emerald-100" />
                                        </div>
                                    </div>

                                    {latestPlayerReward && (
                                        <div className="rounded-xl border border-cyan-300/16 bg-cyan-300/[0.055] p-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">{sceneHud.questComplete}</p>
                                            <p className="mt-1 text-base font-black text-white">{getQuestRewardText(latestPlayerReward, latestPlayerReward.questId, language)}</p>
                                            <p className="mt-1 text-sm text-slate-400">{latestPlayerRewardQuestText?.title ?? latestPlayerReward.questId}</p>
                                        </div>
                                    )}

                                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{sceneHud.recentWinnings}</p>
                                        {recentWalletTransactions.length === 0 ? (
                                            <p className="mt-2 text-sm leading-6 text-slate-400">{sceneHud.noWinnings}</p>
                                        ) : (
                                            <div className="mt-2 grid gap-2">
                                                {recentWalletTransactions.map((transaction) => (
                                                    <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300/12 bg-emerald-300/[0.05] px-2.5 py-2">
                                                        <span className="min-w-0 truncate text-sm font-bold text-white">{transaction.label}</span>
                                                        <span className="font-mono text-sm font-black text-emerald-100">+{formatMoney(transaction.amountCents)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

                    {isWaterDispenserOpen && (
                        <WaterDispenserOverlay
                            walletBalanceCents={walletBalanceCents}
                            hasArenaAccess={unrealBridge.hasArenaAccess}
                            waterKey={unrealBridge.waterKey}
                            waterPurchased={unrealBridge.waterPurchased}
                            onClose={() => setIsWaterDispenserOpen(false)}
                            onAttempt={handleWaterPurchaseAttempt}
                            onBuy={handleWaterPurchase}
                            onOpenPassword={() => setIsArenaPasswordOpen(true)}
                        />
                    )}

                    {isArenaPasswordOpen && (
                        <ArenaPasswordOverlay
                            pieces={unrealBridge.arenaKeyPieces}
                            onClose={() => setIsArenaPasswordOpen(false)}
                            onSubmit={handleArenaPasswordSubmit}
                        />
                    )}

                    {isWheelOpen && (
                        <WheelOverlay
                            spinsRemaining={unrealBridge.wheelSpinsRemaining}
                            coupon={unrealBridge.wheelCoupon}
                            onClose={() => setIsWheelOpen(false)}
                            onSpin={handleWheelSpin}
                        />
                    )}

                    {isArcadeOpen && (
                        <ArcadeOverlay
                            copy={ARCADE_COPY[language]}
                            walletBalanceCents={walletBalanceCents}
                            transactions={recentWalletTransactions}
                            playsRemaining={arcadePlaysRemaining}
                            setPlaysRemaining={setArcadePlaysRemaining}
                            onClose={() => setIsArcadeOpen(false)}
                            onPrize={handleArcadePrize}
                        />
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

