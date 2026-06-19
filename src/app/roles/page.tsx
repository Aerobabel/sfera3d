'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

const CITY_INTRO_CUTSCENE_SRC = '/cutscenes/cityvideo.mp4';

const roleBases: RoleBase[] = [
    {
        tone: 'player',
        href: '/login?role=user&next=/player/dashboard',
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
        introTag: 'Choose your operating mode',
        title: 'One immersive city, three serious product workflows.',
        subtitle: 'Pick the dashboard that matches what you need to do now: play and earn, shop and coordinate delivery, or operate a commercial pavilion.',
        startWithSound: 'Start with sound',
        skipIntro: 'Skip to role selection',
        rolePath: 'Role path',
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
            { icon: Store, title: 'Pavilion growth', text: 'Business workflows cover product readiness, leads, analytics, and sponsored quests.' },
            { icon: BadgeCheck, title: 'Premium polish', text: 'Screens use restrained controls, stronger hierarchy, and real illustrative assets.' },
        ],
        roles: {
            player: {
                title: 'Player',
                label: 'Signed player dashboard',
                description: 'Enter a private command center for game zones, quests, rewards, coin balance, delivery, and player messages.',
                action: 'Login and open dashboard',
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
                description: 'Operate a branded pavilion, manage product readiness, buyer leads, fulfilment, analytics, and sponsored quests.',
                action: 'Open business dashboard',
                proof: ['Pavilion ops', 'Lead pipeline', 'Game sponsorships'],
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
        introTag: 'Выберите рабочий режим',
        title: 'Один иммерсивный город, три серьезных продуктовых сценария.',
        subtitle: 'Выберите панель под текущую задачу: играть и зарабатывать, покупать и вести доставку или управлять коммерческим павильоном.',
        startWithSound: 'Начать со звуком',
        skipIntro: 'К выбору роли',
        rolePath: 'Путь роли',
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
            { icon: Store, title: 'Рост павильона', text: 'Бизнес-сценарии покрывают товары, лиды, аналитику и игровые спонсорства.' },
            { icon: BadgeCheck, title: 'Премиальный вид', text: 'Экраны используют строгие контролы, сильную иерархию и иллюстрации.' },
        ],
        roles: {
            player: {
                title: 'Игрок',
                label: 'Личный кабинет игрока',
                description: 'Личный центр для игровых зон, квестов, наград, монет, доставки и сообщений игрока.',
                action: 'Войти и открыть панель',
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
                description: 'Управляйте брендовым павильоном, готовностью товаров, лидами, доставкой, аналитикой и квестами.',
                action: 'Открыть бизнес-панель',
                proof: ['Операции павильона', 'Воронка лидов', 'Игровые спонсорства'],
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
        introTag: '选择你的操作模式',
        title: '一个沉浸式城市，三个严肃的产品流程。',
        subtitle: '根据当前目标选择仪表盘：游戏并赚取奖励、购物并协调配送，或运营商业展馆。',
        startWithSound: '开启声音',
        skipIntro: '跳到角色选择',
        rolePath: '角色路径',
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
            { icon: Store, title: '展馆增长', text: '商务流程覆盖商品准备度、线索、分析和赞助任务。' },
            { icon: BadgeCheck, title: '高级质感', text: '界面使用克制控件、清晰层级和真实插图资产。' },
        ],
        roles: {
            player: {
                title: '玩家',
                label: '玩家登录仪表盘',
                description: '进入私人控制中心，管理游戏区域、任务、奖励、金币、配送和玩家消息。',
                action: '登录并打开仪表盘',
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
                description: '运营品牌展馆，管理商品准备度、买家线索、履约、分析和赞助任务。',
                action: '打开商务仪表盘',
                proof: ['展馆运营', '线索管线', '游戏赞助'],
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

function RoleCard({ base, text, rolePath }: { base: RoleBase; text: RoleText; rolePath: string }) {
    const tone = toneClasses[base.tone];
    const Icon = base.Icon;

    return (
        <Link
            href={base.href}
            className={`group relative flex min-h-[34rem] flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.065] ${tone.border}`}
        >
            <div className="relative h-56 overflow-hidden bg-slate-950">
                <Image src={base.image} alt={base.imageAlt} fill sizes="(min-width: 1024px) 32vw, 100vw" className="object-cover opacity-85 transition duration-700 group-hover:scale-105" />
                <div className={`absolute inset-0 bg-gradient-to-br ${tone.glow}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/20 to-transparent" />
                <span className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] backdrop-blur ${tone.icon}`}>
                    {base.tone === 'player' && <LockKeyhole className="h-3.5 w-3.5" />}
                    {text.label}
                </span>
                <span className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur ${tone.icon}`}>
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{rolePath}</p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{text.title}</h2>
                    </div>
                    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        {text.metrics.map((metric) => (
                            <div key={metric.label} className="min-w-20 border-r border-white/10 px-3 py-2 text-center last:border-r-0">
                                <p className={`text-lg font-black ${tone.text}`}>{metric.value}</p>
                                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-300">{text.description}</p>

                <div className="mt-5 grid gap-2">
                    {text.proof.map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                            <BadgeCheck className={`h-4 w-4 shrink-0 ${tone.text}`} />
                            <span className="text-sm text-slate-300">{item}</span>
                        </div>
                    ))}
                </div>

                <span className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition group-hover:bg-white/[0.08] ${tone.button}`}>
                    {text.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
            </div>
        </Link>
    );
}

function Insight({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
    return (
        <article className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
        </article>
    );
}

export default function RoleSelectionPage() {
    const { language } = useLanguage();
    const copy = rolePageCopy[language];
    const searchParams = useSearchParams();
    const returnToScene = searchParams.get('returnTo') === '/fastview' || searchParams.get('from') === 'scene';
    const shouldPlayIntro = !returnToScene && searchParams.get('skipIntro') !== 'true';
    const [isIntroVisible, setIsIntroVisible] = useState(shouldPlayIntro);
    const [hasStartedIntro, setHasStartedIntro] = useState(!shouldPlayIntro);
    const introVideoRef = useRef<HTMLVideoElement | null>(null);

    const startIntroWithSound = () => {
        setHasStartedIntro(true);
        const video = introVideoRef.current;
        if (!video) return;

        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    };

    return (
        <main className="min-h-screen overflow-hidden bg-[#070b14] text-white">
            {isIntroVisible && (
                <div className="fixed inset-0 z-50 bg-black">
                    <video
                        ref={introVideoRef}
                        className="h-full w-full object-cover"
                        src={CITY_INTRO_CUTSCENE_SRC}
                        muted={!hasStartedIntro}
                        playsInline
                        preload="auto"
                        onEnded={() => setIsIntroVisible(false)}
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

            <section className="relative px-4 py-5 sm:px-6 lg:px-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(251,191,36,0.12),transparent_34%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:54px_54px]" />

                <div className="relative mx-auto max-w-7xl">
                    <nav className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            <Link href={returnToScene ? '/fastview?resume=scene' : '/'} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10">
                                {returnToScene ? copy.backToScene : copy.home}
                            </Link>
                            <Link href="/fastview?resume=scene" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10">
                                <Globe2 className="h-4 w-4" />
                                {copy.liveWorld}
                            </Link>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            <Sparkles className="h-4 w-4 text-cyan-200" />
                            {copy.eyebrow}
                        </span>
                    </nav>

                    <header className="grid gap-6 rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_100px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-7 lg:grid-cols-[minmax(0,1fr)_25rem] lg:p-8">
                        <div>
                            <p className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">{copy.introTag}</p>
                            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">{copy.title}</h1>
                            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">{copy.subtitle}</p>
                            <div className="mt-7 grid gap-3 sm:grid-cols-3">
                                {copy.insights.map((insight) => (
                                    <Insight key={insight.title} icon={insight.icon} title={insight.title} text={insight.text} />
                                ))}
                            </div>
                        </div>

                        <div className="relative min-h-72 overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950">
                            <Image src="/visuals/business-pavilion.svg" alt="3DSFERA premium city dashboard preview" fill sizes="(min-width: 1024px) 25rem, 100vw" className="object-cover opacity-80" priority />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.status.label}</p>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                                        <p className="text-lg font-black text-cyan-100">3</p>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{copy.status.roles}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                                        <p className="text-lg font-black text-amber-100">Live</p>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{copy.status.world}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                                        <p className="text-lg font-black text-emerald-100">B2B</p>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{copy.status.trade}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="mt-5 grid gap-5 lg:grid-cols-3">
                        {roleBases.map((base) => (
                            <RoleCard key={base.tone} base={base} text={copy.roles[base.tone]} rolePath={copy.rolePath} />
                        ))}
                    </div>

                    <section className="mt-5 grid gap-5 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6 lg:grid-cols-4">
                        {copy.footerInsights.map((insight) => (
                            <Insight key={insight.title} icon={insight.icon} title={insight.title} text={insight.text} />
                        ))}
                    </section>
                </div>
            </section>
        </main>
    );
}
