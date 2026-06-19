'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Activity,
    ArrowRight,
    BarChart3,
    Box,
    Building2,
    CalendarCheck,
    CheckCircle2,
    ChevronRight,
    CircleDollarSign,
    ClipboardCheck,
    Clock3,
    Coins,
    CreditCard,
    Gamepad2,
    Gift,
    Globe2,
    HeartPulse,
    Home,
    LineChart,
    LockKeyhole,
    Map,
    MessageSquare,
    PackageCheck,
    Search,
    ShieldCheck,
    ShoppingBag,
    Star,
    Store,
    Trophy,
    Truck,
    Users,
    WalletCards,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { GAME_RULES } from '@/lib/unreal/gameRules';
import type { UnrealEventBridgeState } from '@/lib/unreal/types';

type DashboardProps = {
    bridge?: UnrealEventBridgeState;
};

type Tone = 'cyan' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

type MetricProps = {
    title: string;
    value: string;
    helper: string;
    icon: LucideIcon;
    tone: Tone;
    progress?: number;
};

const fallback: UnrealEventBridgeState = {
    currentMode: 'shopper',
    currentLocation: 'city',
    currentGame: null,
    isInGame: false,
    zombieScore: 0,
    zombieHealth: GAME_RULES.zombieArena.startingHealth,
    zombieGameOver: false,
    zombieKills: 0,
    playerHits: 0,
    zombieCombo: 0,
    maxZombieCombo: 0,
    zombieCoins: 0,
    zombieThreatLevel: 1,
    zombieRank: 'Rookie Survivor',
    arenaMoments: [],
    lastUnrealEvent: null,
    accessDeniedMessage: null,
    recentActivity: ['Entered Zombie Arena', 'Cleared a wave', 'Unlocked coin bonus', 'Returned to Sfera Hall'],
};

const dashboardCopy = {
    enterWorld: 'Enter world',
    roles: 'Roles',
    backToScene: 'Back to scene',
    playerTitle: 'Player command center',
    playerKicker: 'Live player operations',
    playerSubtitle: 'Track quests, rewards, delivery, messages, and game access from one polished player workspace.',
    shopperTitle: 'Shopper workspace',
    shopperKicker: 'Spatial commerce dashboard',
    shopperSubtitle: 'Manage discovery, saved products, supplier messages, order status, and delivery in one buying cockpit.',
    businessTitle: 'Business control room',
    businessKicker: 'Pavilion and supplier operations',
    businessSubtitle: 'Operate a branded pavilion, manage product readiness, follow buyer leads, and sponsor in-world rewards.',
};

const toneStyles: Record<Tone, { icon: string; ring: string; accent: string; bar: string }> = {
    cyan: {
        icon: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200',
        ring: 'shadow-[0_0_40px_rgba(34,211,238,0.14)]',
        accent: 'text-cyan-200',
        bar: 'bg-cyan-300',
    },
    sky: {
        icon: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
        ring: 'shadow-[0_0_40px_rgba(56,189,248,0.14)]',
        accent: 'text-sky-200',
        bar: 'bg-sky-300',
    },
    emerald: {
        icon: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
        ring: 'shadow-[0_0_40px_rgba(52,211,153,0.14)]',
        accent: 'text-emerald-200',
        bar: 'bg-emerald-300',
    },
    amber: {
        icon: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
        ring: 'shadow-[0_0_40px_rgba(251,191,36,0.14)]',
        accent: 'text-amber-200',
        bar: 'bg-amber-300',
    },
    rose: {
        icon: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
        ring: 'shadow-[0_0_40px_rgba(251,113,133,0.14)]',
        accent: 'text-rose-200',
        bar: 'bg-rose-300',
    },
    violet: {
        icon: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
        ring: 'shadow-[0_0_40px_rgba(167,139,250,0.14)]',
        accent: 'text-violet-200',
        bar: 'bg-violet-300',
    },
};

const panel = 'rounded-[1.35rem] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl';
const compactPanel = 'rounded-[1.15rem] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function DashboardBackNav() {
    const { language } = useLanguage();
    const searchParams = useSearchParams();
    const returnToScene = searchParams.get('returnTo') === '/fastview';
    const rolesLabel = language === 'en' ? dashboardCopy.roles : dashboardCopy.roles;
    const sceneLabel = language === 'en' ? dashboardCopy.backToScene : dashboardCopy.backToScene;

    return (
        <div className="mb-5 flex flex-wrap items-center gap-2">
            <Link
                href={returnToScene ? '/roles?returnTo=/fastview' : '/roles?skipIntro=true'}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
            >
                <Home className="h-3.5 w-3.5" />
                {rolesLabel}
            </Link>
            <Link
                href="/fastview?resume=scene"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
            >
                <Globe2 className="h-3.5 w-3.5" />
                {sceneLabel}
            </Link>
        </div>
    );
}

function DashboardFrame({
    children,
    sidebar,
    mode,
}: {
    children: ReactNode;
    sidebar?: ReactNode;
    mode: 'player' | 'shopper' | 'business';
}) {
    const modeGlow = {
        player: 'radial-gradient(circle_at_78%_8%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(34,211,238,0.12),transparent_34%)',
        shopper: 'radial-gradient(circle_at_82%_10%,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_14%_82%,rgba(45,212,191,0.14),transparent_34%)',
        business: 'radial-gradient(circle_at_82%_10%,rgba(52,211,153,0.18),transparent_30%),radial-gradient(circle_at_14%_80%,rgba(56,189,248,0.13),transparent_34%)',
    }[mode];

    return (
        <section className="relative overflow-hidden border border-white/10 bg-[#070b14] text-white shadow-[0_40px_140px_rgba(0,0,0,0.52)] md:rounded-[2rem]">
            <div className="pointer-events-none absolute inset-0" style={{ background: modeGlow }} />
            <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:54px_54px]" />
            <div className="relative grid min-h-screen xl:grid-cols-[15rem_minmax(0,1fr)]">
                {sidebar}
                <div className="min-w-0 p-4 sm:p-5 lg:p-7 xl:p-8">{children}</div>
            </div>
        </section>
    );
}

function HeaderSearch({ label }: { label: string }) {
    return (
        <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] pl-11 pr-24 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-cyan-300/[0.07]"
                placeholder={label}
                readOnly
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Ctrl K
            </span>
        </div>
    );
}

function StatusPill({ children, tone = 'cyan' }: { children: React.ReactNode; tone?: Tone }) {
    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${toneStyles[tone].icon}`}>
            <span className={`h-2 w-2 rounded-full ${toneStyles[tone].bar}`} />
            {children}
        </span>
    );
}

function MetricCard({ title, value, helper, icon: Icon, tone, progress }: MetricProps) {
    return (
        <article className={`${panel} ${toneStyles[tone].ring} min-h-40 p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{title}</p>
                    <p className="mt-3 break-words text-2xl font-black leading-tight text-white sm:text-3xl">{value}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneStyles[tone].icon}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
            </div>
            <p className="mt-3 text-sm leading-5 text-slate-400">{helper}</p>
            {typeof progress === 'number' && (
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${toneStyles[tone].bar}`} style={{ width: `${clampPercent(progress)}%` }} />
                </div>
            )}
        </article>
    );
}

function WorkCard({
    title,
    text,
    icon: Icon,
    tone,
    href = '/fastview',
    action = 'Open',
}: {
    title: string;
    text: string;
    icon: LucideIcon;
    tone: Tone;
    href?: string;
    action?: string;
}) {
    return (
        <Link href={href} className={`${compactPanel} group flex min-h-40 flex-col justify-between p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.065]`}>
            <div>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${toneStyles[tone].icon}`}>
                    <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-black tracking-tight text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
            <span className={`mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] ${toneStyles[tone].accent}`}>
                {action}
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}

function ListPanel({
    title,
    items,
    icon: Icon,
    tone = 'cyan',
}: {
    title: string;
    items: string[];
    icon: LucideIcon;
    tone?: Tone;
}) {
    return (
        <section className={`${panel} p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-300">{title}</h2>
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneStyles[tone].icon}`}>
                    <Icon className="h-5 w-5" />
                </span>
            </div>
            <div className="space-y-3">
                {items.map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${toneStyles[tone].accent}`} />
                        <p className="text-sm leading-5 text-slate-300">{item}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function VisualPanel({
    src,
    alt,
    title,
    markers,
}: {
    src: string;
    alt: string;
    title: string;
    markers: { label: string; className: string }[];
}) {
    return (
        <section className={`${panel} overflow-hidden`}>
            <div className="p-5 pb-3">
                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-300">{title}</h2>
            </div>
            <div className="relative mx-5 mb-5 h-64 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                <Image src={src} alt={alt} width={1200} height={760} className="h-full w-full object-cover opacity-75" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/15" />
                {markers.map((marker) => (
                    <span key={marker.label} className={`absolute rounded-lg border bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur ${marker.className}`}>
                        {marker.label}
                    </span>
                ))}
            </div>
        </section>
    );
}

function PlayerSidebar() {
    const items = [
        { label: 'Dashboard', href: '/player/dashboard', icon: Activity, active: true },
        { label: 'World Map', href: '/fastview?resume=scene', icon: Map },
        { label: 'Arena', href: '/fastview?resume=scene&mode=gamer', icon: Gamepad2 },
        { label: 'Rewards', href: '/fastview', icon: Gift },
        { label: 'Wallet', href: '/fastview', icon: WalletCards },
        { label: 'Delivery', href: '/fastview', icon: Truck },
    ];

    return (
        <aside className="hidden border-r border-white/10 bg-black/25 p-4 backdrop-blur-xl xl:flex xl:flex-col">
            <div className="flex items-center gap-3 px-2 py-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-lg font-black text-cyan-100">3D</span>
                <div>
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-white">3DSFERA</p>
                    <p className="text-xs text-slate-500">Player suite</p>
                </div>
            </div>
            <nav className="mt-8 space-y-2">
                {items.map(({ label, href, icon: Icon, active }) => (
                    <Link
                        key={label}
                        href={href}
                        className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                            active
                                ? 'border-cyan-300/35 bg-cyan-300/12 text-white shadow-[0_0_32px_rgba(34,211,238,0.16)]'
                                : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            {label}
                        </span>
                        {active && <ChevronRight className="h-4 w-4 text-cyan-200" />}
                    </Link>
                ))}
            </nav>
            <div className="mt-auto rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Season 1</p>
                <p className="mt-2 text-lg font-black leading-tight text-white">Weekly arena rewards are live</p>
                <Link href="/fastview?resume=scene&mode=gamer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
                    Play now
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </aside>
    );
}

function DashboardHero({
    kicker,
    title,
    subtitle,
    src,
    alt,
    tone,
    children,
}: {
    kicker: string;
    title: string;
    subtitle: string;
    src: string;
    alt: string;
    tone: Tone;
    children?: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7">
            <Image src={src} alt={alt} width={1200} height={760} className="absolute inset-0 h-full w-full object-cover opacity-45" priority />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98),rgba(2,6,23,0.78)_52%,rgba(2,6,23,0.28))]" />
            <div className="relative max-w-3xl">
                <StatusPill tone={tone}>{kicker}</StatusPill>
                <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{subtitle}</p>
                {children}
            </div>
        </section>
    );
}

export function GamerDashboard({ bridge = fallback }: DashboardProps) {
    const coinsPreview = bridge.zombieCoins || Math.floor(bridge.zombieScore / GAME_RULES.zombieArena.zombieKillPoints) * GAME_RULES.zombieArena.coinsPerKill;
    const healthPercent = clampPercent(bridge.zombieHealth);
    const levelProgress = clampPercent(Math.max(18, bridge.zombieScore / 100));
    const questProgress = clampPercent(Math.max(34, (bridge.zombieKills % 10) * 10));
    const rewardCount = Math.max(bridge.zombieKills + bridge.maxZombieCombo, 27);
    const activityItems = bridge.recentActivity.length > 0 ? bridge.recentActivity : fallback.recentActivity;
    const currentGame = bridge.currentGame ?? 'Zombie Arena';
    const currentLocation = bridge.currentLocation === 'city' ? '3DSFERA City' : bridge.currentLocation;

    return (
        <DashboardFrame mode="player" sidebar={<PlayerSidebar />}>
            <DashboardBackNav />
            <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <HeaderSearch label="Search quests, rewards, pavilions..." />
                <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone="sky">Player mode</StatusPill>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-300">
                        <LockKeyhole className="h-4 w-4 text-emerald-200" />
                        Signed player dashboard
                    </span>
                </div>
            </header>

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                <main className="min-w-0 space-y-5">
                    <DashboardHero
                        kicker={dashboardCopy.playerKicker}
                        title={dashboardCopy.playerTitle}
                        subtitle={dashboardCopy.playerSubtitle}
                        src="/visuals/player-arena.svg"
                        alt="3DSFERA player arena dashboard"
                        tone="sky"
                    >
                        <div className="mt-7 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                            <div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-slate-200">Level 24</span>
                                    <span className="text-slate-400">{bridge.zombieScore.toLocaleString()} / 10,000 XP</span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.75)]" style={{ width: `${levelProgress}%` }} />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Player ID</p>
                                <p className="mt-1 font-mono text-sm text-slate-200">3DSF-7A2B-9C4D</p>
                            </div>
                        </div>
                    </DashboardHero>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard title="Current location" value={currentLocation} helper="Ready to enter the live city" icon={Map} tone="cyan" />
                        <MetricCard title="Current game" value={currentGame} helper="Arena access unlocked" icon={Gamepad2} tone="sky" />
                        <MetricCard title="Health" value={`${bridge.zombieHealth} / 100`} helper="Regenerates before next run" icon={HeartPulse} tone="rose" progress={healthPercent} />
                        <MetricCard title="Coin balance" value={coinsPreview.toLocaleString()} helper="+320 earned today" icon={Coins} tone="amber" />
                        <MetricCard title="Arena score" value={bridge.zombieScore.toLocaleString()} helper="Top 18 percent this week" icon={Trophy} tone="violet" />
                        <MetricCard title="Quest progress" value={`${questProgress}%`} helper={`${Math.max(bridge.zombieKills, 15)} of 22 tasks complete`} icon={ClipboardCheck} tone="emerald" progress={questProgress} />
                        <MetricCard title="Rewards earned" value={String(rewardCount)} helper="Coupons, gifts, and drops" icon={Gift} tone="amber" />
                        <MetricCard title="Threat level" value={String(bridge.zombieThreatLevel)} helper={bridge.zombieRank} icon={Zap} tone="rose" />
                    </div>

                    <section className={`${panel} p-5`}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-300">Playable zones</h2>
                                <p className="mt-1 text-sm text-slate-500">Game access, reward rules, and risk level for this player.</p>
                            </div>
                            <Link href="/fastview?resume=scene&mode=gamer" className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-sky-100">
                                Enter world
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-3">
                            <WorkCard title="Zombie Arena" text="Survive waves, build combo streaks, and convert points into coin rewards." icon={Gamepad2} tone="rose" href="/fastview?resume=scene&mode=gamer" action="Start run" />
                            <WorkCard title="Racing Zone" text="Compete in timed city circuits with sponsored weekly prize pools." icon={Activity} tone="cyan" href="/fastview?resume=scene&mode=gamer" action="Queue race" />
                            <WorkCard title="Treasure Hunt" text="Find product coupons and marketplace gifts hidden across pavilions." icon={Gift} tone="amber" href="/fastview?resume=scene&mode=gamer" action="View hunt" />
                        </div>
                    </section>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <ListPanel
                            title="Reward and delivery queue"
                            icon={Truck}
                            tone="amber"
                            items={[
                                'Gaming headset reward - unlocked, delivery location needed',
                                'Zombie Arena coin payout - pending match settlement',
                                'Sfera Hall merch drop - ready to claim in marketplace',
                            ]}
                        />
                        <ListPanel
                            title="Player messages"
                            icon={MessageSquare}
                            tone="cyan"
                            items={[
                                'Arena host opened the weekly survival tournament.',
                                'Marketplace concierge can bundle a reward with a real product order.',
                                'Youbo supplier sent a player-only discount code.',
                            ]}
                        />
                    </div>
                </main>

                <aside className="space-y-5 2xl:sticky 2xl:top-6 2xl:self-start">
                    <ListPanel title="Recent activity" icon={Clock3} tone="sky" items={activityItems.slice(0, 5)} />
                    <VisualPanel
                        src="/visuals/shopper-market.svg"
                        alt="3DSFERA city overview map"
                        title="City overview"
                        markers={[
                            { label: 'Sfera Hall', className: 'left-[12%] top-[24%] border-cyan-300/45 text-cyan-100' },
                            { label: 'Arena', className: 'right-[12%] top-[34%] border-rose-300/45 text-rose-100' },
                            { label: 'Racing', className: 'bottom-[22%] left-[10%] border-sky-300/45 text-sky-100' },
                            { label: 'Rewards', className: 'bottom-[16%] right-[12%] border-amber-300/45 text-amber-100' },
                        ]}
                    />
                    <section className={`${panel} p-5`}>
                        <div className="flex items-center gap-4">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                                <ShieldCheck className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="font-black text-white">Double coin event</p>
                                <p className="text-sm text-slate-400">Earn 2X coins in all player zones.</p>
                            </div>
                            <div className="ml-auto text-right font-mono text-lg text-slate-200">02:18</div>
                        </div>
                    </section>
                </aside>
            </div>
        </DashboardFrame>
    );
}

export function ShopperDashboard({ bridge = fallback }: DashboardProps) {
    const currentLocation = bridge.currentLocation === 'city' ? 'Sfera Hall' : bridge.currentLocation;

    return (
        <DashboardFrame mode="shopper">
            <DashboardBackNav />
            <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <HeaderSearch label="Search products, suppliers, orders..." />
                <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone="amber">Buyer mode</StatusPill>
                    <Link href="/fastview?resume=scene&mode=shopper" className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
                        Open hall
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </header>

            <div className="space-y-5">
                <DashboardHero
                    kicker={dashboardCopy.shopperKicker}
                    title={dashboardCopy.shopperTitle}
                    subtitle={dashboardCopy.shopperSubtitle}
                    src="/visuals/shopper-market.svg"
                    alt="3DSFERA shopper marketplace dashboard"
                    tone="amber"
                >
                    <div className="mt-7 flex flex-wrap gap-3">
                        <StatusPill tone="cyan">Location: {currentLocation}</StatusPill>
                        <StatusPill tone="emerald">Verified suppliers online</StatusPill>
                    </div>
                </DashboardHero>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Saved products" value="12" helper="3 in comparison, 2 price alerts" icon={Star} tone="amber" />
                    <MetricCard title="Active orders" value="3" helper="One awaiting payment" icon={PackageCheck} tone="emerald" />
                    <MetricCard title="Supplier replies" value="5" helper="Two quotes need review" icon={MessageSquare} tone="cyan" />
                    <MetricCard title="Protection status" value="Ready" helper="Escrow and return rules placeholder" icon={ShieldCheck} tone="sky" />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
                    <section className={`${panel} p-5`}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-300">Buying workflow</h2>
                                <p className="mt-1 text-sm text-slate-500">A compact view of discovery, comparison, and delivery.</p>
                            </div>
                            <Link href="/fastview?resume=scene&mode=shopper" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
                                Shop in 3D
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <WorkCard title="Product discovery" text="Browse pavilions, product cards, catalogues, previews, and supplier chat." icon={ShoppingBag} tone="amber" />
                            <WorkCard title="Comparison board" text="Shortlist lighting, furniture, samples, and verified supplier options." icon={BarChart3} tone="sky" />
                            <WorkCard title="Order tracking" text="Follow cart, payment, supplier confirmation, packing, delivery, and returns." icon={Truck} tone="emerald" />
                        </div>
                    </section>

                    <VisualPanel
                        src="/visuals/shopper-market.svg"
                        alt="Sfera Hall shopper map"
                        title="Hall map"
                        markers={[
                            { label: 'Youbo', className: 'left-[12%] top-[22%] border-amber-300/45 text-amber-100' },
                            { label: 'Double Lin', className: 'right-[10%] top-[38%] border-cyan-300/45 text-cyan-100' },
                            { label: 'Samples', className: 'bottom-[18%] left-[16%] border-emerald-300/45 text-emerald-100' },
                        ]}
                    />
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    <ListPanel
                        title="Orders and delivery"
                        icon={Truck}
                        tone="emerald"
                        items={[
                            'Mira pendant lights - supplier confirmed, awaiting payment',
                            'Double Lin sample box - in delivery, ETA 3 to 5 days',
                            'Saved cart - 3 products waiting for checkout',
                        ]}
                    />
                    <ListPanel
                        title="Supplier messages"
                        icon={MessageSquare}
                        tone="cyan"
                        items={[
                            'Youbo supplier replied with a bulk discount.',
                            'Concierge suggested 4 matching pendant lights.',
                            'Delivery support needs confirmation for sample timing.',
                        ]}
                    />
                    <ListPanel
                        title="Deals and gifts"
                        icon={Gift}
                        tone="amber"
                        items={[
                            'Player reward coupons can be applied to real marketplace orders.',
                            'Supplier gifts are available for sample requests this week.',
                            'Hotel lobby lighting list is ready for quote review.',
                        ]}
                    />
                </div>
            </div>
        </DashboardFrame>
    );
}

export function SupplierDashboard() {
    return (
        <DashboardFrame mode="business">
            <DashboardBackNav />
            <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <HeaderSearch label="Search leads, products, pavilion tasks..." />
                <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone="emerald">Supplier mode</StatusPill>
                    <Link href="/login?role=supplier&next=/supplier/dashboard" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
                        Supplier portal
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </header>

            <div className="space-y-5">
                <DashboardHero
                    kicker={dashboardCopy.businessKicker}
                    title={dashboardCopy.businessTitle}
                    subtitle={dashboardCopy.businessSubtitle}
                    src="/visuals/business-pavilion.svg"
                    alt="3DSFERA supplier pavilion dashboard"
                    tone="emerald"
                >
                    <div className="mt-7 flex flex-wrap gap-3">
                        <StatusPill tone="emerald">Pavilion health: 92%</StatusPill>
                        <StatusPill tone="cyan">Buyers online: 18</StatusPill>
                        <StatusPill tone="amber">2 sponsored quests live</StatusPill>
                    </div>
                </DashboardHero>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Buyer leads" value="28" helper="7 need reply today" icon={Users} tone="emerald" />
                    <MetricCard title="Product readiness" value="84%" helper="Models, catalogues, pricing" icon={Box} tone="cyan" progress={84} />
                    <MetricCard title="Quote pipeline" value="$42K" helper="Open sample and bulk requests" icon={CircleDollarSign} tone="amber" />
                    <MetricCard title="Pavilion ROI" value="3.8x" helper="Visits, dwell, chat conversion" icon={LineChart} tone="sky" />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <section className={`${panel} p-5`}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-300">Operations board</h2>
                                <p className="mt-1 text-sm text-slate-500">Everything a premium pavilion operator expects to control.</p>
                            </div>
                            <Link href="/supplier/upload" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
                                Upload products
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <WorkCard title="Pavilion management" text="Configure showroom identity, 3D scenes, banners, floor placement, and store details." icon={Store} tone="emerald" href="/supplier/upload" action="Configure" />
                            <WorkCard title="Rent a pavilion" text="Choose mall zone, lease duration, promotion level, and launch date." icon={Building2} tone="sky" href="/login?role=supplier&next=/supplier/dashboard" action="Open portal" />
                            <WorkCard title="Host a game" text="Sponsor arena rewards, racing events, treasure hunts, or coupon quests." icon={Gamepad2} tone="amber" href="/login?role=supplier&next=/supplier/dashboard" action="Plan event" />
                            <WorkCard title="Lead inbox" text="Review buyer conversations, quotes, sample requests, and follow-ups." icon={MessageSquare} tone="cyan" href="/login?role=supplier&next=/supplier/dashboard" action="Reply" />
                            <WorkCard title="Fulfilment" text="Set warehouses, delivery regions, sample rules, return windows, and support contacts." icon={Truck} tone="emerald" href="/login?role=supplier&next=/supplier/dashboard" action="Manage" />
                            <WorkCard title="Analytics" text="Monitor visits, dwell time, product focus, chat conversion, and reward redemptions." icon={BarChart3} tone="violet" href="/login?role=supplier&next=/supplier/dashboard" action="Review" />
                        </div>
                    </section>

                    <VisualPanel
                        src="/visuals/business-pavilion.svg"
                        alt="Supplier pavilion preview"
                        title="Pavilion preview"
                        markers={[
                            { label: 'Hotspots', className: 'left-[12%] top-[24%] border-emerald-300/45 text-emerald-100' },
                            { label: 'Catalog', className: 'right-[10%] top-[36%] border-cyan-300/45 text-cyan-100' },
                            { label: 'Event', className: 'bottom-[18%] right-[16%] border-amber-300/45 text-amber-100' },
                        ]}
                    />
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    <ListPanel
                        title="Order pipeline"
                        icon={PackageCheck}
                        tone="emerald"
                        items={[
                            'Youbo buyer lead - new message, reply needed',
                            'Double Lin bulk quote - quote draft ready',
                            'Sample shipment - packing, delivery details received',
                        ]}
                    />
                    <ListPanel
                        title="Launch checklist"
                        icon={CalendarCheck}
                        tone="cyan"
                        items={[
                            'Upload localized product descriptions and certifications.',
                            'Approve pavilion hero media and product hotspots.',
                            'Confirm sponsored reward budget for player quests.',
                        ]}
                    />
                    <ListPanel
                        title="Revenue controls"
                        icon={CreditCard}
                        tone="amber"
                        items={[
                            'Set sample pricing, bulk terms, and payment milestones.',
                            'Review escrow, refund, and dispute support settings.',
                            'Track coupon redemptions from game sponsorship.',
                        ]}
                    />
                </div>
            </div>
        </DashboardFrame>
    );
}
