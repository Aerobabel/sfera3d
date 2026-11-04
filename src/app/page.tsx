'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Compass, Handshake, Mail, MessageCircle, Play, ScanSearch, ShieldCheck } from "lucide-react";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";

const products = [
  { name: "3DSFERA GAMING CHAIR", description: "Ergonomic seating presented inside an interactive showroom.", image: "/marketing/products/gaming-chair-dark.png", tone: "orange" },
  { name: "3DSFERA WIRELESS HEADPHONES", description: "Immersive audio presented through a guided product demonstration.", image: "/marketing/products/wireless-headphones-dark.png", tone: "purple" },
  { name: "3DSFERA SNEAKERS X1", description: "Performance footwear explored in a motion-focused experience.", image: "/marketing/products/sneakers-x1-dark.png", tone: "orange" },
  { name: "3DSFERA SMART HUB PRO", description: "Connected-home controls shown in a realistic room scenario.", image: "/marketing/products/smart-hub-pro-dark.png", tone: "purple" },
] as const;

const featureCards = [
  { number: "01", title: "EXPLORE", text: "Walk a free 3D city with showrooms, exhibitions and events.", image: "/marketing/features/explore-pavilion.png", href: "/#explore", icon: Compass, tone: "orange" },
  { number: "02", title: "EXPERIENCE", text: "Try products inside interactive scenarios and challenges.", image: "/visuals/3dsfera-city-reference-bg.png", href: "/#experience", icon: ScanSearch, tone: "purple" },
  { number: "03", title: "CONNECT", text: "Request info, book a meeting or buy directly from the brand.", image: "/marketing/features/shop-products.png", href: "/#contact", icon: MessageCircle, tone: "blue" },
] as const;

const toneStyles = {
  orange: { border: "border-orange-400/70", text: "text-orange-400", shadow: "shadow-[0_0_30px_rgba(255,100,20,0.10),inset_0_0_24px_rgba(255,100,20,0.03)]" },
  purple: { border: "border-purple-400/70", text: "text-purple-400", shadow: "shadow-[0_0_30px_rgba(168,85,247,0.12),inset_0_0_24px_rgba(168,85,247,0.04)]" },
  blue: { border: "border-sky-400/70", text: "text-sky-400", shadow: "shadow-[0_0_30px_rgba(56,189,248,0.12),inset_0_0_24px_rgba(56,189,248,0.04)]" },
} as const;

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#01040a] text-white [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <Image src="/visuals/3dsfera-city-reference-bg.png" alt="" fill priority loading="eager" className="object-cover object-[80%_center] brightness-[1.04] contrast-[1.08] saturate-[1.48] sm:object-[70%_center] lg:object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,3,9,0.02),rgba(0,3,9,0.08)_48%,rgba(0,3,9,0.2)),radial-gradient(circle_at_78%_20%,rgba(0,145,255,0.18),transparent_40%),radial-gradient(circle_at_20%_72%,rgba(255,83,15,0.14),transparent_38%)]" />
      </div>

      <MarketingHeader />

      <main className="sfera-page-enter relative z-10 -mt-[7.5rem] sm:-mt-[7.75rem] lg:-mt-[6.5rem]">
        <section id="explore" className="relative flex min-h-[760px] scroll-mt-32 items-start overflow-hidden px-4 pb-16 pt-40 sm:min-h-[820px] sm:px-8 sm:pb-20 sm:pt-44 lg:min-h-[100svh] lg:items-center lg:px-12 lg:pt-36">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,4,10,0.25),rgba(0,4,10,0.02)_64%,rgba(0,4,10,0.08))]" />
          <div className="relative w-full lg:-translate-y-3">
            <div data-reveal="left" data-interactive className="marketing-glass-panel marketing-interactive w-full max-w-[900px] rounded-[22px] border border-sky-100/65 bg-[#07101b]/68 px-6 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.58),0_0_34px_rgba(35,160,255,0.18)] backdrop-blur-2xl sm:rounded-[30px] sm:px-12 sm:py-12 lg:px-16 lg:py-16">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300 sm:text-sm">3DSFERA</p>
              <h1 className="mt-4 max-w-[820px] text-[clamp(2.55rem,7vw,6.6rem)] font-black uppercase leading-[0.9] tracking-[-0.045em] [font-family:var(--font-display)]">A LIVING 3D WORLD FOR REAL PRODUCTS</h1>
              <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-2xl">Explore an interactive city of showrooms, pavilions and exhibitions — and experience products before you buy them.</p>
              <Link href="/pre-register" className="marketing-cta-glow group mt-8 inline-flex min-h-14 w-full items-center justify-between rounded-[14px] border border-orange-100 bg-[linear-gradient(135deg,#ff4d00,#ff831c)] px-6 text-sm font-bold text-white shadow-[0_0_34px_rgba(255,91,18,0.55)] transition hover:-translate-y-1 hover:brightness-110 sm:mt-9 sm:min-h-16 sm:w-auto sm:gap-9 sm:px-8 sm:text-xl">Get Early Access <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" /></Link>
              <p className="mt-7 text-xs text-white/65 sm:mt-8 sm:text-lg">App and browser access available at launch.</p>
            </div>
          </div>
        </section>

        <section id="experience" className="relative scroll-mt-32 overflow-hidden px-4 py-16 sm:px-8 sm:py-24 lg:min-h-[860px] lg:px-12 lg:py-28">
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(5,7,18,0.16),rgba(10,8,23,0.05),rgba(4,6,14,0.18))]" />
          <div className="relative mx-auto grid max-w-[1600px] gap-6 sm:gap-9 lg:grid-cols-[0.56fr_1.04fr] lg:items-stretch">
            <div data-reveal="left" data-interactive className="marketing-glass-panel marketing-interactive flex flex-col justify-center rounded-[22px] border border-orange-300/75 bg-[linear-gradient(145deg,rgba(29,29,45,0.88),rgba(50,38,54,0.76))] p-6 shadow-[0_34px_100px_rgba(0,0,0,0.58),0_0_28px_rgba(255,101,24,0.12)] backdrop-blur-2xl sm:min-h-[560px] sm:rounded-[32px] sm:p-14 lg:min-h-[640px]">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Interactive showroom</p>
              <h2 className="mt-5 text-[clamp(3rem,13vw,7rem)] font-black uppercase leading-[0.8] tracking-[0.01em] [font-family:var(--font-condensed)] sm:text-[clamp(4.5rem,8vw,7rem)]">SEE PRODUCTS<br />IN CONTEXT</h2>
              <div className="mt-9 h-1 w-24 bg-[linear-gradient(90deg,#ff781e,#f064c8,#7c4dff,#34a8ff)] shadow-[0_0_15px_rgba(214,92,255,0.5)]" />
              <p className="mt-8 max-w-md text-base leading-relaxed text-white/70 sm:mt-10 sm:text-2xl">Watch the latest 3DSFERA presentation, then explore how products can be brought to life.</p>
              <Link href="/pre-register" className="marketing-cta-glow group mt-8 flex min-h-16 items-center justify-between rounded-[14px] border border-white/70 bg-[linear-gradient(100deg,#ff5c16,#ff7629_58%,#b24fe7)] px-6 text-base font-bold shadow-[0_0_30px_rgba(255,90,25,0.45)] transition hover:-translate-y-1 hover:brightness-110 sm:mt-11 sm:min-h-20 sm:rounded-[16px] sm:px-8 sm:text-2xl">Get Early Access <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" /></Link>
            </div>
            <div data-reveal="right" data-interactive className="marketing-glass-panel marketing-interactive overflow-hidden rounded-[22px] border border-white/55 bg-[#050812]/90 shadow-[0_35px_110px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:rounded-[32px]">
              <video className="aspect-video w-full bg-black object-cover lg:min-h-[560px]" controls playsInline preload="metadata" poster="/cutscenes/novembersfera-poster.jpg" aria-label="Official 3DSFERA presentation"><source src="/cutscenes/novembersfera.mp4" type="video/mp4" /></video>
              <div className="flex min-h-14 items-center gap-3 border-t border-white/10 px-5 text-xs font-medium uppercase tracking-[0.24em] text-white/65 sm:min-h-18 sm:gap-4 sm:px-8 sm:text-sm sm:tracking-[0.32em]"><Play className="h-4 w-4 fill-orange-400 text-orange-400" />3DSFERA PRESENTATION</div>
            </div>
          </div>
        </section>

        <section id="discover" className="relative scroll-mt-32 overflow-hidden px-4 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,4,10,0.24),rgba(1,4,10,0.08)_46%,rgba(1,4,10,0.04)),linear-gradient(180deg,rgba(1,4,10,0.12),transparent_18%,transparent_82%,rgba(1,4,10,0.14))]" />
          <div className="relative mx-auto max-w-[1200px]">
            <div data-reveal className="max-w-[760px]"><h2 className="text-[clamp(3.7rem,18vw,8.3rem)] font-black uppercase leading-[0.78] tracking-[0.01em] [font-family:var(--font-condensed)] sm:text-[clamp(5rem,11vw,8.3rem)]">DISCOVER</h2><div className="mt-5 h-1 w-full max-w-[430px] bg-[linear-gradient(90deg,#ff7420,#9e4dff)] shadow-[0_0_12px_rgba(168,85,247,0.52)]" /><p className="mt-5 max-w-[720px] text-base leading-relaxed text-white/65 sm:text-lg">Brands build interactive pavilions where you can inspect products in 3D, watch live demos and talk to the team behind them.</p></div>
            <div className="marketing-reveal-grid mt-8 grid gap-4 sm:gap-7 lg:grid-cols-2">
              {products.map((product) => {
                const styles = toneStyles[product.tone];
                return <article key={product.name} data-reveal data-interactive className={`marketing-product-card marketing-interactive group overflow-hidden rounded-[18px] border bg-[linear-gradient(145deg,rgba(8,11,16,0.98),rgba(4,7,12,0.96))] sm:rounded-[22px] ${styles.border} ${styles.shadow}`}><div className="grid grid-cols-1 sm:min-h-[330px] sm:grid-cols-[1.05fr_0.95fr]"><div className="relative min-h-[250px] sm:min-h-[300px]"><Image src={product.image} alt={product.name} fill className="object-contain p-2 transition duration-700 group-hover:scale-[1.035] sm:p-3" sizes="(min-width: 1024px) 320px, 50vw" /></div><div className="flex flex-col justify-center px-6 pb-7 pt-1 sm:py-7 sm:pl-0 sm:pr-7"><p className={`text-[10px] font-black uppercase tracking-[0.18em] ${styles.text}`}>Interactive product demo</p><h3 className="mt-3 text-[clamp(1.35rem,2.4vw,2rem)] font-black uppercase leading-[0.98] tracking-[0.015em] [font-family:var(--font-condensed)]">{product.name}</h3><p className="mt-4 max-w-[220px] text-sm leading-relaxed text-white/60">{product.description}</p></div></div></article>;
              })}
            </div>
            <p className="mt-7 border-l-2 border-orange-400 pl-4 text-sm font-semibold text-white/65">Demo pavilion — illustrative items, not for sale.</p>
          </div>
        </section>

        <section id="how-it-works" className="relative scroll-mt-32 overflow-hidden px-4 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-24 lg:px-12 lg:pt-28">
          <div className="marketing-reveal-grid relative mx-auto grid max-w-[1460px] gap-4 lg:grid-cols-3">
            {featureCards.map((card) => {
              const styles = toneStyles[card.tone]; const Icon = card.icon;
              return <Link key={card.number} href={card.href} data-reveal data-interactive className={`marketing-interactive group relative min-h-[340px] overflow-hidden rounded-[18px] border bg-black sm:aspect-[1.38/1] sm:min-h-[340px] sm:rounded-[22px] ${styles.border} ${styles.shadow}`}><Image src={card.image} alt="" fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 1024px) 33vw, 100vw" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,4,10,0.92),rgba(1,4,10,0.4)_68%,rgba(1,4,10,0.16)),linear-gradient(180deg,rgba(1,4,10,0.1),rgba(1,4,10,0.5))]" /><div className="relative flex h-full flex-col justify-between p-7"><div><p className={`text-7xl font-black leading-none [font-family:var(--font-condensed)] sm:text-8xl ${styles.text}`}>{card.number}</p><h3 className={`mt-1 text-3xl font-black uppercase [font-family:var(--font-condensed)] sm:text-4xl ${styles.text}`}>{card.title}</h3></div><div className="flex items-end justify-between gap-5"><div className="flex items-start gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border bg-black/35 ${styles.border} ${styles.text}`}><Icon className="h-5 w-5" /></span><span className="max-w-[16rem] text-sm font-semibold leading-relaxed sm:text-base">{card.text}</span></div><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-black/35 ${styles.border} ${styles.text}`}><ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" /></span></div></div></Link>;
            })}
          </div>
        </section>

        <section id="brands" className="relative scroll-mt-32 px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div data-reveal data-interactive className="marketing-glass-panel marketing-interactive relative mx-auto max-w-[1460px] overflow-hidden rounded-[24px] border border-orange-300/45 bg-[linear-gradient(115deg,rgba(255,91,13,0.18),rgba(4,8,16,0.88)_48%,rgba(35,111,255,0.14))] p-7 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-12 lg:p-16"><div className="grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center"><span className="grid h-16 w-16 place-items-center rounded-2xl border border-orange-300/40 bg-orange-300/10 text-orange-300"><Building2 className="h-8 w-8" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">For Brands</p><h2 className="mt-3 text-3xl font-black uppercase leading-tight [font-family:var(--font-display)] sm:text-5xl">YOUR PRODUCT, BROUGHT TO LIFE</h2><p className="mt-5 max-w-4xl text-sm leading-relaxed text-white/65 sm:text-lg">3DSFERA builds and hosts your interactive pavilion, places your product in guided experiences and delivers qualified leads with clear analytics. Brands pay a pavilion and marketing service fee.</p></div><a href="mailto:partners@3dsfera.org" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-orange-200/55 bg-orange-400/15 px-6 text-sm font-black text-orange-100 transition hover:bg-orange-400/25"><Mail className="h-5 w-5" />partners@3dsfera.org</a></div></div>
        </section>

        <section id="about" className="relative scroll-mt-32 px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="relative mx-auto grid max-w-[1460px] gap-5 lg:grid-cols-2">
            <article data-reveal="left" className="rounded-[24px] border border-cyan-200/25 bg-[#06101b]/88 p-7 backdrop-blur-xl sm:p-10"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">How we work</p><h2 className="mt-4 text-3xl font-black uppercase [font-family:var(--font-display)]">A showroom and marketing platform</h2><div className="mt-7 grid gap-4 text-sm leading-relaxed text-white/70 sm:text-base"><p className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />We are a marketing and showroom platform, not a retailer.</p><p className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />We do not hold user funds or operate a wallet.</p><p className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />We do not issue cryptocurrency, tokens or NFTs.</p><p className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />Products are sold, priced, guaranteed and delivered by the brands themselves.</p></div></article>
            <article data-reveal="right" className="rounded-[24px] border border-purple-300/25 bg-[#0b0918]/88 p-7 backdrop-blur-xl sm:p-10"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-200">About</p><h2 className="mt-4 text-3xl font-black uppercase [font-family:var(--font-display)]">3DSFERA</h2><p className="mt-7 text-sm leading-relaxed text-white/70 sm:text-lg">3DSFERA is developed by 3DSPHERE International Limited, a technology company based in Hong Kong. We build our own 3D engine and web platform connecting brands with their audience through interactive showrooms.</p><p className="mt-6 text-xs leading-relaxed text-white/40">Company No. 80291271 · Unit A7, 12/F, Astoria Building, 34 Ashley Road, Tsim Sha Tsui, Hong Kong</p></article>
          </div>
        </section>

        <section id="contact" className="relative scroll-mt-32 overflow-hidden px-4 pb-8 pt-4 sm:px-8 sm:pb-10 lg:px-12">
          <div data-reveal data-interactive className="marketing-glass-panel marketing-interactive relative mx-auto max-w-[1250px] overflow-hidden rounded-[22px] border border-white/65 bg-[#07101b]/72 px-5 py-9 text-center shadow-[0_35px_120px_rgba(0,0,0,0.65),0_0_34px_rgba(62,124,255,0.16)] backdrop-blur-2xl sm:rounded-[34px] sm:px-12 sm:py-12 lg:px-16"><div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(255,92,20,0.16),rgba(4,7,16,0.36)_48%,rgba(38,111,255,0.16))]" /><h2 className="text-[clamp(3.1rem,15vw,8.6rem)] font-black uppercase leading-[0.82] tracking-[0.01em] [font-family:var(--font-condensed)] sm:text-[clamp(4.2rem,9vw,8.6rem)]">JOIN THE FUTURE</h2><Link href="/pre-register" className="marketing-cta-glow mx-auto mt-7 flex min-h-24 max-w-[610px] flex-col items-center justify-center rounded-[18px] border border-orange-100 bg-[linear-gradient(110deg,rgba(255,91,13,0.94),rgba(255,122,24,0.82),rgba(119,69,161,0.58))] px-5 shadow-[0_0_38px_rgba(255,95,25,0.55)] transition hover:-translate-y-1 hover:brightness-110 sm:mt-8 sm:min-h-28 sm:rounded-[22px] sm:px-8"><strong className="text-xl sm:text-4xl">Pre-Register Now</strong><span className="mt-1 text-sm text-white/72 sm:text-xl">3dsfera.org/pre-register</span></Link><div className="mx-auto mt-6 grid max-w-[840px] gap-5 md:grid-cols-2"><a href="mailto:support@3dsfera.org" className="flex min-h-16 flex-wrap items-center justify-center gap-x-3 gap-y-1 break-all rounded-[15px] border border-orange-300/60 bg-black/35 px-4 text-xs text-white/65 transition hover:bg-white/[0.06] hover:text-white sm:gap-4 sm:px-5 sm:text-base"><Mail className="h-6 w-6 shrink-0 text-white" /><strong className="text-white">Questions?</strong> support@3dsfera.org</a><a href="mailto:partners@3dsfera.org" className="flex min-h-16 flex-wrap items-center justify-center gap-x-3 gap-y-1 break-all rounded-[15px] border border-blue-300/60 bg-black/35 px-4 text-xs text-white/65 transition hover:bg-white/[0.06] hover:text-white sm:gap-4 sm:px-5 sm:text-base"><Handshake className="h-6 w-6 shrink-0 text-white" /><strong className="text-white">For Brands</strong> partners@3dsfera.org</a></div></div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
