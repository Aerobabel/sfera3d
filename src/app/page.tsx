'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Box, Radio } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import MarketingHeader, { PLAYER_ENTRY_HREF } from "@/components/marketing/MarketingHeader";

const copy = {
  en: {
    eyebrow: "A living 3D world",
    welcome: "Welcome to",
    description: "Explore digital spaces, play games, earn rewards, and discover real-world products in one living 3D city.",
    enter: "Enter the world",
    pavilion: "Build your pavilion",
    trailer: "See 3DSFERA in motion",
    trailerMeta: "Official trailer · 25 sec",
    stages: ["Explore", "Play", "Discover"],
    cardTitle: "One world. Real possibilities.",
    cardText: "App and browser access available at launch.",
    status: "World status",
    online: "Online",
    early: "Early access now open",
  },
  ru: {
    eyebrow: "Живой 3D-мир",
    welcome: "Добро пожаловать в",
    description: "Исследуйте цифровые пространства, играйте, получайте награды и открывайте реальные товары в одном живом 3D-городе.",
    enter: "Войти в мир",
    pavilion: "Создать павильон",
    trailer: "Увидеть 3DSFERA в движении",
    trailerMeta: "Официальный трейлер · 25 сек",
    stages: ["Исследовать", "Играть", "Открывать"],
    cardTitle: "Один мир. Реальные возможности.",
    cardText: "Доступ через приложение и браузер на старте.",
    status: "Статус мира",
    online: "Онлайн",
    early: "Ранний доступ открыт",
  },
  zh: {
    eyebrow: "鲜活的 3D 世界",
    welcome: "欢迎来到",
    description: "探索数字空间、畅玩游戏、赢取奖励，并在同一座鲜活的 3D 城市中发现真实商品。",
    enter: "进入世界",
    pavilion: "创建品牌展馆",
    trailer: "观看 3DSFERA 世界",
    trailerMeta: "官方预告片 · 25 秒",
    stages: ["探索", "游玩", "发现"],
    cardTitle: "一个世界，真实可能。",
    cardText: "上线时支持应用与浏览器访问。",
    status: "世界状态",
    online: "在线",
    early: "抢先体验现已开放",
  },
} as const;

export default function Home() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="sfera-page-enter relative min-h-screen overflow-x-clip bg-[var(--sfera-marketing-bg)] text-white [font-family:var(--font-body)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[100svh]">
        <Image
          src="/visuals/3dsfera-city-hero.png"
          alt=""
          fill
          priority
          className="object-cover object-[68%_center] opacity-80 brightness-[0.72] saturate-[1.12] sm:object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#03050a_0%,rgba(3,5,10,0.9)_38%,rgba(3,5,10,0.28)_76%,rgba(3,5,10,0.5)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,10,0.3),rgba(3,5,10,0.72)_70%,#03050a)]" />
        <div data-parallax="0.055" className="absolute right-[8%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-[120px]" />
        <div data-parallax="0.08" className="absolute bottom-[2%] left-[42%] h-72 w-72 rounded-full bg-[var(--sfera-marketing-orange)]/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(84,220,230,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(84,220,230,0.09)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_68%_42%,black,transparent_74%)]" />
      </div>

      <MarketingHeader />

      <main className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-[92rem] items-center gap-12 px-4 py-14 sm:px-6 lg:px-10 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.78fr)] xl:gap-16">
        <section className="max-w-4xl">
          <div className="fade-up flex items-center gap-3">
            <Radio className="h-4 w-4 text-[var(--sfera-marketing-orange)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[var(--sfera-marketing-cyan)] sm:text-xs">
              {t.eyebrow}
            </p>
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 sm:inline">// {t.early}</span>
          </div>

          <h1 className="fade-up delay-1 mt-7 uppercase leading-[0.8] tracking-[-0.055em] [font-family:var(--font-display)]">
            <span className="block text-[clamp(2.7rem,6vw,5.75rem)] font-black text-white">{t.welcome}</span>
            <span className="mt-4 block text-[clamp(4rem,9vw,8.5rem)] font-black text-[var(--sfera-marketing-orange)] [text-shadow:0_0_18px_rgba(255,90,25,0.45),0_0_55px_rgba(255,90,25,0.22)]">
              3DSFERA
            </span>
          </h1>

          <p className="fade-up delay-2 mt-8 max-w-2xl border-l-2 border-[var(--sfera-marketing-orange)]/70 pl-5 text-base leading-relaxed text-white/70 sm:text-xl">
            {t.description}
          </p>

          <div className="fade-up delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href={PLAYER_ENTRY_HREF}
              className="group inline-flex min-h-14 items-center justify-center gap-8 bg-[var(--sfera-marketing-orange)] px-7 py-3 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[0_0_36px_rgba(255,90,25,0.3)] transition hover:bg-[#ff743b]"
              style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}
            >
              {t.enter} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex min-h-14 items-center justify-center border border-white/25 bg-black/30 px-7 py-3 text-sm font-bold text-white transition hover:border-[var(--sfera-marketing-cyan)]/70 hover:bg-white/10"
            >
              {t.pavilion}
            </Link>
          </div>

          <div className="fade-up delay-3 mt-10 flex flex-wrap items-center gap-3 sm:gap-5">
            {t.stages.map((stage, index) => (
              <div key={stage} className="flex items-center gap-3 sm:gap-5">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55 sm:text-[10px]">
                  <span className="mr-2 text-[var(--sfera-marketing-orange)]">0{index + 1}</span>{stage}
                </span>
                {index < t.stages.length - 1 && <span className="h-px w-5 bg-white/20 sm:w-9" />}
              </div>
            ))}
          </div>

          <div className="fade-up delay-3 mt-10 grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-4 border border-white/10 bg-[#07101b]/70 p-4 backdrop-blur-xl">
              <div className="grid h-11 w-11 place-items-center border border-[var(--sfera-marketing-purple)]/45 bg-[var(--sfera-marketing-purple)]/10">
                <Box className="h-5 w-5 text-[var(--sfera-marketing-purple)]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[var(--sfera-marketing-orange)]">{t.cardTitle}</p>
                <p className="mt-1 text-xs text-white/50">{t.cardText}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-white/10 bg-[#07101b]/70 px-4 py-3 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/35">{t.status}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">{t.online}</p>
              </div>
            </div>
          </div>
        </section>

        <aside data-reveal="right" className="xl:justify-self-end">
          <div
            data-interactive
            className="marketing-interactive overflow-hidden border border-white/20 bg-[#03050a]/95 shadow-[0_35px_110px_rgba(0,0,0,0.7),0_0_60px_rgba(84,220,230,0.08)]"
            style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[var(--sfera-marketing-orange)] shadow-[0_0_12px_var(--sfera-marketing-orange)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white sm:text-xs">{t.trailer}</p>
              </div>
              <span className="text-[9px] uppercase tracking-[0.14em] text-white/40">{t.trailerMeta}</span>
            </div>
            <video
              className="aspect-video w-full bg-black object-contain xl:w-[36rem]"
              controls
              playsInline
              preload="metadata"
              poster="/cutscenes/webrolik-poster.jpg"
              aria-label={t.trailer}
            >
              <source src="/cutscenes/webrolik.mp4" type="video/mp4" />
            </video>
          </div>
        </aside>
      </main>
    </div>
  );
}
