'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gamepad2, Globe2, PackageSearch, Rocket, Store, Users } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";

const icons = [Globe2, Gamepad2, PackageSearch];

const copy = {
  en: {
    eyebrow: "About 3DSFERA",
    title: "A living 3D world for play, discovery, and real possibilities.",
    description: "3DSFERA is an international platform where digital spaces, interactive experiences, and real-world products come together in a new kind of online journey.",
    access: "App and browser access available at launch.",
    cards: [
      { title: "Explore", text: "Move through immersive city districts, pavilions, and live digital spaces." },
      { title: "Play", text: "Complete challenges, join arcade experiences, and earn rewards along the way." },
      { title: "Discover", text: "Experience selected real products inside the world before deciding what matters to you." },
    ],
    earlyEyebrow: "Founding access",
    earlyTitle: "Join while the world is still being built.",
    earlyText: "Pre-register to secure early access, follow launch updates, and be among the first players invited into 3DSFERA.",
    earlyButton: "Pre-register now",
    steps: ["Create your account", "Complete early-access onboarding", "Receive launch access"],
    partnerEyebrow: "For brands and suppliers",
    partnerTitle: "Bring products into a world people want to explore.",
    partnerText: "We create 3D spaces for selected products and help early partners test a more interactive path from attention to discovery.",
    partnerButton: "Build your pavilion",
    signals: ["International platform", "Real products in 3D", "Early partner opportunities"],
  },
  ru: {
    eyebrow: "О 3DSFERA",
    title: "Живой 3D-мир для игры, исследований и реальных возможностей.",
    description: "3DSFERA — международная платформа, где цифровые пространства, интерактивные впечатления и реальные товары соединяются в новом пользовательском опыте.",
    access: "Доступ через приложение и браузер будет доступен на старте.",
    cards: [
      { title: "Исследуйте", text: "Путешествуйте по районам города, павильонам и живым цифровым пространствам." },
      { title: "Играйте", text: "Проходите испытания, открывайте аркады и получайте награды." },
      { title: "Открывайте", text: "Знакомьтесь с избранными реальными товарами внутри виртуального мира." },
    ],
    earlyEyebrow: "Доступ основателей",
    earlyTitle: "Присоединяйтесь, пока мир ещё строится.",
    earlyText: "Пройдите предрегистрацию, чтобы получить ранний доступ, следить за запуском и войти в число первых игроков 3DSFERA.",
    earlyButton: "Пройти предрегистрацию",
    steps: ["Создайте аккаунт", "Пройдите онбординг", "Получите доступ на старте"],
    partnerEyebrow: "Для брендов и поставщиков",
    partnerTitle: "Размещайте товары в мире, который хочется исследовать.",
    partnerText: "Мы создаём 3D-пространства для избранных продуктов и помогаем ранним партнёрам проверить новый путь от внимания к открытию.",
    partnerButton: "Создать павильон",
    signals: ["Международная платформа", "Реальные товары в 3D", "Возможности для ранних партнёров"],
  },
  zh: {
    eyebrow: "关于 3DSFERA",
    title: "一个融合游玩、探索与真实可能的鲜活 3D 世界。",
    description: "3DSFERA 是一个国际化平台，将数字空间、互动体验和真实商品汇聚成全新的线上旅程。",
    access: "上线时将支持应用与浏览器访问。",
    cards: [
      { title: "探索", text: "穿行于沉浸式城市街区、品牌展馆和鲜活的数字空间。" },
      { title: "游玩", text: "完成挑战、体验街机内容，并在旅途中赢取奖励。" },
      { title: "发现", text: "在虚拟世界中体验精选真实商品，找到真正适合你的选择。" },
    ],
    earlyEyebrow: "创始体验资格",
    earlyTitle: "在世界仍在建设时加入我们。",
    earlyText: "预先注册以锁定抢先体验资格、获取上线动态，并成为首批进入 3DSFERA 的玩家。",
    earlyButton: "立即预注册",
    steps: ["创建账户", "完成抢先体验引导", "获得上线资格"],
    partnerEyebrow: "面向品牌与供应商",
    partnerTitle: "让商品进入一个人们愿意探索的世界。",
    partnerText: "我们为精选商品打造 3D 空间，并帮助早期合作伙伴验证从关注到发现的互动路径。",
    partnerButton: "创建品牌展馆",
    signals: ["国际化平台", "真实商品 3D 呈现", "早期合作机会"],
  },
} as const;

export default function AboutPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="sfera-page-enter relative min-h-screen overflow-x-clip bg-[var(--sfera-marketing-bg)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(84,220,230,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(84,220,230,0.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_50%_20%,black,transparent_72%)]" />
      <div data-parallax="0.08" className="pointer-events-none absolute left-[-10rem] top-32 h-[32rem] w-[32rem] rounded-full bg-[var(--sfera-marketing-orange)]/10 blur-[130px]" />
      <MarketingHeader />

      <main className="relative z-10">
        <section className="mx-auto grid max-w-[92rem] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.62fr)] lg:items-center lg:px-10 lg:py-28">
          <div data-reveal="left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--sfera-marketing-orange)] sm:text-xs">{t.eyebrow}</p>
            <h1 className="mt-6 max-w-5xl break-words text-[clamp(2.35rem,5vw,5.5rem)] font-black uppercase leading-[0.94] tracking-[-0.045em] [font-family:var(--font-display)] [text-wrap:balance]">
              {t.title}
            </h1>
            <p className="mt-8 max-w-3xl text-base leading-relaxed text-white/65 sm:text-xl">{t.description}</p>
            <div className="mt-8 inline-flex items-center gap-3 border border-[var(--sfera-marketing-cyan)]/25 bg-[var(--sfera-marketing-cyan)]/5 px-4 py-3 text-xs font-bold text-[var(--sfera-marketing-cyan)]">
              <Rocket className="h-4 w-4" /> {t.access}
            </div>
          </div>

          <div data-reveal="right" data-interactive className="marketing-interactive relative overflow-hidden border border-white/15 bg-[#07101b] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
            <div data-parallax="0.035" className="relative aspect-[4/3] scale-[1.08]">
              <Image src="/sferapic.png" alt="3DSFERA virtual city" fill className="object-cover brightness-75 saturate-125" sizes="(min-width: 1024px) 38vw, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#03050a] via-transparent to-transparent" />
            </div>
            <div className="grid gap-px bg-white/10 sm:grid-cols-3">
              {t.signals.map((signal, index) => (
                <div key={signal} className="bg-[#05080e] p-4">
                  <span className="text-[9px] font-black text-[var(--sfera-marketing-orange)]">0{index + 1}</span>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">{signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#060a12]/80">
          <div className="marketing-reveal-grid mx-auto grid max-w-[92rem] gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-10 lg:py-16">
            {t.cards.map((card, index) => {
              const Icon = icons[index] ?? Globe2;
              return (
                <article key={card.title} data-reveal data-interactive className="marketing-interactive group border border-white/10 bg-[#080d16] p-6 transition hover:border-[var(--sfera-marketing-orange)]/40 hover:shadow-[0_24px_70px_rgba(255,90,25,0.08)]">
                  <div className="flex items-center justify-between">
                    <Icon className="h-6 w-6 text-[var(--sfera-marketing-cyan)]" />
                    <span className="text-xs font-black text-white/20">0{index + 1}</span>
                  </div>
                  <h2 className="mt-8 text-2xl font-black uppercase [font-family:var(--font-display)]">{card.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">{card.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[92rem] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div data-reveal data-interactive className="marketing-interactive grid overflow-hidden border border-[var(--sfera-marketing-orange)]/30 bg-[linear-gradient(125deg,rgba(255,90,25,0.15),rgba(10,13,24,0.96)_48%,rgba(84,220,230,0.08))] lg:grid-cols-[1fr_0.8fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--sfera-marketing-orange)]">{t.earlyEyebrow}</p>
              <h2 className="mt-5 max-w-3xl text-3xl font-black uppercase leading-tight [font-family:var(--font-display)] sm:text-5xl">{t.earlyTitle}</h2>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">{t.earlyText}</p>
              <Link href="/pre-register" className="group mt-8 inline-flex min-h-13 items-center gap-7 bg-[var(--sfera-marketing-orange)] px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-white">
                {t.earlyButton} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="border-t border-white/10 bg-black/20 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
              <ol className="space-y-6">
                {t.steps.map((step, index) => (
                  <li key={step} className="flex items-center gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--sfera-marketing-cyan)]/35 text-[10px] font-black text-[var(--sfera-marketing-cyan)]">0{index + 1}</span>
                    <span className="text-sm font-semibold text-white/70">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#060a12]">
          <div data-reveal className="mx-auto grid max-w-[92rem] gap-8 px-4 py-16 sm:px-6 md:grid-cols-[auto_1fr_auto] md:items-center lg:px-10">
            <div className="grid h-14 w-14 place-items-center border border-[var(--sfera-marketing-purple)]/40 bg-[var(--sfera-marketing-purple)]/10">
              <Store className="h-6 w-6 text-[var(--sfera-marketing-purple)]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--sfera-marketing-purple)]">{t.partnerEyebrow}</p>
              <h2 className="mt-2 text-2xl font-black uppercase [font-family:var(--font-display)] sm:text-3xl">{t.partnerTitle}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/50">{t.partnerText}</p>
            </div>
            <Link href="/onboarding" className="inline-flex items-center gap-3 border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] transition hover:border-[var(--sfera-marketing-purple)]/60 hover:bg-white/5">
              {t.partnerButton} <Users className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
