'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coins, Compass, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader, { PLAYER_ENTRY_HREF } from "@/components/marketing/MarketingHeader";

const products = [
  {
    name: "Aeroflow Runner",
    category: "Performance footwear",
    zone: "Motion Gallery",
    description: "Cushioned performance runner with a sculpted high-stack sole.",
    price: 189,
    image: "/hall-products/thumbnails/performance_sneaker.webp",
    accent: "orange",
  },
  {
    name: "Remote Smart Hub",
    category: "Connected control",
    zone: "SFERA Living",
    description: "Compact remote and tabletop hub for connected-room control.",
    price: 179,
    image: "/hall-products/thumbnails/remote_smart_hub.webp",
    accent: "purple",
  },
  {
    name: "Connected Health Console",
    category: "Health telemetry",
    zone: "Recovery Lab",
    description: "Phone-linked clinical console for guided home measurements.",
    price: 499,
    image: "/hall-products/thumbnails/connected_health_monitor.webp",
    accent: "purple",
  },
  {
    name: "Normatec Recovery Boots",
    category: "Compression recovery",
    zone: "Recovery Lab",
    description: "Sequential compression system with guided session control.",
    price: 749,
    image: "/hall-products/thumbnails/normatec_recovery_boots.webp",
    accent: "orange",
  },
  {
    name: "EMO Companion",
    category: "Desktop robotics",
    zone: "Future Friends",
    description: "Expressive desktop companion with reactive movement.",
    price: 279,
    image: "/hall-products/thumbnails/emo_companion_robot.webp",
    accent: "purple",
  },
  {
    name: "Galaxy Ring Gold",
    category: "Smart wellness",
    zone: "Orbit Wear",
    description: "Titanium health sensing in a compact charging case.",
    price: 399,
    image: "/hall-products/thumbnails/galaxy_ring_gold.webp",
    accent: "orange",
  },
] as const;

const copy = {
  en: {
    eyebrow: "Discover the virtual world",
    title: "Discover",
    description: "A curated view of products you can experience inside 3DSFERA. Explore first. Decide later.",
    rate: "100 coins = $1",
    selected: "Selected world objects",
    coins: "coins",
    usd: "USD reference",
    explore: "Experience in 3D",
    early: "Early access discovery",
    note: "Products are shown for discovery. Partner offers, availability, and worldwide delivery are confirmed during early access.",
    ctaTitle: "Want to unlock world pricing?",
    ctaText: "Pre-register, complete onboarding, and be ready when product discovery opens inside 3DSFERA.",
    cta: "Get early access",
  },
  ru: {
    eyebrow: "Исследуйте виртуальный мир",
    title: "Discover",
    description: "Избранные товары, с которыми можно познакомиться внутри 3DSFERA. Сначала исследуйте — решение потом.",
    rate: "100 монет = $1",
    selected: "Избранные объекты мира",
    coins: "монет",
    usd: "Цена в USD",
    explore: "Посмотреть в 3D",
    early: "Открытие раннего доступа",
    note: "Товары представлены для знакомства. Партнёрские предложения, наличие и международная доставка подтверждаются в рамках раннего доступа.",
    ctaTitle: "Хотите открыть цены мира?",
    ctaText: "Пройдите предрегистрацию и онбординг, чтобы быть готовыми к запуску товарных открытий внутри 3DSFERA.",
    cta: "Получить ранний доступ",
  },
  zh: {
    eyebrow: "探索虚拟世界",
    title: "Discover",
    description: "精选可在 3DSFERA 中体验的真实商品。先探索，再决定。",
    rate: "100 金币 = 1 美元",
    selected: "精选世界物品",
    coins: "金币",
    usd: "美元参考价",
    explore: "在 3D 中体验",
    early: "抢先体验发现",
    note: "商品仅供探索展示。合作优惠、库存与全球配送将在抢先体验阶段确认。",
    ctaTitle: "想解锁世界专属价格？",
    ctaText: "完成预注册与引导，为 3DSFERA 商品发现功能开放做好准备。",
    cta: "获取抢先体验",
  },
} as const;

const formatCoins = (price: number) => new Intl.NumberFormat("en-US").format(price * 100);

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
            <div className="flex items-center gap-3">
              <Compass className="h-4 w-4 text-[var(--sfera-marketing-cyan)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--sfera-marketing-cyan)]">{t.eyebrow}</p>
            </div>
            <h1 className="mt-5 text-[clamp(4rem,10vw,9rem)] font-black uppercase leading-[0.78] tracking-[-0.06em] [font-family:var(--font-display)]">
              {t.title}
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-relaxed text-white/60 sm:text-xl">{t.description}</p>
          </div>

          <div data-reveal="right" className="flex flex-col gap-3 lg:items-end">
            <div className="inline-flex items-center gap-3 border border-[var(--sfera-marketing-orange)]/35 bg-[var(--sfera-marketing-orange)]/10 px-4 py-3">
              <Coins className="h-5 w-5 text-[var(--sfera-marketing-orange)]" />
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">{t.rate}</span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{t.selected} · {products.length}</p>
          </div>
        </section>

        <section className="marketing-reveal-grid mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product, index) => {
            const isOrange = product.accent === "orange";
            const accent = isOrange ? "var(--sfera-marketing-orange)" : "var(--sfera-marketing-purple)";
            return (
              <article
                key={product.name}
                data-reveal
                data-interactive
                className="marketing-interactive group overflow-hidden border bg-[#070b12] transition duration-300"
                style={{ borderColor: `color-mix(in srgb, ${accent} 38%, transparent)`, boxShadow: `0 22px 70px color-mix(in srgb, ${accent} 9%, transparent)` }}
              >
                <div className="relative aspect-[3/2] overflow-hidden bg-[#101921]">
                  <Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-[1.04]" sizes="(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-transparent to-transparent" />
                  <div className="absolute left-4 top-4 border border-white/15 bg-black/55 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur-md">
                    {product.zone}
                  </div>
                  <div className="absolute bottom-4 right-4 text-[10px] font-black text-white/30">0{index + 1}</div>
                </div>

                <div className="p-5 sm:p-6">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>{product.category}</p>
                  <h2 className="mt-3 text-2xl font-black uppercase leading-none [font-family:var(--font-display)]">{product.name}</h2>
                  <p className="mt-3 min-h-10 text-xs leading-relaxed text-white/45">{product.description}</p>

                  <div className="mt-6 grid grid-cols-2 gap-px bg-white/10">
                    <div className="bg-[#05080e] p-3">
                      <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/30">{t.usd}</p>
                      <p className="mt-1 text-lg font-black text-white">${product.price.toLocaleString("en-US")}</p>
                    </div>
                    <div className="bg-[#05080e] p-3">
                      <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/30">{t.early}</p>
                      <p className="mt-1 flex items-center gap-2 text-lg font-black" style={{ color: accent }}>
                        <Coins className="h-4 w-4" /> {formatCoins(product.price)}
                      </p>
                      <p className="text-[8px] uppercase tracking-[0.12em] text-white/25">{t.coins}</p>
                    </div>
                  </div>

                  <Link href={PLAYER_ENTRY_HREF} className="mt-5 inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:text-white">
                    {t.explore} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <p data-reveal className="mt-8 border-l border-white/15 pl-4 text-xs leading-relaxed text-white/35">{t.note}</p>

        <section data-reveal data-interactive className="marketing-interactive mt-16 grid gap-8 border border-[var(--sfera-marketing-purple)]/30 bg-[linear-gradient(120deg,rgba(139,92,246,0.15),rgba(7,10,18,0.96)_50%,rgba(255,90,25,0.08))] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3 text-[var(--sfera-marketing-purple)]">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.early}</span>
            </div>
            <h2 className="mt-4 text-3xl font-black uppercase [font-family:var(--font-display)] sm:text-4xl">{t.ctaTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/50">{t.ctaText}</p>
          </div>
          <Link href="/pre-register" className="inline-flex min-h-13 items-center justify-center gap-5 bg-[var(--sfera-marketing-orange)] px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-white">
            {t.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
