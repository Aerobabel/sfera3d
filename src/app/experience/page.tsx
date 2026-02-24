'use client';

import PixelStreamingPlayer from "@/components/PixelStreamingPlayer";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Menu, X, Box, Info } from "lucide-react";
import Link from 'next/link';
import { Product, Supplier } from "@/lib/types";
import { getProductById, getSupplierById, getProductsBySupplier } from "@/lib/db";
import ProductCard from "@/components/overlay/ProductCard";
import CatalogueOverlay from "@/components/overlay/CatalogueOverlay";
import MobileControls from "@/components/pixelstreaming/MobileControls";
import MarketplaceCrosshair from "@/components/pixelstreaming/MarketplaceCrosshair";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AppLanguage, getLocalizedProduct } from "@/lib/i18n";

type MobileInputMode = 'joystick' | 'touch';
type ToStreamerHandler = (messageData?: Array<number | string>) => void;
type PixelStreamingWindow = Window & {
    ps?: {
        toStreamerHandlers?: Map<string, ToStreamerHandler>;
    };
};

type ChatMessage = {
    id: string;
    role: 'assistant' | 'user';
    text: string;
    timestamp: number;
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

export default function ExperiencePage() {
    const { language } = useLanguage();
    const ui = EXPERIENCE_COPY[language];
    const [signalingServerUrl] = useState<string>(() => resolveDefaultSignalingUrl());
    const [chatInput, setChatInput] = useState('');
    const [isChatFocused, setIsChatFocused] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: 'assistant-welcome',
            role: 'assistant',
            text: ui.welcome,
            timestamp: Date.now(),
        },
    ]);
    const [isSendingChat, setIsSendingChat] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [mobileInputMode] = useState<MobileInputMode>('joystick');
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
    const chatFeedRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Simple mobile detection
        const checkMobile = () => {
            const legacyWindow = window as Window & { opera?: string; MSStream?: unknown };
            const userAgent = navigator.userAgent || navigator.vendor || legacyWindow.opera || '';
            const isForceMobile = new URLSearchParams(window.location.search).get('force_mobile') === 'true';

            if (isForceMobile || /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent) && !legacyWindow.MSStream) {
                setIsMobile(true);
            }
        };
        checkMobile();
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

    // Product Interaction State
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [activeSupplier, setActiveSupplier] = useState<Supplier | undefined>(undefined);

    // Catalogue State
    const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
    const [catalogueProducts, setCatalogueProducts] = useState<Product[]>([]);
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
    const usingMobileJoysticks = isMobile && isLandscape && mobileInputMode === 'joystick';

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = chatInput.trim();
        if (!trimmed || isSendingChat) return;

        setChatMessages((previous) => [...previous, createClientChatMessage('user', trimmed)]);
        setChatInput('');
        setIsSendingChat(true);

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

            setChatMessages((previous) => [...previous, createClientChatMessage('assistant', replyText)]);
        } catch {
            setChatMessages((previous) => [
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
        setChatMessages((previous) =>
            previous.map((message) =>
                message.id === 'assistant-welcome'
                    ? { ...message, text: ui.welcome }
                    : message
            )
        );
    }, [ui.welcome]);

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

        setChatMessages((previous) => [
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
    const simulateUnrealClick = (id: string) => {
        const product = getProductById(id);
        if (product) {
            setActiveProduct(product);
            // Fetch supplier
            const supplier = getSupplierById(product.supplierId);
            setActiveSupplier(supplier);
            return;
        }

        console.warn('No product mapping found for Unreal ID:', id);
    };

    const handleChatWithSupplier = () => {
        if (!activeSupplier) return;
        const fallbackProductName =
            language === 'ru' ? 'товару' : language === 'zh' ? '该产品' : 'product';
        setChatInput(
            ui.chatPrefill(
                activeSupplier.name,
                localizedActiveProduct?.name ?? activeProduct?.name ?? fallbackProductName
            )
        );
        alert(ui.startSupplierChat(activeSupplier.name));
    };

    const handleViewCatalogue = () => {
        if (!activeSupplier) return;
        const products = getProductsBySupplier(activeSupplier.id);
        setCatalogueProducts(products);
        setIsCatalogueOpen(true);
    };

    const sendUnrealExitFocus = () => {
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
    };

    const handleCloseProductCard = () => {
        setActiveProduct(null);
        sendUnrealExitFocus();
    };

    const handlePixelStreamingResponse = (jsonString: string) => {
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

    return (
        <div className="relative h-screen w-screen bg-gray-900 overflow-hidden font-sans">
            {/* Video Container (Pixel Streaming) */}
            <div id="player-container" className="absolute inset-0 z-0">
                {/* Default to UE Pixel Streaming signaling server on loopback: ws://127.0.0.1 */}
                <PixelStreamingPlayer
                    signalingServerUrl={signalingServerUrl}
                    onPixelStreamingResponse={handlePixelStreamingResponse}
                    onVideoInitialized={setVideoElement}
                    mobileInputMode={isMobile ? mobileInputMode : 'joystick'}
                    isMobileDevice={isMobile}
                    keyboardInputEnabled={!isChatFocused}
                />
            </div>

            {/* Overlay UI (Z-Index 10) */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <MarketplaceCrosshair />
                <div className="flex flex-col h-full justify-between p-4 md:p-6 lg:p-8">

                    {/* Header */}
                    <header className="flex justify-between items-start pointer-events-auto w-full z-50">
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

                        <div className="flex items-start gap-3">
                            <p className="hidden max-w-[34rem] pt-1 text-right text-[10px] uppercase tracking-[0.14em] text-[#9fcfdf] md:block">
                                {ui.instruction}
                            </p>
                            {isMobile && (
                                <button
                                    onClick={() => setIsMobileChatOpen((previous) => !previous)}
                                    className="group relative px-4 py-2 bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/5 rounded-lg transition overflow-hidden"
                                >
                                    <span className="text-[10px] font-mono text-gray-400 group-hover:text-emerald-300 uppercase tracking-wider transition">
                                        {isMobileChatOpen ? ui.chatToggleHide : ui.chatToggleShow}
                                    </span>
                                </button>
                            )}

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

                    {/* Side Menu (Conditional) */}
                    {isMenuOpen && (
                        <div className="absolute top-24 right-6 pointer-events-auto w-64 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-2 animate-in slide-in-from-right-10 fade-in duration-200">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">{ui.menuNavigation}</div>
                            <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition flex items-center gap-2">
                                <Box size={16} /> {ui.menuProducts}
                            </button>
                            <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition flex items-center gap-2">
                                <Info size={16} /> {ui.menuSupplier}
                            </button>
                            <div className="h-px bg-white/10 my-2"></div>
                            <Link href="/" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition">
                                {ui.menuExit}
                            </Link>
                        </div>
                    )}

                    {/* Product Card Overlay */}
                    {activeProduct && !isCatalogueOpen && (
                        <div className="pointer-events-auto">
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
                    <div className="flex justify-end pointer-events-auto gap-3">
                        {/* Chat Box */}
                        {(!isMobile || isMobileChatOpen) && (
                            <div className={`w-full md:max-w-lg rounded-2xl border border-[#66d9cb]/30 bg-[linear-gradient(160deg,rgba(5,10,18,0.9),rgba(12,18,28,0.82))] p-4 text-white shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl ${isMobile ? 'max-w-[min(92vw,560px)] mx-auto' : ''} ${usingMobileJoysticks ? 'mb-28' : ''}`}>
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#66d9cb]">{ui.assistantTitle}</p>
                                        <p className="mt-1 text-xs text-[#bbc6d4]">
                                            {ui.assistantSubtitle}
                                        </p>
                                    </div>
                                    {isMobile && (
                                        <button
                                            onClick={() => setIsMobileChatOpen(false)}
                                            className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-300 hover:bg-white/10 hover:text-white transition"
                                        >
                                            {ui.close}
                                        </button>
                                    )}
                                </div>

                                <div ref={chatFeedRef} className="mb-3 h-36 space-y-3 overflow-y-auto pr-1 md:h-56">
                                    {chatMessages.map((message) => (
                                        <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {message.role === 'assistant' && (
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#66d9cb]/35 bg-[#66d9cb]/15 text-[10px] font-bold tracking-wide text-[#66d9cb]">
                                                    AI
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-[84%] rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === 'assistant'
                                                    ? 'rounded-tl-none border border-[#66d9cb]/20 bg-black/35 text-gray-100'
                                                    : 'rounded-tr-none bg-[#66d9cb] font-semibold text-[#03100f]'
                                                    }`}
                                            >
                                                {message.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isSendingChat && (
                                        <div className="flex items-center gap-2 text-xs text-[#9db1c7]">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#66d9cb]" />
                                            {ui.typing}
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
                                            placeholder={ui.inputPlaceholder}
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
            </div >

            {/* Mobile Controls (Z-Index 50 - Topmost) */}
            {isMobile && isLandscape && mobileInputMode === 'joystick' && (
                <MobileControls videoElement={videoElement} />
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
