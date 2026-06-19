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

type RoleTone = 'player' | 'shopper' | 'business';

type Role = {
    tone: RoleTone;
    href: string;
    title: string;
    label: string;
    description: string;
    image: string;
    imageAlt: string;
    Icon: LucideIcon;
    action: string;
    proof: string[];
    metrics: { value: string; label: string }[];
};

const CITY_INTRO_CUTSCENE_SRC = '/cutscenes/cityvideo.mp4';

const roles: Role[] = [
    {
        tone: 'player',
        href: '/login?role=user&next=/player/dashboard',
        title: 'Player',
        label: 'Signed player dashboard',
        description: 'Enter a private command center for game zones, quests, rewards, coin balance, delivery, and player messages.',
        image: '/visuals/player-arena.svg',
        imageAlt: '3DSFERA player arena dashboard preview',
        Icon: Gamepad2,
        action: 'Login and open dashboard',
        proof: ['Password access', 'Rewards wallet', 'Arena activity'],
        metrics: [
            { value: '24', label: 'player level' },
            { value: '3', label: 'live zones' },
        ],
    },
    {
        tone: 'shopper',
        href: '/shopper/dashboard',
        title: 'Shopper',
        label: 'Marketplace workspace',
        description: 'Browse pavilions, compare products, monitor supplier replies, track delivery, and keep real orders moving.',
        image: '/visuals/shopper-market.svg',
        imageAlt: '3DSFERA Sfera Hall shopper dashboard preview',
        Icon: ShoppingBag,
        action: 'Open shopper dashboard',
        proof: ['Saved products', 'Supplier chat', 'Delivery queue'],
        metrics: [
            { value: '12', label: 'saved items' },
            { value: '5', label: 'supplier replies' },
        ],
    },
    {
        tone: 'business',
        href: '/business/dashboard',
        title: 'Business',
        label: 'Pavilion control room',
        description: 'Operate a branded pavilion, manage product readiness, buyer leads, fulfilment, analytics, and sponsored quests.',
        image: '/visuals/business-pavilion.svg',
        imageAlt: '3DSFERA business pavilion dashboard preview',
        Icon: Building2,
        action: 'Open business dashboard',
        proof: ['Pavilion ops', 'Lead pipeline', 'Game sponsorships'],
        metrics: [
            { value: '28', label: 'buyer leads' },
            { value: '84%', label: 'product ready' },
        ],
    },
];

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

function RoleCard({ role }: { role: Role }) {
    const tone = toneClasses[role.tone];
    const Icon = role.Icon;

    return (
        <Link
            href={role.href}
            className={`group relative flex min-h-[34rem] flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.065] ${tone.border}`}
        >
            <div className="relative h-56 overflow-hidden bg-slate-950">
                <Image src={role.image} alt={role.imageAlt} fill sizes="(min-width: 1024px) 32vw, 100vw" className="object-cover opacity-82 transition duration-700 group-hover:scale-105" />
                <div className={`absolute inset-0 bg-gradient-to-br ${tone.glow}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/20 to-transparent" />
                <span className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] backdrop-blur ${tone.icon}`}>
                    {role.tone === 'player' && <LockKeyhole className="h-3.5 w-3.5" />}
                    {role.label}
                </span>
                <span className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur ${tone.icon}`}>
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Role path</p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{role.title}</h2>
                    </div>
                    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        {role.metrics.map((metric) => (
                            <div key={metric.label} className="min-w-20 border-r border-white/10 px-3 py-2 text-center last:border-r-0">
                                <p className={`text-lg font-black ${tone.text}`}>{metric.value}</p>
                                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-300">{role.description}</p>

                <div className="mt-5 grid gap-2">
                    {role.proof.map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                            <BadgeCheck className={`h-4 w-4 shrink-0 ${tone.text}`} />
                            <span className="text-sm text-slate-300">{item}</span>
                        </div>
                    ))}
                </div>

                <span className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition group-hover:bg-white/[0.08] ${tone.button}`}>
                    {role.action}
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
                                Start with sound
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsIntroVisible(false)}
                            className="rounded-full border border-white/15 bg-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:bg-white/[0.14]"
                        >
                            Skip to role selection
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
                                {returnToScene ? 'Back to scene' : 'Home'}
                            </Link>
                            <Link href="/fastview?resume=scene" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10">
                                <Globe2 className="h-4 w-4" />
                                Live world
                            </Link>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            <Sparkles className="h-4 w-4 text-cyan-200" />
                            3DSFERA role selection
                        </span>
                    </nav>

                    <header className="grid gap-6 rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_100px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-7 lg:grid-cols-[minmax(0,1fr)_25rem] lg:p-8">
                        <div>
                            <p className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">Choose your operating mode</p>
                            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                                One immersive city, three serious product workflows.
                            </h1>
                            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                                Pick the dashboard that matches what you need to do now: play and earn, shop and coordinate delivery, or operate a commercial pavilion.
                            </p>
                            <div className="mt-7 grid gap-3 sm:grid-cols-3">
                                <Insight icon={ShieldCheck} title="Protected player access" text="Player dashboard now opens behind email and password authentication." />
                                <Insight icon={MessageSquare} title="Real work surfaces" text="Dashboards focus on orders, leads, rewards, delivery, and messages." />
                                <Insight icon={Truck} title="Responsive by default" text="Layouts collapse into useful mobile boards instead of shrinking desktop panels." />
                            </div>
                        </div>

                        <div className="relative min-h-72 overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950">
                            <Image src="/visuals/business-pavilion.svg" alt="3DSFERA premium city dashboard preview" fill sizes="(min-width: 1024px) 25rem, 100vw" className="object-cover opacity-80" priority />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Platform status</p>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                                        <p className="text-lg font-black text-cyan-100">3</p>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">roles</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                                        <p className="text-lg font-black text-amber-100">Live</p>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">world</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                                        <p className="text-lg font-black text-emerald-100">B2B</p>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">trade</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="mt-5 grid gap-5 lg:grid-cols-3">
                        {roles.map((role) => (
                            <RoleCard key={role.title} role={role} />
                        ))}
                    </div>

                    <section className="mt-5 grid gap-5 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6 lg:grid-cols-4">
                        <Insight icon={Trophy} title="Game economy" text="Player rewards connect to coins, coupons, and real delivery actions." />
                        <Insight icon={PackageCheck} title="Buyer operations" text="Shopping dashboards track saved products, supplier replies, and delivery state." />
                        <Insight icon={Store} title="Pavilion growth" text="Business workflows cover product readiness, leads, analytics, and sponsored quests." />
                        <Insight icon={BadgeCheck} title="Premium polish" text="Screens now use restrained controls, stronger hierarchy, and real illustrative assets." />
                    </section>
                </div>
            </section>
        </main>
    );
}
