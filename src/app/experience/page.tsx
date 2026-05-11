'use client';

import PixelStreamingPlayer from "@/components/PixelStreamingPlayer";
import StreamPixelPlayer from "@/components/StreamPixelPlayer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Menu, X, Monitor } from "lucide-react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Product, Supplier } from "@/lib/types";
import { getProductById, getSupplierById, getProductsBySupplier } from "@/lib/db";
import ProductCard from "@/components/overlay/ProductCard";
import CatalogueOverlay from "@/components/overlay/CatalogueOverlay";
import PavilionExposition from "@/components/overlay/PavilionExposition";
import WelcomeControls from "@/components/overlay/WelcomeControls";
import TranslatableText from "@/components/chat/TranslatableText";
import { getPavilionById, parseEnterPavilionMessage, type Pavilion as PavilionInfo } from "@/lib/pavilions";
import MobileControls from "@/components/pixelstreaming/MobileControls";
import MarketplaceCrosshair from "@/components/pixelstreaming/MarketplaceCrosshair";
import SensitivitySlider from "@/components/pixelstreaming/SensitivitySlider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { clearServerAuthSession } from "@/lib/auth/browser";
import { AppLanguage, getLocalizedProduct } from "@/lib/i18n";
import { readSupplierChatApiResponse } from "@/lib/supplierChat";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type MobileInputMode = 'joystick' | 'touch';
type ToStreamerHandler = (messageData?: Array<number | string>) => void;
type PixelStreamingWindow = Window & {
    ps?: {
        toStreamerHandlers?: Map<string, ToStreamerHandler>;
        videoElementParent?: HTMLElement;
        config?: {
            setFlagEnabled?: (flagName: string, enabled: boolean) => void;
        };
        _webRtcController?: {
            streamController?: {
                audioElement?: HTMLMediaElement | null;
            };
        };
    };
};
const DEFAULT_MOUSE_SENSITIVITY = 0.5;
const LANGUAGE_ASSISTANT_KEY_CODES: Record<AppLanguage, number> = {
    zh: 48,
    ru: 49,
    en: 50,
};

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
    const keyboardEventInit: KeyboardEventInit = {
        key: keyString,
        code: `Digit${keyString}`,
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
        assistantHint: (key) => `Press ${key} to call the Assistant.`,
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
        assistantHint: (key) => `\u041D\u0430\u0436\u043C\u0438\u0442\u0435 ${key}, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u0430.`,
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
        assistantHint: (key) => `\u6309 ${key} \u547C\u53EB\u52A9\u7406\u3002`,
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

export default function ExperiencePage() {
    const pathname = usePathname();
    const isFastViewRoute = pathname === '/fastview';
    const { language } = useLanguage();
    const ui = EXPERIENCE_COPY[language];
    const fastViewLaunch = FASTVIEW_LAUNCH_COPY[language];
    const assistantKeyCode = LANGUAGE_ASSISTANT_KEY_CODES[language];
    const assistantKeyLabel = String.fromCharCode(assistantKeyCode);
    const fastViewAssistantHint = fastViewLaunch.assistantHint(assistantKeyLabel);
    const fastViewAssistantCta = fastViewLaunch.assistantCta(assistantKeyLabel);
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
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [needsPointerResume, setNeedsPointerResume] = useState(false);
    const [isStreamPixelOpen, setIsStreamPixelOpen] = useState(false);
    const [fastViewError, setFastViewError] = useState<string | null>(null);
    const chatFeedRef = useRef<HTMLDivElement | null>(null);

    const handleSensitivityChange = useCallback((value: number) => {
        setMouseSensitivity(value);
        try { localStorage.setItem('ps_mouse_sensitivity', String(value)); } catch {}
    }, []);

    useEffect(() => {
        setIsMobile(detectMobileDevice());
    }, []);


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
            try {
                const supabase = getSupabaseBrowserClient();
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!isMounted) return;
                setViewerEmail(session?.user.email ?? null);
            } catch {
                if (!isMounted) return;
                setViewerEmail(null);
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

    const handleStartExperience = useCallback(() => {
        if (hasStartedExperience) return;
        if (isFastViewRoute && !videoElement) return;

        // Flip the library's StartVideoMuted flag so that any subsequent
        // playStream() / play() calls inside the library no longer re-mute.
        try {
            const psWindow = window as PixelStreamingWindow;
            psWindow.ps?.config?.setFlagEnabled?.('StartVideoMuted', false);
        } catch { /* best-effort */ }

        // Unmute all media elements currently in the DOM.
        const unmuteAllDOM = () => {
            document.querySelectorAll('video, audio').forEach((el) => {
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

        // Send the language/assistant keycode to UE so it switches locale and
        // can open the in-scene assistant. This works on both Epic PS and
        // FastView (same UE build).
        const psWindow = window as PixelStreamingWindow;
        sendUnrealKeyPress(assistantKeyCode);

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
    }, [hasStartedExperience, videoElement, assistantKeyCode, isFastViewRoute]);

    const handleCallFastViewAssistant = useCallback(() => {
        if (!isFastViewRoute) return;

        if (!hasStartedExperience) {
            handleStartExperience();
            return;
        }

        sendUnrealKeyPress(assistantKeyCode);
    }, [assistantKeyCode, handleStartExperience, hasStartedExperience, isFastViewRoute]);

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
        ? 'Type message to supplier...'
        : ui.inputPlaceholder;
    const isChatPanelOpen = isMobile ? isMobileChatOpen : isDesktopChatOpen;
    const showFastViewLaunchOverlay = isFastViewRoute && (!hasStartedExperience || Boolean(fastViewError));
    const showExperienceHud = !isFastViewRoute || !showFastViewLaunchOverlay;
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
            return;
        }

        console.warn('No product mapping found for Unreal ID:', id);
    }, []);

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
        void syncSupplierMessages();
    };

    const handleViewCatalogue = () => {
        if (!activeSupplier) return;
        const products = getProductsBySupplier(activeSupplier.id);
        setCatalogueProducts(products);
        setIsCatalogueOpen(true);
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
        // Debug: surface every raw message from UE so you can confirm the
        // blueprint is actually emitting "entered_pavilion:<id>".
        console.info('[UE→Web] raw response:', jsonString);

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

                                    <div className="mt-5 rounded-2xl border border-[#66d9cb]/25 bg-[#66d9cb]/10 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#66d9cb]/40 bg-black/35 font-mono text-lg font-semibold text-[#66d9cb]">
                                                {assistantKeyLabel}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#66d9cb]">
                                                    Assistant
                                                </p>
                                                <p className="mt-1 text-sm leading-5 text-slate-200">
                                                    {fastViewAssistantHint}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={handleStartExperience}
                                            disabled={!canEnterFastView}
                                            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#66d9cb] px-5 py-3 text-sm font-semibold text-[#04110f] transition hover:bg-[#84e7dd] disabled:cursor-wait disabled:bg-[#66d9cb]/40 disabled:text-[#04110f]/70"
                                        >
                                            {canEnterFastView ? fastViewLaunch.enterCta : fastViewLaunch.connectingCta}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCallFastViewAssistant}
                                            disabled={!canEnterFastView}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#66d9cb]/35 bg-[#66d9cb]/10 px-5 py-3 text-sm font-semibold text-[#c8fff8] transition hover:border-[#66d9cb]/55 hover:bg-[#66d9cb]/18 disabled:cursor-wait disabled:border-[#66d9cb]/15 disabled:bg-[#66d9cb]/5 disabled:text-[#c8fff8]/45"
                                        >
                                            <Bot size={16} />
                                            <span>{canEnterFastView ? fastViewAssistantCta : fastViewLaunch.connectingCta}</span>
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
                            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#66d9cb]">3DSFERA</div>
                            <div className="mt-2 text-sm font-mono uppercase tracking-[0.2em] text-slate-300 animate-pulse">
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
                    <div className="flex flex-col h-full justify-between p-4 md:p-6 lg:p-8">

                    {/* Header */}
                    <header className="flex justify-between items-start pointer-events-none w-full z-50">
                        <div className="group cursor-default">
                            <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-md border border-[#66d9cb]/50 bg-[#66d9cb]/15 shadow-[0_0_18px_rgba(102,217,203,0.35)]" />
                                <h1 className="text-2xl tracking-tight text-white sm:text-3xl">
                                    3D<span className="text-[#66d9cb]">SFERA</span>
                                </h1>
                            </div>

                            {/* System Status Indicator */}
                            <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-black/40 border border-white/5 rounded-full w-fit backdrop-blur-md">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">{ui.statusOnline}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 pointer-events-auto">
                            <p className="hidden max-w-[34rem] pt-1 text-right text-[10px] uppercase tracking-[0.14em] text-[#9fcfdf] md:block">
                                {isFastViewRoute ? fastViewAssistantHint : ui.instruction}
                            </p>
                            {isFastViewRoute && (
                                <button
                                    type="button"
                                    onClick={handleCallFastViewAssistant}
                                    className="group relative inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#66d9cb]/25 bg-slate-900/45 px-3 text-[#c8fff8] backdrop-blur-md transition hover:border-[#66d9cb]/45 hover:bg-slate-800/65"
                                    aria-label={fastViewAssistantCta}
                                    title={fastViewAssistantHint}
                                >
                                    <Bot size={15} className="text-[#66d9cb]" />
                                    <span className="font-mono text-[11px] font-semibold leading-none">
                                        {assistantKeyLabel}
                                    </span>
                                    <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-gray-300 lg:inline">
                                        AI
                                    </span>
                                </button>
                            )}
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
                            <a href="/login?role=supplier" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-[#66d9cb] hover:bg-[#66d9cb]/10 transition">
                                {ui.menuLogin}
                            </a>
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
                            <button
                                onClick={() => void handleSignOut()}
                                disabled={isSigningOut}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-amber-200 hover:bg-amber-500/10 transition disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {accountSignOutLabel}
                            </button>
                            <div className="h-px bg-white/10 my-2"></div>
                            <Link href="/" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition">
                                {returnHomeLabel}
                            </Link>
                        </div>
                    )}

                    {/* Product Card Overlay */}
                    {activeProduct && !isCatalogueOpen && (
                        <div className="pointer-events-none">
                            <ProductCard
                                product={localizedActiveProduct ?? activeProduct}
                                supplier={activeSupplier}
                                onClose={handleCloseProductCard}
                                onAddToCart={() =>
                                    alert(
                                        ui.addToCart(
                                            localizedActiveProduct?.name ?? activeProduct.name
                                        )
                                    )
                                }
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

