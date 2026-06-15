'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { useSearchParams } from 'next/navigation';
import type { AppLanguage } from '@/lib/i18n';

const roleCopy = {
    en: {
        eyebrow: '3DSFERA cutscene',
        title: '3DSFERA',
        subtitle: 'A new standard. A new starting point.',
        screen1: 'SCREEN 1 — 5 seconds without text: the camera slowly flies into a futuristic city. Lights. Skyscrapers. Living streets. People. Cars. Music rises.',
        voice: '“Every day billions of people buy, sell, work, and play — in different worlds. For the first time in history, all of it is in one place.”',
        question: '“Who are you in this world?”',
        welcome: '“Welcome to the city where your actions have real weight. Welcome to 3DSFERA.”',
        enter: 'ENTER',
        roles: [
            { href: '/player/dashboard', icon: '🎮', title: 'GAMER', text: 'Complete quests. Race. Win arenas. Earn real rewards.', mode: 'Player Mode' },
            { href: '/shopper/dashboard', icon: '🛍️', title: 'SHOPPER', text: 'Explore photoreal 3D stores. Buy real products for less. Get delivery home.', mode: 'Shopper Mode' },
            { href: '/business/dashboard', icon: '🏛️', title: 'BUSINESS', text: 'Open a pavilion. Sell to a global audience. No intermediaries. No expensive rent. No borders.', mode: 'Supplier Dashboard' },
        ],
    },
    ru: {
        eyebrow: 'Катсцена 3DSFERA',
        title: '3DSFERA',
        subtitle: 'Новый стандарт. Новая точка отсчёта.',
        screen1: 'ЭКРАН 1 — 5 секунд без текста: камера медленно влетает в футуристический город. Огни. Небоскрёбы. Живые улицы. Люди. Машины. Музыка нарастает.',
        voice: '“Каждый день миллиарды людей покупают, продают, работают и играют — в разных мирах. Впервые в истории — всё это в одном месте.”',
        question: '“Кто ты в этом мире?”',
        welcome: '“Добро пожаловать в город где твои действия имеют реальный вес. Добро пожаловать в 3DSFERA.”',
        enter: 'ВОЙТИ',
        roles: [
            { href: '/player/dashboard', icon: '🎮', title: 'ГЕЙМЕР', text: 'Проходи квесты. Участвуй в гонках. Побеждай на аренах. Зарабатывай реальные деньги.', mode: 'Player Mode' },
            { href: '/shopper/dashboard', icon: '🛍️', title: 'ПОКУПАТЕЛЬ', text: 'Изучай магазины в фотореалистичном 3D. Покупай реальные товары дешевле чем где-либо. Получай домой.', mode: 'Shopper Mode' },
            { href: '/business/dashboard', icon: '🏛️', title: 'БИЗНЕС', text: 'Открой павильон. Продавай глобальной аудитории. Без посредников. Без дорогой аренды. Без границ.', mode: 'Supplier Dashboard' },
        ],
    },
    zh: {
        eyebrow: '3DSFERA 过场',
        title: '3DSFERA',
        subtitle: '新标准。新起点。',
        screen1: '画面 1 — 5 秒无文字：镜头缓慢飞入未来城市。灯光、摩天楼、热闹街道、人群、车辆，音乐逐渐增强。',
        voice: '“每天，数十亿人在不同世界中购买、销售、工作和游戏。历史上第一次，所有这些都在同一个地方。”',
        question: '“你在这个世界中是谁？”',
        welcome: '“欢迎来到行动具有真实重量的城市。欢迎来到 3DSFERA。”',
        enter: '进入',
        roles: [
            { href: '/player/dashboard', icon: '🎮', title: '玩家', text: '完成任务。参加赛车。赢得竞技场。获得真实奖励。', mode: '玩家模式' },
            { href: '/shopper/dashboard', icon: '🛍️', title: '买家', text: '探索照片级 3D 商店。更低价格购买真实商品。配送到家。', mode: '购物者模式' },
            { href: '/business/dashboard', icon: '🏛️', title: '商家', text: '开设展馆。面向全球观众销售。无中间商。无高额租金。无边界。', mode: '供应商仪表盘' },
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
    roles: Array<{ href: string; icon: string; title: string; text: string; mode: string }>;
}>;

const CITY_INTRO_CUTSCENE_SRC = '/cutscenes/cityvideo.mp4';

const roleAccents: Record<string, string> = {
    '/player/dashboard': 'from-sky-300 via-cyan-200 to-indigo-300',
    '/shopper/dashboard': 'from-fuchsia-300 via-rose-200 to-amber-200',
    '/business/dashboard': 'from-emerald-200 via-teal-200 to-cyan-200',
};

const roleVisuals: Record<string, string> = {
    '/player/dashboard': '/visuals/player-arena.svg',
    '/shopper/dashboard': '/visuals/shopper-market.svg',
    '/business/dashboard': '/visuals/business-pavilion.svg',
};

export default function RoleSelectionPage() {
    const { language } = useLanguage();
    const searchParams = useSearchParams();
    const copy = roleCopy[language];
    const returnToScene = searchParams.get('returnTo') === '/fastview' || searchParams.get('from') === 'scene';
    const shouldPlayIntro = !returnToScene && searchParams.get('skipIntro') !== 'true';
    const [isIntroCutsceneVisible, setIsIntroCutsceneVisible] = useState(shouldPlayIntro);
    const sceneReturnHref = '/fastview?resume=scene';

    return (
        <main className="min-h-screen overflow-hidden bg-[#02050b] text-white">
            {isIntroCutsceneVisible && (
                <div className="fixed inset-0 z-50 bg-black">
                    <video
                        className="h-full w-full object-cover"
                        src={CITY_INTRO_CUTSCENE_SRC}
                        autoPlay
                        muted
                        playsInline
                        preload="auto"
                        onEnded={() => setIsIntroCutsceneVisible(false)}
                        onError={() => setIsIntroCutsceneVisible(false)}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),transparent_45%,rgba(0,0,0,0.72))]" />
                    <div className="absolute inset-x-0 bottom-8 flex justify-center px-6">
                        <button
                            type="button"
                            onClick={() => setIsIntroCutsceneVisible(false)}
                            className="rounded-full border border-white/20 bg-black/45 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/15"
                        >
                            Skip to role selection
                        </button>
                    </div>
                </div>
            )}
            <section className="relative flex min-h-screen items-center justify-center px-6 py-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(102,217,203,0.26),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.18),transparent_28%),linear-gradient(145deg,rgba(2,6,23,0.72),rgba(3,7,18,1)_58%,rgba(0,0,0,1))]" />
                <div className="relative z-10 w-full max-w-6xl">
                    <div className="mb-4 flex flex-wrap gap-2">
                        <Link href={returnToScene ? sceneReturnHref : "/"} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-[#66d9cb]/40 hover:bg-[#66d9cb]/10 hover:text-[#9ff4ec]">← {returnToScene ? 'Back to scene' : 'Home'}</Link>
                        <Link href="/fastview" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-[#66d9cb]/40 hover:bg-[#66d9cb]/10 hover:text-[#9ff4ec]">World</Link>
                    </div>
                    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.1),rgba(255,255,255,0.035))] p-6 shadow-[0_45px_160px_rgba(0,0,0,0.6)] backdrop-blur-2xl md:p-10">
                        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                            <div>
                                <p className="inline-flex rounded-full border border-[#66d9cb]/25 bg-[#66d9cb]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-[#9ff4ec]">{copy.eyebrow}</p>
                                <h1 className="mt-5 bg-[linear-gradient(135deg,#ffffff,#9ff4ec_48%,#ffffff)] bg-clip-text text-5xl font-black uppercase tracking-tight text-transparent md:text-7xl">{copy.title}</h1>
                                <p className="mt-3 text-xl text-slate-200">{copy.subtitle}</p>
                                <div className="mt-8 space-y-5 text-sm leading-7 text-slate-300">
                                    <p className="text-slate-500">{copy.screen1}</p>
                                    <p>{copy.voice}</p>
                                    <p className="text-lg font-semibold text-white">{copy.question}</p>
                                    <p>{copy.welcome}</p>
                                </div>
                                <Link href={sceneReturnHref} className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#66d9cb,#d9fff9)] px-7 py-3.5 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_55px_rgba(102,217,203,0.28)] transition hover:scale-[1.02]">{copy.enter}</Link>
                            </div>
                            <div className="grid gap-4">
                                {copy.roles.map((role) => {
                                    const roleHref = returnToScene ? `${role.href}?returnTo=/fastview` : role.href;
                                    return (
                                        <Link key={role.title} href={roleHref} className="group relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(2,6,23,0.74))] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_34px_110px_rgba(102,217,203,0.2)]">
                                            <div className={`absolute -inset-24 bg-gradient-to-br ${roleAccents[role.href]} opacity-0 blur-3xl transition duration-500 group-hover:opacity-25`} />
                                            <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-950/60 p-4">
                                                <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                                                    <Image src={roleVisuals[role.href]} alt="" width={1200} height={760} className="h-32 w-full object-cover transition duration-500 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05),rgba(2,6,23,0.68))]" />
                                                    <div className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-md">Premium access</div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">{role.icon}</span>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <h2 className="bg-[linear-gradient(135deg,#ffffff,#c7fff8)] bg-clip-text text-xl font-black tracking-wide text-transparent">{role.title}</h2>
                                                            <span className="rounded-full border border-[#66d9cb]/35 bg-[#66d9cb]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#9ff4ec]">{role.mode}</span>
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-slate-300">{role.text}</p>
                                                        <span className="mt-4 inline-flex text-xs font-black uppercase tracking-[0.16em] text-[#9ff4ec]">Enter dashboard →</span>
                                                    </div>
                                                </div>
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
