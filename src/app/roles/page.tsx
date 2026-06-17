'use client';

import { useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { useSearchParams } from 'next/navigation';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    Gamepad2,
    Globe2,
    MousePointer2,
    PackageCheck,
    ShoppingBag,
    Sparkles,
    Trophy,
    type LucideIcon,
} from 'lucide-react';
import type { AppLanguage } from '@/lib/i18n';

type RoleHref = '/player/dashboard' | '/shopper/dashboard' | '/business/dashboard';
type Role = {
    href: RoleHref;
    title: string;
    text: string;
    mode: string;
    stat: string;
    statLabel: string;
    destinationTitle: string;
    destinationText: string;
    imageAlt: string;
};

const roleCopy = {
    en: {
        eyebrow: 'Choose your 3DSFERA path',
        title: 'Enter the city as the role that moves you forward.',
        subtitle: 'A unified immersive marketplace for play, discovery, and global trade.',
        screen1: 'The same premium world adapts to your intent: compete in live experiences, shop inside spatial showrooms, or operate a branded pavilion.',
        voice: 'Every role is connected to the same real-time city, with refined controls, direct conversations, and commercial actions that matter beyond the screen.',
        question: 'Who are you in this world?',
        welcome: 'Pick your entry point. You can return here whenever your mission changes.',
        enter: 'Enter live world',
        home: 'Home',
        backToScene: 'Back to scene',
        world: 'World',
        startWithSound: 'Start with sound',
        skipIntro: 'Skip to role selection',
        premiumAccess: 'Live mode',
        selectMode: 'Select mode',
        enterGameMode: 'Enter game mode',
        roles: [
            { href: '/player/dashboard', title: 'GAMER', text: 'Complete quests, race through live districts, win arenas, and unlock rewards with cinematic responsiveness.', mode: 'Player Mode', stat: '3D', statLabel: 'quests', destinationTitle: 'Zombie Arena', destinationText: 'Enter the zombie game, survive waves, and win gifts you can use in the marketplace.', imageAlt: 'Zombie Arena entrance for player games and gifts' },
            { href: '/shopper/dashboard', title: 'SHOPPER', text: 'Browse photoreal pavilions, inspect products at scale, compare details, and move from discovery to delivery.', mode: 'Shopper Mode', stat: '4K', statLabel: 'showrooms', destinationTitle: 'Sfera Hall', destinationText: 'Enter the main hall to discover products, visit pavilions, buy from suppliers, or sell through your own presence.', imageAlt: 'Sfera Hall marketplace entrance for buying and selling' },
            { href: '/business/dashboard', title: 'BUSINESS', text: 'Launch a premium pavilion, qualify global buyers, and manage direct supplier conversations without borders.', mode: 'Supplier Dashboard', stat: 'B2B', statLabel: 'pipeline', destinationTitle: 'Sfera Hall', destinationText: 'Operate inside the main hall: sell products, meet buyers, manage leads, and turn the 3D pavilion into commerce.', imageAlt: 'Sfera Hall business pavilion for sellers' },
        ],
    },
    ru: {
        eyebrow: 'Выберите путь в 3DSFERA',
        title: 'Войдите в город в роли, которая ведёт вас дальше.',
        subtitle: 'Единый иммерсивный маркетплейс для игры, выбора товаров и мировой торговли.',
        screen1: 'Один премиальный мир подстраивается под вашу цель: соревнуйтесь, покупайте в пространственных шоурумах или управляйте фирменным павильоном.',
        voice: 'Каждая роль связана с одним real-time городом: точное управление, прямые диалоги и коммерческие действия за пределами экрана.',
        question: 'Кто вы в этом мире?',
        welcome: 'Выберите точку входа. Сюда можно вернуться, когда миссия изменится.',
        enter: 'Войти в live-мир',
        home: 'Главная',
        backToScene: 'Назад в сцену',
        world: 'Мир',
        startWithSound: 'Начать со звуком',
        skipIntro: 'К выбору роли',
        premiumAccess: 'Живой режим',
        selectMode: 'Выбрать режим',
        enterGameMode: 'Войти в игровой режим',
        roles: [
            { href: '/player/dashboard', title: 'ГЕЙМЕР', text: 'Выполняйте квесты, участвуйте в гонках по live-районам, побеждайте на аренах и открывайте награды.', mode: 'Игровой режим', stat: '3D', statLabel: 'квесты', destinationTitle: 'Zombie Arena', destinationText: 'Войдите в зомби-игру, переживите волны и выигрывайте подарки для маркетплейса.', imageAlt: 'Вход в Zombie Arena для игры и подарков' },
            { href: '/shopper/dashboard', title: 'ПОКУПАТЕЛЬ', text: 'Изучайте фотореалистичные павильоны, смотрите товары в масштабе, сравнивайте детали и оформляйте доставку.', mode: 'Режим покупателя', stat: '4K', statLabel: 'шоурумы', destinationTitle: 'Sfera Hall', destinationText: 'Главный холл для товаров и павильонов: покупайте у поставщиков или переходите к продаже.', imageAlt: 'Sfera Hall — главный холл для покупки и продажи' },
            { href: '/business/dashboard', title: 'БИЗНЕС', text: 'Запустите премиальный павильон, получайте глобальных покупателей и ведите прямые диалоги без границ.', mode: 'Панель поставщика', stat: 'B2B', statLabel: 'воронка', destinationTitle: 'Sfera Hall', destinationText: 'Работайте в главном холле: продавайте товары, встречайте покупателей и управляйте лидами.', imageAlt: 'Бизнес-павильон Sfera Hall для продавцов' },
        ],
    },
    zh: {
        eyebrow: '选择你的 3DSFERA 路径',
        title: '以推动你前进的身份进入城市。',
        subtitle: '集游戏、探索与全球贸易于一体的沉浸式市场。',
        screen1: '同一个高级世界会根据你的目标改变：参与实时体验、在空间展厅购物，或运营品牌展馆。',
        voice: '每个角色都连接到同一座实时城市，拥有精致控制、直接沟通，以及真正有价值的商业动作。',
        question: '你在这个世界中是谁？',
        welcome: '选择入口。当任务改变时，你可以随时回到这里。',
        enter: '进入实时世界',
        home: '首页',
        backToScene: '返回场景',
        world: '世界',
        startWithSound: '开启声音',
        skipIntro: '跳到角色选择',
        premiumAccess: '实时模式',
        selectMode: '选择模式',
        enterGameMode: '进入游戏模式',
        roles: [
            { href: '/player/dashboard', title: '玩家', text: '完成任务，穿越实时街区竞速，赢得竞技场，并以电影级响应获得奖励。', mode: '玩家模式', stat: '3D', statLabel: '任务', destinationTitle: 'Zombie Arena', destinationText: '进入僵尸游戏，挺过一波波攻击，并赢取可在市场使用的礼物。', imageAlt: '玩家游戏与礼物的 Zombie Arena 入口' },
            { href: '/shopper/dashboard', title: '买家', text: '浏览照片级展馆，按真实比例查看产品，比较细节，并从发现走向配送。', mode: '购物者模式', stat: '4K', statLabel: '展厅', destinationTitle: 'Sfera Hall', destinationText: '进入主大厅，探索商品和展馆，向供应商购买，也可以开启销售。', imageAlt: '用于买卖的 Sfera Hall 市场入口' },
            { href: '/business/dashboard', title: '商家', text: '发布高级展馆，获取全球买家，并在无边界环境中管理直接供应商对话。', mode: '供应商仪表盘', stat: 'B2B', statLabel: '商机', destinationTitle: 'Sfera Hall', destinationText: '在主大厅运营：销售商品、接待买家、管理线索，并把 3D 展馆变成交易。', imageAlt: '卖家使用的 Sfera Hall 商务展馆' },
        ],
    },
} satisfies Record<AppLanguage, {
    eyebrow: string;
    title: string;
    subtitle: string;
    screen1: string;
    voice: string;
    question: string;
    welcome: string;
    enter: string;
    home: string;
    backToScene: string;
    world: string;
    startWithSound: string;
    skipIntro: string;
    premiumAccess: string;
    selectMode: string;
    enterGameMode: string;
    roles: Role[];
}>;

const CITY_INTRO_CUTSCENE_SRC = '/cutscenes/cityvideo.mp4';

const roleThemes: Record<RoleHref, { accent: string; aura: string; Icon: LucideIcon; DetailIcon: LucideIcon }> = {
    '/player/dashboard': { accent: 'from-cyan-200 via-sky-300 to-violet-300', aura: 'rgba(56,189,248,0.35)', Icon: Gamepad2, DetailIcon: Trophy },
    '/shopper/dashboard': { accent: 'from-amber-100 via-rose-200 to-fuchsia-300', aura: 'rgba(251,191,36,0.28)', Icon: ShoppingBag, DetailIcon: PackageCheck },
    '/business/dashboard': { accent: 'from-emerald-200 via-teal-200 to-cyan-200', aura: 'rgba(45,212,191,0.3)', Icon: Building2, DetailIcon: BadgeCheck },
};

const roleImageFor = (role: Role) => role.href === '/player/dashboard' ? '/zombiepic.png' : '/sferapic.png';

const useNextImageFallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const fallbackStep = image.dataset.fallbackStep ?? 'png';
    if (fallbackStep === 'png') {
        image.dataset.fallbackStep = 'jpg';
        image.src = image.src.replace(/\.png($|\?)/, '.jpg$1');
        return;
    }
    if (fallbackStep === 'jpg') {
        image.dataset.fallbackStep = 'jpeg';
        image.src = image.src.replace(/\.jpg($|\?)/, '.jpeg$1');
    }
};

function RoleArtwork({ role }: { role: Role }) {
    const theme = roleThemes[role.href];
    const Icon = theme.Icon;
    const DetailIcon = theme.DetailIcon;

    return (
        <div className="relative h-56 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0b1018] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] xl:h-full xl:min-h-[14rem]">
            <img src={roleImageFor(role)} alt={role.imageAlt} onError={useNextImageFallback} className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105" />
            <div className={`absolute -inset-16 bg-gradient-to-br ${theme.accent} opacity-25 blur-3xl`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_46%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.76))]" />
            <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/85 backdrop-blur-md">{role.mode}</div>
            <div className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/25 text-white backdrop-blur-md">
                <Icon className="h-6 w-6" strokeWidth={1.7} />
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">Destination</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-white">{role.destinationTitle}</p>
                </div>
                <div className="relative flex h-20 w-28 items-center justify-center rounded-[1.4rem] border border-white/15 bg-white/[0.08] backdrop-blur-md">
                    <div className="absolute inset-x-4 top-1/2 h-px bg-white/25" />
                    <div className="absolute inset-y-4 left-1/2 w-px bg-white/20" />
                    <DetailIcon className="relative h-9 w-9 text-white" strokeWidth={1.4} />
                </div>
            </div>
            <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        </div>
    );
}

export default function RoleSelectionPage() {
    const { language } = useLanguage();
    const searchParams = useSearchParams();
    const copy = roleCopy[language];
    const returnToScene = searchParams.get('returnTo') === '/fastview' || searchParams.get('from') === 'scene';
    const shouldPlayIntro = !returnToScene && searchParams.get('skipIntro') !== 'true';
    const [isIntroCutsceneVisible, setIsIntroCutsceneVisible] = useState(shouldPlayIntro);
    const [hasStartedIntroCutscene, setHasStartedIntroCutscene] = useState(!shouldPlayIntro);
    const introCutsceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const sceneReturnHref = '/fastview?resume=scene';
    const gamerSceneHref = '/fastview?resume=scene&mode=gamer';
    const shopperSceneHref = '/fastview?resume=scene&mode=shopper';

    const handleStartIntroCutsceneWithSound = () => {
        setHasStartedIntroCutscene(true);
        const video = introCutsceneVideoRef.current;
        if (!video) return;

        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    };

    return (
        <main className="min-h-screen overflow-hidden bg-[var(--sfera-bg)] text-[var(--sfera-text)]">
            {isIntroCutsceneVisible && (
                <div className="fixed inset-0 z-50 bg-black">
                    <video ref={introCutsceneVideoRef} className="h-full w-full object-cover" src={CITY_INTRO_CUTSCENE_SRC} muted={!hasStartedIntroCutscene} playsInline preload="auto" onEnded={() => setIsIntroCutsceneVisible(false)} onError={() => setIsIntroCutsceneVisible(false)} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),transparent_45%,rgba(0,0,0,0.72))]" />
                    <div className="absolute inset-x-0 bottom-8 flex flex-wrap justify-center gap-3 px-6">
                        {!hasStartedIntroCutscene && <button type="button" onClick={handleStartIntroCutsceneWithSound} className="sfera-btn-primary rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.2em] shadow-[0_18px_70px_rgba(102,217,203,0.35)] transition hover:scale-[1.02]">{copy.startWithSound}</button>}
                        <button type="button" onClick={() => setIsIntroCutsceneVisible(false)} className="sfera-btn-ghost rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.2em] shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-md">{copy.skipIntro}</button>
                    </div>
                </div>
            )}
            <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(102,217,203,0.24),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(246,186,79,0.16),transparent_26%),linear-gradient(145deg,rgba(9,11,16,0.86),rgba(15,20,29,1)_52%,rgba(3,6,13,1))]" />
                <div className="grain-overlay" />
                <div className="relative z-10 w-full max-w-7xl">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            <Link href={returnToScene ? sceneReturnHref : '/'} className="sfera-btn-ghost rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em]">← {returnToScene ? copy.backToScene : copy.home}</Link>
                            <Link href="/fastview" className="sfera-btn-ghost rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em]">{copy.world}</Link>
                        </div>
                        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--sfera-text-muted)] sm:inline-flex"><Globe2 className="h-4 w-4 text-[var(--sfera-accent)]" /> 3DSFERA</span>
                    </div>
                    <div className="sfera-card relative overflow-hidden rounded-[2rem] p-5 shadow-[0_45px_160px_rgba(0,0,0,0.58)] md:rounded-[2.75rem] md:p-8 lg:p-10">
                        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
                        <div className="grid items-stretch gap-8 xl:grid-cols-[0.82fr_1.18fr]">
                            <div className="flex flex-col justify-between rounded-[1.6rem] border border-white/10 bg-black/15 p-6 md:p-8">
                                <div>
                                    <p className="sfera-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.26em]"><Sparkles className="h-3.5 w-3.5" />{copy.eyebrow}</p>
                                    <h1 className="mt-6 max-w-2xl font-display text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl 2xl:text-6xl">{copy.title}</h1>
                                    <p className="mt-5 max-w-xl text-base leading-7 text-[var(--sfera-text-muted)] md:text-lg">{copy.subtitle}</p>
                                    <div className="mt-8 grid gap-4 text-sm leading-7 text-slate-300">
                                        <p className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-slate-300">{copy.screen1}</p>
                                        <p>{copy.voice}</p>
                                        <p className="font-display text-2xl font-semibold text-white">{copy.question}</p>
                                        <p className="text-[var(--sfera-text-muted)]">{copy.welcome}</p>
                                    </div>
                                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                        {copy.roles.slice(0, 2).map((role) => (
                                            <div key={role.destinationTitle} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
                                                <div className="relative h-28">
                                                    <img src={roleImageFor(role)} alt={role.imageAlt} onError={useNextImageFallback} className="h-full w-full object-cover opacity-85" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                    <p className="absolute bottom-3 left-3 text-xs font-black uppercase tracking-[0.18em] text-white">{role.destinationTitle}</p>
                                                </div>
                                                <p className="p-3 text-xs leading-5 text-slate-300">{role.destinationText}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Link href={sceneReturnHref} className="sfera-btn-primary mt-8 inline-flex w-fit items-center gap-3 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-[0.16em] shadow-[0_18px_55px_rgba(102,217,203,0.24)] transition hover:scale-[1.02]">{copy.enter}<ArrowRight className="h-4 w-4" /></Link>
                            </div>
                            <div className="grid content-start gap-4 lg:grid-cols-3 xl:grid-cols-1">
                                {copy.roles.map((role) => {
                                    const isGamerRole = role.href === '/player/dashboard';
                                    const roleHref = isGamerRole ? gamerSceneHref : shopperSceneHref;
                                    const theme = roleThemes[role.href];
                                    const Icon = theme.Icon;
                                    return (
                                        <Link key={role.title} href={roleHref} style={{ '--role-aura': theme.aura } as CSSProperties} className="group relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,rgba(20,27,39,0.9),rgba(9,11,16,0.76))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_34px_110px_var(--role-aura)] xl:grid xl:grid-cols-[0.78fr_1fr] xl:gap-5">
                                            <RoleArtwork role={role} />
                                            <div className="relative flex min-h-[14rem] flex-col justify-between p-3 xl:p-4">
                                                <div>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--sfera-accent)]">{copy.premiumAccess}</p>
                                                            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">{role.title}</h2>
                                                        </div>
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06]"><Icon className="h-5 w-5 text-white" /></span>
                                                    </div>
                                                    <p className="mt-4 text-sm leading-6 text-[var(--sfera-text-muted)]">{role.text}</p>
                                                    <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold leading-5 text-slate-300">{role.destinationText}</p>
                                                </div>
                                                <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--sfera-accent)]">{isGamerRole ? copy.enterGameMode : copy.selectMode}<MousePointer2 className="h-4 w-4" /></span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
