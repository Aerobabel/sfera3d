'use client';

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Cpu,
  Globe2,
  Handshake,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Manrope, Space_Mono, Syne } from "next/font/google";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

type PillarKey = "pipeline" | "attendance" | "safe";
type TrustKey = "verified" | "response" | "security";

const pillarIcons: Record<PillarKey, LucideIcon> = {
  pipeline: Cpu,
  attendance: Globe2,
  safe: ShieldCheck,
};

const trustIcons: Record<TrustKey, LucideIcon> = {
  verified: BadgeCheck,
  response: Clock3,
  security: ShieldCheck,
};

const copy = {
  en: {
    nav: {
      exhibition: "Exhibition",
      marketplace: "Marketplace",
      solutions: "Solutions",
      onboarding: "Onboarding",
      about: "About",
    },
    cta: {
      supplier: "Supplier Login",
      visit: "Visit Exhibition",
      onboarding: "Supplier Onboarding",
      startTour: "Start Interactive Tour",
      visitSection: "Visit Exhibition",
      explore: "Explore Live",
    },
    hero: {
      tag: "Premium Virtual Marketplace",
      title: "A flagship digital trade floor built to sell presence, not screenshots.",
      description:
        "3DSFERA gives buyers a confident way to discover products and gives suppliers a clear path to start real conversations, build trust, and close better deals from anywhere.",
    },
    stats: [
      { value: "42", label: "Active Supplier Halls" },
      { value: "13 ms", label: "Median Input Latency" },
      { value: "4K", label: "Cinematic Stream Quality" },
    ],
    trust: {
      tag: "Trust Layer",
      title: "Built for confident buyer-supplier decisions.",
      description:
        "Every inquiry, listing, and supplier profile is designed to reduce risk and shorten time to deal.",
      metrics: [
        { value: "100%", label: "Verified Supplier Profiles" },
        { value: "< 15m", label: "Median First Reply Time" },
        { value: "24/7", label: "Session Monitoring" },
      ],
      pillars: [
        {
          key: "verified" as const,
          title: "Verified Supplier Identity",
          description: "Each supplier profile is screened before going live in the marketplace.",
        },
        {
          key: "response" as const,
          title: "Measured Response SLA",
          description: "Live chat responsiveness is tracked so buyers know when to expect answers.",
        },
        {
          key: "security" as const,
          title: "Secure Commercial Sessions",
          description: "Session-level protection and moderated channels keep conversations business-safe.",
        },
      ],
      buyersTitle: "For Buyers",
      buyersDescription: "Compare products with confidence and speak directly to accountable suppliers.",
      suppliersTitle: "For Suppliers",
      suppliersDescription: "Receive qualified inquiries and reply in a structured, trusted environment.",
    },
    sectionA: {
      tag: "Experience Layer",
      title: "A polished commercial stage for every supplier booth.",
      description:
        "Real-time overlays, AI-assisted chat, and object-level interaction create the feeling of a hosted showroom while preserving web-native accessibility for global attendees.",
      pillars: [
        {
          key: "pipeline" as const,
          title: "Realtime Unreal Pipeline",
          description:
            "Products are streamed from Unreal Engine with interactive lighting, reflections, and physical scale.",
        },
        {
          key: "attendance" as const,
          title: "Borderless Attendance",
          description:
            "Open from desktop, tablet, or mobile browser. No installer, no high-end workstation requirement.",
        },
        {
          key: "safe" as const,
          title: "Enterprise Safe",
          description:
            "Session isolation, verified supplier channels, and moderated interactions designed for commercial events.",
        },
      ],
      signal: {
        title: "Signal Preview",
        subtitle: "Live Stage Quality",
        session: "Session",
        online: "Online",
        items: ["Render Pipeline", "Pixel Stream", "Supplier Chat", "Product Overlay"],
        ready: "Ready",
        trusted: "Trusted by teams",
        tags: ["Footwear", "Consumer Tech", "Industrial", "Home & Living"],
      },
    },
    sectionB: {
      tag: "Conversion Journey",
      title: "From curiosity to qualified lead in three steps.",
      steps: [
        {
          step: "01",
          title: "Enter a Live Pavilion",
          description:
            "Walk curated halls, inspect products, and control the scene with responsive interactions.",
        },
        {
          step: "02",
          title: "Focus on Any Object",
          description:
            "Use crosshair targeting, open detail cards instantly, and compare specs without context switching.",
        },
        {
          step: "03",
          title: "Connect and Convert",
          description:
            "Launch supplier chat, request catalogs, and move directly from discovery to qualified lead flow.",
        },
      ],
    },
    sectionC: {
      tag: "Ready for Launch",
      title: "Turn your next expo into a premium digital destination.",
      description:
        "Bring your suppliers, catalogs, and product scenes into one immersive environment designed for measurable engagement.",
    },
  },
  ru: {
    nav: {
      exhibition: "Выставка",
      marketplace: "Маркетплейс",
      solutions: "Решения",
      onboarding: "Онбординг",
      about: "О нас",
    },
    cta: {
      supplier: "Вход поставщика",
      visit: "Посетить выставку",
      onboarding: "Онбординг поставщика",
      startTour: "Начать интерактивный тур",
      visitSection: "Посетить выставку",
      explore: "Открыть демо",
    },
    hero: {
      tag: "Премиальный виртуальный маркетплейс",
      title: "Цифровая торговая площадка, где продается впечатление, а не скриншоты.",
      description:
        "3DSFERA помогает покупателям уверенно выбирать товары, а поставщикам быстро переходить к диалогу, доверию и сделке на любом устройстве.",
    },
    stats: [
      { value: "42", label: "Активных павильона" },
      { value: "13 мс", label: "Средняя задержка ввода" },
      { value: "4K", label: "Кинематографическое качество" },
    ],
    trust: {
      tag: "Слой доверия",
      title: "Платформа для уверенных решений между покупателем и поставщиком.",
      description:
        "Каждый запрос, карточка товара и профиль поставщика устроены так, чтобы снижать риск и ускорять сделку.",
      metrics: [
        { value: "100%", label: "Проверенные профили поставщиков" },
        { value: "< 15м", label: "Среднее время первого ответа" },
        { value: "24/7", label: "Мониторинг сессий" },
      ],
      pillars: [
        {
          key: "verified" as const,
          title: "Проверенная идентификация поставщика",
          description: "Каждый профиль поставщика проходит проверку перед публикацией в маркетплейсе.",
        },
        {
          key: "response" as const,
          title: "Измеряемый SLA ответа",
          description: "Скорость ответа в live-чате отслеживается и прозрачна для покупателя.",
        },
        {
          key: "security" as const,
          title: "Безопасные коммерческие сессии",
          description: "Защита на уровне сессии и модерация каналов для делового общения.",
        },
      ],
      buyersTitle: "Для покупателей",
      buyersDescription: "Сравнивайте товары увереннее и общайтесь напрямую с ответственными поставщиками.",
      suppliersTitle: "Для поставщиков",
      suppliersDescription: "Получайте квалифицированные обращения в структурированной доверенной среде.",
    },
    sectionA: {
      tag: "Слой опыта",
      title: "Отполированная коммерческая сцена для каждого поставщика.",
      description:
        "Оверлеи в реальном времени, AI-чат и взаимодействие с объектами дают ощущение персонального шоурума без потери доступности в браузере.",
      pillars: [
        {
          key: "pipeline" as const,
          title: "Realtime Unreal-пайплайн",
          description:
            "Товары стримятся из Unreal Engine с интерактивным светом, отражениями и корректным масштабом.",
        },
        {
          key: "attendance" as const,
          title: "Без границ по устройствам",
          description:
            "Открывается на desktop, планшете и телефоне. Без установки и без мощной рабочей станции.",
        },
        {
          key: "safe" as const,
          title: "Готово для enterprise",
          description:
            "Изоляция сессий, проверенные каналы поставщиков и модерация для коммерческих мероприятий.",
        },
      ],
      signal: {
        title: "Превью сигнала",
        subtitle: "Качество live-сцены",
        session: "Сессия",
        online: "Онлайн",
        items: ["Рендер-пайплайн", "Pixel Stream", "Чат поставщика", "Оверлей товара"],
        ready: "Готово",
        trusted: "Используют команды",
        tags: ["Обувь", "Потреб. электроника", "Промышленность", "Дом и интерьер"],
      },
    },
    sectionB: {
      tag: "Путь к сделке",
      title: "От интереса к квалифицированному лидy за три шага.",
      steps: [
        {
          step: "01",
          title: "Войти в живой павильон",
          description:
            "Проходите по залам, изучайте товары и управляйте сценой в реальном времени.",
        },
        {
          step: "02",
          title: "Сфокусироваться на объекте",
          description:
            "Наводите прицел, мгновенно открывайте карточки и сравнивайте характеристики.",
        },
        {
          step: "03",
          title: "Связаться и конвертировать",
          description:
            "Запускайте чат с поставщиком, запрашивайте каталоги и переходите к сделке.",
        },
      ],
    },
    sectionC: {
      tag: "Готово к запуску",
      title: "Превратите следующую выставку в премиальное цифровое направление.",
      description:
        "Объедините поставщиков, каталоги и 3D-сцены в одном иммерсивном пространстве с измеримой вовлеченностью.",
    },
  },
  zh: {
    nav: {
      exhibition: "展览",
      marketplace: "商城",
      solutions: "解决方案",
      onboarding: "入驻规范",
      about: "关于我们",
    },
    cta: {
      supplier: "供应商登录",
      visit: "访问展览",
      onboarding: "供应商入驻",
      startTour: "开始互动导览",
      visitSection: "访问展览",
      explore: "体验在线展厅",
    },
    hero: {
      tag: "高端虚拟交易平台",
      title: "旗舰级数字展销空间，销售的是临场感，而不是截图。",
      description:
        "3DSFERA 让买家更有把握地选品，也让供应商更快开启高质量沟通、建立信任并达成交易。",
    },
    stats: [
      { value: "42", label: "活跃供应商展馆" },
      { value: "13 ms", label: "中位输入延迟" },
      { value: "4K", label: "电影级流媒体画质" },
    ],
    trust: {
      tag: "信任层",
      title: "为买卖双方建立更放心的决策环境。",
      description:
        "从咨询到商品卡再到供应商主页，所有关键环节都围绕“降低风险、加快成交”设计。",
      metrics: [
        { value: "100%", label: "已验证供应商档案" },
        { value: "< 15m", label: "首次回复中位时间" },
        { value: "24/7", label: "会话监控" },
      ],
      pillars: [
        {
          key: "verified" as const,
          title: "供应商身份已验证",
          description: "每个供应商在进入在线商城前都经过身份与资料审核。",
        },
        {
          key: "response" as const,
          title: "可量化回复 SLA",
          description: "实时聊天响应速度可追踪，买家可预期答复时效。",
        },
        {
          key: "security" as const,
          title: "安全商务会话",
          description: "会话级安全与受控沟通通道，保障商业沟通过程可靠。",
        },
      ],
      buyersTitle: "面向买家",
      buyersDescription: "更放心地比较商品，并与可追责供应商直接沟通。",
      suppliersTitle: "面向供应商",
      suppliersDescription: "在可信且结构化的环境中接收高质量询盘并高效回复。",
    },
    sectionA: {
      tag: "体验层",
      title: "为每个供应商展位打造精致商业舞台。",
      description:
        "实时叠层、AI 对话与对象级交互，兼顾高端展厅体验与网页端全球可访问性。",
      pillars: [
        {
          key: "pipeline" as const,
          title: "实时 Unreal 管线",
          description:
            "产品通过 Unreal Engine 实时渲染与推流，具备交互灯光、反射与真实尺度。",
        },
        {
          key: "attendance" as const,
          title: "跨设备无门槛访问",
          description:
            "支持桌面、平板、手机浏览器访问，无需安装、无需高性能工作站。",
        },
        {
          key: "safe" as const,
          title: "企业级安全",
          description:
            "会话隔离、供应商身份通道与受控互动，适配商业会展场景。",
        },
      ],
      signal: {
        title: "信号预览",
        subtitle: "实时舞台质量",
        session: "会话",
        online: "在线",
        items: ["渲染管线", "Pixel Stream", "供应商聊天", "产品叠层"],
        ready: "就绪",
        trusted: "被这些行业采用",
        tags: ["鞋服", "消费电子", "工业", "家居生活"],
      },
    },
    sectionB: {
      tag: "转化路径",
      title: "三步把兴趣转化为高质量商机。",
      steps: [
        {
          step: "01",
          title: "进入实时展馆",
          description:
            "浏览精选展区、查看产品，并通过流畅交互控制场景。",
        },
        {
          step: "02",
          title: "精准聚焦产品",
          description:
            "通过准星选择目标，快速打开详情卡并对比参数。",
        },
        {
          step: "03",
          title: "沟通并促成成交",
          description:
            "直接联系供应商、请求资料并从发现走向有效转化。",
        },
      ],
    },
    sectionC: {
      tag: "准备上线",
      title: "把下一场展会升级为高端数字目的地。",
      description:
        "将供应商、目录与产品场景整合到同一个沉浸式环境中，提升可量化互动与转化。",
    },
  },
} as const;

export default function LandingPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} relative min-h-screen overflow-x-clip bg-[#090b10] text-[#f5f1e9] [font-family:var(--font-body)] selection:bg-[#66d9cb] selection:text-[#090b10]`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(93,233,214,0.24),rgba(93,233,214,0)_70%)] blur-2xl" />
        <div className="drift absolute right-[-6rem] top-48 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(246,186,79,0.24),rgba(246,186,79,0)_72%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_58%),linear-gradient(to_bottom,#090b10_0%,#090b10_55%,#07080c_100%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b10]/72 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="fade-up flex items-center gap-3">
            <div className="h-7 w-7 rounded-md border border-[#66d9cb]/50 bg-[#66d9cb]/15 shadow-[0_0_18px_rgba(102,217,203,0.35)]" />
            <span className="text-lg tracking-tight [font-family:var(--font-display)] sm:text-xl">
              3D<span className="text-[#66d9cb]">SFERA</span>
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[#d6d1c8] md:flex">
            <a href="#exhibition" className="fade-up delay-1 transition hover:text-white">
              {t.nav.exhibition}
            </a>
            <a href="#marketplace" className="fade-up delay-2 transition hover:text-white">
              {t.nav.marketplace}
            </a>
            <a href="#solutions" className="fade-up delay-3 transition hover:text-white">
              {t.nav.solutions}
            </a>
            <Link href="/onboarding" className="fade-up delay-3 transition hover:text-white">
              {t.nav.onboarding}
            </Link>
            <a href="#about" className="fade-up delay-3 transition hover:text-white">
              {t.nav.about}
            </a>
          </nav>

          <div className="fade-up delay-2 flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold tracking-wide text-[#f5f1e9] transition hover:border-white/35 hover:bg-white/10 sm:text-sm"
            >
              {t.cta.supplier}
            </Link>
            <Link
              href="/experience"
              className="rounded-full bg-[#f6ba4f] px-4 py-2 text-xs font-bold tracking-wide text-[#130f07] transition hover:bg-[#ffd084] sm:text-sm"
            >
              {t.cta.visit}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section id="exhibition" className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
          <p className="fade-up [font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.32em] text-[#66d9cb] sm:text-xs">
            {t.hero.tag}
          </p>

          <h1 className="fade-up delay-1 mt-5 max-w-4xl text-4xl leading-[0.95] tracking-tight [font-family:var(--font-display)] sm:text-6xl lg:text-7xl">
            {t.hero.title}
          </h1>

          <p className="fade-up delay-2 mt-7 max-w-2xl text-base leading-relaxed text-[#cdc7bc] sm:text-lg">
            {t.hero.description}
          </p>

          <div className="fade-up delay-3 mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/experience"
              className="sfera-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition"
            >
              {t.cta.startTour} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/onboarding"
              className="sfera-btn-secondary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
            >
              {t.cta.onboarding} <Users className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {t.stats.map((stat, index) => (
              <article
                key={stat.label}
                className={`sfera-card fade-up delay-${index + 1} rounded-2xl p-5`}
              >
                <p className="text-3xl [font-family:var(--font-display)]">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#b9b3a8]">{stat.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="sfera-card rounded-3xl p-7 sm:p-9">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
              {t.trust.tag}
            </p>
            <h2 className="mt-3 text-3xl [font-family:var(--font-display)] sm:text-4xl">
              {t.trust.title}
            </h2>
            <p className="mt-4 max-w-3xl text-[#c8c1b6]">{t.trust.description}</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {t.trust.metrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-2xl [font-family:var(--font-display)] text-[#66d9cb]">{metric.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#bdb7aa]">{metric.label}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {t.trust.pillars.map((pillar) => {
                const Icon = trustIcons[pillar.key as TrustKey];
                return (
                  <article key={pillar.title} className="rounded-2xl border border-white/10 bg-[#0e121a]/75 p-4">
                    <Icon className="h-5 w-5 text-[#66d9cb]" />
                    <h3 className="mt-3 text-sm font-semibold text-white">{pillar.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#bbb4a9]">{pillar.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <article className="rounded-2xl border border-[#66d9cb]/30 bg-[#66d9cb]/8 p-4">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[#83f0e2]">
                  <Handshake className="h-4 w-4" /> {t.trust.buyersTitle}
                </h3>
                <p className="mt-2 text-sm text-[#c9f0eb]">{t.trust.buyersDescription}</p>
              </article>
              <article className="rounded-2xl border border-[#f6ba4f]/30 bg-[#f6ba4f]/8 p-4">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[#ffd995]">
                  <BadgeCheck className="h-4 w-4" /> {t.trust.suppliersTitle}
                </h3>
                <p className="mt-2 text-sm text-[#f2d7a8]">{t.trust.suppliersDescription}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="marketplace" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="fade-up rounded-3xl border border-white/10 bg-[#11151d]/70 p-7 backdrop-blur-xl sm:p-9">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                {t.sectionA.tag}
              </p>
              <h2 className="mt-4 text-3xl leading-tight [font-family:var(--font-display)] sm:text-4xl">
                {t.sectionA.title}
              </h2>
              <p className="mt-5 max-w-xl text-[#ccc5b9]">{t.sectionA.description}</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {t.sectionA.pillars.map((pillar) => {
                  const Icon = pillarIcons[pillar.key as PillarKey];
                  return (
                    <article
                      key={pillar.title}
                      className="rounded-2xl border border-white/10 bg-[#0d1016]/90 p-5 transition hover:border-[#66d9cb]/35"
                    >
                      <Icon className="h-5 w-5 text-[#66d9cb]" />
                      <h3 className="mt-3 text-sm font-semibold tracking-wide">{pillar.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#b5aea2]">{pillar.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="fade-up delay-2 relative overflow-hidden rounded-3xl border border-[#f6ba4f]/25 bg-[#0f1014] p-7">
              <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top_right,rgba(246,186,79,0.3),transparent_60%)]" />
              <div className="scan-line absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-transparent via-[#66d9cb]/20 to-transparent" />
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#f6ba4f] [font-family:var(--font-mono)]">
                  {t.sectionA.signal.title}
                </p>
                <h3 className="mt-3 text-2xl [font-family:var(--font-display)]">{t.sectionA.signal.subtitle}</h3>

                <div className="mt-6 rounded-2xl border border-white/10 bg-[#090b10]/80 p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] text-[#bdb5a8]">
                    <span>{t.sectionA.signal.session}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#66d9cb] shadow-[0_0_8px_rgba(102,217,203,0.8)]" />
                      {t.sectionA.signal.online}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {t.sectionA.signal.items.map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                        <span>{item}</span>
                        <span className="text-[#66d9cb]">{t.sectionA.signal.ready}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7c0b3]">{t.sectionA.signal.trusted}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {t.sectionA.signal.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-[#ddd6ca]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="solutions" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="fade-up rounded-3xl border border-white/10 bg-[#0f1219]/75 p-7 backdrop-blur-xl sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                  {t.sectionB.tag}
                </p>
                <h2 className="mt-3 text-3xl [font-family:var(--font-display)] sm:text-4xl">
                  {t.sectionB.title}
                </h2>
              </div>
              <Link
                href="/experience"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold transition hover:border-white/40 hover:bg-white/10"
              >
                {t.cta.visitSection} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {t.sectionB.steps.map((item) => (
                <article key={item.step} className="rounded-2xl border border-white/10 bg-[#0b0e13]/80 p-5">
                  <p className="text-xs [font-family:var(--font-mono)] tracking-[0.18em] text-[#f6ba4f]">{item.step}</p>
                  <h3 className="mt-3 text-xl [font-family:var(--font-display)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#b9b2a6]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="fade-up delay-2 rounded-3xl border border-[#66d9cb]/35 bg-[linear-gradient(135deg,rgba(17,32,35,0.92),rgba(14,18,27,0.92))] p-8 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                  {t.sectionC.tag}
                </p>
                <h2 className="mt-2 text-3xl [font-family:var(--font-display)] sm:text-4xl">
                  {t.sectionC.title}
                </h2>
                <p className="mt-3 max-w-2xl text-[#c9c1b5]">{t.sectionC.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/experience"
                  className="inline-flex items-center gap-2 rounded-full bg-[#f6ba4f] px-6 py-3 text-sm font-bold text-[#120d04] transition hover:bg-[#ffd083]"
                >
                  {t.cta.explore} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold transition hover:border-white/35 hover:bg-white/10"
                >
                  <Users className="h-4 w-4" /> {t.cta.onboarding}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
