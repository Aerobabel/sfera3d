'use client';

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gamepad2,
  Gift,
  Handshake,
  ShoppingBag,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

type PillarKey = "pipeline" | "attendance" | "safe";
type TrustKey = "verified" | "response" | "security";

const pillarIcons: Record<PillarKey, LucideIcon> = {
  pipeline: Gamepad2,
  attendance: Trophy,
  safe: ShoppingBag,
};

const trustIcons: Record<TrustKey, LucideIcon> = {
  verified: Trophy,
  response: Gift,
  security: ShieldCheck,
};

const playerIntroLoginHref = "/login?role=player&next=%2Froles%3Fintro%3Dcity";

const copy = {
  en: {
    nav: {
      exhibition: "Game World",
      fastview: "Play",
      marketplace: "In-Game Shops",
      solutions: "Quests",
      onboarding: "Onboarding",
      about: "About",
    },
    cta: {
      supplier: "Creator Login",
      fastview: "Play Now",
      visit: "Enter Game",
      onboarding: "Bring Products In-Game",
      startTour: "Start Playing",
      visitSection: "Enter the World",
      explore: "Launch Experience",
    },
    hero: {
      tag: "Playable Commerce World",
      title: "Play through 3DSFERA, win rewards, and shop real products inside the game.",
      description:
        "A browser-based game world where players explore city zones, jump into arcade cabinets, earn wallet credits, and buy from branded pavilions without leaving the experience.",
    },
    stats: [
      { value: "3", label: "Playable Arcade Modes" },
      { value: "24", label: "Reward Levels" },
      { value: "4K", label: "Cinematic Game Stream" },
    ],
    trust: {
      tag: "Game Economy Layer",
      title: "The fun comes first. The shopping feels native to the world.",
      description:
        "Players can chase scores, collect rewards, inspect products, and move to checkout through interfaces that feel like part of the game loop.",
      metrics: [
        { value: "100%", label: "Verified Brand Pavilions" },
        { value: "1", label: "Wallet for Coins and Rewards" },
        { value: "24/7", label: "Playable Browser Access" },
      ],
      pillars: [
        {
          key: "verified" as const,
          title: "Rewards With Real Utility",
          description: "Arcade wins can connect to wallet credits, coupons, and product actions.",
        },
        {
          key: "response" as const,
          title: "Drops, Quests, and Bonuses",
          description: "Brands can use game moments to unlock offers without breaking immersion.",
        },
        {
          key: "security" as const,
          title: "Commerce That Stays Controlled",
          description: "Product pages, conversations, and checkout paths remain clear and moderated.",
        },
      ],
      buyersTitle: "For Players",
      buyersDescription: "Play first, then use rewards to discover products when curiosity is already high.",
      suppliersTitle: "For Brands",
      suppliersDescription: "Place products inside a premium game world instead of another flat catalog.",
    },
    sectionA: {
      tag: "Game World Layer",
      title: "Arcade energy on the surface, premium commerce underneath.",
      description:
        "3DSFERA turns pavilions into playable destinations: cabinets, quests, product discovery, chat, and rewards all live in one scene-first flow.",
      pillars: [
        {
          key: "pipeline" as const,
          title: "Playable Arcade Cabinets",
          description:
            "Snake, Flappy Sfera, and Brick Breaker style challenges give visitors something to master before they shop.",
        },
        {
          key: "attendance" as const,
          title: "Quest-Based Discovery",
          description:
            "Products can be revealed through missions, score targets, wallet bonuses, and event drops.",
        },
        {
          key: "safe" as const,
          title: "In-Game Purchasing",
          description:
            "Players can open product overlays, message suppliers, save items, and continue into checkout.",
        },
      ],
      signal: {
        title: "Game HUD Preview",
        subtitle: "Live Player Session",
        session: "Player",
        online: "Online",
        items: ["Arcade Cabinet", "Reward Wallet", "Product Drop", "Brand Pavilion"],
        ready: "Ready",
        trusted: "Game loop",
        tags: ["Play", "Win", "Collect", "Shop"],
      },
    },
    sectionB: {
      tag: "Player Loop",
      title: "A clear path from gameplay to purchase.",
      steps: [
        {
          step: "01",
          title: "Enter the City",
          description:
            "Land inside the 3D world and move through zones that feel like a premium browser game.",
        },
        {
          step: "02",
          title: "Play and Earn",
          description:
            "Open arcade cabinets, complete challenges, build score streaks, and collect reward value.",
        },
        {
          step: "03",
          title: "Shop In-World",
          description:
            "Use product overlays, pavilion chats, saved items, and wallet rewards without leaving the game.",
        },
      ],
    },
    sectionC: {
      tag: "Ready for Launch",
      title: "Make commerce feel like a world people actually want to play.",
      description:
        "Bring games, rewards, product pavilions, and real purchasing into one premium experience built for retention and conversion.",
    },
  },
  ru: {
    nav: {
      exhibition: "Цифровой мир",
      fastview: "FastView",
      marketplace: "Маркетплейс",
      solutions: "Решения",
      onboarding: "Онбординг",
      about: "О нас",
    },
    cta: {
      supplier: "Вход поставщика",
      fastview: "Открыть FastView",
      visit: "Войти в цифровой мир",
      onboarding: "Онбординг поставщика",
      startTour: "Начать интерактивный тур",
      visitSection: "Открыть цифровое пространство",
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
        "Оверлеи в реальном времени, AI-чат и взаимодействие с объектами дают ощущение персонального виртуального пространства без потери доступности в браузере.",
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
      title: "Превратите следующий запуск в премиальное цифровое пространство.",
      description:
        "Объедините поставщиков, каталоги и 3D-сцены в одном иммерсивном пространстве с измеримой вовлеченностью.",
    },
  },
  zh: {
    nav: {
      exhibition: "展览",
      fastview: "FastView",
      marketplace: "商城",
      solutions: "解决方案",
      onboarding: "入驻规范",
      about: "关于我们",
    },
    cta: {
      supplier: "供应商登录",
      fastview: "打开 FastView",
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
  const t = copy.en;

  return (
    <div
      className={`relative min-h-screen overflow-x-clip bg-[#090b10] text-[#f5f1e9] [font-family:var(--font-body)] selection:bg-[#66d9cb] selection:text-[#090b10]`}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#07080c_0%,#0b1116_44%,#07080c_100%)]" />
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(102,217,203,0.13),transparent)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b10]/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
          <div className="fade-up flex min-w-0 items-center">
            <BrandLogo size="md" priority />
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[#d6d1c8] md:flex">
            <a href="#exhibition" className="fade-up delay-1 transition hover:text-white">
              {t.nav.exhibition}
            </a>
            <Link href={playerIntroLoginHref} className="fade-up delay-2 transition hover:text-white">
              {t.nav.fastview}
            </Link>
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

          <div className="fade-up delay-2 flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="/login?role=supplier"
              className="hidden rounded-full border border-white/15 px-4 py-2 text-xs font-semibold tracking-wide text-[#f5f1e9] transition hover:border-white/35 hover:bg-white/10 sm:inline-flex sm:text-sm"
            >
              {t.cta.supplier}
            </a>
            <Link
              href={playerIntroLoginHref}
              className="rounded-full bg-[#f6ba4f] px-3 py-2 text-xs font-bold tracking-wide text-[#130f07] transition hover:bg-[#ffd084] sm:px-4 sm:text-sm"
            >
              {t.cta.visit}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section
          id="exhibition"
          className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10"
        >
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-[0.64]"
            autoPlay
            muted
            loop
            playsInline
            poster="/sferapic.png"
          >
            <source src="/cutscenes/cityvideo.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,12,0.94)_0%,rgba(7,8,12,0.72)_38%,rgba(7,8,12,0.34)_72%,rgba(7,8,12,0.68)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,12,0.62)_0%,rgba(7,8,12,0.2)_46%,#090b10_100%)]" />
          <div className="grain-overlay" />

          <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-end px-4 pb-8 pt-20 sm:px-6 sm:pb-10 lg:px-8">
            <div className="max-w-5xl">
              <p className="fade-up [font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.32em] text-[#66d9cb] sm:text-xs">
                {t.hero.tag}
              </p>

              <h1 className="fade-up delay-1 mt-5 max-w-5xl text-4xl leading-[0.98] tracking-tight [overflow-wrap:anywhere] [font-family:var(--font-display)] sm:text-6xl sm:leading-[0.92] lg:text-7xl">
                {t.hero.title}
              </h1>

              <p className="fade-up delay-2 mt-6 max-w-3xl text-base leading-relaxed text-[#e1dbd0] sm:text-lg">
                {t.hero.description}
              </p>

              <div className="fade-up delay-3 mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
                <Link
                  href={playerIntroLoginHref}
                  className="sfera-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-center text-sm font-bold transition sm:px-6"
                >
                  {t.cta.startTour} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/onboarding"
                  className="sfera-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-center text-sm font-semibold transition sm:px-6"
                >
                  {t.cta.onboarding} <Users className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-3 lg:grid-cols-[1fr_0.82fr] lg:items-end">
              <div className="grid gap-3 sm:grid-cols-3">
                {t.sectionB.steps.map((item, index) => (
                  <article
                    key={item.step}
                    className={`fade-up delay-${index + 1} border border-white/15 bg-[#080b10]/75 p-4 backdrop-blur-xl`}
                  >
                    <p className="text-[10px] [font-family:var(--font-mono)] uppercase tracking-[0.24em] text-[#f6ba4f]">
                      {item.step}
                    </p>
                    <h2 className="mt-2 text-base font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-xs leading-relaxed text-[#cfc8bc]">{item.description}</p>
                  </article>
                ))}
              </div>

              <div className="grid border border-white/15 bg-[#080b10]/75 backdrop-blur-xl sm:grid-cols-3">
                {t.stats.map((stat) => (
                  <article
                    key={stat.label}
                    className="border-b border-white/10 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                  >
                    <p className="text-2xl [font-family:var(--font-display)] text-white sm:text-3xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#c5beb3]">{stat.label}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0b0f14]/90 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                  {t.trust.tag}
                </p>
                <h2 className="mt-3 text-3xl leading-tight [font-family:var(--font-display)] sm:text-4xl">
                  {t.trust.title}
                </h2>
                <p className="mt-4 max-w-2xl text-[#c8c1b6]">{t.trust.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {t.trust.metrics.map((metric) => (
                  <article key={metric.label} className="border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-2xl [font-family:var(--font-display)] text-[#66d9cb]">{metric.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#bdb7aa]">{metric.label}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {t.trust.pillars.map((pillar) => {
                const Icon = trustIcons[pillar.key as TrustKey];
                return (
                  <article key={pillar.title} className="border border-white/10 bg-[#111821]/80 p-5">
                    <Icon className="h-5 w-5 text-[#66d9cb]" />
                    <h3 className="mt-3 text-sm font-semibold text-white">{pillar.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#bbb4a9]">{pillar.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <article className="border border-[#66d9cb]/30 bg-[#102020]/80 p-5">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[#83f0e2]">
                  <Handshake className="h-4 w-4" /> {t.trust.buyersTitle}
                </h3>
                <p className="mt-2 text-sm text-[#c9f0eb]">{t.trust.buyersDescription}</p>
              </article>
              <article className="border border-[#f6ba4f]/30 bg-[#211b10]/80 p-5">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[#ffd995]">
                  <BadgeCheck className="h-4 w-4" /> {t.trust.suppliersTitle}
                </h3>
                <p className="mt-2 text-sm text-[#f2d7a8]">{t.trust.suppliersDescription}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="marketplace" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="fade-up">
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
                      className="border border-white/10 bg-[#0d1016]/90 p-5 transition hover:border-[#66d9cb]/35"
                    >
                      <Icon className="h-5 w-5 text-[#66d9cb]" />
                      <h3 className="mt-3 text-sm font-semibold tracking-wide">{pillar.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#b5aea2]">{pillar.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="fade-up delay-2 relative overflow-hidden border border-[#f6ba4f]/25 bg-[#0f1014] p-7">
              <div className="absolute inset-0 opacity-[0.45] [background:linear-gradient(135deg,rgba(246,186,79,0.28),transparent_46%),linear-gradient(180deg,rgba(102,217,203,0.12),transparent_62%)]" />
              <div className="scan-line absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-transparent via-[#66d9cb]/20 to-transparent" />
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#f6ba4f] [font-family:var(--font-mono)]">
                  {t.sectionA.signal.title}
                </p>
                <h3 className="mt-3 text-2xl [font-family:var(--font-display)]">{t.sectionA.signal.subtitle}</h3>

                <div className="mt-6 border border-white/10 bg-[#090b10]/80 p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] text-[#bdb5a8]">
                    <span>{t.sectionA.signal.session}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#66d9cb] shadow-[0_0_8px_rgba(102,217,203,0.8)]" />
                      {t.sectionA.signal.online}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {t.sectionA.signal.items.map((item) => (
                      <div key={item} className="flex items-center justify-between bg-white/[0.04] px-3 py-2 text-xs">
                        <span>{item}</span>
                        <span className="text-[#66d9cb]">{t.sectionA.signal.ready}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border border-white/10 bg-white/[0.03] p-4">
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

        <section id="solutions" className="border-y border-white/10 bg-[#0a0d12]/90 px-4 py-20 sm:px-6 lg:px-8">
          <div className="fade-up mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                  {t.sectionB.tag}
                </p>
                <h2 className="mt-3 text-3xl [font-family:var(--font-display)] sm:text-4xl">
                  {t.sectionB.title}
                </h2>
              </div>
              <Link
                href={playerIntroLoginHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold transition hover:border-white/40 hover:bg-white/10"
              >
                {t.cta.visitSection} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {t.sectionB.steps.map((item) => (
                <article key={item.step} className="border border-white/10 bg-[#0f141d]/85 p-5">
                  <p className="text-xs [font-family:var(--font-mono)] tracking-[0.18em] text-[#f6ba4f]">{item.step}</p>
                  <h3 className="mt-3 text-xl [font-family:var(--font-display)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#b9b2a6]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="fade-up delay-2 relative mx-auto max-w-7xl overflow-hidden border border-[#66d9cb]/35 bg-[linear-gradient(135deg,rgba(17,32,35,0.92),rgba(14,18,27,0.92))] p-8 sm:p-10">
            <video
              className="absolute inset-0 h-full w-full object-cover opacity-[0.18]"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/cutscenes/maincutscene-ru.MP4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,12,16,0.96),rgba(8,12,16,0.78),rgba(8,12,16,0.92))]" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
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
                  href={playerIntroLoginHref}
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
