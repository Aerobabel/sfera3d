'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";

const products = [
  { name: "Aeroflow Runner", category: "Performance footwear", zone: "Motion Gallery", description: "Cushioned performance runner presented in a motion-focused showroom.", image: "/hall-products/thumbnails/performance_sneaker.webp", accent: "orange" },
  { name: "Remote Smart Hub", category: "Connected control", zone: "SFERA Living", description: "Compact remote and tabletop hub demonstrated in a connected-room scenario.", image: "/hall-products/thumbnails/remote_smart_hub.webp", accent: "purple" },
  { name: "Connected Health Console", category: "Health telemetry", zone: "Recovery Lab", description: "Phone-linked console shown through a guided product presentation.", image: "/hall-products/thumbnails/connected_health_monitor.webp", accent: "purple" },
  { name: "Normatec Recovery Boots", category: "Compression recovery", zone: "Recovery Lab", description: "Sequential compression system explored through an interactive demonstration.", image: "/hall-products/thumbnails/normatec_recovery_boots.webp", accent: "orange" },
  { name: "EMO Companion", category: "Desktop robotics", zone: "Future Friends", description: "Expressive desktop companion presented with reactive movement.", image: "/hall-products/thumbnails/emo_companion_robot.webp", accent: "purple" },
  { name: "Galaxy Ring Gold", category: "Smart wellness", zone: "Orbit Wear", description: "Titanium health-sensing concept displayed in a digital showroom.", image: "/hall-products/thumbnails/galaxy_ring_gold.webp", accent: "orange" },
] as const;

const copy = {
  en: {
    eyebrow: "Discover the virtual world",
    title: "Discover",
    description: "Brands build interactive pavilions where you can inspect products in 3D, watch live demos and talk to the team behind them.",
    selected: "Demo pavilion",
    item: "Illustrative showroom item",
    note: "Demo pavilion — illustrative items, not for sale.",
    ctaTitle: "Experience products in a new way",
    ctaText: "Pre-register for early access to the 3DSFERA interactive showroom.",
    cta: "Get early access",
  },
  ru: {
    eyebrow: "Исследуйте виртуальный мир",
    title: "Discover",
    description: "Бренды создают интерактивные павильоны, где можно изучать товары в 3D, смотреть демонстрации и общаться с командой бренда.",
    selected: "Демо-павильон",
    item: "Иллюстративный экспонат",
    note: "Демо-павильон — иллюстративные товары не продаются.",
    ctaTitle: "Новый способ познакомиться с товарами",
    ctaText: "Пройдите предрегистрацию для раннего доступа к интерактивному шоуруму 3DSFERA.",
    cta: "Получить ранний доступ",
  },
  zh: {
    eyebrow: "探索虚拟世界",
    title: "Discover",
    description: "品牌可打造互动展馆，访客能够以 3D 方式查看产品、观看现场演示并与品牌团队沟通。",
    selected: "演示展馆",
    item: "示意展品",
    note: "演示展馆——所示商品仅作展示，不用于销售。",
    ctaTitle: "以全新方式体验产品",
    ctaText: "预注册以获得 3DSFERA 互动展馆的抢先体验资格。",
    cta: "获取抢先体验",
  },
} as const;

export default function DiscoverPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="sfera-page-enter relative min-h-screen overflow-x-clip bg-[var(--sfera-marketing-bg)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.1)_1px,transparent_1px)] [background-size:68px_68px] [mask-image:radial-gradient(circle_at_50%_10%,black,transparent_75%)]" />
      <div data-parallax="0.08" className="pointer-events-none absolute right-[-10rem] top-20 h-[34rem] w-[34rem] rounded-full bg-[var(--sfera-marketing-purple)]/10 blur-[140px]" />
      <MarketingHeader />

      <main className="relative z-10 mx-auto max-w-[92rem] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <section className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div data-reveal="left">
            <div className="flex items-center gap-3"><Compass className="h-4 w-4 text-[var(--sfera-marketing-cyan)]" /><p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--sfera-marketing-cyan)]">{t.eyebrow}</p></div>
            <h1 className="mt-5 text-[clamp(4rem,10vw,9rem)] font-black uppercase leading-[0.78] tracking-[-0.06em] [font-family:var(--font-display)]">{t.title}</h1>
            <p className="mt-7 max-w-3xl text-base leading-relaxed text-white/60 sm:text-xl">{t.description}</p>
          </div>
          <p data-reveal="right" className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{t.selected} · {products.length}</p>
        </section>

        <section className="marketing-reveal-grid mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product, index) => {
            const accent = product.accent === "orange" ? "var(--sfera-marketing-orange)" : "var(--sfera-marketing-purple)";
            return (
              <article key={product.name} data-reveal data-interactive className="marketing-interactive group overflow-hidden border bg-[#070b12] transition duration-300" style={{ borderColor: `color-mix(in srgb, ${accent} 38%, transparent)`, boxShadow: `0 22px 70px color-mix(in srgb, ${accent} 9%, transparent)` }}>
                <div className="relative aspect-[3/2] overflow-hidden bg-[#101921]"><Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-[1.04]" sizes="(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw" /><div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-transparent to-transparent" /><div className="absolute left-4 top-4 border border-white/15 bg-black/55 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur-md">{product.zone}</div><div className="absolute bottom-4 right-4 text-[10px] font-black text-white/30">0{index + 1}</div></div>
                <div className="p-5 sm:p-6"><p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>{product.category}</p><h2 className="mt-3 text-2xl font-black uppercase leading-none [font-family:var(--font-display)]">{product.name}</h2><p className="mt-3 min-h-10 text-xs leading-relaxed text-white/45">{product.description}</p><p className="mt-6 border-t border-white/10 pt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">{t.item}</p></div>
              </article>
            );
          })}
        </section>

        <p data-reveal className="mt-8 border-l border-white/15 pl-4 text-xs font-semibold leading-relaxed text-white/45">{t.note}</p>

        <section data-reveal data-interactive className="marketing-interactive mt-16 grid gap-8 border border-[var(--sfera-marketing-purple)]/30 bg-[linear-gradient(120deg,rgba(139,92,246,0.15),rgba(7,10,18,0.96)_50%,rgba(255,90,25,0.08))] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><div className="flex items-center gap-3 text-[var(--sfera-marketing-purple)]"><Sparkles className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Interactive showroom</span></div><h2 className="mt-4 text-3xl font-black uppercase [font-family:var(--font-display)] sm:text-4xl">{t.ctaTitle}</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/50">{t.ctaText}</p></div>
          <Link href="/pre-register" className="inline-flex min-h-13 items-center justify-center gap-5 bg-[var(--sfera-marketing-orange)] px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-white">{t.cta} <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
