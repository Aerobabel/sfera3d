'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
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

export default function RoleSelectionPage() {
    const { language } = useLanguage();
    const copy = roleCopy[language];

    return (
        <main className="min-h-screen overflow-hidden bg-[#02050b] text-white">
            <section className="relative flex min-h-screen items-center justify-center px-6 py-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(102,217,203,0.26),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.18),transparent_28%),linear-gradient(145deg,rgba(2,6,23,0.72),rgba(3,7,18,1)_58%,rgba(0,0,0,1))]" />
                <div className="relative z-10 w-full max-w-6xl">
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
                                <Link href="/experience" className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#66d9cb,#d9fff9)] px-7 py-3.5 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_55px_rgba(102,217,203,0.28)] transition hover:scale-[1.02]">{copy.enter}</Link>
                            </div>
                            <div className="grid gap-4">
                                {copy.roles.map((role) => (
                                    <Link key={role.title} href={role.href} className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.84),rgba(2,6,23,0.72))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_60px_rgba(0,0,0,0.26)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-[#66d9cb]/55 hover:bg-[#66d9cb]/10 hover:shadow-[0_28px_90px_rgba(102,217,203,0.16)]">
                                        <div className="flex gap-4"><span className="text-4xl">{role.icon}</span><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-black tracking-wide">{role.title}</h2><span className="rounded-full border border-[#66d9cb]/35 bg-[#66d9cb]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#9ff4ec]">{role.mode}</span></div><p className="mt-2 text-sm leading-6 text-slate-300">{role.text}</p></div></div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
