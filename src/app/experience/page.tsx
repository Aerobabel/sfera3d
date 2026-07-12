'use client';

import PixelStreamingPlayer from "@/components/PixelStreamingPlayer";
import StreamPixelPlayer from "@/components/StreamPixelPlayer";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Activity, ArrowRight, CheckCircle2, ChevronDown, Coins, Droplets, Gamepad2, Gift, KeyRound, ListChecks, LockKeyhole, Monitor, Package, Play, RotateCw, Send, ShieldCheck, ShoppingCart, Sparkles, Ticket, Trophy, Volume2, WalletCards, X, Zap, Menu } from "lucide-react";
import Image from 'next/image';
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
import WorldGuideOverlay, { parseWorldPosition, type WorldPosition } from "@/components/WorldGuideOverlay";
import RewardVideoSequence from "@/components/RewardVideoSequence";

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

const LIVE_ACTIVITY_MESSAGE_LABELS: Record<AppLanguage, Record<string, string>> = {
    en: {
        'Mode changed to Player Mode': 'Mode changed to Player Mode',
        'Mode changed to Shopper Mode': 'Mode changed to Shopper Mode',
        'Entered Sfera Hall': 'Entered Sfera Hall',
        'Zombie Hall locked: supplier code required': 'Zombie Hall locked: supplier code required',
        'Entered Zombie Arena': 'Entered Zombie Arena',
        'Zombie Arena locked: key required': 'Zombie Arena locked: key required',
        'Game access denied: Player Mode needed': 'Game access denied: Player Mode needed',
        'Zombie Hall cleared: arena payout earned for water': 'Zombie Hall cleared: arena payout earned for water',
        'Zombie killed': 'Zombie killed',
        'You were overwhelmed': 'You were overwhelmed',
        'Returned to city': 'Returned to city',
        'Reward ATM opened': 'Reward ATM opened',
        'Left Reward ATM': 'Left Reward ATM',
        'Water dispenser opened': 'Water dispenser opened',
        'Left water dispenser': 'Left water dispenser',
        'Water purchased: wheel coupon unlocked': 'Water purchased: wheel coupon unlocked',
        'Heyy, stay focused haha. Doggy is mad.': 'Heyy, stay focused haha. Doggy is mad.',
        'Doggy is calm again': 'Doggy is calm again',
        'Arena password accepted': 'Arena password accepted',
        'Arena password rejected': 'Arena password rejected',
        'Wheel of Fortune opened': 'Wheel of Fortune opened',
        'Left Wheel of Fortune': 'Left Wheel of Fortune',
        'Wheel of Fortune spin used': 'Wheel of Fortune spin used',
        'Sfera Arcade opened': 'Sfera Arcade opened',
        'Left Sfera Arcade': 'Left Sfera Arcade',
        'Quest complete: Buy Water': 'Quest complete: Buy Water',
    },
    ru: {
        'Mode changed to Player Mode': 'Включен режим игрока',
        'Mode changed to Shopper Mode': 'Включен режим покупателя',
        'Entered Sfera Hall': 'Вход в Sfera Hall',
        'Zombie Hall locked: supplier code required': 'Зомби-холл закрыт: нужен код поставщиков',
        'Entered Zombie Arena': 'Вход в Zombie Arena',
        'Zombie Arena locked: key required': 'Zombie Arena закрыта: нужен ключ',
        'Game access denied: Player Mode needed': 'Доступ к игре закрыт: нужен режим игрока',
        'Zombie Hall cleared: arena payout earned for water': 'Зомби-холл очищен: выплата на воду получена',
        'Zombie killed': 'Зомби уничтожен',
        'You were overwhelmed': 'Вас окружили',
        'Returned to city': 'Возврат в город',
        'Reward ATM opened': 'Открыт банкомат наград',
        'Left Reward ATM': 'Банкомат наград закрыт',
        'Water dispenser opened': 'Открыт автомат с водой',
        'Left water dispenser': 'Автомат с водой закрыт',
        'Water purchased: wheel coupon unlocked': 'Вода куплена: купон колеса открыт',
        'Heyy, stay focused haha. Doggy is mad.': 'Эй, не отвлекайтесь, ха-ха. Собака злится.',
        'Doggy is calm again': 'Собака снова спокойна',
        'Arena password accepted': 'Код арены принят',
        'Arena password rejected': 'Код арены отклонен',
        'Wheel of Fortune opened': 'Колесо фортуны открыто',
        'Left Wheel of Fortune': 'Колесо фортуны закрыто',
        'Wheel of Fortune spin used': 'Попытка колеса фортуны использована',
        'Sfera Arcade opened': 'Аркады Sfera открыты',
        'Left Sfera Arcade': 'Аркады Sfera закрыты',
        'Quest complete: Buy Water': 'Задание выполнено: купить воду',
    },
    zh: {
        'Mode changed to Player Mode': '已切换到玩家模式',
        'Mode changed to Shopper Mode': '已切换到买家模式',
        'Entered Sfera Hall': '进入 Sfera Hall',
        'Zombie Hall locked: supplier code required': 'Zombie Hall 已锁定：需要供应商代码',
        'Entered Zombie Arena': '进入 Zombie Arena',
        'Zombie Arena locked: key required': 'Zombie Arena 已锁定：需要钥匙',
        'Game access denied: Player Mode needed': '无法进入游戏：需要玩家模式',
        'Zombie Hall cleared: arena payout earned for water': 'Zombie Hall 已清理：已获得买水奖励',
        'Zombie killed': '已清理一个僵尸',
        'You were overwhelmed': '你被击败了',
        'Returned to city': '返回城市',
        'Reward ATM opened': '奖励 ATM 已打开',
        'Left Reward ATM': '奖励 ATM 已关闭',
        'Water dispenser opened': '售水机已打开',
        'Left water dispenser': '售水机已关闭',
        'Water purchased: wheel coupon unlocked': '水已购买：幸运轮券已解锁',
        'Heyy, stay focused haha. Doggy is mad.': '嘿，集中一点哈哈，小狗生气了。',
        'Doggy is calm again': '小狗又冷静了',
        'Arena password accepted': '竞技场代码已通过',
        'Arena password rejected': '竞技场代码被拒绝',
        'Wheel of Fortune opened': '幸运轮已打开',
        'Left Wheel of Fortune': '幸运轮已关闭',
        'Wheel of Fortune spin used': '幸运轮机会已使用',
        'Sfera Arcade opened': 'Sfera 街机已打开',
        'Left Sfera Arcade': 'Sfera 街机已关闭',
        'Quest complete: Buy Water': '任务完成：购买水',
    },
};

const localizeLiveActivityMessage = (value: string, language: AppLanguage) => {
    const labels = LIVE_ACTIVITY_MESSAGE_LABELS[language];
    const direct = labels[value];
    if (direct) return direct;

    const arenaKeyMatch = value.match(/^Arena key piece found: (.+)$/);
    if (arenaKeyMatch) {
        if (language === 'ru') return `Фрагмент кода арены найден: ${arenaKeyMatch[1]}`;
        if (language === 'zh') return `已找到竞技场代码片段：${arenaKeyMatch[1]}`;
        return value;
    }

    const comboMatch = value.match(/^Zombie killed.*?(\d+)x combo$/);
    if (comboMatch) {
        if (language === 'ru') return `Зомби уничтожен: комбо ${comboMatch[1]}x`;
        if (language === 'zh') return `已清理一个僵尸：${comboMatch[1]}x 连击`;
        return value;
    }

    if (value.startsWith('Zombie Arena cleared: enough coins earned for') || value.startsWith('Zombie Arena cleared: water payout ready for')) {
        if (language === 'ru') return `Zombie Arena очищена: монеты на ${GAME_RULES.water.bottleName} получены`;
        if (language === 'zh') return `Zombie Arena 已清理：已获得购买 ${GAME_RULES.water.bottleName} 的金币`;
        return value;
    }

    const arcadeRewardMatch = value.match(/^\+([\d,]+) arcade reward at (.+)$/);
    if (arcadeRewardMatch) {
        if (language === 'ru') return `+${arcadeRewardMatch[1]} монет в аркаде ${arcadeRewardMatch[2]}`;
        if (language === 'zh') return `+${arcadeRewardMatch[1]} 枚币，来自 ${arcadeRewardMatch[2]}`;
        return value;
    }

    return value;
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
        recentWinnings: 'Balance',
        noWinnings: 'Arcade prizes and quest coins will appear here.',
        guideTitle: 'What to do now',
        guideBody: 'Your goal is simple and weirdly urgent: buy water. Start at the dispenser, learn why the machine refuses the purchase, get the Zombie Hall code from suppliers, clear 5 zombies, then come back and buy EVIAN.',
        guideSteps: ['Try the water dispenser', 'Find the Zombie Hall code', 'Clear 5 zombies for coins', 'Buy EVIAN water'],
        arenaTrainingTitle: 'Zombie Arena controls',
        arenaTrainingSteps: ['WASD to move', 'Mouse to aim', 'LMB/P to fire', 'Leave through the return portal'],
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
        recentWinnings: 'Баланс',
        noWinnings: 'Выигрыши из аркады и монеты за задания появятся здесь.',
        guideTitle: 'Что делать сейчас',
        guideBody: 'Цель простая: купить воду. Начните у автомата, узнайте, почему он отказывает в покупке, получите код Зомби-холла у поставщиков, уничтожьте 5 зомби и купите EVIAN.',
        guideSteps: ['Попробовать автомат с водой', 'Найти код Зомби-холла', 'Получить монеты за 5 зомби', 'Купить воду EVIAN'],
        arenaTrainingTitle: 'Управление на арене',
        arenaTrainingSteps: ['WASD: движение', 'Мышь: прицел', 'LMB/P: стрельба', 'Выход: портал возврата'],
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
        recentWinnings: '余额',
        noWinnings: '街机奖金和任务现金会显示在这里。',
        guideTitle: '现在要做什么',
        guideBody: '目标很简单：买水。从售卖机开始，了解机器为什么拒绝购买，向供应商获取僵尸大厅代码，清理 5 个僵尸，然后购买 EVIAN。',
        guideSteps: ['尝试饮水售卖机', '找到僵尸大厅代码', '清理 5 个僵尸赚金币', '购买 EVIAN 水'],
        arenaTrainingTitle: '僵尸竞技场操作',
        arenaTrainingSteps: ['WASD 移动', '鼠标瞄准', 'LMB/P 射击', '传送门返回'],
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
        instruction: 'Long press T to speak with avatars, press F to open doors, X to exit inspection mode. Press ESC to switch to cursor control.',
        zombieInstruction: 'Zombie Arena: move with WASD, aim with mouse, left-click/LMB or press P to fire, use the return portal to leave.',
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
        instruction: 'Удерживайте T для разговора с аватарами, F для открытия дверей, X для выхода из режима осмотра. Чтобы переключить управление на курсор, нажмите ESC.',
        zombieInstruction: 'Zombie Arena: WASD \u0434\u043B\u044F \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F, \u043C\u044B\u0448\u044C\u044E \u0446\u0435\u043B\u044C\u0442\u0435\u0441\u044C, LMB/P \u0434\u043B\u044F \u0441\u0442\u0440\u0435\u043B\u044C\u0431\u044B, \u0432\u044B\u0445\u043E\u0434 \u0447\u0435\u0440\u0435\u0437 \u043F\u043E\u0440\u0442\u0430\u043B.',
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
        instruction: '长按 T 与角色对话，按 F 开门，按 X 退出检视模式。按 ESC 切换到光标控制。',
        zombieInstruction: 'Zombie Arena: WASD \u79FB\u52A8, \u9F20\u6807\u7784\u51C6, \u6309 LMB/P \u5C04\u51FB, \u4F7F\u7528\u4F20\u9001\u95E8\u79BB\u5F00.',
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
    en: ['/cutscenes/gameagain.MOV'],
    ru: ['/cutscenes/gameagain.MOV'],
    zh: ['/cutscenes/gameagain.MOV'],
};
const WATER_WIN_CUTSCENE_SRC = '/cutscenes/wincut.MOV';
const FASTVIEW_CUTSCENE_FADE_MS = 700;
const WATER_FLOW_COPY = {
    en: {
        missionStatement: 'Mission statement',
        missionTitle: 'Buy water',
        missionBody: 'Find the dispenser, get the supplier code, win the Zombie Hall payout, then buy EVIAN.',
        dismissMissionStatement: 'Dismiss mission statement',
        missionDirector: 'Mission director',
        codeConsole: 'Zombie Hall code console',
        codeReady: 'Zombie Hall code ready',
        codeReadyBody: 'Open the code console at the hall gate',
        gateAria: 'Zombie Hall access code',
        close: 'Close',
        gateKicker: 'Zombie Hall gate',
        gateTitle: 'Enter the supplier code',
        gateBody: 'The hall only opens when both supplier fragments are combined. This is the lock in front of the zombie fight, not the water dispenser.',
        accessConsole: 'Access console',
        clearanceGranted: 'Clearance granted. Opening Zombie Hall...',
        codeRejected: 'Code rejected. Recheck supplier fragments.',
        awaitingCode: 'Awaiting supplier code',
        enterCodePlaceholder: 'ENTER CODE',
        openingHall: 'Opening hall',
        unlockHall: 'Unlock Zombie Hall',
        recoverBoth: 'Recover both fragments',
        gateSequence: 'Gate sequence',
        gateSent: 'G sent',
        supplierEvidence: 'Supplier evidence',
        supplierEvidenceBody: 'Each pavilion hides one half of the Zombie Hall code.',
        evidenceLabel: 'Evidence',
        combinedCode: 'Combined code',
        fragmentsShort: 'Fragments',
        coinsShort: 'Coins',
        prizeShort: 'Prize',
        phoneShort: 'phone',
        pendingShort: 'pending',
        signalLabels: {
            locked: 'locked',
            search: 'search',
            ready: 'ready',
            reward: 'reward',
            complete: 'complete',
        },
        enter: 'Enter',
        firstBuyerBonus: 'First buyer bonus',
        purchaseAuthorized: 'Purchase authorized',
        evianSecured: 'EVIAN secured',
        purchaseBody: 'Coins confirmed, first buyer status recorded, and your Wheel of Fortune coupon is now active in Sfera Hall.',
        paid: 'Paid',
        balanceAfter: 'Balance after',
        next: 'Next',
        spinWheel: 'Spin the wheel',
        dispenserAria: 'Water dispenser',
        hydrationTerminal: '3DSFERA hydration terminal',
        buyEvian: 'Buy EVIAN',
        dispenserBody: 'The machine accepts coins only. You can earn them now as the quest reward.',
        cheapestItem: 'Quest item',
        coins: 'coins',
        railDispenser: 'Dispenser found',
        railCode: 'Zombie Hall code',
        railPayout: 'Arena payout received',
        railCoins: 'Enough coins',
        supplierFragments: 'Supplier fragments',
        fragmentsRecovered: (count: number) => `${count}/2 fragments recovered from pavilion suppliers.`,
        hallGate: 'Zombie Hall gate',
        accessAccepted: 'Access accepted. Enter the arena.',
        useSupplierCode: 'Use the supplier code at the hall entrance.',
        payoutTitle: '5 zombies and coins',
        payoutReceived: 'Zombie Hall payout received for EVIAN.',
        clearZombiesForMoney: 'Clear 5 zombies to earn enough money.',
        ready: 'ready',
        locked: 'locked',
        balance: 'Balance',
        needed: 'Needed',
        paidInCoins: 'Paid in coins',
        wheelCoupon: 'Wheel coupon',
        openCodeConsole: 'Open Zombie Hall code console',
        waterBought: 'Water bought',
        buyBottle: 'Buy EVIAN 0.5L',
        tryToBuy: 'Try to buy',
        payoutNeeded: 'Zombie Hall payout needed',
        evianCatalogue: 'EVIAN catalogue',
        visibleProducts: '30 visible products',
        officialBottleImagery: 'Official bottle imagery',
        cheapestWater: 'Quest item',
        machinePrice: 'Machine price',
        questItem: 'Quest item',
        comingSoon: 'Coming soon',
        selectedProduct: 'Selected product',
        productUnavailable: 'This product is coming soon. The quest purchase is EVIAN 0.5L.',
        purchaseBlocked: 'Purchase blocked. Follow the quest steps on the left, then return to this button.',
        lockNeedCode: 'You need the Zombie Hall payout. Get the supplier code, unlock the hall, win the arena, then return with enough money.',
        lockNeedPayout: 'Not enough coins for the purchase. Finish the Zombie Hall quest to receive the reward.',
        enoughReady: 'Enough money ready. Buy the EVIAN bottle.',
        needMoreCoins: (amount: number) => `You need ${amount} more coins. Clear all 5 zombies to finish the arena reward.`,
        wheelTitle: 'Wheel of Fortune',
        wheelAria: 'Wheel of Fortune',
        wheelBody: 'Try your luck with the Wheel of Fortune. Coupons are awarded for quest completion. All prizes are delivered to your account with the nearest order.',
        coupon: 'Coupon',
        required: 'Required',
        attempts: 'Attempts',
        prize: 'Prize',
        phonePrize: 'PHONE',
        phonePrizeStamped: 'Prize revealed',
        prizeHidden: 'Hidden until spin',
        pointerTracking: 'Pointer tracking',
        prizeReveal: 'Prize reveal',
        wheelStatus: 'Wheel status',
        spinningBody: 'Hold tight. The wheel is choosing the result.',
        spunBody: 'Spin recorded. Phone prize result saved and the coupon has been used.',
        readyBody: 'One attempt available after buying water. The prize is hidden until the spin finishes.',
        spinning: 'Spinning',
        spinOnce: 'Spin once',
        alreadyPlayed: 'Already played',
        closeWheel: 'Close wheel',
        evianBottleAlt: 'EVIAN bottle',
        missingFragmentTip: 'Tip: if a fragment is missing, return to Sfera Hall and inspect supplier product cards.',
        wheelUnlockedToast: 'Wheel unlocked',
        wheelReturnToast: 'Go back to Sfera Hall for 1 spin',
        attemptUnit: 'try',
        cutscene: {
            openingFilm: 'Opening film',
            roleSelect: 'Role select',
            hallArrival: 'Hall arrival',
            waterWin: 'Water win',
            sferaSignal: '3DSFERA signal',
            accessFilm: 'Access film',
            premiumSignal: 'Premium signal',
        },
        productTiers: {
            Everyday: 'Everyday',
            Sport: 'Sport',
            Glass: 'Glass',
            Prestige: 'Prestige',
            Kids: 'Kids',
            Family: 'Family',
            Pack: 'Pack',
            Mini: 'Mini',
            Event: 'Event',
            Reward: 'Reward',
        },
        productTags: {
            'Cheapest water': 'Quest item',
            'On the go': 'On the go',
            'Share size': 'Share size',
            'Fast cap': 'Fast cap',
            Dining: 'Dining',
            'Table service': 'Table service',
            Premium: 'Premium',
            'Small bottle': 'Small bottle',
            Large: 'Large',
            Source: 'Source',
            Bundle: 'Bundle',
            Mini: 'Mini',
            Sample: 'Sample',
            Pack: 'Pack',
            Office: 'Office',
            'Cold shelf': 'Cold shelf',
            Pocket: 'Pocket',
            'Quick buy': 'Quick buy',
            Compact: 'Compact',
            Event: 'Event',
            Hall: 'Hall',
            'Delivery bonus': 'Delivery bonus',
        },
        mission: {
            couponLiveTitle: 'Wheel coupon is live',
            couponLiveBody: 'Water is bought. Return to Sfera Hall and use the first-buyer Wheel of Fortune attempt.',
            hydrationCompleteTitle: 'Hydration run complete',
            hydrationCompleteBody: 'The EVIAN purchase is recorded and the reward trail is complete.',
            buyBottleTitle: 'Buy the EVIAN bottle',
            buyBottleBody: 'Zombie Hall paid out enough coins. Return to the dispenser and buy the EVIAN bottle.',
            payoutNeededTitle: 'Zombie Hall payout needed',
            payoutNeededBody: 'The dispenser needs the arena payout trail. Unlock Zombie Hall, finish the 5-zombie mission, then buy water.',
            clearHallTitle: 'Clear Zombie Hall',
            clearHallBody: (coins: number) => {
                void coins;
                return 'The gate accepted the supplier code. Clear 5 zombies to earn the arena payout.';
            },
            codeReadyTitle: 'Code ready for Zombie Hall',
            codeReadyBody: (first: string, second: string) => `Combine ${first} and ${second}, then unlock the hall gate.`,
            findSecondTitle: 'Find the second fragment',
            findSecondBody: 'One supplier fragment is recovered. The missing half is still hidden in another pavilion.',
            refusedTitle: 'Dispenser refused purchase',
            refusedBody: 'The water machine is locked. Go to Sfera Hall suppliers and recover both code fragments.',
            startTitle: 'Start at the water machine',
            startBody: 'Try the EVIAN dispenser first. The failed purchase reveals why the supplier code matters.',
            findWheel: 'Find the wheel',
            reviewRewards: 'Review rewards',
            buyWater: 'Buy water',
            enterArena: 'Enter arena',
            enterCode: 'Enter Zombie Hall code',
            findSupplierCode: 'Find supplier code',
            openSupplierChat: 'Open supplier chat',
            searchSuppliers: 'Search suppliers',
            tryBuyWater: 'Try to buy water',
        },
    },
    ru: {
        missionStatement: 'Задание',
        missionTitle: 'Купить воду',
        missionBody: 'Найдите автомат, получите код у поставщиков, выиграйте выплату в Зомби-холле и купите EVIAN.',
        dismissMissionStatement: 'Закрыть задание',
        missionDirector: 'Режиссер миссии',
        codeConsole: 'Консоль кода Зомби-холла',
        codeReady: 'Код Зомби-холла готов',
        codeReadyBody: 'Откройте консоль кода у ворот холла',
        gateAria: 'Код доступа в Зомби-холл',
        close: 'Закрыть',
        gateKicker: 'Ворота Зомби-холла',
        gateTitle: 'Введите код поставщиков',
        gateBody: 'Холл откроется только после соединения двух фрагментов поставщиков. Это замок перед боем с зомби, не автомат с водой.',
        accessConsole: 'Консоль доступа',
        clearanceGranted: 'Доступ разрешен. Открываем Зомби-холл...',
        codeRejected: 'Код отклонен. Проверьте фрагменты поставщиков.',
        awaitingCode: 'Ожидание кода поставщиков',
        enterCodePlaceholder: 'ВВЕДИТЕ КОД',
        openingHall: 'Открываем холл',
        unlockHall: 'Открыть Зомби-холл',
        recoverBoth: 'Найдите оба фрагмента',
        gateSequence: 'Последовательность ворот',
        gateSent: 'G отправлено',
        supplierEvidence: 'Доказательства поставщиков',
        supplierEvidenceBody: 'В каждом павильоне спрятана одна половина кода Зомби-холла.',
        evidenceLabel: 'Доказательство',
        combinedCode: 'Собранный код',
        fragmentsShort: 'Фрагменты',
        coinsShort: 'Монеты',
        prizeShort: 'Приз',
        phoneShort: 'телефон',
        pendingShort: 'ожидается',
        signalLabels: {
            locked: 'закрыто',
            search: 'поиск',
            ready: 'готово',
            reward: 'награда',
            complete: 'готово',
        },
        enter: 'Ввести',
        firstBuyerBonus: 'Бонус первого покупателя',
        purchaseAuthorized: 'Покупка подтверждена',
        evianSecured: 'EVIAN получен',
        purchaseBody: 'Монеты списаны, статус первого покупателя записан, купон Колеса фортуны активен в Sfera Hall.',
        paid: 'Оплачено',
        balanceAfter: 'Остаток',
        next: 'Дальше',
        spinWheel: 'Крутить колесо',
        dispenserAria: 'Автомат с водой',
        hydrationTerminal: 'Терминал воды 3DSFERA',
        buyEvian: 'Купить EVIAN',
        dispenserBody: 'Автомат принимает только монеты. Сейчас их можно заработать как награду за квест.',
        cheapestItem: 'Товар для задания',
        coins: 'монет',
        railDispenser: 'Автомат найден',
        railCode: 'Код Зомби-холла',
        railPayout: 'Выплата арены получена',
        railCoins: 'Монет хватает',
        supplierFragments: 'Фрагменты поставщиков',
        fragmentsRecovered: (count: number) => `${count}/2 фрагментов найдено у поставщиков павильонов.`,
        hallGate: 'Ворота Зомби-холла',
        accessAccepted: 'Доступ принят. Войдите на арену.',
        useSupplierCode: 'Введите код поставщиков у входа в холл.',
        payoutTitle: '5 зомби и монеты',
        payoutReceived: 'Выплата Зомби-холла для EVIAN получена.',
        clearZombiesForMoney: 'Уничтожьте 5 зомби, чтобы заработать монеты.',
        ready: 'готово',
        locked: 'закрыто',
        balance: 'Баланс',
        needed: 'Нужно',
        paidInCoins: 'Оплачено монетами',
        wheelCoupon: 'Купон колеса',
        openCodeConsole: 'Открыть консоль кода Зомби-холла',
        waterBought: 'Вода куплена',
        buyBottle: 'Купить EVIAN 0,5 л',
        tryToBuy: 'Попробовать купить',
        payoutNeeded: 'Нужна выплата Зомби-холла',
        evianCatalogue: 'Каталог EVIAN',
        visibleProducts: '30 товаров',
        officialBottleImagery: 'Официальные изображения бутылок',
        cheapestWater: 'Товар для задания',
        machinePrice: 'Цена в автомате',
        questItem: 'Товар задания',
        comingSoon: 'Скоро в продаже',
        selectedProduct: 'Выбранный товар',
        productUnavailable: 'Этот товар скоро появится в продаже. Для задания нужен EVIAN 0,5 л.',
        purchaseBlocked: 'Покупка пока заблокирована. Выполните шаги задания слева и вернитесь к этой кнопке.',
        lockNeedCode: 'Нужна выплата Зомби-холла. Получите код поставщиков, откройте холл, победите на арене и вернитесь с деньгами.',
        lockNeedPayout: 'Не хватает монет для покупки. Завершите задание в Zombie Hall, чтобы получить награду.',
        enoughReady: 'Денег хватает. Купите бутылку EVIAN.',
        needMoreCoins: (amount: number) => `Нужно еще ${amount} монет. Уничтожьте 5 зомби, чтобы получить выплату арены.`,
        wheelTitle: 'Колесо фортуны',
        wheelAria: 'Колесо фортуны',
        wheelBody: 'Испытайте свою удачу в нашем Колесе фортуны. Купоны на попытки выдаются за выполнение квестов. Все призы будут доставлены по указанному вами адресу в личном кабинете вместе с ближайшим заказом.',
        coupon: 'Купон',
        required: 'Нужен',
        attempts: 'Попытки',
        prize: 'Приз',
        phonePrize: 'ТЕЛЕФОН',
        phonePrizeStamped: 'Приз открыт',
        prizeHidden: 'Скрыто до прокрутки',
        pointerTracking: 'Указатель движется',
        prizeReveal: 'Показ приза',
        wheelStatus: 'Статус колеса',
        spinningBody: 'Секунду. Колесо выбирает результат.',
        spunBody: 'Прокрутка записана. Результат с телефоном сохранен, купон использован.',
        readyBody: 'Одна попытка доступна после покупки воды. Приз скрыт до завершения прокрутки.',
        spinning: 'Крутится',
        spinOnce: 'Крутить один раз',
        alreadyPlayed: 'Уже сыграно',
        closeWheel: 'Закрыть колесо',
        evianBottleAlt: 'Бутылка EVIAN',
        missingFragmentTip: 'Подсказка: если фрагмента не хватает, вернитесь в Sfera Hall и осмотрите карточки товаров поставщиков.',
        wheelUnlockedToast: 'Колесо открыто',
        wheelReturnToast: 'Вернитесь в Sfera Hall для 1 попытки',
        attemptUnit: 'попытка',
        cutscene: {
            openingFilm: 'Вступительный ролик',
            roleSelect: 'Выбор роли',
            hallArrival: 'Прибытие в холл',
            waterWin: 'Победа с водой',
            sferaSignal: 'Сигнал 3DSFERA',
            accessFilm: 'Фильм доступа',
            premiumSignal: 'Премиум-сигнал',
        },
        productTiers: {
            Everyday: 'Каждый день',
            Sport: 'Спорт',
            Glass: 'Стекло',
            Prestige: 'Престиж',
            Kids: 'Детям',
            Family: 'Семья',
            Pack: 'Упаковка',
            Mini: 'Мини',
            Event: 'Ивент',
            Reward: 'Награда',
        },
        productTags: {
            'Cheapest water': 'Товар для задания',
            'On the go': 'В дорогу',
            'Share size': 'Для компании',
            'Fast cap': 'Спорт-крышка',
            Dining: 'Для ужина',
            'Table service': 'Для стола',
            Premium: 'Премиум',
            'Small bottle': 'Маленькая бутылка',
            Large: 'Большая',
            Source: 'Источник',
            Bundle: 'Набор',
            Mini: 'Мини',
            Sample: 'Пробник',
            Pack: 'Пак',
            Office: 'Офис',
            'Cold shelf': 'Холодная полка',
            Pocket: 'Карманная',
            'Quick buy': 'Быстрая покупка',
            Compact: 'Компакт',
            Event: 'Ивент',
            Hall: 'Холл',
            'Delivery bonus': 'Бонус доставки',
        },
        mission: {
            couponLiveTitle: 'Купон колеса активен',
            couponLiveBody: 'Вода куплена. Вернитесь в Sfera Hall и используйте попытку Колеса фортуны.',
            hydrationCompleteTitle: 'Задание с водой завершено',
            hydrationCompleteBody: 'Покупка EVIAN записана, цепочка наград завершена.',
            buyBottleTitle: 'Купить бутылку EVIAN',
            buyBottleBody: 'Зомби-холл выдал достаточно монет. Вернитесь к автомату и купите EVIAN.',
            payoutNeededTitle: 'Нужна выплата Зомби-холла',
            payoutNeededBody: 'Автомату нужна выплата арены. Откройте Зомби-холл, завершите миссию на 5 зомби и купите воду.',
            clearHallTitle: 'Очистить Зомби-холл',
            clearHallBody: (coins: number) => {
                void coins;
                return 'Ворота приняли код поставщика. Уничтожьте 5 зомби и получите выплату арены.';
            },
            codeReadyTitle: 'Код Зомби-холла готов',
            codeReadyBody: (first: string, second: string) => `Соедините ${first} и ${second}, затем откройте ворота холла.`,
            findSecondTitle: 'Найти второй фрагмент',
            findSecondBody: 'Один фрагмент найден. Вторая половина спрятана у другого поставщика.',
            refusedTitle: 'Автомат отказал в покупке',
            refusedBody: 'Автомат закрыт. Идите к поставщикам Sfera Hall и соберите оба фрагмента кода.',
            startTitle: 'Начните у автомата',
            startBody: 'Сначала попробуйте купить EVIAN. Отказ объяснит, зачем нужен код поставщиков.',
            findWheel: 'Найти колесо',
            reviewRewards: 'Проверить награды',
            buyWater: 'Купить воду',
            enterArena: 'Войти на арену',
            enterCode: 'Ввести код Зомби-холла',
            findSupplierCode: 'Найти код поставщиков',
            openSupplierChat: 'Открыть чат поставщика',
            searchSuppliers: 'Искать поставщиков',
            tryBuyWater: 'Попробовать купить воду',
        },
    },
    zh: {
        missionStatement: '任务说明',
        missionTitle: '购买水',
        missionBody: '找到售卖机，获取供应商代码，赢得僵尸大厅奖励，然后购买 EVIAN。',
        dismissMissionStatement: '关闭任务说明',
        missionDirector: '任务导演',
        codeConsole: '僵尸大厅代码控制台',
        codeReady: '僵尸大厅代码已就绪',
        codeReadyBody: '在大厅门口打开代码控制台',
        gateAria: '僵尸大厅访问代码',
        close: '关闭',
        gateKicker: '僵尸大厅大门',
        gateTitle: '输入供应商代码',
        gateBody: '只有组合两个供应商碎片后，大厅才会打开。这是僵尸战斗前的门锁，不是饮水售卖机。',
        accessConsole: '访问控制台',
        clearanceGranted: '访问已通过。正在打开僵尸大厅...',
        codeRejected: '代码被拒绝。请检查供应商碎片。',
        awaitingCode: '等待供应商代码',
        enterCodePlaceholder: '输入代码',
        openingHall: '正在打开大厅',
        unlockHall: '解锁僵尸大厅',
        recoverBoth: '找回两个碎片',
        gateSequence: '大门序列',
        gateSent: 'G 已发送',
        supplierEvidence: '供应商证据',
        supplierEvidenceBody: '每个展馆都藏着僵尸大厅代码的一半。',
        evidenceLabel: '证据',
        combinedCode: '组合代码',
        fragmentsShort: '碎片',
        coinsShort: '金币',
        prizeShort: '奖品',
        phoneShort: '手机',
        pendingShort: '待领取',
        signalLabels: {
            locked: '锁定',
            search: '搜索',
            ready: '就绪',
            reward: '奖励',
            complete: '完成',
        },
        enter: '输入',
        firstBuyerBonus: '首位买家奖励',
        purchaseAuthorized: '购买已确认',
        evianSecured: 'EVIAN 已获得',
        purchaseBody: '金币已确认，首位买家状态已记录，幸运转盘券已在 Sfera Hall 激活。',
        paid: '已支付',
        balanceAfter: '剩余余额',
        next: '下一步',
        spinWheel: '转动转盘',
        dispenserAria: '饮水售卖机',
        hydrationTerminal: '3DSFERA 补水终端',
        buyEvian: '购买 EVIAN',
        dispenserBody: '机器只收金币。现在可以通过任务奖励获得金币。',
        cheapestItem: '任务商品',
        coins: '枚币',
        railDispenser: '已找到售卖机',
        railCode: '僵尸大厅代码',
        railPayout: '已获得竞技场奖励',
        railCoins: '金币足够',
        supplierFragments: '供应商碎片',
        fragmentsRecovered: (count: number) => `已从展馆供应商处找回 ${count}/2 个碎片。`,
        hallGate: '僵尸大厅大门',
        accessAccepted: '访问已通过。进入竞技场。',
        useSupplierCode: '在大厅入口使用供应商代码。',
        payoutTitle: '5 个僵尸和金币',
        payoutReceived: '已获得 EVIAN 的僵尸大厅奖励。',
        clearZombiesForMoney: '清理 5 个僵尸以赚取足够金币。',
        ready: '就绪',
        locked: '锁定',
        balance: '余额',
        needed: '需要',
        paidInCoins: '金币已支付',
        wheelCoupon: '转盘券',
        openCodeConsole: '打开僵尸大厅代码控制台',
        waterBought: '水已购买',
        buyBottle: '购买 EVIAN 0.5L',
        tryToBuy: '尝试购买',
        payoutNeeded: '需要僵尸大厅奖励',
        evianCatalogue: 'EVIAN 商品目录',
        visibleProducts: '30 件可见商品',
        officialBottleImagery: '官方瓶装图片',
        cheapestWater: '任务商品',
        machinePrice: '机器价格',
        questItem: '任务商品',
        comingSoon: '即将上架',
        selectedProduct: '已选商品',
        productUnavailable: '该商品即将上架。任务购买商品为 EVIAN 0.5L。',
        purchaseBlocked: '购买暂时被锁定。请完成左侧任务步骤后再回到此按钮。',
        lockNeedCode: '需要僵尸大厅奖励。获取供应商代码，解锁大厅，赢下竞技场，然后带着足够金币回来。',
        lockNeedPayout: '金币不足，无法购买。完成 Zombie Hall 任务即可获得奖励。',
        enoughReady: '金币足够。购买 EVIAN 瓶装水。',
        needMoreCoins: (amount: number) => `还需要 ${amount} 枚币。清理 5 个僵尸以完成竞技场奖励。`,
        wheelTitle: '幸运转盘',
        wheelAria: '幸运转盘',
        wheelBody: '试试你的运气。完成任务可获得转盘券，所有奖品会随最近订单配送到你的账户地址。',
        coupon: '券',
        required: '需要',
        attempts: '次数',
        prize: '奖品',
        phonePrize: '手机',
        phonePrizeStamped: '奖品已揭晓',
        prizeHidden: '转动后揭晓',
        pointerTracking: '指针追踪',
        prizeReveal: '奖品揭晓',
        wheelStatus: '转盘状态',
        spinningBody: '请稍等。转盘正在选择结果。',
        spunBody: '转盘结果已记录。手机奖品结果已保存，券已使用。',
        readyBody: '购买水后可使用一次机会。奖品会在转动结束后揭晓。',
        spinning: '转动中',
        spinOnce: '转一次',
        alreadyPlayed: '已使用',
        closeWheel: '关闭转盘',
        evianBottleAlt: 'EVIAN 瓶装水',
        missingFragmentTip: '提示：如果缺少碎片，请回到 Sfera Hall 并检查供应商商品卡片。',
        wheelUnlockedToast: '转盘已解锁',
        wheelReturnToast: '回到 Sfera Hall 可转动 1 次',
        attemptUnit: '次',
        cutscene: {
            openingFilm: '开场影片',
            roleSelect: '角色选择',
            hallArrival: '大厅抵达',
            waterWin: '买水胜利',
            sferaSignal: '3DSFERA 信号',
            accessFilm: '访问影片',
            premiumSignal: '高级信号',
        },
        productTiers: {
            Everyday: '日常',
            Sport: '运动',
            Glass: '玻璃瓶',
            Prestige: '高端',
            Kids: '儿童',
            Family: '家庭',
            Pack: '套装',
            Mini: '迷你',
            Event: '活动',
            Reward: '奖励',
        },
        productTags: {
            'Cheapest water': '任务商品',
            'On the go': '随身带',
            'Share size': '分享装',
            'Fast cap': '运动瓶盖',
            Dining: '用餐',
            'Table service': '餐桌服务',
            Premium: '高端',
            'Small bottle': '小瓶',
            Large: '大瓶',
            Source: '水源',
            Bundle: '套装',
            Mini: '迷你',
            Sample: '试饮装',
            Pack: '整包',
            Office: '办公室',
            'Cold shelf': '冷藏架',
            Pocket: '口袋装',
            'Quick buy': '快速购买',
            Compact: '紧凑装',
            Event: '活动',
            Hall: '大厅',
            'Delivery bonus': '配送奖励',
        },
        mission: {
            couponLiveTitle: '转盘券已激活',
            couponLiveBody: '水已购买。返回 Sfera Hall 使用首位买家的幸运转盘机会。',
            hydrationCompleteTitle: '买水任务完成',
            hydrationCompleteBody: 'EVIAN 购买已记录，奖励路线已完成。',
            buyBottleTitle: '购买 EVIAN 瓶装水',
            buyBottleBody: '僵尸大厅已发放足够金币。返回售卖机购买 EVIAN。',
            payoutNeededTitle: '需要僵尸大厅奖励',
            payoutNeededBody: '售卖机需要竞技场奖励记录。解锁僵尸大厅，完成 5 个僵尸任务，然后买水。',
            clearHallTitle: '清理僵尸大厅',
            clearHallBody: (coins: number) => {
                void coins;
                return '大门已接受供应商代码。清理 5 个僵尸即可获得竞技场奖励。';
            },
            codeReadyTitle: '僵尸大厅代码已就绪',
            codeReadyBody: (first: string, second: string) => `组合 ${first} 和 ${second}，然后解锁大厅大门。`,
            findSecondTitle: '寻找第二个碎片',
            findSecondBody: '已找回一个供应商碎片。另一半仍藏在另一个展馆。',
            refusedTitle: '售卖机拒绝购买',
            refusedBody: '售卖机已锁定。前往 Sfera Hall 供应商处找回两个代码碎片。',
            startTitle: '从售卖机开始',
            startBody: '先尝试购买 EVIAN。失败提示会说明为什么需要供应商代码。',
            findWheel: '寻找转盘',
            reviewRewards: '查看奖励',
            buyWater: '购买水',
            enterArena: '进入竞技场',
            enterCode: '输入僵尸大厅代码',
            findSupplierCode: '寻找供应商代码',
            openSupplierChat: '打开供应商聊天',
            searchSuppliers: '搜索供应商',
            tryBuyWater: '尝试购买水',
        },
    },
} as const;
const ARENA_ENTRANCE_EVENT_NAMES = new Set([
    'arena_nearby',
    'arena_enter',
    'arena_gate',
    'zombie_nearby',
    'zombie_hall',
    'zombie_hall_nearby',
    'zombie_room',
    'zombie_room_nearby',
    'zombiehall_nearby',
]);
type WaterFlowCopy = (typeof WATER_FLOW_COPY)[AppLanguage];

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
const ARENA_UNLOCK_KEY_CODES = ['KeyG', 'g', '71'];
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

    if (payload.event === 'portal_entered' && payload.portal === 'SferaHall') return null;

    if (payload.event === 'game_entered' && payload.game === 'ZombieArena') {
        return { ...copy.zombieArena, destinationKicker: copy.destinationKicker };
    }

    if (payload.event === 'returned_to_city') {
        return { ...copy.city, destinationKicker: copy.destinationKicker };
    }

    return null;
};

const formatMoney = (amountCents: number, unit = 'coins') =>
    `${amountCents.toLocaleString('en-US')} ${unit}`;

const EVIAN_IMAGE_BY_SIZE = {
    '0.33L': '/evian/evian-330ml.png',
    '0.5L': '/evian/evian-50cl.png',
    '0.75L': '/evian/evian-75cl.png',
    '1L': '/evian/evian-1l.png',
    '1.5L': '/evian/evian-15l.png',
} as const;

const WATER_PRODUCT_SEED = [
    { name: 'EVIAN Still Water', size: '0.5L', tier: 'Everyday', tag: 'Cheapest water' },
    { name: 'EVIAN Still Water', size: '0.75L', tier: 'Everyday', tag: 'On the go' },
    { name: 'EVIAN Still Water', size: '1L', tier: 'Everyday', tag: 'Share size' },
    { name: 'EVIAN Sport Cap', size: '0.75L', tier: 'Sport', tag: 'Fast cap' },
    { name: 'EVIAN Glass Bottle', size: '0.33L', tier: 'Glass', tag: 'Dining' },
    { name: 'EVIAN Glass Bottle', size: '0.75L', tier: 'Glass', tag: 'Table service' },
    { name: 'EVIAN Prestige', size: '0.5L', tier: 'Prestige', tag: 'Premium' },
    { name: 'EVIAN Prestige', size: '1L', tier: 'Prestige', tag: 'Premium' },
    { name: 'EVIAN Kids', size: '0.33L', tier: 'Kids', tag: 'Small bottle' },
    { name: 'EVIAN Mineral Water', size: '1.5L', tier: 'Family', tag: 'Large' },
    { name: 'EVIAN Natural Spring', size: '0.5L', tier: 'Everyday', tag: 'Source' },
    { name: 'EVIAN Natural Spring', size: '1L', tier: 'Everyday', tag: 'Source' },
    { name: 'EVIAN Multipack 6x', size: '0.5L', tier: 'Pack', tag: 'Bundle' },
    { name: 'EVIAN Multipack 12x', size: '0.5L', tier: 'Pack', tag: 'Bundle' },
    { name: 'EVIAN Multipack 6x', size: '1L', tier: 'Pack', tag: 'Bundle' },
    { name: 'EVIAN Still Water', size: '0.33L', tier: 'Everyday', tag: 'Mini' },
    { name: 'EVIAN Still Water', size: '0.25L', tier: 'Everyday', tag: 'Sample' },
    { name: 'EVIAN Glass Still', size: '0.5L', tier: 'Glass', tag: 'Dining' },
    { name: 'EVIAN Premium Glass', size: '1L', tier: 'Glass', tag: 'Premium' },
    { name: 'EVIAN Hydration Pack 4x', size: '0.5L', tier: 'Pack', tag: 'Pack' },
    { name: 'EVIAN Office Pack 24x', size: '0.5L', tier: 'Pack', tag: 'Office' },
    { name: 'EVIAN Fridge Pack 8x', size: '0.5L', tier: 'Pack', tag: 'Cold shelf' },
    { name: 'EVIAN Mini', size: '0.33L', tier: 'Mini', tag: 'Pocket' },
    { name: 'EVIAN On The Go', size: '0.5L', tier: 'Everyday', tag: 'Quick buy' },
    { name: 'EVIAN Family', size: '1.5L', tier: 'Family', tag: 'Large' },
    { name: 'EVIAN Compact', size: '0.75L', tier: 'Everyday', tag: 'Compact' },
    { name: 'EVIAN Sports Bundle 6x', size: '0.75L', tier: 'Sport', tag: 'Bundle' },
    { name: 'EVIAN Event Pack 12x', size: '0.75L', tier: 'Event', tag: 'Event' },
    { name: 'EVIAN Hall Pack 18x', size: '0.5L', tier: 'Event', tag: 'Hall' },
    { name: 'EVIAN First Buyer Pack 24x', size: '0.5L', tier: 'Reward', tag: 'Delivery bonus' },
].slice(0, GAME_RULES.water.productsToShow);

const WATER_PRODUCTS = WATER_PRODUCT_SEED.map((product, index) => ({
    id: `evian-${index + 1}`,
    ...product,
    image: EVIAN_IMAGE_BY_SIZE[product.size as keyof typeof EVIAN_IMAGE_BY_SIZE] ?? EVIAN_IMAGE_BY_SIZE['0.5L'],
    priceCoins: index === 0 ? GAME_RULES.water.bottlePriceCoins : GAME_RULES.water.bottlePriceCoins + Math.ceil((index + 1) * 7 / 10) * 10,
}));

const SUPPLIER_EVIDENCE = [
    {
        id: 'youbo',
        name: 'Zhejiang Youbo',
        piece: GAME_RULES.keys.firstHalf,
        address: 'Zhejiang Province, China, Jiaxing district, Youbo representation desk.',
        hint: 'Inspect REID bathroom products or ask in pavilion chat.',
    },
    {
        id: 'doublelin',
        name: 'Zhejiang Double Lin',
        piece: GAME_RULES.keys.secondHalf,
        address: 'Zhejiang Province, China, Jiaxing district, Double Lin representation desk.',
        hint: 'Inspect brass valve products or ask in pavilion chat.',
    },
] as const;

type QuestDirectorState = {
    kicker: string;
    title: string;
    body: string;
    destination: string;
    action: string;
    signal: 'locked' | 'search' | 'ready' | 'reward' | 'complete';
    progress: number;
};

const localizeWaterProductLabel = (dictionary: Readonly<Record<string, string>>, value: string) =>
    dictionary[value] ?? value;

type ArcadeGameId = 'pulse-runner' | 'signal-match' | 'vault-drop';

type ArcadeCopy = {
    title: string;
    eyebrow: string;
    subtitle: string;
    wallet: string;
    coinUnit: string;
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
        coinUnit: 'coins',
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
        subtitle: 'Короткие игры на реакцию и память. Выигрывайте монеты сессии, и они сразу появляются в кошельке.',
        wallet: 'Кошелек',
        coinUnit: 'монет',
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
        coinUnit: '枚币',
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

function SupplierEvidenceBoard({ pieces, compact = false, copy }: { pieces: string[]; compact?: boolean; copy: WaterFlowCopy }) {
    const foundPieces = SUPPLIER_EVIDENCE.filter((supplier) => pieces.includes(supplier.piece));
    const isComplete = foundPieces.length === SUPPLIER_EVIDENCE.length;

    return (
        <div className={compact ? 'grid gap-2' : 'grid gap-3'}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">{copy.supplierEvidence}</p>
                    {!compact && <p className="mt-1 text-xs leading-5 text-slate-400">{copy.supplierEvidenceBody}</p>}
                </div>
                <span className={`rounded-full border px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] ${
                    isComplete ? 'border-emerald-300/34 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-slate-300'
                }`}>
                    {foundPieces.length}/{SUPPLIER_EVIDENCE.length}
                </span>
            </div>

            <div className={compact ? 'grid gap-2' : 'grid gap-3 md:grid-cols-2'}>
                {SUPPLIER_EVIDENCE.map((supplier, index) => {
                    const isFound = pieces.includes(supplier.piece);
                    return (
                        <div key={supplier.id} className={`relative overflow-hidden rounded-xl border p-3 ${
                            isFound
                                ? 'border-emerald-300/28 bg-emerald-300/[0.07]'
                                : 'border-white/10 bg-white/[0.035]'
                        }`}>
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
                            <div className="relative flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{copy.evidenceLabel} {index + 1}</p>
                                    <p className="mt-1 truncate text-sm font-black text-white">{supplier.name}</p>
                                    {!compact && <p className="mt-2 text-xs leading-5 text-slate-400">{supplier.address}</p>}
                                    <p className="mt-2 text-[11px] font-semibold text-cyan-100/85">{supplier.hint}</p>
                                </div>
                                <span className={`grid h-12 w-14 shrink-0 place-items-center rounded-xl border font-mono text-base font-black ${
                                    isFound ? 'border-emerald-300/45 bg-black/30 text-emerald-100 shadow-[0_0_24px_rgba(110,231,183,0.16)]' : 'border-white/10 bg-black/30 text-white/28'
                                }`}>
                                    {isFound ? supplier.piece : '??'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={`relative overflow-hidden rounded-xl border p-3 ${
                isComplete ? 'border-cyan-200/28 bg-cyan-300/[0.08]' : 'border-white/10 bg-black/25'
            }`}>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{copy.combinedCode}</span>
                    <span className={`font-mono text-sm font-black ${isComplete ? 'text-cyan-100' : 'text-white/30'}`}>
                        {isComplete ? `${GAME_RULES.keys.firstHalf} + ${GAME_RULES.keys.secondHalf} = ${GAME_RULES.keys.arenaPassword}` : copy.recoverBoth}
                    </span>
                </div>
            </div>
        </div>
    );
}

function QuestDirectorOverlay({
    state,
    pieces,
    walletBalanceCents,
    coupon,
    copy,
    onOpenPassword,
}: {
    state: QuestDirectorState;
    pieces: string[];
    walletBalanceCents: number;
    coupon: string | null;
    copy: WaterFlowCopy;
    onOpenPassword: () => void;
}) {
    const signalClass = {
        locked: 'border-rose-300/28 bg-rose-300/[0.08] text-rose-100',
        search: 'border-cyan-300/24 bg-cyan-300/[0.07] text-cyan-100',
        ready: 'border-amber-300/28 bg-amber-300/[0.08] text-amber-100',
        reward: 'border-emerald-300/28 bg-emerald-300/[0.08] text-emerald-100',
        complete: 'border-fuchsia-300/28 bg-fuchsia-300/[0.08] text-fuchsia-100',
    }[state.signal];
    const signalLabel = copy.signalLabels[state.signal];
    const canOpenCode = state.action === copy.mission.enterCode;
    const canAffordWater = walletBalanceCents >= GAME_RULES.water.bottlePriceCoins;

    return (
        <div className="pointer-events-auto w-[min(92vw,21rem)] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#031018]/72 text-white shadow-[0_18px_58px_rgba(0,0,0,0.34)] backdrop-blur-md">
            <div className="relative p-3">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(102,217,203,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.055),transparent_42%)]" />
                <div className="relative flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-300/24 bg-cyan-300/10 text-cyan-100 shadow-[0_0_30px_rgba(102,217,203,0.18)]">
                        <Activity className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100">{state.kicker}</p>
                            <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${signalClass}`}>
                                {signalLabel}
                            </span>
                        </div>
                        <h3 className="mt-1 truncate text-base font-black leading-tight">{state.title}</h3>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-300">{state.body}</p>
                    </div>
                </div>
                <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#66d9cb,#f5c766,#a78bfa)] shadow-[0_0_18px_rgba(102,217,203,0.42)] transition-all duration-700" style={{ width: `${state.progress}%` }} />
                </div>
            </div>

            <div className="grid gap-2 border-t border-white/10 p-2.5">
                <div className="grid grid-cols-3 gap-1.5">
                    <div className={`rounded-xl border px-2 py-2 ${pieces.length >= 2 ? 'border-emerald-300/24 bg-emerald-300/[0.07]' : 'border-white/10 bg-white/[0.035]'}`}>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{copy.fragmentsShort}</p>
                        <p className="mt-1 font-mono text-sm font-black">{pieces.length}/2</p>
                    </div>
                    <div className={`rounded-xl border px-2 py-2 ${canAffordWater ? 'border-emerald-300/24 bg-emerald-300/[0.07]' : 'border-white/10 bg-white/[0.035]'}`}>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{copy.coinsShort}</p>
                        <p className="mt-1 truncate font-mono text-sm font-black">{Math.min(walletBalanceCents, GAME_RULES.water.bottlePriceCoins)}/{GAME_RULES.water.bottlePriceCoins}</p>
                    </div>
                    <div className={`rounded-xl border px-2 py-2 ${coupon ? 'border-amber-300/24 bg-amber-300/[0.07]' : 'border-white/10 bg-white/[0.035]'}`}>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{copy.prizeShort}</p>
                        <p className="mt-1 truncate font-mono text-sm font-black">{coupon ? copy.phoneShort : copy.pendingShort}</p>
                    </div>
                </div>

                {canOpenCode && (
                    <div className="rounded-xl border border-amber-300/22 bg-amber-300/[0.075] px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100">{copy.codeConsole}</p>
                        <div className="mt-1 flex items-center gap-2 font-mono text-sm font-black text-white">
                            <span>{GAME_RULES.keys.firstHalf}</span>
                            <span className="text-slate-500">+</span>
                            <span>{GAME_RULES.keys.secondHalf}</span>
                            <span className="text-slate-500">=</span>
                            <span className="text-amber-100">{GAME_RULES.keys.arenaPassword}</span>
                        </div>
                    </div>
                )}

                {canOpenCode && (
                    <button
                        type="button"
                        onClick={onOpenPassword}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f5c766,#66d9cb)] px-3 py-2.5 text-xs font-black uppercase tracking-[0.13em] text-slate-950 shadow-[0_18px_44px_rgba(245,199,102,0.16)] transition hover:scale-[1.01]"
                    >
                        <KeyRound className="h-4 w-4" />
                        {state.action}
                    </button>
                )}
            </div>
        </div>
    );
}

function ZombieHallCodePrompt({ copy, onOpenPassword }: { copy: WaterFlowCopy; onOpenPassword: () => void }) {
    return (
        <button
            type="button"
            onClick={onOpenPassword}
            className="pointer-events-auto sfera-reward-pop flex w-[min(92vw,28rem)] items-center gap-3 overflow-hidden rounded-2xl border border-amber-300/28 bg-[#140f05]/82 p-3 text-left text-white shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-md transition hover:border-amber-200/48 hover:bg-amber-300/[0.12]"
        >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/26 bg-amber-300/10 text-amber-100">
                <KeyRound className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-amber-100">{copy.codeReady}</span>
                <span className="mt-0.5 block truncate text-sm font-black text-white">{copy.codeReadyBody}</span>
                <span className="mt-1 flex items-center gap-1.5 font-mono text-[11px] font-black text-slate-300">
                    <span>{GAME_RULES.keys.firstHalf}</span>
                    <span>+</span>
                    <span>{GAME_RULES.keys.secondHalf}</span>
                    <span>=</span>
                    <span className="text-amber-100">{GAME_RULES.keys.arenaPassword}</span>
                </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
                {copy.enter}
                <ArrowRight className="h-3 w-3" />
            </span>
        </button>
    );
}

function OpeningMissionStatement({ copy, onDismiss }: { copy: WaterFlowCopy; onDismiss: () => void }) {
    return (
        <div className="pointer-events-auto sfera-reward-pop w-[min(92vw,34rem)] overflow-hidden rounded-2xl border border-cyan-300/24 bg-[#031018]/88 text-white shadow-[0_26px_86px_rgba(0,0,0,0.48)] backdrop-blur-md">
            <div className="relative p-4">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(102,217,203,0.28),transparent_38%),radial-gradient(circle_at_90%_110%,rgba(245,199,102,0.18),transparent_34%)]" />
                <button type="button" onClick={onDismiss} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/32 text-slate-300 transition hover:text-white" aria-label={copy.dismissMissionStatement}>
                    <X className="h-4 w-4" />
                </button>
                <div className="relative flex items-start gap-3 pr-8">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-300/26 bg-cyan-300/10 text-cyan-100">
                        <Droplets className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">{copy.missionStatement}</p>
                        <h2 className="mt-1 text-2xl font-black leading-tight">{copy.missionTitle}</h2>
                        <p className="mt-2 text-sm leading-5 text-slate-300">
                            {copy.missionBody}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function WaterPurchaseCeremony({ copy, walletBalanceCents }: { copy: WaterFlowCopy; walletBalanceCents: number }) {
    const balanceAfter = Math.max(0, walletBalanceCents - GAME_RULES.water.bottlePriceCoins);

    return (
        <div className="pointer-events-auto absolute inset-0 z-[118] grid place-items-center bg-[#02050b]/86 p-4 text-white backdrop-blur-md">
            <section className="sfera-reward-pop relative w-[min(100%,46rem)] overflow-hidden rounded-2xl border border-cyan-200/24 bg-[#071018]/96 p-6 text-center shadow-[0_44px_150px_rgba(0,0,0,0.72)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(102,217,203,0.26),transparent_34%),radial-gradient(circle_at_70%_80%,rgba(245,199,102,0.16),transparent_34%)]" />
                <div className="relative mx-auto grid h-56 w-56 place-items-center">
                    <div className="absolute inset-0 rounded-full border border-cyan-200/16 bg-cyan-200/[0.04] shadow-[0_0_90px_rgba(102,217,203,0.22)]" />
                    <div className="absolute inset-8 animate-spin rounded-full border border-dashed border-cyan-200/30" />
                    <Image src="/evian/evian-50cl.png" alt={copy.evianBottleAlt} width={92} height={220} className="relative max-h-52 w-auto drop-shadow-[0_34px_55px_rgba(0,0,0,0.7)]" priority />
                </div>
                <div className="relative mt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">{copy.purchaseAuthorized}</p>
                    <h2 className="mt-2 text-4xl font-black leading-tight">{copy.evianSecured}</h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">{copy.purchaseBody}</p>
                </div>
                <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{copy.paid}</p>
                        <p className="mt-1 font-mono text-lg font-black text-cyan-100">{GAME_RULES.water.bottlePriceCoins}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{copy.balanceAfter}</p>
                        <p className="mt-1 font-mono text-lg font-black text-white">{formatMoney(balanceAfter, copy.coins)}</p>
                    </div>
                    <div className="rounded-xl border border-amber-300/22 bg-amber-300/[0.07] px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">{copy.next}</p>
                        <p className="mt-1 text-sm font-black text-white">{copy.spinWheel}</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function CutsceneCinematicOverlay({ tone, label, copy }: { tone: 'opening' | 'hall' | 'water'; label: string; copy: WaterFlowCopy }) {
    const toneClass = {
        opening: 'border-cyan-200/18 text-cyan-100',
        hall: 'border-fuchsia-200/18 text-fuchsia-100',
        water: 'border-amber-200/22 text-amber-100',
    }[tone];
    const glowClass = {
        opening: 'from-cyan-200/80 via-cyan-200/18',
        hall: 'from-fuchsia-200/80 via-cyan-200/18',
        water: 'from-amber-200/80 via-cyan-200/18',
    }[tone];

    return (
        <>
            <div className="pointer-events-none absolute inset-0 z-[4] bg-[radial-gradient(circle_at_50%_42%,transparent_0%,transparent_48%,rgba(0,0,0,0.34)_76%,rgba(0,0,0,0.72)_100%)]" />
            <div className="grain-overlay z-[5] opacity-[0.075]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-[clamp(3.25rem,7vh,5.25rem)] bg-gradient-to-b from-black/78 via-black/34 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-[clamp(5.5rem,14vh,8.5rem)] bg-gradient-to-t from-black/88 via-black/42 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 z-[7] h-[34vh] w-[min(44vw,34rem)] bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.86),rgba(0,0,0,0.42)_42%,transparent_72%)]" />
            <div className="pointer-events-none absolute bottom-8 right-4 z-[20] hidden h-32 w-32 rounded-2xl border border-white/8 bg-black/72 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:block" />
            <div className={`pointer-events-none absolute bottom-5 left-4 z-[21] hidden w-[min(38vw,17rem)] overflow-hidden rounded-r-2xl border-y border-r bg-black/82 px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.5)] backdrop-blur-md sm:block ${toneClass}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.08] via-white/[0.02] to-transparent" />
                <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-white/72">{copy.cutscene.sferaSignal}</p>
                        <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.18em]">{label}</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/14 bg-white/[0.06]">
                        <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
                    </span>
                </div>
                <div className="relative mt-3 h-px overflow-hidden rounded-full bg-white/12">
                    <span className={`absolute inset-y-0 left-0 w-2/3 animate-[shimmer_2.4s_linear_infinite] bg-gradient-to-r ${glowClass} to-transparent`} />
                </div>
            </div>
            <div className="pointer-events-none absolute bottom-5 right-4 z-[21] hidden w-[min(26vw,13rem)] overflow-hidden rounded-l-2xl border-y border-l border-white/12 bg-black/64 px-4 py-3 text-right text-white shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-md sm:block">
                <div className="absolute inset-0 bg-gradient-to-l from-white/[0.08] via-white/[0.02] to-transparent" />
                <p className="relative text-[9px] font-black uppercase tracking-[0.22em] text-white/70">{copy.cutscene.accessFilm}</p>
                <p className="relative mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-white">{copy.cutscene.premiumSignal}</p>
                <div className="relative mt-3 ml-auto grid w-20 grid-cols-5 gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <span key={index} className="h-1 rounded-full bg-white/20" />
                    ))}
                </div>
            </div>
        </>
    );
}

function ArenaPasswordOverlay({
    copy,
    pieces,
    onClose,
    onSubmit,
}: {
    copy: WaterFlowCopy;
    pieces: string[];
    onClose: () => void;
    onSubmit: (password: string) => void;
}) {
    const [password, setPassword] = useState('');
    const [terminalState, setTerminalState] = useState<'idle' | 'denied' | 'accepted'>('idle');
    const unlockTimerRef = useRef<number | null>(null);
    const normalized = password.trim().toUpperCase().replace(/\s+/g, '');
    const expected = GAME_RULES.keys.arenaPassword;
    const hasAllFragments = SUPPLIER_EVIDENCE.every((supplier) => pieces.includes(supplier.piece));
    const matchedCount = normalized
        .split('')
        .filter((char, index) => expected[index] === char).length;
    const progress = Math.min(100, Math.round((matchedCount / expected.length) * 100));
    const isComplete = normalized === expected;
    const canUnlock = isComplete && hasAllFragments;
    const inputCells = Array.from({ length: expected.length }, (_, index) => normalized[index] ?? '');
    const terminalLabel = terminalState === 'accepted'
        ? copy.clearanceGranted
        : terminalState === 'denied'
            ? copy.codeRejected
            : copy.awaitingCode;

    useEffect(() => {
        return () => {
            if (unlockTimerRef.current !== null) {
                window.clearTimeout(unlockTimerRef.current);
            }
        };
    }, []);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (terminalState === 'accepted') return;

        if (canUnlock) {
            setTerminalState('accepted');
            unlockTimerRef.current = window.setTimeout(() => {
                onSubmit(password);
            }, 1250);
            return;
        }

        setTerminalState('denied');
        onSubmit(password);
        window.setTimeout(() => setTerminalState('idle'), 900);
    };

    return (
        <div className={`absolute inset-0 z-[96] grid place-items-center bg-[#01040a]/84 p-4 text-white backdrop-blur-md pointer-events-auto ${terminalState === 'denied' ? 'animate-pulse' : ''}`} role="dialog" aria-modal="true" aria-label={copy.gateAria}>
            <section className={`sfera-reward-pop relative grid max-h-[calc(100vh-2rem)] w-[min(100%,62rem)] overflow-hidden rounded-2xl border bg-[#050914]/96 shadow-[0_44px_150px_rgba(0,0,0,0.72)] transition ${
                terminalState === 'accepted'
                    ? 'border-emerald-300/38'
                    : terminalState === 'denied'
                        ? 'border-rose-300/38'
                        : 'border-cyan-200/22'
            } lg:grid-cols-[1fr_1.08fr]`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(102,217,203,0.24),transparent_32%),radial-gradient(circle_at_90%_18%,rgba(244,63,94,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
                <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-slate-300 transition hover:text-white" aria-label={copy.close}>
                    <X className="h-4 w-4" />
                </button>

                <div className="relative border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
                    <div className="flex items-start gap-3 pr-8">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_34px_rgba(102,217,203,0.24)]">
                            <LockKeyhole className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">{copy.gateKicker}</p>
                            <h2 className="mt-1 text-3xl font-black leading-tight">{copy.gateTitle}</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{copy.gateBody}</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <SupplierEvidenceBoard pieces={pieces} copy={copy} />
                    </div>
                </div>

                <div className="relative flex min-h-0 flex-col justify-center p-5 lg:p-6">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-100">{copy.accessConsole}</p>
                                <p className={`mt-1 text-sm ${terminalState === 'denied' ? 'text-rose-100' : terminalState === 'accepted' ? 'text-emerald-100' : 'text-slate-300'}`}>{terminalLabel}</p>
                            </div>
                            <ShieldCheck className={`h-6 w-6 ${isComplete ? 'text-emerald-200' : 'text-cyan-100'}`} />
                        </div>
                        <form
                            className="mt-4"
                            onSubmit={handleSubmit}
                        >
                            <div className="grid grid-cols-4 gap-2">
                                {inputCells.map((char, index) => {
                                    const isMatched = expected[index] === char;
                                    const hasChar = Boolean(char);
                                    return (
                                        <span key={index} className={`grid h-14 place-items-center rounded-xl border bg-black/35 font-mono text-2xl font-black transition ${
                                            isMatched
                                                ? 'border-emerald-300/50 text-emerald-100 shadow-[0_0_24px_rgba(110,231,183,0.18)]'
                                                : hasChar
                                                    ? 'border-amber-300/45 text-amber-100'
                                                    : 'border-white/10 text-white/18'
                                        }`}>
                                            {char || '-'}
                                        </span>
                                    );
                                })}
                            </div>
                            <input
                                value={password}
                                onChange={(event) => setPassword(event.target.value.toUpperCase())}
                                autoFocus
                                maxLength={8}
                                placeholder={copy.enterCodePlaceholder}
                                disabled={terminalState === 'accepted'}
                                className="mt-3 w-full rounded-xl border border-cyan-300/22 bg-black/45 px-4 py-4 font-mono text-xl font-black uppercase tracking-[0.28em] text-white outline-none transition placeholder:text-white/22 focus:border-cyan-200/70 focus:bg-black/62 disabled:opacity-60"
                            />
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                                <div className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.7)]' : 'bg-cyan-300/80'}`} style={{ width: `${progress}%` }} />
                            </div>
                            <button type="submit" disabled={terminalState === 'accepted'} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#66d9cb,#d8fff9)] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70">
                                <KeyRound className="h-4 w-4" />
                                {terminalState === 'accepted' ? copy.openingHall : hasAllFragments ? copy.unlockHall : copy.recoverBoth}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </form>
                    </div>

                    {terminalState === 'accepted' && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-300/24 bg-emerald-300/[0.08] p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">{copy.gateSequence}</span>
                                <span className="font-mono text-xs font-black text-emerald-100">{copy.gateSent}</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full w-full animate-pulse rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.55)]" />
                            </div>
                        </div>
                    )}

                    <p className="mt-4 text-center text-xs leading-5 text-slate-400">{copy.missingFragmentTip}</p>
                </div>
            </section>
        </div>
    );
}

function WaterDispenserOverlay({
    copy,
    walletBalanceCents,
    hasArenaAccess,
    hasArenaPayout,
    waterPurchased,
    onClose,
    onAttempt,
    onBuy,
    onOpenPassword,
}: {
    copy: WaterFlowCopy;
    walletBalanceCents: number;
    hasArenaAccess: boolean;
    hasArenaPayout: boolean;
    waterPurchased: boolean;
    onClose: () => void;
    onAttempt: () => void;
    onBuy: () => void;
    onOpenPassword: () => void;
}) {
    const [selectedProductId, setSelectedProductId] = useState(WATER_PRODUCTS[0]?.id ?? '');
    const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
    const selectedProductIndex = Math.max(0, WATER_PRODUCTS.findIndex((product) => product.id === selectedProductId));
    const selectedProduct = WATER_PRODUCTS[selectedProductIndex] ?? WATER_PRODUCTS[0];
    const isQuestProductSelected = selectedProductIndex === 0;
    const canAfford = walletBalanceCents >= GAME_RULES.water.bottlePriceCoins;
    const canBuy = isQuestProductSelected && hasArenaPayout && canAfford && !waterPurchased;
    const questRail = [
        { label: copy.railDispenser, complete: true },
        { label: copy.railCode, complete: hasArenaAccess },
        { label: copy.railPayout, complete: hasArenaPayout },
        { label: copy.railCoins, complete: canAfford },
    ];
    const lockHint = !isQuestProductSelected
        ? copy.productUnavailable
        : !hasArenaAccess
        ? copy.lockNeedCode
        : !hasArenaPayout
            ? copy.lockNeedPayout
            : !canAfford
            ? copy.needMoreCoins(GAME_RULES.water.bottlePriceCoins - walletBalanceCents)
            : copy.enoughReady;
    const selectedProductTier = localizeWaterProductLabel(copy.productTiers, selectedProduct.tier);

    return (
        <div className="absolute inset-0 z-[94] grid place-items-center bg-[#01040a]/78 p-3 text-white backdrop-blur-md pointer-events-auto sm:p-4" role="dialog" aria-modal="true" aria-label={copy.dispenserAria}>
            <section className="sfera-reward-pop grid max-h-[calc(100vh-1.25rem)] w-[min(100%,74rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#071018]/96 shadow-[0_44px_150px_rgba(0,0,0,0.72)] lg:grid-cols-[1fr_1.18fr]">
                <div className="relative overflow-hidden border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
                    <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-slate-300 transition hover:text-white" aria-label={copy.close}>
                        <X className="h-4 w-4" />
                    </button>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(102,217,203,0.24),transparent_34%),radial-gradient(circle_at_75%_70%,rgba(244,63,94,0.13),transparent_32%),linear-gradient(160deg,rgba(255,255,255,0.05),transparent_45%)]" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(102,217,203,0.1),transparent)]" />
                    <div className="relative flex h-full flex-col">
                        <div className="flex items-start gap-4 pr-8">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_34px_rgba(102,217,203,0.22)]">
                                <Droplets className="h-6 w-6" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">{copy.hydrationTerminal}</p>
                                <h2 className="mt-1 text-4xl font-black leading-none tracking-tight">{copy.buyEvian}</h2>
                                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{copy.dispenserBody}</p>
                            </div>
                        </div>

                        <div className="relative mt-6 grid min-h-[14rem] place-items-center overflow-hidden rounded-2xl border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(220,252,255,0.08),rgba(2,6,23,0.18))]">
                            <div className="absolute inset-x-8 bottom-4 h-16 rounded-full bg-cyan-200/14 blur-2xl" />
                            <div className="absolute inset-0 bg-[url('/evian/evian-teaser.jpg')] bg-cover bg-center opacity-[0.18]" />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.76),rgba(2,6,23,0.16),rgba(2,6,23,0.76))]" />
                            <div className="relative flex items-end justify-center gap-5 py-5">
                                <div className="h-48 w-24 bg-contain bg-center bg-no-repeat drop-shadow-[0_28px_45px_rgba(0,0,0,0.65)]" style={{ backgroundImage: `url('${selectedProduct.image}')` }} />
                                <div className="mb-4 hidden rounded-2xl border border-white/10 bg-black/38 p-4 backdrop-blur sm:block">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">{isQuestProductSelected ? copy.questItem : copy.selectedProduct}</p>
                                    <p className="mt-1 text-xl font-black text-white">{selectedProduct.name}</p>
                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{selectedProduct.size} / {selectedProductTier}</p>
                                    {isQuestProductSelected ? (
                                        <>
                                            <p className="mt-1 font-mono text-3xl font-black text-cyan-100">{GAME_RULES.water.bottlePriceCoins}</p>
                                            <p className="text-xs text-slate-400">{copy.coins}</p>
                                        </>
                                    ) : (
                                        <p className="mt-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-200">{copy.comingSoon}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2">
                            {questRail.map((item, index) => (
                                <div key={item.label} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                                    item.complete ? 'border-emerald-300/24 bg-emerald-300/[0.065]' : 'border-white/10 bg-white/[0.04]'
                                }`}>
                                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-black ${
                                        item.complete ? 'border-emerald-300/45 bg-emerald-300/14 text-emerald-100' : 'border-white/12 bg-black/25 text-white/34'
                                    }`}>
                                        {item.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                                    </span>
                                    <span className="min-w-0 flex-1 text-sm font-bold text-slate-100">{item.label}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${item.complete ? 'text-emerald-100' : 'text-slate-500'}`}>{item.complete ? copy.ready : copy.locked}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/24 p-3 sm:grid-cols-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{copy.balance}</p>
                                <p className="mt-1 font-mono text-lg font-black text-white">{formatMoney(walletBalanceCents, copy.coins)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{copy.needed}</p>
                                <p className={canAfford ? 'mt-1 truncate font-mono text-sm font-black text-emerald-100' : 'mt-1 font-bold text-amber-100'}>{canAfford ? copy.paidInCoins : `${GAME_RULES.water.bottlePriceCoins} ${copy.coins}`}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{copy.firstBuyerBonus}</p>
                                <p className="mt-1 text-sm font-black text-amber-100">{copy.wheelCoupon}</p>
                            </div>
                        </div>

                        {!hasArenaAccess && (
                            <button type="button" onClick={onOpenPassword} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-black uppercase tracking-[0.13em] text-amber-100 transition hover:bg-amber-300/16">
                                <KeyRound className="h-4 w-4" />
                                {copy.openCodeConsole}
                            </button>
                        )}
                        {(purchaseNotice || (!canBuy && !waterPurchased)) && (
                            <p className="mt-3 rounded-xl border border-amber-300/18 bg-amber-300/[0.075] px-3 py-2 text-xs leading-5 text-amber-100/95">
                                {purchaseNotice ?? lockHint}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (!isQuestProductSelected) {
                                    setPurchaseNotice(copy.productUnavailable);
                                    return;
                                }
                                if (!canBuy) {
                                    setPurchaseNotice(copy.purchaseBlocked);
                                }
                                onAttempt();
                                if (canBuy) onBuy();
                            }}
                            disabled={waterPurchased}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#66d9cb,#d8fff9)] px-4 py-3 text-sm font-black uppercase tracking-[0.13em] text-slate-950 shadow-[0_18px_48px_rgba(102,217,203,0.2)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            {waterPurchased ? copy.waterBought : !isQuestProductSelected ? copy.comingSoon : canBuy ? copy.buyBottle : copy.tryToBuy}
                        </button>
                    </div>
                </div>
                <div className="min-h-0 touch-pan-y overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent)] p-4 lg:p-5" onWheel={(event) => event.stopPropagation()}>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">{copy.evianCatalogue}</p>
                            <h3 className="mt-1 text-2xl font-black text-white">{copy.visibleProducts}</h3>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                            <Package className="h-3.5 w-3.5 text-cyan-100" />
                            {copy.officialBottleImagery}
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {WATER_PRODUCTS.map((product, index) => {
                            const productTag = localizeWaterProductLabel(copy.productTags, product.tag);
                            const productTier = localizeWaterProductLabel(copy.productTiers, product.tier);

                            const isSelected = selectedProduct.id === product.id;

                            return (
                                <button key={product.id} type="button" onClick={() => {
                                    setSelectedProductId(product.id);
                                    setPurchaseNotice(index === 0 ? null : copy.productUnavailable);
                                }} className={`group relative min-h-[10.5rem] overflow-hidden rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${
                                    isSelected
                                        ? 'border-cyan-200/55 bg-cyan-300/[0.105] shadow-[0_0_38px_rgba(102,217,203,0.18)]'
                                        : index === 0
                                            ? 'border-cyan-300/38 bg-cyan-300/[0.085] shadow-[0_0_34px_rgba(102,217,203,0.12)]'
                                            : 'border-white/10 bg-white/[0.035] hover:border-cyan-200/24 hover:bg-cyan-300/[0.045]'
                                }`}>
                                    <div className="absolute right-2 top-2 h-28 w-20 bg-contain bg-center bg-no-repeat opacity-90 transition group-hover:scale-105" style={{ backgroundImage: `url('${product.image}')` }} />
                                    <div className="relative flex min-h-[8.8rem] flex-col justify-between pr-16">
                                        <div>
                                            <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                                                index === 0 ? 'border-cyan-200/40 bg-cyan-200/12 text-cyan-100' : 'border-white/10 bg-black/24 text-slate-300'
                                            }`}>
                                                {index === 0 ? copy.questItem : productTag}
                                            </span>
                                            <p className="mt-3 text-sm font-black leading-tight text-white">{product.name}</p>
                                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{product.size} / {productTier}</p>
                                        </div>
                                        <div className="flex items-end justify-between gap-2">
                                            <div>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{index === 0 ? copy.machinePrice : copy.comingSoon}</p>
                                                    <p className="font-mono text-lg font-black text-cyan-100">{index === 0 ? product.priceCoins : '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}

function WheelOverlay({
    copy,
    spinsRemaining,
    coupon,
    onClose,
    onSpin,
}: {
    copy: WaterFlowCopy;
    spinsRemaining: number;
    coupon: string | null;
    onClose: () => void;
    onSpin: () => void;
}) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [hasSpun, setHasSpun] = useState(false);
    const [wheelRotation, setWheelRotation] = useState(0);
    const wheelTicks = Array.from({ length: 18 }, (_, index) => index);
    const phonePrizeRotation = 2850;

    const spin = () => {
        if (spinsRemaining <= 0 || isSpinning || hasSpun) return;
        setIsSpinning(true);
        setWheelRotation((current) => current + phonePrizeRotation);
        window.setTimeout(() => {
            setIsSpinning(false);
            setHasSpun(true);
            onSpin();
        }, 2400);
    };

    return (
        <div className="absolute inset-0 z-[95] grid place-items-center bg-[#02040a]/82 p-4 text-white backdrop-blur-md pointer-events-auto" role="dialog" aria-modal="true" aria-label={copy.wheelAria}>
            <section className="sfera-reward-pop relative grid max-h-[calc(100vh-2rem)] w-[min(100%,64rem)] overflow-hidden rounded-2xl border border-amber-300/22 bg-[#0a1018]/96 text-center shadow-[0_44px_150px_rgba(0,0,0,0.72)] lg:grid-cols-[1.05fr_0.95fr]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(245,199,102,0.18),transparent_34%),radial-gradient(circle_at_75%_65%,rgba(102,217,203,0.12),transparent_32%)]" />
                <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-slate-300 transition hover:text-white" aria-label={copy.closeWheel}>
                    <X className="h-4 w-4" />
                </button>

                <div className="relative grid place-items-center p-5 lg:p-7">
                    <div className={`pointer-events-none absolute left-1/2 top-5 z-10 h-0 w-0 -translate-x-1/2 border-x-[18px] border-t-[34px] border-x-transparent border-t-amber-200 drop-shadow-[0_0_18px_rgba(245,199,102,0.65)] ${isSpinning ? 'animate-bounce' : ''}`} />
                    <div className="relative grid h-[min(74vw,30rem)] w-[min(74vw,30rem)] place-items-center">
                        <div className={`absolute inset-0 rounded-full border border-amber-200/22 bg-amber-200/5 shadow-[0_0_100px_rgba(245,199,102,0.18)] ${isSpinning ? 'animate-pulse' : ''}`} />
                        <div className={`absolute inset-3 rounded-full border border-cyan-200/16 ${isSpinning ? 'animate-[spin_5s_linear_infinite]' : ''}`} />
                        <div className={`pointer-events-none absolute inset-2 rounded-full border border-dashed border-amber-100/24 ${isSpinning ? 'animate-[spin_2.2s_linear_infinite_reverse]' : ''}`} />
                        {wheelTicks.map((tick) => (
                            <span
                                key={tick}
                                className={`absolute left-1/2 top-1/2 h-2 w-1 rounded-full ${tick % 3 === 0 ? 'bg-amber-100' : 'bg-cyan-100/60'} shadow-[0_0_14px_rgba(245,199,102,0.35)]`}
                                style={{ transform: `rotate(${tick * 20}deg) translateY(calc(-1 * min(34vw, 13.8rem)))` }}
                            />
                        ))}
                        <div
                            className="relative h-[88%] w-[88%] overflow-hidden rounded-full shadow-[0_0_80px_rgba(245,199,102,0.26)] transition-transform duration-[2400ms] ease-[cubic-bezier(0.16,0.84,0.22,1)] will-change-transform"
                            style={{ transform: `rotate(${wheelRotation}deg)` }}
                        >
                            <Image src="/wheeloffortune.jpg" alt={copy.wheelTitle} fill sizes="(max-width: 768px) 74vw, 30rem" className="object-cover" />
                            <div className={`pointer-events-none absolute inset-0 bg-[conic-gradient(from_90deg,rgba(255,255,255,0.18),transparent_16%,rgba(255,255,255,0.12)_22%,transparent_42%,rgba(255,255,255,0.16)_58%,transparent_76%)] mix-blend-screen ${isSpinning ? 'opacity-90' : 'opacity-35'}`} />
                        </div>
                        <div className="absolute grid h-20 w-20 place-items-center rounded-full border border-white/18 bg-black/70 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur">
                            <Sparkles className={`h-8 w-8 ${hasSpun ? 'text-emerald-200' : 'text-amber-100'}`} />
                        </div>
                        {hasSpun && (
                            <div className="pointer-events-none absolute inset-0">
                                {wheelTicks.slice(0, 12).map((tick) => (
                                    <span
                                        key={tick}
                                        className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-emerald-200 shadow-[0_0_16px_rgba(110,231,183,0.8)]"
                                        style={{ transform: `rotate(${tick * 30}deg) translateY(calc(-1 * min(36vw, 14.8rem)))` }}
                                    />
                                ))}
                            </div>
                        )}
                        {hasSpun && (
                            <div className="pointer-events-none absolute -bottom-1 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 shadow-[0_0_30px_rgba(110,231,183,0.2)]">
                                {copy.phonePrizeStamped}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative flex flex-col justify-center border-t border-white/10 p-5 text-left lg:border-l lg:border-t-0 lg:p-7">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">{copy.firstBuyerBonus}</p>
                    <h2 className="mt-2 text-4xl font-black leading-tight">{copy.wheelTitle}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{copy.wheelBody}</p>
                    <div className="mt-5 grid gap-2">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-300/18 bg-cyan-300/[0.06] px-3 py-3">
                            <span className="inline-flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                                <Ticket className="h-4 w-4" />
                                {copy.coupon}
                            </span>
                            <span className="truncate font-mono text-sm font-black text-white">{coupon ?? copy.required}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3">
                            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">{copy.attempts}</span>
                            <span className="font-mono text-sm font-black text-amber-100">{spinsRemaining} / {GAME_RULES.wheel.maxSpins}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/18 bg-amber-300/[0.06] px-3 py-3">
                            <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">{copy.prize}</span>
                            <span className="font-mono text-sm font-black text-white">{hasSpun ? copy.phonePrize : copy.prizeHidden}</span>
                        </div>
                    </div>
                    <div className={`mt-4 rounded-xl border p-3 transition ${
                        isSpinning
                            ? 'border-amber-300/30 bg-amber-300/[0.09] text-amber-100'
                            : hasSpun
                                ? 'border-emerald-300/24 bg-emerald-300/[0.08] text-emerald-100'
                                : 'border-white/10 bg-white/[0.04] text-slate-300'
                    }`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">{isSpinning ? copy.pointerTracking : hasSpun ? copy.prizeReveal : copy.wheelStatus}</p>
                        <p className="mt-1 text-sm font-bold">
                            {isSpinning
                                ? copy.spinningBody
                                : hasSpun
                                    ? copy.spunBody
                                    : copy.readyBody}
                        </p>
                    </div>
                    <button type="button" onClick={spin} disabled={spinsRemaining <= 0 || isSpinning || hasSpun || !coupon} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f5c766,#66d9cb)] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_18px_48px_rgba(245,199,102,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45">
                        <RotateCw className="h-4 w-4" />
                        {spinsRemaining > 0 && !hasSpun ? (isSpinning ? copy.spinning : copy.spinOnce) : copy.alreadyPlayed}
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/[0.08]">
                        {copy.closeWheel}
                    </button>
                </div>
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
                                <p className="mt-1 text-3xl font-black text-white">{formatMoney(walletBalanceCents, copy.coinUnit)}</p>
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
                                            <span>{snakeScore} {copy.coinUnit}</span>
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
                                            {result.amountCents > 0 ? `${copy.cashAdded}: ${formatMoney(result.amountCents, copy.coinUnit)}` : activeCopy.mechanic}
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
                                        <span className="font-mono text-sm font-black text-emerald-100">+{formatMoney(transaction.amountCents, copy.coinUnit)}</span>
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
    const waterFlowCopy = WATER_FLOW_COPY[language];
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
    const isZombieArenaCleared = isZombieArenaActive && unrealBridge.zombieKills >= 5;
    const sceneInstruction = isZombieArenaActive ? ui.zombieInstruction : ui.instruction;
    const emitQuestEvent = useCallback((event: QuestEventInput) => {
        unrealBridge.handleUnrealResponse(JSON.stringify(event));
        if (
            event.event === 'pavilion_product_viewed' &&
            (event.pavilionId === 'youbo' || event.pavilionId === 'doublelin')
        ) {
            const piece = event.pavilionId === 'youbo'
                ? GAME_RULES.keys.firstHalf
                : GAME_RULES.keys.secondHalf;
            if (event.arenaKeyPiece !== piece) return;
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
    const [isMissionStatementVisible, setIsMissionStatementVisible] = useState(false);
    const liveActivityIndexRef = useRef(0);
    const liveActivityRemovalTimersRef = useRef<number[]>([]);
    const lastQuestActivitySignatureRef = useRef('');
    const missionStatementTimerRef = useRef<number | null>(null);
    const hasShownMissionStatementRef = useRef(false);
    const hasAppliedInitialModeRef = useRef(false);
    const canPlaySferaHallCutsceneRef = useRef(false);
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

        const isSferaHallPortal = unrealBridge.lastUnrealEvent &&
            typeof unrealBridge.lastUnrealEvent === 'object' &&
            'event' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.event === 'portal_entered' &&
            'portal' in unrealBridge.lastUnrealEvent &&
            unrealBridge.lastUnrealEvent.portal === 'SferaHall';

        if (isSferaHallPortal && !canPlaySferaHallCutsceneRef.current) {
            setFrontendCinematic(null);
            return;
        }

        if (isSferaHallPortal) {
            setHasStartedSferaHallCutsceneSound(false);
            setIsSferaHallCutsceneVisible(true);

            if (isFastViewRoute) {
                setFrontendCinematic(null);
                return;
            }
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
    }, [isFastViewRoute, language, unrealBridge.lastUnrealEvent]);


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

    useEffect(() => {
        if (isViewerSessionLoading || viewerEmail) return;
        const currentPath = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?role=player&next=${encodeURIComponent(currentPath)}`);
    }, [isViewerSessionLoading, viewerEmail]);

    // Product Interaction State
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [activeSupplier, setActiveSupplier] = useState<Supplier | undefined>(undefined);

    // Catalogue State
    const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
    const [catalogueProducts, setCatalogueProducts] = useState<Product[]>([]);

    // Pavilion Exposition State — opened when Unreal sends `entered_pavilion:<id>`.
    const [activePavilion, setActivePavilion] = useState<PavilionInfo | null>(null);
    const [isRewardTerminalOpen, setIsRewardTerminalOpen] = useState(false);
    const [worldPosition, setWorldPosition] = useState<WorldPosition>({ map: 'CityStreets', x: 16229, y: 11830, yaw: -69 });
    const [isPhoneRewardSequenceOpen, setIsPhoneRewardSequenceOpen] = useState(false);
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
    const [hasStartedWaterWinCutsceneSound, setHasStartedWaterWinCutsceneSound] = useState(false);
    const [waterPurchaseCeremonyBalance, setWaterPurchaseCeremonyBalance] = useState<number | null>(null);
    const waterWinCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const fastViewCutsceneExitTimerRef = useRef<number | null>(null);
    const waterPurchaseCeremonyTimerRef = useRef<number | null>(null);
    const fastViewCutscenePlaylist = FASTVIEW_START_CUTSCENE_PLAYLIST[language] ?? FASTVIEW_START_CUTSCENE_PLAYLIST.en;
    const fastViewCutsceneSrc = fastViewCutscenePlaylist[fastViewCutsceneIndex] ?? fastViewCutscenePlaylist[0];

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
                if (unrealBridge.lastUnrealEvent.reason === 'arena_key_required') {
                    setIsRewardTerminalOpen(false);
                    setIsArcadeOpen(false);
                    setIsWaterDispenserOpen(false);
                    setIsWheelOpen(false);
                    setIsPlayerModePromptDismissed(true);
                    setIsArenaPasswordOpen(true);
                    sendUnrealUiInteraction({
                        type: 'arena_access_denied',
                        destination: 'ZombieArena',
                        reason: 'supplier_code_required',
                    });
                }
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
        releaseAllInputs();
        try { document.exitPointerLock?.(); } catch {}
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
        const hasAllFragments = SUPPLIER_EVIDENCE.every((supplier) => unrealBridge.arenaKeyPieces.includes(supplier.piece));
        const success = normalized === GAME_RULES.keys.arenaPassword && hasAllFragments;
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
        setWaterPurchaseCeremonyBalance(unrealBridge.walletBalanceCents);
        if (waterPurchaseCeremonyTimerRef.current !== null) {
            window.clearTimeout(waterPurchaseCeremonyTimerRef.current);
        }
        waterPurchaseCeremonyTimerRef.current = window.setTimeout(() => {
            setWaterPurchaseCeremonyBalance(null);
            setHasStartedWaterWinCutsceneSound(false);
            setIsWaterWinCutsceneVisible(true);
            waterPurchaseCeremonyTimerRef.current = null;
        }, 3800);
        playSferaUiSound('reward');
    }, [unrealBridge]);

    const handleWheelSpin = useCallback(() => {
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'wheel_spun' }));
        sendUnrealUiInteraction({ type: 'wheel_spun' });
        playSferaUiSound('reward');
        setIsPhoneRewardSequenceOpen(true);
    }, [unrealBridge]);

    useEffect(() => {
        if (isZombieArenaCleared) releaseAllInputs();
    }, [isZombieArenaCleared]);

    const openArenaPasswordGate = useCallback(() => {
        releaseAllInputs();
        setIsRewardTerminalOpen(false);
        setIsArcadeOpen(false);
        setIsWaterDispenserOpen(false);
        setIsWheelOpen(false);
        setIsPlayerModePromptDismissed(true);
        setIsArenaPasswordOpen(true);
        unrealBridge.handleUnrealResponse(JSON.stringify({
            event: 'game_access_denied',
            game: 'ZombieArena',
            reason: 'arena_key_required',
        }));
        sendUnrealUiInteraction({
            type: 'arena_access_denied',
            destination: 'ZombieArena',
            reason: 'supplier_code_required',
        });
    }, [unrealBridge]);

    const isWaterQuestActive = useMemo(
        () => unrealBridge.questProgress.some((progress) => progress.questId === 'water_arena_run' && progress.status === 'active'),
        [unrealBridge.questProgress]
    );
    const shouldBlockManualArenaUnlockKey = isWaterQuestActive && !unrealBridge.hasArenaAccess;
    const blockedUnrealKeyboardCodes = useMemo(
        () => [
            ...BLOCKED_UNREAL_KEY_CODES,
            ...(isArcadeOpen ? ARCADE_CONTROL_KEY_CODES : []),
            ...(shouldBlockManualArenaUnlockKey ? ARENA_UNLOCK_KEY_CODES : []),
        ],
        [isArcadeOpen, shouldBlockManualArenaUnlockKey]
    );

    const handleBlockedStreamKeyboardInput = useCallback((event: KeyboardEvent) => {
        if (!shouldBlockManualArenaUnlockKey || event.type !== 'keydown') return;

        const isArenaUnlockKey =
            event.code === 'KeyG' ||
            event.key.toLowerCase() === 'g' ||
            String(event.keyCode) === '71';

        if (!isArenaUnlockKey) return;

        event.preventDefault();
        openArenaPasswordGate();
    }, [openArenaPasswordGate, shouldBlockManualArenaUnlockKey]);


    useEffect(() => {
        if (!isFastViewRoute || !hasStartedExperience) return;

        const targetMode = resolveRequestedSceneMode(searchParams.get('mode'));
        if (!targetMode) {
            hasAppliedInitialModeRef.current = false;
            return;
        }
        if (hasAppliedInitialModeRef.current && unrealBridge.currentMode === targetMode) return;

        hasAppliedInitialModeRef.current = true;
        sendUnrealUiInteraction({ type: 'set_mode', mode: targetMode });
        sendUnrealUiInteraction({ event: 'mode_changed', mode: targetMode });
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
            if (waterPurchaseCeremonyTimerRef.current !== null) {
                window.clearTimeout(waterPurchaseCeremonyTimerRef.current);
            }
            if (missionStatementTimerRef.current !== null) {
                window.clearTimeout(missionStatementTimerRef.current);
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
            setHasStartedFastViewCutscene(false);
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
            setHasStartedSferaHallCutsceneSound(false);
        });
    }, []);

    const handleStartWaterWinCutsceneWithSound = useCallback(() => {
        const video = waterWinCutsceneVideoRef.current;
        if (!video) return;

        setHasStartedWaterWinCutsceneSound(true);
        video.muted = false;
        resetCutsceneAudio(video);
        video.play().catch(() => {
            setHasStartedWaterWinCutsceneSound(false);
        });
    }, []);

    const closeWaterWinCutscene = useCallback(() => {
        const video = waterWinCutsceneVideoRef.current;
        if (video) {
            video.pause();
            try {
                video.currentTime = 0;
            } catch { /* best-effort */ }
            resetCutsceneAudio(video);
        }

        setIsWaterWinCutsceneVisible(false);
        setHasStartedWaterWinCutsceneSound(false);
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

    useEffect(() => {
        if (!isWaterWinCutsceneVisible || hasStartedWaterWinCutsceneSound) return;
        const startFromKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            handleStartWaterWinCutsceneWithSound();
        };
        window.addEventListener('keydown', startFromKey);
        return () => window.removeEventListener('keydown', startFromKey);
    }, [handleStartWaterWinCutsceneWithSound, hasStartedWaterWinCutsceneSound, isWaterWinCutsceneVisible]);

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

            if (isWaterQuestActive) {
                if (!unrealBridge.hasArenaAccess) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    openArenaPasswordGate();
                }
                return;
            }

            toggleUnrealMode();
        };

        document.addEventListener('keydown', handleModeHotkey, true);
        return () => document.removeEventListener('keydown', handleModeHotkey, true);
    }, [activePavilion, activeProduct, isArcadeOpen, isArenaPasswordOpen, isCatalogueOpen, isChatFocused, isMenuOpen, isRewardTerminalOpen, isWaterDispenserOpen, isWaterQuestActive, isWheelOpen, hasStartedExperience, openArenaPasswordGate, toggleUnrealMode, unrealBridge.hasArenaAccess]);

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

    useEffect(() => {
        canPlaySferaHallCutsceneRef.current =
            showExperienceHud &&
            hasStartedExperience &&
            hasCompletedFastViewCutscene &&
            !showFastViewCutscene &&
            !showFastViewLaunchOverlay;
    }, [
        hasCompletedFastViewCutscene,
        hasStartedExperience,
        showExperienceHud,
        showFastViewCutscene,
        showFastViewLaunchOverlay,
    ]);

    useEffect(() => {
        if (!showExperienceHud || !hasStartedExperience || !isWaterQuestActive || unrealBridge.waterPurchased || hasShownMissionStatementRef.current) return;

        hasShownMissionStatementRef.current = true;
        setIsMissionStatementVisible(true);
        if (missionStatementTimerRef.current !== null) {
            window.clearTimeout(missionStatementTimerRef.current);
        }
        missionStatementTimerRef.current = window.setTimeout(() => {
            setIsMissionStatementVisible(false);
            missionStatementTimerRef.current = null;
        }, 7800);
    }, [hasStartedExperience, isWaterQuestActive, showExperienceHud, unrealBridge.waterPurchased]);

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
        if (isArenaKeyAccessDenied) {
            setIsArenaPasswordOpen(true);
            setIsPlayerModePromptDismissed(true);
            return;
        }

        sendUnrealUiInteraction({ type: 'set_mode', mode: 'player' });
        sendUnrealUiInteraction({ event: 'mode_changed', mode: 'player' });
        unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'mode_changed', mode: 'player' }));
        setIsPlayerModePromptDismissed(true);
    }, [effectiveSceneMode, isArenaKeyAccessDenied, isPlayerModeAccessDenied, unrealBridge]);

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

    useEffect(() => {
        if (!shouldRunLiveActivity) return;
        const latestActivity = unrealBridge.recentActivity[0];
        if (!latestActivity) return;

        const signature = `${latestActivity}:${unrealBridge.recentActivity.length}`;
        if (lastQuestActivitySignatureRef.current === signature) return;
        lastQuestActivitySignatureRef.current = signature;

        const lower = latestActivity.toLowerCase();
        const kind: LiveActivityKind = lower.includes('water') || lower.includes('wheel')
            ? 'market'
            : lower.includes('key') || lower.includes('password') || lower.includes('zombie')
                ? 'booking'
                : lower.includes('pavilion') || lower.includes('supplier')
                    ? 'catalogue'
                    : 'message';
        const id = Date.now();

        setLiveActivityToasts((previous) => [{
            id,
            kind,
            message: localizeLiveActivityMessage(latestActivity, language),
        }, ...previous].slice(0, 3));

        const removalTimer = window.setTimeout(() => {
            setLiveActivityToasts((previous) => previous.filter((toast) => toast.id !== id));
            liveActivityRemovalTimersRef.current = liveActivityRemovalTimersRef.current.filter(
                (timerId) => timerId !== removalTimer
            );
        }, LIVE_ACTIVITY_VISIBLE_MS);

        liveActivityRemovalTimersRef.current.push(removalTimer);
    }, [language, shouldRunLiveActivity, unrealBridge.recentActivity]);

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
        const nextWorldPosition = parseWorldPosition(jsonString);
        if (nextWorldPosition) {
            setWorldPosition(nextWorldPosition);
            return;
        }

        let incomingEventName = typeof jsonString === 'string'
            ? jsonString.trim().replace(/^"|"$/g, '')
            : '';

        try {
            const parsedPayload = JSON.parse(jsonString) as unknown;
            if (parsedPayload && typeof parsedPayload === 'object') {
                const eventName = (parsedPayload as Record<string, unknown>).event;
                if (typeof eventName === 'string') {
                    incomingEventName = eventName;
                }
            }
        } catch {
            // Some Pixel Streaming events are plain strings.
        }

        if (ARENA_ENTRANCE_EVENT_NAMES.has(incomingEventName)) {
            if (unrealBridge.hasArenaAccess) {
                unrealBridge.handleUnrealResponse(JSON.stringify({ event: 'game_entered', game: 'ZombieArena' }));
            } else {
                setIsRewardTerminalOpen(false);
                setIsArcadeOpen(false);
                setIsWaterDispenserOpen(false);
                setIsWheelOpen(false);
                setIsArenaPasswordOpen(true);
                unrealBridge.handleUnrealResponse(JSON.stringify({
                    event: 'game_access_denied',
                    game: 'ZombieArena',
                    reason: 'arena_key_required',
                }));
                sendUnrealUiInteraction({
                    type: 'arena_access_denied',
                    destination: 'ZombieArena',
                    reason: 'supplier_code_required',
                });
            }
            return;
        }

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
        const progress = unrealBridge.questProgress.find((candidate) => candidate.questId === 'water_arena_run');
        const quest = progress ? getQuestDefinition(progress.questId) : null;
        if (quest?.role === 'player' && progress?.status === 'active') {
            return { progress, quest };
        }

        return null;
    }, [unrealBridge.questProgress]);
    const activeSceneQuestText = activeSceneQuest ? getQuestText(activeSceneQuest.quest, language) : null;
    const activeSceneQuestPercent = activeSceneQuest ? getQuestCompletionPercent(activeSceneQuest.progress) : 0;
    const activeSceneQuestNextObjective = activeSceneQuest
        ? Object.entries(activeSceneQuest.progress.objectives).find(([, objective]) => !objective.completed)
        : null;
    const activeSceneQuestObjectiveLabel = activeSceneQuest && activeSceneQuestNextObjective
        ? `${getQuestObjectiveText(activeSceneQuest.quest, activeSceneQuestNextObjective[0], language)} · ${activeSceneQuestNextObjective[1].current}/${activeSceneQuestNextObjective[1].target}`
        : null;
    const activeSceneQuestMapFocus = (() => {
        const objectiveId = activeSceneQuestNextObjective?.[0];
        if (!objectiveId) return null;

        if (objectiveId === 'find_water_dispenser' || objectiveId === 'try_buy_water') {
            return worldPosition.map === 'CityStreets' ? 'water' : 'hall-exit';
        }
        if (objectiveId === 'collect_supplier_key') {
            if (worldPosition.map === 'CityStreets') return 'sfera';
            if (worldPosition.map === 'Sfera') {
                if (!unrealBridge.arenaKeyPieces.includes(GAME_RULES.keys.firstHalf)) return 'youbo';
                if (!unrealBridge.arenaKeyPieces.includes(GAME_RULES.keys.secondHalf)) return 'double-lin';
                return 'hall-exit';
            }
        }
        if (objectiveId === 'unlock_arena' || objectiveId === 'enter_arena') {
            if (worldPosition.map === 'CityStreets') return 'zombie-hall';
            if (worldPosition.map === 'Sfera') return 'hall-exit';
            return 'range-start';
        }
        return null;
    })();
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
    const hasWaterArenaPayout = unrealBridge.questRewards.some((reward) => reward.questId === 'water_arena_run' && reward.kind === 'coins');
    const mapQuestGuidance = useMemo(() => {
        const focusForExit = worldPosition.map === 'ZombieShooting'
            ? 'range-exit'
            : worldPosition.map === 'Sfera'
              ? 'hall-exit'
              : null;

        if (unrealBridge.waterPurchased && unrealBridge.wheelSpinsRemaining > 0) {
            return {
                objective: waterFlowCopy.mission.findWheel,
                focus: worldPosition.map === 'Sfera' ? 'wheel' : worldPosition.map === 'CityStreets' ? 'sfera' : focusForExit,
            };
        }
        if (unrealBridge.waterPurchased) {
            return {
                objective: waterFlowCopy.mission.reviewRewards,
                focus: null,
            };
        }
        if (hasWaterArenaPayout) {
            return {
                objective: worldPosition.map === 'ZombieShooting'
                    ? (language === 'ru' ? 'Выйдите через портал арены' : language === 'zh' ? '通过竞技场传送门离开' : 'Leave through the arena portal')
                    : waterFlowCopy.mission.buyWater,
                focus: worldPosition.map === 'CityStreets' ? 'water' : focusForExit,
            };
        }
        return {
            objective: activeSceneQuestObjectiveLabel,
            focus: activeSceneQuestMapFocus,
        };
    }, [
        activeSceneQuestMapFocus,
        activeSceneQuestObjectiveLabel,
        hasWaterArenaPayout,
        language,
        unrealBridge.waterPurchased,
        unrealBridge.wheelSpinsRemaining,
        waterFlowCopy.mission,
        worldPosition.map,
    ]);
    const recentWalletTransactions = unrealBridge.walletTransactions.slice(0, 5);
    const hasWalletActivity = walletBalanceCents > 0 || recentWalletTransactions.length > 0;
    const waterQuestObjectives = activeSceneQuest?.quest.id === 'water_arena_run'
        ? activeSceneQuest.progress.objectives
        : null;
    const waterQuestMilestones = waterQuestObjectives
        ? [
            {
                title: waterFlowCopy.railDispenser,
                body: waterFlowCopy.mission.startBody,
                complete: waterQuestObjectives.find_water_dispenser?.completed && waterQuestObjectives.try_buy_water?.completed,
                Icon: Droplets,
            },
            {
                title: waterFlowCopy.supplierFragments,
                body: waterFlowCopy.fragmentsRecovered(unrealBridge.arenaKeyPieces.length),
                complete: waterQuestObjectives.collect_supplier_key?.completed,
                Icon: KeyRound,
            },
            {
                title: waterFlowCopy.hallGate,
                body: unrealBridge.hasArenaAccess ? waterFlowCopy.accessAccepted : waterFlowCopy.useSupplierCode,
                complete: waterQuestObjectives.unlock_arena?.completed,
                Icon: LockKeyhole,
            },
            {
                title: waterFlowCopy.payoutTitle,
                body: hasWaterArenaPayout ? waterFlowCopy.payoutReceived : waterFlowCopy.clearZombiesForMoney,
                complete: hasWaterArenaPayout,
                Icon: Trophy,
            },
        ]
        : [];
    const shouldOfferArenaCodeEntry =
        activeSceneQuest?.quest.id === 'water_arena_run' &&
        !unrealBridge.hasArenaAccess &&
        unrealBridge.arenaKeyPieces.length > 0;
    const shouldShowArenaCodePrompt =
        activeSceneQuest?.quest.id === 'water_arena_run' &&
        !unrealBridge.hasArenaAccess &&
        unrealBridge.arenaKeyPieces.length >= 2 &&
        !isArenaPasswordOpen &&
        !isWaterDispenserOpen;
    const compactWaterQuestMilestones = waterQuestMilestones.length > 0
        ? [waterQuestMilestones.find((milestone) => !milestone.complete) ?? waterQuestMilestones[waterQuestMilestones.length - 1]]
        : [];
    const questDirectorState = useMemo<QuestDirectorState | null>(() => {
        const hasWaterJourney = activeSceneQuest?.quest.id === 'water_arena_run' || hasWaterArenaPayout || unrealBridge.waterPurchased;
        if (!hasWaterJourney) return null;

        if (unrealBridge.waterPurchased && unrealBridge.wheelCoupon && unrealBridge.wheelSpinsRemaining > 0) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.couponLiveTitle,
                body: waterFlowCopy.mission.couponLiveBody,
                destination: 'Sfera Hall wheel',
                action: waterFlowCopy.mission.findWheel,
                signal: 'complete',
                progress: 100,
            };
        }

        if (unrealBridge.waterPurchased) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.hydrationCompleteTitle,
                body: waterFlowCopy.mission.hydrationCompleteBody,
                destination: 'Sfera Hall',
                action: waterFlowCopy.mission.reviewRewards,
                signal: 'complete',
                progress: 100,
            };
        }

        if (hasWaterArenaPayout && walletBalanceCents >= GAME_RULES.water.bottlePriceCoins) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.buyBottleTitle,
                body: waterFlowCopy.mission.buyBottleBody,
                destination: waterFlowCopy.dispenserAria,
                action: waterFlowCopy.mission.buyWater,
                signal: 'reward',
                progress: 88,
            };
        }

        if (walletBalanceCents >= GAME_RULES.water.bottlePriceCoins && !hasWaterArenaPayout) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.payoutNeededTitle,
                body: waterFlowCopy.mission.payoutNeededBody,
                destination: 'Zombie Hall',
                action: unrealBridge.arenaKeyPieces.length >= 2 ? waterFlowCopy.mission.enterCode : waterFlowCopy.mission.findSupplierCode,
                signal: 'locked',
                progress: 58,
            };
        }

        if (unrealBridge.hasArenaAccess) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.clearHallTitle,
                body: waterFlowCopy.mission.clearHallBody(GAME_RULES.water.bottlePriceCoins),
                destination: 'Zombie Hall',
                action: waterFlowCopy.mission.enterArena,
                signal: 'ready',
                progress: 62,
            };
        }

        if (unrealBridge.arenaKeyPieces.length >= 2) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.codeReadyTitle,
                body: waterFlowCopy.mission.codeReadyBody(GAME_RULES.keys.firstHalf, GAME_RULES.keys.secondHalf),
                destination: 'Zombie Hall terminal',
                action: waterFlowCopy.mission.enterCode,
                signal: 'ready',
                progress: 48,
            };
        }

        if (unrealBridge.arenaKeyPieces.length > 0) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.findSecondTitle,
                body: waterFlowCopy.mission.findSecondBody,
                destination: 'Supplier pavilions',
                action: waterFlowCopy.mission.openSupplierChat,
                signal: 'search',
                progress: 34,
            };
        }

        if (waterQuestObjectives?.try_buy_water?.completed) {
            return {
                kicker: waterFlowCopy.missionDirector,
                title: waterFlowCopy.mission.refusedTitle,
                body: waterFlowCopy.mission.refusedBody,
                destination: 'Youbo and Double Lin pavilions',
                action: waterFlowCopy.mission.searchSuppliers,
                signal: 'search',
                progress: 22,
            };
        }

        return {
            kicker: waterFlowCopy.missionDirector,
            title: waterFlowCopy.mission.startTitle,
            body: waterFlowCopy.mission.startBody,
            destination: waterFlowCopy.dispenserAria,
            action: waterFlowCopy.mission.tryBuyWater,
            signal: 'locked',
            progress: 10,
        };
    }, [
        activeSceneQuest?.quest.id,
        unrealBridge.arenaKeyPieces.length,
        unrealBridge.hasArenaAccess,
        hasWaterArenaPayout,
        unrealBridge.waterPurchased,
        unrealBridge.wheelCoupon,
        unrealBridge.wheelSpinsRemaining,
        waterFlowCopy,
        walletBalanceCents,
        waterQuestObjectives?.try_buy_water?.completed,
    ]);
    const shouldShowQuestDirector =
        Boolean(questDirectorState) &&
        showExperienceHud &&
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
        waterPurchaseCeremonyBalance === null &&
        !isSferaHallCutsceneVisible &&
        !isWaterWinCutsceneVisible;
    const shouldShowFrontendCinematic =
        Boolean(frontendCinematic) &&
        showExperienceHud &&
        !(isFastViewRoute && frontendCinematic?.destinationLabel === 'Sfera Hall');

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
                        fireInputEnabled={!isZombieArenaCleared}
                        blockedKeyboardCodes={blockedUnrealKeyboardCodes}
                        onBlockedKeyboardInput={handleBlockedStreamKeyboardInput}
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
                            fireInputEnabled={!isZombieArenaCleared}
                            blockedKeyboardCodes={blockedUnrealKeyboardCodes}
                            onBlockedKeyboardInput={handleBlockedStreamKeyboardInput}
                            mouseSensitivity={mouseSensitivity}
                        />
                    </>
                )}
            </div>

            {showExperienceHud && (
                <WorldGuideOverlay
                    position={worldPosition}
                    questObjective={mapQuestGuidance.objective}
                    focusLandmarkId={mapQuestGuidance.focus}
                    shootingEnabled={!isZombieArenaCleared}
                />
            )}

            {showFastViewCutscene && (
                <div
                    className={`absolute inset-0 z-[130] bg-[#05070b] transition-opacity duration-700 ${
                        isFastViewCutsceneExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    onClick={hasStartedFastViewCutscene ? undefined : handleStartFastViewCutscene}
                >
                    <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden bg-black sm:top-20">
                        <video
                            ref={fastViewCutsceneVideoRef}
                            className={`cinematic-cutscene-video h-full w-full bg-black object-cover transition-[filter,transform] duration-700 ${
                                hasEndedFastViewCutscene && !isVideoStreamingFrames ? 'scale-[1.055] brightness-75' : 'scale-[1.035]'
                            }`}
                            key={fastViewCutsceneSrc}
                            src={fastViewCutsceneSrc}
                            data-cutscene-video="true"
                            muted={!hasStartedFastViewCutscene}
                            playsInline
                            preload="auto"
                            onTimeUpdate={(event) => softenCutsceneAudioTail(event.currentTarget)}
                            onEnded={handleCompleteFastViewCutscene}
                            onError={handleCompleteFastViewCutscene}
                        />
                        <CutsceneCinematicOverlay tone="opening" label={waterFlowCopy.cutscene.openingFilm} copy={waterFlowCopy} />
                    </div>

                    <CutsceneSiteHeader
                        statusOnline={ui.statusOnline}
                        instruction={sceneInstruction}
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
                    <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden bg-black sm:top-20">
                        <video
                            ref={sferaHallCutsceneVideoRef}
                            className="cinematic-cutscene-video h-full w-full scale-[1.025] object-cover"
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
                        <CutsceneCinematicOverlay tone="hall" label={waterFlowCopy.cutscene.hallArrival} copy={waterFlowCopy} />
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

            {waterPurchaseCeremonyBalance !== null && showExperienceHud && (
                <WaterPurchaseCeremony copy={waterFlowCopy} walletBalanceCents={waterPurchaseCeremonyBalance} />
            )}

            {isWaterWinCutsceneVisible && showExperienceHud && (
                <div className="absolute inset-0 z-[126] bg-[#05070b]">
                    <div className="absolute inset-0 overflow-hidden bg-black">
                        <video
                            ref={waterWinCutsceneVideoRef}
                            className="cinematic-cutscene-video h-full w-full scale-[1.04] bg-black object-cover"
                            src={WATER_WIN_CUTSCENE_SRC}
                            data-cutscene-video="true"
                            muted={!hasStartedWaterWinCutsceneSound}
                            playsInline
                            preload="auto"
                            onTimeUpdate={(event) => softenCutsceneAudioTail(event.currentTarget)}
                            onEnded={closeWaterWinCutscene}
                            onError={closeWaterWinCutscene}
                        />
                        <CutsceneCinematicOverlay tone="water" label={waterFlowCopy.cutscene.waterWin} copy={waterFlowCopy} />
                    </div>
                    {!hasStartedWaterWinCutsceneSound && (
                        <div className="absolute inset-x-4 bottom-0 top-16 z-10 flex flex-col items-center justify-center sm:top-20">
                            <button
                                type="button"
                                onClick={handleStartWaterWinCutsceneWithSound}
                                className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl border border-[#66d9cb]/35 bg-black/55 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/[0.16] sm:px-6"
                            >
                                <Play className="h-4 w-4 shrink-0 text-[#66d9cb]" />
                                <span className="truncate">{cutsceneCopy.pressAnyKey}</span>
                                <Volume2 className="h-4 w-4 shrink-0 text-[#66d9cb]" />
                            </button>
                            <p className="mt-3 max-w-md text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300/80">{cutsceneCopy.soundHint}</p>
                        </div>
                    )}
                    <CutsceneSiteHeader
                        statusOnline={ui.statusOnline}
                        instruction={`${waterFlowCopy.purchaseAuthorized}. ${waterFlowCopy.wheelReturnToast}.`}
                        skipLabel={cutsceneCopy.skip}
                        onSkip={() => {
                            fadeOutCutsceneAudio(waterWinCutsceneVideoRef.current, closeWaterWinCutscene);
                        }}
                        startLabel={!hasStartedWaterWinCutsceneSound ? cutsceneCopy.startWithSound : undefined}
                        onStart={!hasStartedWaterWinCutsceneSound ? handleStartWaterWinCutsceneWithSound : undefined}
                    />
                </div>
            )}

            {frontendCinematic && shouldShowFrontendCinematic && (
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

            {showExperienceHud && isMissionStatementVisible && !frontendCinematic && (
                <div className="pointer-events-none absolute left-1/2 top-24 z-[91] -translate-x-1/2 px-3 sm:top-28">
                    <OpeningMissionStatement
                        copy={waterFlowCopy}
                        onDismiss={() => {
                            setIsMissionStatementVisible(false);
                            if (missionStatementTimerRef.current !== null) {
                                window.clearTimeout(missionStatementTimerRef.current);
                                missionStatementTimerRef.current = null;
                            }
                        }}
                    />
                </div>
            )}

            {shouldShowQuestDirector && questDirectorState && (
                <div className="pointer-events-none absolute bottom-24 right-3 z-[82] sm:bottom-6 sm:right-5">
                    <QuestDirectorOverlay
                        state={questDirectorState}
                        pieces={unrealBridge.arenaKeyPieces}
                        walletBalanceCents={walletBalanceCents}
                        coupon={unrealBridge.wheelCoupon}
                        copy={waterFlowCopy}
                        onOpenPassword={() => setIsArenaPasswordOpen(true)}
                    />
                </div>
            )}

            {showExperienceHud && shouldShowArenaCodePrompt && !frontendCinematic && (
                <div className="pointer-events-none absolute bottom-24 left-1/2 z-[83] -translate-x-1/2 px-3 sm:bottom-6">
                    <ZombieHallCodePrompt copy={waterFlowCopy} onOpenPassword={() => setIsArenaPasswordOpen(true)} />
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
                                    <p className="text-[10px] text-slate-400">{sceneHud.returnPortalHint}</p>
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
                                <div className="sfera-guide-enter mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-xl border border-cyan-300/22 bg-[#041018]/78 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-md">
                                    <div className="border-b border-cyan-300/10 bg-cyan-300/[0.055] px-3 py-2.5">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100">{sceneHud.guideTitle}</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsQuestChecklistOpen((current) => !current)}
                                                    className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-cyan-300/18 bg-black/24 text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/10"
                                                    aria-label={isQuestChecklistOpen ? sceneHud.questDetailsClose : sceneHud.questDetailsOpen}
                                                    title={isQuestChecklistOpen ? sceneHud.questDetailsClose : sceneHud.questDetailsOpen}
                                                >
                                                    <ChevronDown className={`h-4 w-4 transition ${isQuestChecklistOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                <span className="rounded-full border border-cyan-300/18 px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">{activeSceneQuestPercent}%</span>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-xs leading-5 text-slate-300">{sceneHud.guideBody}</p>
                                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#66d9cb,#f5c766)] shadow-[0_0_18px_rgba(102,217,203,0.45)]" style={{ width: `${activeSceneQuestPercent}%` }} />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 p-3">
                                        {(waterQuestMilestones.length > 0 ? compactWaterQuestMilestones : sceneHud.guideSteps.map((step, index) => ({
                                            title: step,
                                            body: index === 0 ? 'Start here and follow the prompts.' : 'Continue the sequence.',
                                            complete: index < Math.floor(activeSceneQuestPercent / 25),
                                            Icon: Sparkles,
                                        }))).map((step, index) => {
                                            const StepIcon = step.Icon;
                                            return (
                                                <div key={step.title} className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-xl border px-2.5 py-2 ${
                                                    step.complete
                                                        ? 'border-emerald-300/20 bg-emerald-300/[0.06]'
                                                        : index === 0 || !waterQuestMilestones[index - 1] || waterQuestMilestones[index - 1].complete
                                                            ? 'border-cyan-300/22 bg-cyan-300/[0.055]'
                                                            : 'border-white/10 bg-white/[0.032]'
                                                }`}>
                                                    <span className={`grid h-8 w-8 place-items-center rounded-lg border ${
                                                        step.complete ? 'border-emerald-300/28 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-black/24 text-cyan-100'
                                                    }`}>
                                                        {step.complete ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-xs font-black text-white">{step.title}</span>
                                                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">{step.body}</span>
                                                    </span>
                                                    <span className="font-mono text-[10px] font-black text-white/38">{index + 1}</span>
                                                </div>
                                            );
                                        })}
                                        {shouldOfferArenaCodeEntry && (
                                            <button
                                                type="button"
                                                onClick={() => setIsArenaPasswordOpen(true)}
                                                className="pointer-events-auto mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f5c766,#66d9cb)] px-3 py-3 text-xs font-black uppercase tracking-[0.13em] text-slate-950 shadow-[0_18px_44px_rgba(245,199,102,0.18)] transition hover:scale-[1.01]"
                                            >
                                                <KeyRound className="h-4 w-4" />
                                                {waterFlowCopy.mission.enterCode}
                                            </button>
                                        )}
                                        {isQuestChecklistOpen && (
                                            <div className="mt-1 grid gap-1.5 rounded-lg border border-white/10 bg-black/22 p-2">
                                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/85">
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
                                                            {objective.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                                                        </span>
                                                        <span className={`min-w-0 truncate ${objective.completed ? 'text-white/70 line-through decoration-white/30' : 'text-slate-200'}`}>
                                                            {getQuestObjectiveText(activeSceneQuest.quest, objectiveId, language)}
                                                        </span>
                                                        <span className="font-mono text-[11px] text-white/38">{objective.current}/{objective.target}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {waterQuestMilestones.length > 0 && (
                                            <div className="rounded-xl border border-amber-300/16 bg-amber-300/[0.06] px-3 py-2 text-[10px] leading-5 text-amber-50">
                                                <span className="font-black uppercase tracking-[0.14em] text-amber-200">{sceneHud.reward}: </span>
                                                {getQuestRewardText(activeSceneQuest.quest.reward, activeSceneQuest.quest.id, language)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activeSceneQuest && activeSceneQuestText && waterQuestMilestones.length === 0 && (
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
                                                        {objective.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
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
                            {hasWalletActivity && !latestPlayerReward && (
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
                                        <span className="mt-0.5 block truncate text-lg font-black text-white">{formatMoney(walletBalanceCents, sceneHud.coins)}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full border border-cyan-300/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                                        {sceneHud.openTerminal}
                                    </span>
                                </button>
                            )}
                            {unrealBridge.waterPurchased && unrealBridge.wheelCoupon && (
                                <div className="sfera-reward-pop mt-2 flex w-[min(92vw,22rem)] items-center gap-3 rounded-xl border border-amber-300/24 bg-[#171006]/72 px-3 py-2.5 text-left text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-md">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-amber-300/24 bg-amber-300/10 text-amber-100">
                                        <Ticket className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-100">{waterFlowCopy.wheelUnlockedToast}</span>
                                        <span className="mt-0.5 block truncate text-sm font-black text-white">{waterFlowCopy.wheelReturnToast}</span>
                                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">{unrealBridge.wheelCoupon}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full border border-amber-300/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
                                        {unrealBridge.wheelSpinsRemaining} {waterFlowCopy.attemptUnit}
                                    </span>
                                </div>
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
                                                <p className="mt-1 text-4xl font-black text-white">{formatMoney(walletBalanceCents, sceneHud.coins)}</p>
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

                                    {latestPlayerReward?.questId === 'water_arena_run' && isZombieArenaActive && (
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsRewardTerminalOpen(false);
                                                    setNeedsPointerResume(true);
                                                }}
                                                className="rounded-xl border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-white/30 hover:bg-white/10"
                                            >
                                                {language === 'ru' ? 'Продолжить на арене' : language === 'zh' ? '继续竞技场' : 'Continue in arena'}
                                            </button>
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
                                                        <span className="font-mono text-sm font-black text-emerald-100">+{formatMoney(transaction.amountCents, sceneHud.coins)}</span>
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
                            copy={waterFlowCopy}
                            walletBalanceCents={walletBalanceCents}
                            hasArenaAccess={unrealBridge.hasArenaAccess}
                            hasArenaPayout={hasWaterArenaPayout}
                            waterPurchased={unrealBridge.waterPurchased}
                            onClose={() => setIsWaterDispenserOpen(false)}
                            onAttempt={handleWaterPurchaseAttempt}
                            onBuy={handleWaterPurchase}
                            onOpenPassword={() => setIsArenaPasswordOpen(true)}
                        />
                    )}

                    {isArenaPasswordOpen && (
                        <ArenaPasswordOverlay
                            copy={waterFlowCopy}
                            pieces={unrealBridge.arenaKeyPieces}
                            onClose={() => setIsArenaPasswordOpen(false)}
                            onSubmit={handleArenaPasswordSubmit}
                        />
                    )}

                    {isWheelOpen && (
                        <WheelOverlay
                            copy={waterFlowCopy}
                            spinsRemaining={unrealBridge.wheelSpinsRemaining}
                            coupon={unrealBridge.wheelCoupon}
                            onClose={() => setIsWheelOpen(false)}
                            onSpin={handleWheelSpin}
                        />
                    )}

                    {isPhoneRewardSequenceOpen && (
                        <RewardVideoSequence
                            onClose={() => setIsPhoneRewardSequenceOpen(false)}
                            onOpenDashboard={() => {
                                setIsPhoneRewardSequenceOpen(false);
                                setDashboardOverlay('player');
                            }}
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

