'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { clearServerAuthSession } from "@/lib/auth/browser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const playerIntroLoginHref = "/login?role=player&next=%2Froles%3Fintro%3Dcity";
const HERO_VIDEO_FADE_OFFSET_SECONDS = 1.25;

const syncHeroVideoOutro = (
  event: SyntheticEvent<HTMLVideoElement>,
  fadeHeroVideo: () => void,
) => {
  const video = event.currentTarget;
  if (
    Number.isFinite(video.duration) &&
    video.currentTime >= Math.max(0, video.duration - HERO_VIDEO_FADE_OFFSET_SECONDS)
  ) {
    fadeHeroVideo();
  }
};

const copy = {
  en: {
    eyebrow: "Welcome to 3DSFERA",
    title: "Play the world.",
    accent: "Shop what’s real.",
    description: "Arcade games, rewards, and real products—inside one living 3D city.",
    play: "Enter the world",
    brands: "Build your pavilion",
    signOut: "Sign out",
    stages: ["Explore", "Play", "Shop"],
    live: "World online",
    trailer: "Watch the 3DSFERA trailer",
    trailerMeta: "Official film · 25 sec",
  },
  ru: {
    eyebrow: "Добро пожаловать в 3DSFERA",
    title: "Играйте в мире.",
    accent: "Покупайте настоящее.",
    description: "Аркады, награды и реальные товары — в одном живом 3D-городе.",
    play: "Войти в мир",
    brands: "Создать павильон",
    signOut: "Выйти",
    stages: ["Исследуйте", "Играйте", "Покупайте"],
    live: "Мир онлайн",
    trailer: "Смотреть трейлер 3DSFERA",
    trailerMeta: "Официальное видео · 25 сек",
  },
  zh: {
    eyebrow: "欢迎来到 3DSFERA",
    title: "畅玩虚拟世界。",
    accent: "购买真实好物。",
    description: "街机、奖励与真实商品，汇聚在一座鲜活的 3D 城市中。",
    play: "进入世界",
    brands: "创建品牌展馆",
    signOut: "退出",
    stages: ["探索", "游玩", "购物"],
    live: "世界在线",
    trailer: "观看 3DSFERA 预告片",
    trailerMeta: "官方影片 · 25 秒",
  },
} as const;

export default function Home() {
  const { language } = useLanguage();
  const t = copy[language];
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isHeroVideoFaded, setIsHeroVideoFaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (isMounted) setViewerEmail(data.session?.user.email ?? null);
        })
        .catch(() => {});

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) setViewerEmail(session?.user.email ?? null);
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    } catch {
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      await clearServerAuthSession().catch(() => {});
      setViewerEmail(null);
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  return (
    <div className="sfera-cinematic-shell sfera-page-enter relative min-h-screen overflow-x-hidden bg-[#010203] text-[#f5f1e9] [font-family:var(--font-body)] selection:bg-[#66d9cb] selection:text-[#090b10]">
      <div className="absolute inset-0 md:hidden">
        <Image src="/sferapic.png" alt="" fill priority className="object-cover opacity-20 brightness-75" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,0.64),rgba(4,6,9,0.94)_58%,#040609)]" />
      </div>

      <div
        className="absolute inset-y-16 right-0 hidden w-[58%] overflow-hidden border-l border-[#f6ba4f]/35 md:block"
        style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0 100%)" }}
      >
        <Image
          src="/sferapic.png"
          alt="3DSFERA city pavilion"
          fill
          priority
          className="object-cover brightness-[0.62]"
          sizes="58vw"
        />
        <video
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${
            isHeroVideoFaded ? "opacity-0" : "opacity-50"
          }`}
          autoPlay
          muted
          playsInline
          preload="metadata"
          poster="/sferapic.png"
          onEnded={(event) => syncHeroVideoOutro(event, () => setIsHeroVideoFaded(true))}
          onTimeUpdate={(event) => syncHeroVideoOutro(event, () => setIsHeroVideoFaded(true))}
        >
          <source src="/cutscenes/cityvideo.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,9,0.99)_0%,rgba(4,6,9,0.76)_34%,rgba(4,6,9,0.42)_100%),linear-gradient(180deg,rgba(4,6,9,0.42),rgba(4,6,9,0.84))]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(102,217,203,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(102,217,203,0.15)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(90deg,transparent,black)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-black/25 md:inset-y-16 md:right-auto md:w-[70%] md:bg-[linear-gradient(90deg,rgba(0,0,0,0.82),rgba(0,0,0,0.48)_70%,transparent)]" />

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="absolute right-[5vw] top-[18vh] text-[clamp(8rem,18vw,17rem)] font-black leading-none tracking-[-0.08em] text-transparent opacity-20 [-webkit-text-stroke:1px_rgba(246,186,79,0.8)]">
          03
        </div>
        <div className="absolute right-8 top-28 h-14 w-14 border-r border-t border-[#66d9cb]/70" />
        <div className="absolute bottom-8 right-8 h-14 w-14 border-b border-r border-[#f6ba4f]/70" />
      </div>

      <div className="grain-overlay" />

      <header className="relative z-20 border-b border-white/10 bg-[#040609]/70 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[90rem] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="3DSFERA home">
            <BrandLogo size="md" priority />
            <span className="hidden border-l border-white/15 pl-3 sm:block">
              <span className="block text-xs font-black tracking-[0.16em] text-white">3DSFERA</span>
              <span className="mt-0.5 block text-[8px] uppercase tracking-[0.25em] text-[#66d9cb]">Playable city</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/onboarding"
              className="hidden border border-white/20 px-4 py-2 text-sm font-semibold transition hover:border-[#66d9cb]/60 hover:bg-white/10 sm:inline-flex"
              style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
            >
              {t.brands}
            </Link>
            {viewerEmail && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold transition hover:border-white/40 hover:bg-white/10 disabled:cursor-wait disabled:opacity-50 sm:px-4 sm:text-sm"
                title={viewerEmail}
              >
                {t.signOut}
              </button>
            )}
            <Link
              href={playerIntroLoginHref}
              className="bg-[#f6ba4f] px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-[#130f07] transition hover:bg-[#ffd084] sm:text-sm"
              style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
            >
              {t.play}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-[90rem] items-end px-4 pb-12 pt-24 sm:px-6 md:items-center lg:px-10 xl:pb-12">
        <div className="grid w-full grid-cols-[auto_1fr] gap-4 sm:gap-8 xl:grid-cols-[auto_minmax(0,1fr)_minmax(420px,0.85fr)] xl:items-center xl:gap-10">
          <div className="fade-up hidden flex-col items-center pt-1 sm:flex">
            <span className="text-[9px] font-bold tracking-[0.24em] text-[#f6ba4f] [writing-mode:vertical-rl]">WORLD / 01</span>
            <span className="mt-4 h-20 w-px bg-gradient-to-b from-[#f6ba4f] to-[#66d9cb]/10" />
          </div>

          <div className="max-w-3xl xl:max-w-[46rem]">
            <div className="fade-up flex items-center gap-3">
              <span className="h-px w-10 bg-[#66d9cb]" />
              <p className="[font-family:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.32em] text-[#66d9cb] sm:text-xs">
                {t.eyebrow}
              </p>
            </div>

            <h1 className="fade-up delay-1 mt-6 text-[clamp(3rem,6.2vw,6.5rem)] font-semibold leading-[0.84] tracking-[-0.055em] [font-family:var(--font-display)]">
              <span className="block text-white">{t.title}</span>
              <span className="mt-3 block text-[#f6ba4f]">{t.accent}</span>
            </h1>

            <p className="fade-up delay-2 mt-7 max-w-xl border-l border-white/20 pl-4 text-sm leading-relaxed text-[#d8d2c7] sm:text-lg">
              {t.description}
            </p>

            <div className="fade-up delay-3 mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Link
              href={playerIntroLoginHref}
                className="group inline-flex min-h-14 items-center justify-center gap-8 bg-[#66d9cb] px-7 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#06110f] transition hover:bg-[#91eee3]"
                style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}
            >
                {t.play} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/onboarding"
                className="inline-flex min-h-12 items-center justify-center border border-white/20 px-5 py-3 text-sm font-semibold transition hover:border-[#f6ba4f]/60 hover:bg-white/10 sm:hidden"
            >
              {t.brands}
            </Link>
            </div>

            <div className="fade-up delay-3 mt-10 flex items-center gap-3 sm:gap-5">
              {t.stages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3 sm:gap-5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/55 sm:text-[10px]">
                    <span className="mr-1.5 text-[#66d9cb]">0{index + 1}</span>{stage}
                  </span>
                  {index < t.stages.length - 1 && <span className="h-px w-4 bg-white/20 sm:w-8" />}
                </div>
              ))}
            </div>
          </div>

          <aside className="fade-up delay-2 col-span-2 mt-10 sm:col-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:mt-0">
            <div
              className="overflow-hidden border border-white/20 bg-[#05070a]/95 shadow-[0_30px_100px_rgba(0,0,0,0.7)]"
              style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))" }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#f6ba4f] shadow-[0_0_12px_rgba(246,186,79,0.8)]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white sm:text-xs">{t.trailer}</p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/45">{t.trailerMeta}</span>
              </div>
              <video
                className="aspect-video w-full bg-black object-contain"
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
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-5 right-5 z-20 hidden items-center gap-3 border border-white/15 bg-[#040609]/70 px-3 py-2 backdrop-blur-md md:flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#66d9cb] shadow-[0_0_10px_#66d9cb]" />
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/65">{t.live}</span>
        <span className="text-[9px] text-[#f6ba4f]">03.01</span>
      </div>
    </div>
  );
}
