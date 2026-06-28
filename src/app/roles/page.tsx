'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    Gamepad2,
    Globe2,
    LockKeyhole,
    MessageSquare,
    PackageCheck,
    Play,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Store,
    Trophy,
    Truck,
    type LucideIcon,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { AppLanguage } from '@/lib/i18n';

type RoleTone = 'player' | 'shopper' | 'business';

type RoleBase = {
    tone: RoleTone;
    href: string;
    image: string;
    imageAlt: string;
    Icon: LucideIcon;
};

type RoleText = {
    title: string;
    label: string;
    description: string;
    action: string;
    proof: string[];
    metrics: { value: string; label: string }[];
};

type RolePageText = {
    home: string;
    backToScene: string;
    liveWorld: string;
    eyebrow: string;
    introTag: string;
    title: string;
    subtitle: string;
    startWithSound: string;
    skipIntro: string;
    rolePath: string;
    status: {
        label: string;
        roles: string;
        world: string;
        trade: string;
    };
    insights: { title: string; text: string; icon: LucideIcon }[];
    footerInsights: { title: string; text: string; icon: LucideIcon }[];
    roles: Record<RoleTone, RoleText>;
};

const ROLE_INTRO_CUTSCENE_SRCS: Record<AppLanguage, string[]> = {
    en: ['/cutscenes/maincutscene.MOV'],
    ru: ['/cutscenes/maincutscene-ru.MP4'],
    zh: ['/cutscenes/maincutscene-zh.MP4'],
};

const GAME_SELECTION_CUTSCENE_SRCS: Record<AppLanguage, string> = {
    en: '/cutscenes/gamecutscene.MOV',
    ru: '/cutscenes/gamecutscene-ru.MOV',
    zh: '/cutscenes/gamecutscene-zh.MOV',
};

const roleBases: RoleBase[] = [
    {
        tone: 'player',
        href: '/fastview?resume=scene&mode=player',
        image: '/visuals/player-arena.svg',
        imageAlt: '3DSFERA player arena dashboard preview',
        Icon: Gamepad2,
    },
    {
        tone: 'shopper',
        href: '/shopper/dashboard',
        image: '/visuals/shopper-market.svg',
        imageAlt: '3DSFERA Sfera Hall shopper dashboard preview',
        Icon: ShoppingBag,
    },
    {
        tone: 'business',
        href: '/business/dashboard',
        image: '/visuals/business-pavilion.svg',
        imageAlt: '3DSFERA business pavilion dashboard preview',
        Icon: Building2,
    },
];

const rolePageCopy: Record<AppLanguage, RolePageText> = {
    en: {
        home: 'Home',
        backToScene: 'Back to scene',
        liveWorld: 'Live world',
        eyebrow: '3DSFERA role selection',
        introTag: 'Choose your role',
        title: 'Choose how you want to enter 3DSFERA.',
        subtitle: 'Select one role. You can switch later from the scene menu.',
        startWithSound: 'Start with sound',
        skipIntro: 'Skip to role selection',
        rolePath: 'Role',
        status: {
            label: 'Platform status',
            roles: 'roles',
            world: 'world',
            trade: 'trade',
        },
        insights: [
            { icon: ShieldCheck, title: 'Protected player access', text: 'Player dashboard opens behind email and password authentication.' },
            { icon: MessageSquare, title: 'Real work surfaces', text: 'Dashboards focus on orders, leads, rewards, delivery, and messages.' },
            { icon: Truck, title: 'Responsive by default', text: 'Layouts adapt inside scene menus and full browser pages.' },
        ],
        footerInsights: [
            { icon: Trophy, title: 'Game economy', text: 'Player rewards connect to coins, coupons, and real delivery actions.' },
            { icon: PackageCheck, title: 'Buyer operations', text: 'Shopping dashboards track saved products, supplier replies, and delivery state.' },
            { icon: Store, title: 'Pavilion growth', text: 'Business workflows cover product readiness, leads, analytics, and fulfilment.' },
            { icon: BadgeCheck, title: 'Premium polish', text: 'Screens use restrained controls, stronger hierarchy, and real illustrative assets.' },
        ],
        roles: {
            player: {
                title: 'Player',
                label: 'Signed player dashboard',
                description: 'Enter a private command center for game zones, quests, rewards, coin balance, delivery, and player messages.',
                action: 'Login and enter scene',
                proof: ['Password access', 'Rewards wallet', 'Arena activity'],
                metrics: [
                    { value: '24', label: 'player level' },
                    { value: '3', label: 'live zones' },
                ],
            },
            shopper: {
                title: 'Shopper',
                label: 'Marketplace workspace',
                description: 'Browse pavilions, compare products, monitor supplier replies, track delivery, and keep real orders moving.',
                action: 'Open shopper dashboard',
                proof: ['Saved products', 'Supplier chat', 'Delivery queue'],
                metrics: [
                    { value: '12', label: 'saved items' },
                    { value: '5', label: 'supplier replies' },
                ],
            },
            business: {
                title: 'Business',
                label: 'Pavilion control room',
                description: 'Operate a branded pavilion, manage product readiness, buyer leads, fulfilment, analytics, and campaigns.',
                action: 'Open business dashboard',
                proof: ['Pavilion ops', 'Lead pipeline', 'Campaigns'],
                metrics: [
                    { value: '28', label: 'buyer leads' },
                    { value: '84%', label: 'product ready' },
                ],
            },
        },
    },
    ru: {
        home: 'Главная',
        backToScene: 'Назад в сцену',
        liveWorld: 'Live-мир',
        eyebrow: 'Выбор роли 3DSFERA',
        introTag: 'Выберите роль',
        title: 'Выберите, как войти в 3DSFERA.',
        subtitle: 'Выберите одну роль. Позже можно переключиться из меню сцены.',
        startWithSound: 'Начать со звуком',
        skipIntro: 'К выбору роли',
        rolePath: 'Роль',
        status: {
            label: 'Статус платформы',
            roles: 'роли',
            world: 'мир',
            trade: 'торговля',
        },
        insights: [
            { icon: ShieldCheck, title: 'Защищенный вход игрока', text: 'Панель игрока открывается через email и пароль.' },
            { icon: MessageSquare, title: 'Рабочие панели', text: 'Дашборды сфокусированы на заказах, лидах, наградах, доставке и сообщениях.' },
            { icon: Truck, title: 'Адаптивно по умолчанию', text: 'Интерфейс нормально работает и в меню сцены, и на полной странице.' },
        ],
        footerInsights: [
            { icon: Trophy, title: 'Игровая экономика', text: 'Награды игрока связаны с монетами, купонами и реальной доставкой.' },
            { icon: PackageCheck, title: 'Операции покупателя', text: 'Панель покупателя отслеживает избранное, ответы поставщиков и доставку.' },
            { icon: Store, title: 'Рост павильона', text: 'Бизнес-сценарии покрывают товары, лиды, аналитику и доставку.' },
            { icon: BadgeCheck, title: 'Премиальный вид', text: 'Экраны используют строгие контролы, сильную иерархию и иллюстрации.' },
        ],
        roles: {
            player: {
                title: 'Игрок',
                label: 'Личный кабинет игрока',
                description: 'Личный центр для игровых зон, квестов, наград, монет, доставки и сообщений игрока.',
                action: 'Войти в сцену',
                proof: ['Вход по паролю', 'Кошелек наград', 'Активность арены'],
                metrics: [
                    { value: '24', label: 'уровень' },
                    { value: '3', label: 'игровые зоны' },
                ],
            },
            shopper: {
                title: 'Покупатель',
                label: 'Рабочее место маркетплейса',
                description: 'Изучайте павильоны, сравнивайте товары, следите за ответами поставщиков и доставкой.',
                action: 'Открыть панель покупателя',
                proof: ['Сохраненные товары', 'Чат с поставщиком', 'Очередь доставки'],
                metrics: [
                    { value: '12', label: 'избранных' },
                    { value: '5', label: 'ответов' },
                ],
            },
            business: {
                title: 'Бизнес',
                label: 'Центр управления павильоном',
                description: 'Управляйте брендовым павильоном, готовностью товаров, лидами, доставкой, аналитикой и кампаниями.',
                action: 'Открыть бизнес-панель',
                proof: ['Операции павильона', 'Воронка лидов', 'Кампании'],
                metrics: [
                    { value: '28', label: 'лидов' },
                    { value: '84%', label: 'готово' },
                ],
            },
        },
    },
    zh: {
        home: '首页',
        backToScene: '返回场景',
        liveWorld: '实时世界',
        eyebrow: '3DSFERA 角色选择',
        introTag: '选择角色',
        title: '选择你如何进入 3DSFERA。',
        subtitle: '选择一个角色。之后可在场景菜单中切换。',
        startWithSound: '开启声音',
        skipIntro: '跳到角色选择',
        rolePath: '角色',
        status: {
            label: '平台状态',
            roles: '角色',
            world: '世界',
            trade: '贸易',
        },
        insights: [
            { icon: ShieldCheck, title: '受保护的玩家入口', text: '玩家仪表盘通过邮箱和密码登录后打开。' },
            { icon: MessageSquare, title: '真实工作界面', text: '仪表盘聚焦订单、线索、奖励、配送和消息。' },
            { icon: Truck, title: '默认响应式', text: '布局可适配场景菜单和完整浏览器页面。' },
        ],
        footerInsights: [
            { icon: Trophy, title: '游戏经济', text: '玩家奖励连接金币、优惠券和真实配送动作。' },
            { icon: PackageCheck, title: '买家运营', text: '购物仪表盘追踪收藏商品、供应商回复和配送状态。' },
            { icon: Store, title: '展馆增长', text: '商务流程覆盖商品准备度、线索、分析和履约。' },
            { icon: BadgeCheck, title: '高级质感', text: '界面使用克制控件、清晰层级和真实插图资产。' },
        ],
        roles: {
            player: {
                title: '玩家',
                label: '玩家登录仪表盘',
                description: '进入私人控制中心，管理游戏区域、任务、奖励、金币、配送和玩家消息。',
                action: '登录并进入场景',
                proof: ['密码访问', '奖励钱包', '竞技场活动'],
                metrics: [
                    { value: '24', label: '玩家等级' },
                    { value: '3', label: '实时区域' },
                ],
            },
            shopper: {
                title: '买家',
                label: '市场工作区',
                description: '浏览展馆、比较商品、查看供应商回复、追踪配送，并推动真实订单。',
                action: '打开买家仪表盘',
                proof: ['收藏商品', '供应商聊天', '配送队列'],
                metrics: [
                    { value: '12', label: '收藏' },
                    { value: '5', label: '回复' },
                ],
            },
            business: {
                title: '商务',
                label: '展馆控制室',
                description: '运营品牌展馆，管理商品准备度、买家线索、履约、分析和营销活动。',
                action: '打开商务仪表盘',
                proof: ['展馆运营', '线索管线', '营销活动'],
                metrics: [
                    { value: '28', label: '买家线索' },
                    { value: '84%', label: '准备度' },
                ],
            },
        },
    },
};

const toneClasses: Record<RoleTone, { border: string; icon: string; glow: string; text: string; button: string }> = {
    player: {
        border: 'hover:border-sky-300/40',
        icon: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
        glow: 'from-sky-300/24 via-cyan-300/10 to-transparent',
        text: 'text-sky-100',
        button: 'border-sky-300/35 bg-sky-300/12 text-sky-100',
    },
    shopper: {
        border: 'hover:border-amber-300/40',
        icon: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
        glow: 'from-amber-300/24 via-cyan-300/10 to-transparent',
        text: 'text-amber-100',
        button: 'border-amber-300/35 bg-amber-300/12 text-amber-100',
    },
    business: {
        border: 'hover:border-emerald-300/40',
        icon: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
        glow: 'from-emerald-300/24 via-sky-300/10 to-transparent',
        text: 'text-emerald-100',
        button: 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100',
    },
};

function RoleCard({
    base,
    text,
    rolePath,
    primary = false,
    onSelect,
}: {
    base: RoleBase;
    text: RoleText;
    rolePath: string;
    primary?: boolean;
    onSelect?: (href: string) => void;
}) {
    const tone = toneClasses[base.tone];
    const Icon = base.Icon;

    return (
        <Link
            href={base.href}
            onClick={(event) => {
                if (!onSelect) return;

                event.preventDefault();
                onSelect(base.href);
            }}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e141c] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#111923] ${primary ? 'min-h-[19rem] p-6 shadow-[0_28px_90px_rgba(56,189,248,0.12)]' : 'min-h-[16rem] p-5'} ${tone.border}`}
        >
            <span className={`pointer-events-none absolute inset-x-0 top-0 ${primary ? 'h-36' : 'h-24'} bg-gradient-to-b ${tone.glow} opacity-55`} />
            {primary && <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_8%,rgba(255,255,255,0.08),transparent_34%)]" />}

            <div className="relative flex items-start justify-between gap-4">
                <span className={`flex items-center justify-center rounded-xl border ${primary ? 'h-14 w-14' : 'h-11 w-11'} ${tone.icon}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold ${tone.text}`}>
                    {base.tone === 'player' && <LockKeyhole className="h-3.5 w-3.5" />}
                    {rolePath}
                </span>
            </div>

            <div className={`relative min-w-0 ${primary ? 'mt-7' : 'mt-5'}`}>
                <p className={`text-xs font-semibold ${tone.text}`}>{text.label}</p>
                <h2 className={`mt-2 break-words font-semibold tracking-tight text-white ${primary ? 'text-3xl' : 'text-2xl'}`}>{text.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text.description}</p>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-2">
                {text.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className={`${primary ? 'text-2xl' : 'text-xl'} font-semibold text-white`}>{metric.value}</p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">{metric.label}</p>
                    </div>
                ))}
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
                {text.proof.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] text-slate-300">
                        {item}
                    </span>
                ))}
            </div>

            <div className="relative mt-auto pt-5">
                <span className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition group-hover:bg-white/[0.08] ${tone.button}`}>
                    {text.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
            </div>
        </Link>
    );
}

export default function RoleSelectionPage() {
    const { language } = useLanguage();
    const copy = rolePageCopy[language];
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnToScene = searchParams.get('returnTo') === '/fastview' || searchParams.get('from') === 'scene';
    const shouldPlayIntro = !returnToScene && searchParams.get('skipIntro') !== 'true';
    const [isIntroVisible, setIsIntroVisible] = useState(shouldPlayIntro);
    const [hasStartedIntro, setHasStartedIntro] = useState(!shouldPlayIntro);
    const [introCutsceneIndex, setIntroCutsceneIndex] = useState(0);
    const [isGameCutsceneVisible, setIsGameCutsceneVisible] = useState(false);
    const [hasStartedGameCutscene, setHasStartedGameCutscene] = useState(false);
    const [gameCutsceneHref, setGameCutsceneHref] = useState<string | null>(null);
    const introVideoRef = useRef<HTMLVideoElement | null>(null);
    const gameCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const currentIntroCutsceneSrcs = ROLE_INTRO_CUTSCENE_SRCS[language];
    const currentIntroCutsceneSrc = currentIntroCutsceneSrcs[introCutsceneIndex];
    const currentGameCutsceneSrc = GAME_SELECTION_CUTSCENE_SRCS[language];

    const playIntroVideo = () => {
        const video = introVideoRef.current;
        if (!video) return;

        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    };

    const startIntroWithSound = () => {
        setHasStartedIntro(true);
        playIntroVideo();
    };

    const playGameCutsceneVideo = () => {
        const video = gameCutsceneVideoRef.current;
        if (!video) return;

        video.muted = false;
        video.volume = 1;
        video.currentTime = 0;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    };

    const startGameCutscene = (href: string) => {
        setGameCutsceneHref(href);
        setHasStartedGameCutscene(true);
        setIsGameCutsceneVisible(true);
    };

    const enterSelectedGame = () => {
        const href = gameCutsceneHref ?? roleBases.find((base) => base.tone === 'player')?.href ?? '/fastview?resume=scene&mode=player';
        const video = gameCutsceneVideoRef.current;

        if (video) {
            video.pause();
            try {
                video.currentTime = 0;
            } catch {}
        }

        setIsGameCutsceneVisible(false);
        setHasStartedGameCutscene(false);
        setGameCutsceneHref(null);
        router.push(href);
    };

    const advanceIntroCutscene = () => {
        setIntroCutsceneIndex((currentIndex) => {
            const nextIndex = currentIndex + 1;

            if (nextIndex >= currentIntroCutsceneSrcs.length) {
                setIsIntroVisible(false);
                return currentIndex;
            }

            return nextIndex;
        });
    };

    useEffect(() => {
        if (!isIntroVisible || !hasStartedIntro || introCutsceneIndex === 0) return;

        playIntroVideo();
    }, [hasStartedIntro, introCutsceneIndex, isIntroVisible]);

    useEffect(() => {
        if (!isGameCutsceneVisible || !hasStartedGameCutscene) return;

        const animationFrame = window.requestAnimationFrame(playGameCutsceneVideo);

        return () => window.cancelAnimationFrame(animationFrame);
    }, [hasStartedGameCutscene, isGameCutsceneVisible]);

    return (
        <main className="min-h-screen overflow-hidden bg-[#080b10] text-white">
            {isIntroVisible && (
                <div className="fixed inset-0 z-50 bg-black">
                    <header className="absolute inset-x-0 top-0 z-[80] border-b border-white/15 bg-[#090b10]/95 shadow-[0_16px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                            <Link href="/" className="flex min-w-0 items-center">
                                <BrandLogo size="md" priority />
                            </Link>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/"
                                    className="hidden rounded-full border border-white/15 px-4 py-2 text-xs font-semibold tracking-wide text-[#f5f1e9] transition hover:border-white/35 hover:bg-white/10 sm:inline-flex sm:text-sm"
                                >
                                    {copy.home}
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setIsIntroVisible(false)}
                                    className="rounded-full bg-[#f6ba4f] px-4 py-2 text-xs font-bold tracking-wide text-[#130f07] transition hover:bg-[#ffd084] sm:text-sm"
                                >
                                    {copy.skipIntro}
                                </button>
                            </div>
                        </div>
                    </header>
                    <video
                        ref={introVideoRef}
                        className="h-full w-full object-cover"
                        key={currentIntroCutsceneSrc}
                        src={currentIntroCutsceneSrc}
                        muted={!hasStartedIntro}
                        playsInline
                        preload="auto"
                        onEnded={advanceIntroCutscene}
                        onError={() => setIsIntroVisible(false)}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),transparent_45%,rgba(0,0,0,0.78))]" />
                    <div className="absolute inset-x-0 bottom-8 flex flex-wrap justify-center gap-3 px-6">
                        {!hasStartedIntro && (
                            <button
                                type="button"
                                onClick={startIntroWithSound}
                                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#07110f] shadow-[0_18px_70px_rgba(34,211,238,0.25)] transition hover:scale-[1.02]"
                            >
                                <Play className="h-4 w-4" />
                                {copy.startWithSound}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsIntroVisible(false)}
                            className="rounded-full border border-white/15 bg-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:bg-white/[0.14]"
                        >
                            {copy.skipIntro}
                        </button>
                    </div>
                </div>
            )}

            {isGameCutsceneVisible && (
                <div className="fixed inset-0 z-50 bg-black">
                    <video
                        ref={gameCutsceneVideoRef}
                        className="h-full w-full object-cover"
                        src={currentGameCutsceneSrc}
                        playsInline
                        preload="auto"
                        data-cutscene-video="true"
                        onEnded={enterSelectedGame}
                        onError={enterSelectedGame}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),transparent_58%,rgba(0,0,0,0.72))]" />
                    <div className="absolute inset-x-0 bottom-8 flex justify-center px-6">
                        <button
                            type="button"
                            onClick={enterSelectedGame}
                            className="rounded-full border border-white/15 bg-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:bg-white/[0.14]"
                        >
                            {copy.skipIntro}
                        </button>
                    </div>
                </div>
            )}

            <section className="relative px-4 py-5 sm:px-6 lg:px-8">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(14,165,233,0.1),transparent)]" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />

                <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col">
                    <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            <Link href={returnToScene ? '/fastview?resume=scene' : '/'} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]">
                                {returnToScene ? copy.backToScene : copy.home}
                            </Link>
                            <Link href="/fastview?resume=scene" className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]">
                                <Globe2 className="h-4 w-4" />
                                {copy.liveWorld}
                            </Link>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-400">
                            <Sparkles className="h-4 w-4 text-cyan-200" />
                            {copy.eyebrow}
                        </span>
                    </nav>

                    <div className="flex flex-1 flex-col justify-center gap-5">
                        <header className="grid gap-5 rounded-2xl border border-white/10 bg-[#0c1118]/88 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-6">
                            <div className="min-w-0">
                                <BrandLogo size="sm" imageClassName="h-9 w-[10rem]" />
                                <p className="mt-5 text-sm font-semibold text-cyan-100">{copy.introTag}</p>
                                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
                                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">{copy.subtitle}</p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/18 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.status.label}</p>
                                <div className="mt-4 grid gap-2">
                                    {[
                                        ['3', copy.status.roles],
                                        ['1', copy.status.world],
                                        ['24/7', copy.status.trade],
                                    ].map(([value, label]) => (
                                        <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5">
                                            <p className="text-lg font-semibold text-white">{value}</p>
                                            <p className="text-[11px] text-slate-500">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </header>

                        <section className="grid gap-3 lg:grid-cols-[1.18fr_0.91fr_0.91fr]">
                            {roleBases.map((base) => (
                                <RoleCard
                                    key={base.tone}
                                    base={base}
                                    text={copy.roles[base.tone]}
                                    rolePath={copy.rolePath}
                                    primary={base.tone === 'player'}
                                    onSelect={base.tone === 'player' ? startGameCutscene : undefined}
                                />
                            ))}
                        </section>
                    </div>

                </div>
            </section>
        </main>
    );
}
