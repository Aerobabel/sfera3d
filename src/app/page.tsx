'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
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
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { clearServerAuthSession } from "@/lib/auth/browser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
const HERO_VIDEO_FADE_START_TIME_SECONDS = 5.25;
const HERO_VIDEO_STOP_TIME_SECONDS = 6.55;

const syncHeroVideoOutro = (
  event: SyntheticEvent<HTMLVideoElement>,
  fadeHeroVideo: () => void,
) => {
  const video = event.currentTarget;

  if (video.currentTime >= HERO_VIDEO_FADE_START_TIME_SECONDS) {
    fadeHeroVideo();
  }

  if (video.currentTime < HERO_VIDEO_STOP_TIME_SECONDS) return;

  video.pause();
  video.currentTime = HERO_VIDEO_STOP_TIME_SECONDS;
};

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

const localizedCopy = {
  ...copy,
  ru: {
    nav: {
      exhibition: "Игровой мир",
      fastview: "Играть",
      marketplace: "Магазины в игре",
      solutions: "Квесты",
      onboarding: "Онбординг",
      about: "О нас",
    },
    cta: {
      supplier: "Вход для бренда",
      fastview: "Играть сейчас",
      visit: "Войти в игру",
      onboarding: "Добавить товары в игру",
      startTour: "Начать играть",
      visitSection: "Войти в мир",
      explore: "Запустить опыт",
    },
    hero: {
      tag: "Игровой мир с покупками",
      title: "Играйте в 3DSFERA, получайте награды и покупайте реальные товары внутри игры.",
      description:
        "Браузерный игровой мир, где игроки исследуют городские зоны, запускают аркадные автоматы, получают бонусы в кошелек и покупают товары в брендовых павильонах, не выходя из опыта.",
    },
    stats: [
      { value: "3", label: "Аркадных режима" },
      { value: "24", label: "Уровня наград" },
      { value: "4K", label: "Кинематографичный игровой стрим" },
    ],
    trust: {
      tag: "Игровая экономика",
      title: "Сначала удовольствие. Покупки ощущаются частью мира.",
      description:
        "Игроки набирают очки, собирают награды, изучают товары и переходят к покупке через интерфейсы, которые выглядят как естественная часть игрового цикла.",
      metrics: [
        { value: "100%", label: "Проверенные брендовые павильоны" },
        { value: "1", label: "Кошелек для монет и наград" },
        { value: "24/7", label: "Доступ из браузера" },
      ],
      pillars: [
        {
          key: "verified" as const,
          title: "Награды с реальной пользой",
          description: "Победы в аркадах могут открывать бонусы кошелька, купоны и действия с товарами.",
        },
        {
          key: "response" as const,
          title: "Дропы, квесты и бонусы",
          description: "Бренды могут открывать предложения через игровые моменты, не ломая погружение.",
        },
        {
          key: "security" as const,
          title: "Контролируемая коммерция",
          description: "Карточки товаров, диалоги и путь к покупке остаются понятными и модерируемыми.",
        },
      ],
      buyersTitle: "Для игроков",
      buyersDescription: "Сначала игра, затем награды помогают открыть товары в момент живого интереса.",
      suppliersTitle: "Для брендов",
      suppliersDescription: "Размещайте товары в премиальном игровом мире, а не в очередном плоском каталоге.",
    },
    sectionA: {
      tag: "Слой игрового мира",
      title: "Аркадная энергия на поверхности, премиальная коммерция внутри.",
      description:
        "3DSFERA превращает павильоны в игровые точки притяжения: автоматы, квесты, товары, чат и награды живут в одном сценическом потоке.",
      pillars: [
        {
          key: "pipeline" as const,
          title: "Игровые аркадные автоматы",
          description:
            "Snake, Flappy Sfera и Brick Breaker дают посетителям игру, которую хочется освоить перед покупками.",
        },
        {
          key: "attendance" as const,
          title: "Открытие товаров через квесты",
          description: "Товары можно раскрывать через миссии, цели по очкам, бонусы кошелька и события.",
        },
        {
          key: "safe" as const,
          title: "Покупки внутри игры",
          description: "Игроки открывают карточки товаров, пишут брендам, сохраняют позиции и переходят к покупке.",
        },
      ],
      signal: {
        title: "Превью игрового HUD",
        subtitle: "Живая сессия игрока",
        session: "Игрок",
        online: "Онлайн",
        items: ["Аркадный автомат", "Кошелек наград", "Товарный дроп", "Павильон бренда"],
        ready: "Готово",
        trusted: "Игровой цикл",
        tags: ["Играть", "Побеждать", "Собирать", "Покупать"],
      },
    },
    sectionB: {
      tag: "Цикл игрока",
      title: "Понятный путь от игры к покупке.",
      steps: [
        {
          step: "01",
          title: "Войти в город",
          description: "Попадайте в 3D-мир и перемещайтесь по зонам как в премиальной браузерной игре.",
        },
        {
          step: "02",
          title: "Играть и зарабатывать",
          description: "Открывайте автоматы, проходите испытания, собирайте серии очков и получайте награды.",
        },
        {
          step: "03",
          title: "Покупать в мире",
          description: "Используйте карточки товаров, чаты павильонов, избранное и награды, не выходя из игры.",
        },
      ],
    },
    sectionC: {
      tag: "Готово к запуску",
      title: "Сделайте коммерцию миром, в который действительно хочется играть.",
      description:
        "Объедините игры, награды, товарные павильоны и реальные покупки в одном премиальном опыте для удержания и конверсии.",
    },
  },
  zh: {
    nav: {
      exhibition: "游戏世界",
      fastview: "开始玩",
      marketplace: "游戏内商店",
      solutions: "任务",
      onboarding: "入驻",
      about: "关于",
    },
    cta: {
      supplier: "品牌登录",
      fastview: "立即开始",
      visit: "进入游戏",
      onboarding: "把商品带入游戏",
      startTour: "开始游戏",
      visitSection: "进入世界",
      explore: "启动体验",
    },
    hero: {
      tag: "可玩的商业世界",
      title: "在 3DSFERA 中游玩、赢取奖励，并在游戏内购买真实商品。",
      description:
        "一个基于浏览器的游戏世界，玩家可以探索城市区域、进入街机小游戏、获得钱包奖励，并在品牌展馆中完成商品发现与购买。",
    },
    stats: [
      { value: "3", label: "可玩的街机模式" },
      { value: "24", label: "奖励等级" },
      { value: "4K", label: "电影级游戏串流" },
    ],
    trust: {
      tag: "游戏经济层",
      title: "乐趣优先，购物自然融入世界。",
      description:
        "玩家可以冲击分数、收集奖励、查看商品，并通过像游戏界面一样自然的路径进入购买流程。",
      metrics: [
        { value: "100%", label: "已验证品牌展馆" },
        { value: "1", label: "金币与奖励钱包" },
        { value: "24/7", label: "浏览器随时进入" },
      ],
      pillars: [
        {
          key: "verified" as const,
          title: "有真实用途的奖励",
          description: "街机胜利可以连接钱包额度、优惠券和商品行动。",
        },
        {
          key: "response" as const,
          title: "掉落、任务与奖励",
          description: "品牌可以通过游戏时刻解锁优惠，同时保持沉浸感。",
        },
        {
          key: "security" as const,
          title: "可控的商业流程",
          description: "商品页、沟通与购买路径保持清晰，并处于可管理状态。",
        },
      ],
      buyersTitle: "面向玩家",
      buyersDescription: "先玩起来，再用奖励在兴趣最强的时候发现商品。",
      suppliersTitle: "面向品牌",
      suppliersDescription: "把商品放入高级游戏世界，而不是另一个平面目录。",
    },
    sectionA: {
      tag: "游戏世界层",
      title: "表面是街机能量，底层是高级商业能力。",
      description:
        "3DSFERA 将展馆变成可玩的目的地：街机、任务、商品发现、聊天和奖励都在同一个场景流程中。",
      pillars: [
        {
          key: "pipeline" as const,
          title: "可玩的街机设备",
          description: "Snake、Flappy Sfera 和 Brick Breaker 风格挑战，让访客先掌握玩法再购物。",
        },
        {
          key: "attendance" as const,
          title: "基于任务的发现",
          description: "商品可以通过任务、分数目标、钱包奖励和活动掉落被解锁。",
        },
        {
          key: "safe" as const,
          title: "游戏内购买",
          description: "玩家可以打开商品浮层、联系品牌、收藏商品，并继续进入购买流程。",
        },
      ],
      signal: {
        title: "游戏 HUD 预览",
        subtitle: "实时玩家会话",
        session: "玩家",
        online: "在线",
        items: ["街机设备", "奖励钱包", "商品掉落", "品牌展馆"],
        ready: "就绪",
        trusted: "游戏循环",
        tags: ["玩", "赢", "收集", "购买"],
      },
    },
    sectionB: {
      tag: "玩家循环",
      title: "从游戏到购买的清晰路径。",
      steps: [
        {
          step: "01",
          title: "进入城市",
          description: "进入 3D 世界，在不同区域中移动，体验高级浏览器游戏般的空间感。",
        },
        {
          step: "02",
          title: "游玩并获得奖励",
          description: "打开街机设备、完成挑战、累积分数连击，并获得奖励价值。",
        },
        {
          step: "03",
          title: "在世界中购物",
          description: "使用商品浮层、展馆聊天、收藏商品和钱包奖励，不离开游戏即可继续购物。",
        },
      ],
    },
    sectionC: {
      tag: "准备上线",
      title: "让商业变成一个用户愿意真正游玩的世界。",
      description:
        "将游戏、奖励、商品展馆和真实购买整合进一个高级体验，用于提升留存与转化。",
    },
  },
} as const;

export default function LandingPage() {
  const { language } = useLanguage();
  const [isHeroVideoFaded, setIsHeroVideoFaded] = useState(false);
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const t = localizedCopy[language];
  const signOutLabel = language === "ru" ? "Выйти" : language === "zh" ? "退出登录" : "Sign out";

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (isMounted) {
            setViewerEmail(data.session?.user.email ?? null);
          }
        })
        .catch(() => {});

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setViewerEmail(session?.user.email ?? null);
        }
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
    <div
      className={`sfera-cinematic-shell sfera-page-enter relative min-h-screen overflow-x-clip text-[#f5f1e9] [font-family:var(--font-body)] selection:bg-[#66d9cb] selection:text-[#090b10]`}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#07080c_0%,#0b1116_44%,#07080c_100%)]" />
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(102,217,203,0.13),transparent)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#05080b]/78 backdrop-blur-2xl">
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
            {viewerEmail && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold tracking-wide text-[#f5f1e9] transition hover:border-white/35 hover:bg-white/10 disabled:cursor-wait disabled:opacity-50 sm:px-4 sm:text-sm"
                title={viewerEmail}
              >
                {signOutLabel}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section
          id="exhibition"
          className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10"
        >
          <video
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${
              isHeroVideoFaded ? "opacity-0" : "opacity-[0.64]"
            }`}
            autoPlay
            muted
            playsInline
            poster="/sferapic.png"
            onEnded={(event) => syncHeroVideoOutro(event, () => setIsHeroVideoFaded(true))}
            onTimeUpdate={(event) => syncHeroVideoOutro(event, () => setIsHeroVideoFaded(true))}
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
