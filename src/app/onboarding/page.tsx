'use client';

import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  FolderTree,
  Hash,
  ShieldCheck,
  Sparkles,
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

type SectionKey = "photo" | "naming" | "metadata" | "delivery" | "qa" | "sla";

const sectionIcons: Record<SectionKey, LucideIcon> = {
  photo: Camera,
  naming: Hash,
  metadata: FileText,
  delivery: FolderTree,
  qa: ShieldCheck,
  sla: Clock3,
};

const copy = {
  en: {
    nav: {
      back: "Back to Home",
      login: "Supplier Login",
      downloadPdf: "Download PDF",
      pdfHint: "Opens print dialog configured for Save as PDF",
    },
    hero: {
      tag: "Supplier Onboarding",
      title: "Submission standards that keep every product premium on first review.",
      description:
        "Use this onboarding standard before uploading assets to 3DSFERA. It covers image quality, naming, metadata, delivery format, and QA gates so your products publish without delays.",
    },
    scoreCard: {
      title: "Readiness Score",
      subtitle: "Target threshold for fast approval",
      score: "98",
      scoreLabel: "Quality Match",
      bullets: [
        "Automated naming checks",
        "Metadata completeness checks",
        "Visual consistency checks",
      ],
    },
    metrics: {
      slaLabel: "SLA",
      packageLabel: "Package Cap",
    },
    visuals: {
      title: "Visual Submission Examples",
      cards: [
        {
          title: "Hero Product Shot",
          description: "Centered frame, clean background, and edge clarity for marketplace hero cards.",
        },
        {
          title: "Structured Naming",
          description: "Tokenized naming keeps every view machine-readable and instantly traceable.",
        },
        {
          title: "Packaged for QA",
          description: "Organized folders and metadata JSON prevent revision loops and launch delays.",
        },
      ],
    },
    flowTitle: "Publishing Flow",
    flowSteps: [
      {
        title: "Asset Preparation",
        description: "Prepare image sets and metadata according to naming and quality rules.",
      },
      {
        title: "Auto Validation",
        description: "System validates filenames, structure, and mandatory metadata fields.",
      },
      {
        title: "QA Review",
        description: "Editorial and visual checks verify clarity, consistency, and compliance.",
      },
      {
        title: "Live Publication",
        description: "Approved products are synced to supplier pavilion and marketplace cards.",
      },
    ],
    sections: [
      {
        key: "photo" as const,
        title: "1) Picture Quality Standards",
        points: [
          "Minimum 3000 px on the longest side. Target 4096 px for hero images.",
          "Accepted formats: JPG/WebP (quality 90+) and PNG only when transparency is required.",
          "Use neutral or transparent background. Avoid heavy gradients and scene clutter.",
          "Lighting must be even and color-accurate (sRGB IEC61966-2.1).",
          "Required angles: front, back, left, right, top, and one detail close-up.",
          "No watermark overlays, promotional stickers, or compressed artifacts.",
        ],
      },
      {
        key: "naming" as const,
        title: "2) Naming Convention",
        points: [
          "Pattern: supplierCode_productCode_view_lighting_version.ext",
          "Use lowercase letters, digits, underscores, and hyphens only.",
          "productCode must match the SKU used in your supplier dashboard.",
          "Version is mandatory: v01, v02, v03...",
          "One image set per variant (color, size, finish).",
          "Example: nonagon_monitor-001_front_softbox_v01.jpg",
        ],
      },
      {
        key: "metadata" as const,
        title: "3) Required Metadata",
        points: [
          "Mandatory: SKU, product name, category, materials, dimensions, weight.",
          "Include localized titles and descriptions for EN, RU, and ZH when available.",
          "List 3-7 key selling points and warranty period in months.",
          "For variants, provide color names plus HEX code references.",
          "Attach compliance info (CE/FCC/ROHS/etc.) when relevant.",
          "Set stock status and expected replenishment date.",
        ],
      },
      {
        key: "delivery" as const,
        title: "4) Delivery Package",
        points: [
          "Deliver one ZIP per SKU variant. Max package size: 300 MB.",
          "Include a full-size images/ folder and thumbs/ (1200x1200).",
          "Store machine-readable metadata in metadata/product.json.",
          "Include compliance/ docs (PDF) if certifications are claimed.",
          "Do not mix multiple suppliers in a single package.",
          "Use UTF-8 filenames and avoid spaces at file start/end.",
        ],
      },
      {
        key: "qa" as const,
        title: "5) QA Approval Gate",
        points: [
          "Sharp focus on product edges and labels at 100% zoom.",
          "No clipping, no blown highlights, no crushed shadows.",
          "Consistent framing across all mandatory camera angles.",
          "File names must pass convention checks automatically.",
          "Metadata values must be complete and unit-consistent.",
          "Any mismatch between SKU and asset set sends the pack back to revision.",
        ],
      },
      {
        key: "sla" as const,
        title: "6) Review Timeline",
        points: [
          "Submit at least 72 hours before booth go-live.",
          "First QA response target: within 24 hours.",
          "Revision window: up to 48 hours after feedback.",
          "Urgent releases require explicit supplier manager approval.",
          "Only approved packs are synced to live exhibition scenes.",
          "Keep source files archived for at least 30 days post-launch.",
        ],
      },
    ],
    namingTemplateTitle: "Reference Naming Template",
    namingTemplateDescription:
      "Keep this exact token order so automation can validate and publish without manual remapping.",
    namingTemplate: "supplierCode_productCode_view_lighting_version.ext",
    packageTitle: "Reference Package Structure",
    packageStructure: [
      "nonagon_monitor-001_black_v01/",
      "  images/",
      "    nonagon_monitor-001_front_softbox_v01.jpg",
      "    nonagon_monitor-001_detail_ports_v01.jpg",
      "  thumbs/",
      "    nonagon_monitor-001_front_thumb_v01.jpg",
      "  metadata/",
      "    product.json",
      "  compliance/",
      "    ce-certificate.pdf",
    ],
    checklistTitle: "Pre-Submission Checklist",
    checklist: [
      "SKU in filename matches SKU in metadata.",
      "All required camera angles are included.",
      "Color and exposure are consistent across the full set.",
      "No duplicate files or dead references in metadata.",
      "ZIP opens cleanly and follows the folder structure.",
      "Supplier contact email is included for revision feedback.",
    ],
  },
  ru: {
    nav: {
      back: "На главную",
      login: "Вход поставщика",
      downloadPdf: "Скачать PDF",
      pdfHint: "Откроется окно печати: выберите «Сохранить как PDF»",
    },
    hero: {
      tag: "Онбординг поставщика",
      title: "Стандарт загрузки, который помогает пройти проверку с первого раза.",
      description:
        "Используйте этот стандарт перед загрузкой в 3DSFERA. Здесь требования к качеству фото, неймингу, метаданным, структуре пакета и QA-проверке.",
    },
    scoreCard: {
      title: "Индекс готовности",
      subtitle: "Целевой порог для быстрого одобрения",
      score: "98",
      scoreLabel: "Соответствие стандарту",
      bullets: [
        "Автопроверка нейминга",
        "Контроль полноты метаданных",
        "Проверка визуальной консистентности",
      ],
    },
    metrics: {
      slaLabel: "SLA",
      packageLabel: "Лимит пакета",
    },
    visuals: {
      title: "Визуальные примеры подачи",
      cards: [
        {
          title: "Главный кадр товара",
          description: "Центрированная композиция и чистый фон для премиальной карточки товара.",
        },
        {
          title: "Структурный нейминг",
          description: "Токены в имени файла упрощают автопроверку и связывают ассеты со SKU.",
        },
        {
          title: "Пакет для QA",
          description: "Папки, превью и metadata JSON позволяют пройти проверку без возвратов.",
        },
      ],
    },
    flowTitle: "Путь публикации",
    flowSteps: [
      {
        title: "Подготовка ассетов",
        description: "Соберите изображения и metadata по требованиям качества и нейминга.",
      },
      {
        title: "Автовалидация",
        description: "Система проверяет имена файлов, структуру архива и обязательные поля.",
      },
      {
        title: "QA-проверка",
        description: "Команда проверяет четкость, единообразие, корректность и соответствие.",
      },
      {
        title: "Публикация в live",
        description: "Одобренные товары синхронизируются в павильон поставщика и карточки.",
      },
    ],
    sections: [
      {
        key: "photo" as const,
        title: "1) Требования к качеству изображений",
        points: [
          "Минимум 3000 px по длинной стороне. Целевое качество: 4096 px для главных кадров.",
          "Форматы: JPG/WebP (качество 90+) и PNG только при необходимости прозрачности.",
          "Фон нейтральный или прозрачный. Без перегруженных сцен и агрессивных градиентов.",
          "Свет ровный, цветопередача корректная (sRGB IEC61966-2.1).",
          "Обязательные ракурсы: front, back, left, right, top + один detail close-up.",
          "Без водяных знаков, промо-стикеров и артефактов сжатия.",
        ],
      },
      {
        key: "naming" as const,
        title: "2) Нейминг файлов",
        points: [
          "Шаблон: supplierCode_productCode_view_lighting_version.ext",
          "Разрешены строчные буквы, цифры, подчеркивание и дефис.",
          "productCode должен точно совпадать со SKU в кабинете поставщика.",
          "Версия обязательна: v01, v02, v03...",
          "Отдельный набор файлов на каждый вариант (цвет, размер, отделка).",
          "Пример: nonagon_monitor-001_front_softbox_v01.jpg",
        ],
      },
      {
        key: "metadata" as const,
        title: "3) Обязательные метаданные",
        points: [
          "Обязательно: SKU, название, категория, материалы, размеры, вес.",
          "Добавляйте локализованные заголовки и описания для EN, RU и ZH при наличии.",
          "Укажите 3-7 ключевых преимуществ и гарантию в месяцах.",
          "Для вариантов добавляйте название цвета и HEX-код.",
          "При необходимости приложите compliance-документы (CE/FCC/ROHS и т.д.).",
          "Заполните статус наличия и ожидаемую дату пополнения.",
        ],
      },
      {
        key: "delivery" as const,
        title: "4) Структура пакета",
        points: [
          "Один ZIP на один SKU-вариант. Максимум 300 MB.",
          "Включайте images/ (оригиналы) и thumbs/ (1200x1200).",
          "Машиночитаемые метаданные храните в metadata/product.json.",
          "Если заявлены сертификаты, добавляйте PDF в compliance/.",
          "Не смешивайте товары разных поставщиков в одном архиве.",
          "Имена файлов в UTF-8, без пробелов в начале и конце.",
        ],
      },
      {
        key: "qa" as const,
        title: "5) QA-контроль",
        points: [
          "Резкость по контурам товара и маркировкам при масштабе 100%.",
          "Без пересветов, провалов в тенях и обрезанных граней.",
          "Единое кадрирование для всех обязательных ракурсов.",
          "Нейминг должен проходить автоматическую валидацию.",
          "Метаданные должны быть полными и с едиными единицами измерения.",
          "Любое расхождение SKU и файлов возвращает пакет на доработку.",
        ],
      },
      {
        key: "sla" as const,
        title: "6) Сроки проверки",
        points: [
          "Загрузка минимум за 72 часа до публикации в павильоне.",
          "Первый ответ QA: целевой срок до 24 часов.",
          "Окно исправлений: до 48 часов после комментариев.",
          "Срочные релизы только с подтверждением supplier-менеджера.",
          "В live-сцену выставки попадают только одобренные пакеты.",
          "Храните исходники минимум 30 дней после запуска.",
        ],
      },
    ],
    namingTemplateTitle: "Эталонный шаблон имени файла",
    namingTemplateDescription:
      "Соблюдайте порядок токенов, чтобы система валидации публиковала карточки без ручной перенастройки.",
    namingTemplate: "supplierCode_productCode_view_lighting_version.ext",
    packageTitle: "Эталонная структура архива",
    packageStructure: [
      "nonagon_monitor-001_black_v01/",
      "  images/",
      "    nonagon_monitor-001_front_softbox_v01.jpg",
      "    nonagon_monitor-001_detail_ports_v01.jpg",
      "  thumbs/",
      "    nonagon_monitor-001_front_thumb_v01.jpg",
      "  metadata/",
      "    product.json",
      "  compliance/",
      "    ce-certificate.pdf",
    ],
    checklistTitle: "Чеклист перед отправкой",
    checklist: [
      "SKU в имени файла совпадает со SKU в metadata.",
      "Все обязательные ракурсы загружены.",
      "Цвет и экспозиция единообразны во всем наборе.",
      "В metadata нет битых или дублирующихся ссылок.",
      "ZIP открывается корректно и соблюдает структуру папок.",
      "Указан контактный email поставщика для обратной связи QA.",
    ],
  },
  zh: {
    nav: {
      back: "返回首页",
      login: "供应商登录",
      downloadPdf: "下载 PDF",
      pdfHint: "将打开打印窗口，请选择“另存为 PDF”",
    },
    hero: {
      tag: "供应商入驻规范",
      title: "一次提交通过审核的高标准素材规范。",
      description:
        "上传到 3DSFERA 前请先对照本规范。涵盖图片质量、命名规则、元数据、打包方式与 QA 审核门槛，避免反复返工。",
    },
    scoreCard: {
      title: "就绪指数",
      subtitle: "快速通过审核的目标阈值",
      score: "98",
      scoreLabel: "标准匹配度",
      bullets: [
        "自动命名校验",
        "元数据完整性校验",
        "视觉一致性校验",
      ],
    },
    metrics: {
      slaLabel: "SLA",
      packageLabel: "包体上限",
    },
    visuals: {
      title: "视觉示例",
      cards: [
        {
          title: "主图示例",
          description: "居中构图、干净背景与清晰边缘，适合商城主卡展示。",
        },
        {
          title: "命名结构示例",
          description: "标准化命名让系统能自动识别视角、光照与版本信息。",
        },
        {
          title: "QA 打包示例",
          description: "规范目录与 metadata JSON 可显著减少返修与上线延迟。",
        },
      ],
    },
    flowTitle: "发布流程",
    flowSteps: [
      {
        title: "素材准备",
        description: "按规范准备图片与 metadata，确保命名和质量一致。",
      },
      {
        title: "自动校验",
        description: "系统检查文件名、目录结构与必填字段。",
      },
      {
        title: "QA 审核",
        description: "人工审核画面清晰度、一致性与合规信息。",
      },
      {
        title: "上线发布",
        description: "通过审核的商品同步到供应商展馆与商城卡片。",
      },
    ],
    sections: [
      {
        key: "photo" as const,
        title: "1) 图片质量要求",
        points: [
          "长边至少 3000 px，主图建议 4096 px。",
          "支持 JPG/WebP（质量 90+），仅在需要透明背景时使用 PNG。",
          "背景建议中性或透明，避免复杂场景干扰。",
          "光照均匀且颜色准确（sRGB IEC61966-2.1）。",
          "必需视角：front、back、left、right、top，以及 1 张细节图。",
          "禁止水印、促销贴纸与明显压缩噪点。",
        ],
      },
      {
        key: "naming" as const,
        title: "2) 文件命名规则",
        points: [
          "命名模板：supplierCode_productCode_view_lighting_version.ext",
          "仅使用小写字母、数字、下划线和短横线。",
          "productCode 必须与供应商后台 SKU 完全一致。",
          "必须带版本号：v01、v02、v03...",
          "每个变体（颜色/尺寸/表面工艺）单独一套文件。",
          "示例：nonagon_monitor-001_front_softbox_v01.jpg",
        ],
      },
      {
        key: "metadata" as const,
        title: "3) 必填元数据",
        points: [
          "必填字段：SKU、产品名、分类、材质、尺寸、重量。",
          "如可提供，请补充 EN/RU/ZH 多语言标题与描述。",
          "填写 3-7 条核心卖点与保修月数。",
          "有变体时需提供颜色名称及 HEX 色值。",
          "如涉及认证，请上传 CE/FCC/ROHS 等资料。",
          "请填写库存状态与预计补货时间。",
        ],
      },
      {
        key: "delivery" as const,
        title: "4) 打包与交付",
        points: [
          "每个 SKU 变体单独一个 ZIP，最大 300 MB。",
          "必须包含 images/ 原图与 thumbs/（1200x1200）。",
          "机器可读元数据放在 metadata/product.json。",
          "声明认证时请在 compliance/ 提供 PDF。",
          "不要在同一个压缩包中混放多个供应商素材。",
          "文件名使用 UTF-8，避免首尾空格。",
        ],
      },
      {
        key: "qa" as const,
        title: "5) QA 审核门槛",
        points: [
          "100% 缩放下产品边缘与标识需保持清晰。",
          "不得出现高光过曝、阴影死黑或裁切缺失。",
          "所有必需视角构图应保持一致。",
          "文件命名必须通过自动校验。",
          "元数据必须完整且单位统一。",
          "SKU 与素材不一致将被退回修改。",
        ],
      },
      {
        key: "sla" as const,
        title: "6) 审核时效",
        points: [
          "建议至少在展馆上线前 72 小时提交。",
          "首轮 QA 反馈目标：24 小时内。",
          "收到反馈后建议 48 小时内完成修订。",
          "紧急上线需供应商运营经理明确批准。",
          "仅审核通过的包会同步到在线展馆。",
          "上线后请至少保留 30 天源文件备份。",
        ],
      },
    ],
    namingTemplateTitle: "命名模板参考",
    namingTemplateDescription: "严格使用该字段顺序，便于系统自动校验并无人工映射发布。",
    namingTemplate: "supplierCode_productCode_view_lighting_version.ext",
    packageTitle: "打包结构参考",
    packageStructure: [
      "nonagon_monitor-001_black_v01/",
      "  images/",
      "    nonagon_monitor-001_front_softbox_v01.jpg",
      "    nonagon_monitor-001_detail_ports_v01.jpg",
      "  thumbs/",
      "    nonagon_monitor-001_front_thumb_v01.jpg",
      "  metadata/",
      "    product.json",
      "  compliance/",
      "    ce-certificate.pdf",
    ],
    checklistTitle: "提交前检查清单",
    checklist: [
      "文件名中的 SKU 与 metadata 中 SKU 一致。",
      "必需视角已全部提供。",
      "整套素材色彩与曝光一致。",
      "metadata 中无失效引用或重复文件。",
      "ZIP 可正常解压且目录结构正确。",
      "已提供供应商联系人邮箱用于审核反馈。",
    ],
  },
} as const;

export default function OnboardingPage() {
  const { language } = useLanguage();
  const t = copy[language];

  const handleDownloadPdf = () => {
    if (typeof window === "undefined") return;

    const previousTitle = document.title;
    document.title = `3DSFERA_Onboarding_${language.toUpperCase()}`;
    window.print();

    window.setTimeout(() => {
      document.title = previousTitle;
    }, 300);
  };

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} relative min-h-screen overflow-x-clip bg-[#090b10] text-[#f5f1e9] [font-family:var(--font-body)] print:bg-white print:text-black`}
    >
      <div className="pointer-events-none absolute inset-0 print:hidden">
        <div className="absolute -left-28 top-20 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(93,233,214,0.2),rgba(93,233,214,0)_70%)] blur-2xl" />
        <div className="drift absolute right-[-8rem] top-44 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(246,186,79,0.18),rgba(246,186,79,0)_72%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b10]/75 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md border border-[#66d9cb]/50 bg-[#66d9cb]/15 shadow-[0_0_18px_rgba(102,217,203,0.35)]" />
            <span className="text-lg tracking-tight [font-family:var(--font-display)] sm:text-xl">
              3D<span className="text-[#66d9cb]">SFERA</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-full border border-[#66d9cb]/45 bg-[#66d9cb]/10 px-3 py-2 text-[11px] font-semibold tracking-wide text-[#d8fff9] transition hover:bg-[#66d9cb]/20 sm:px-4 sm:text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {t.nav.downloadPdf}
            </button>
            <Link
              href="/"
              className="rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold tracking-wide text-[#f5f1e9] transition hover:border-white/35 hover:bg-white/10 sm:px-4 sm:text-xs"
            >
              {t.nav.back}
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#f6ba4f] px-3 py-2 text-[11px] font-bold tracking-wide text-[#130f07] transition hover:bg-[#ffd084] sm:px-4 sm:text-xs"
            >
              {t.nav.login}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16 print:max-w-none print:px-0 print:pt-0">
        <section className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr] print:grid-cols-1">
          <article className="pdf-section rounded-3xl border border-white/10 bg-[linear-gradient(155deg,rgba(13,17,26,0.95),rgba(12,18,28,0.84))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl print:border-gray-300 print:bg-white print:shadow-none sm:p-8 lg:p-10">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#66d9cb] [font-family:var(--font-mono)] sm:text-xs print:text-[#0d7d72]">
              {t.hero.tag}
            </p>
            <h1 className="mt-4 max-w-5xl text-3xl leading-[0.95] tracking-tight [font-family:var(--font-display)] sm:text-5xl lg:text-6xl print:text-black">
              {t.hero.title}
            </h1>
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#cbc5bb] sm:text-base print:text-[#2e2e2e]">
              {t.hero.description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 print:border-gray-300 print:bg-gray-50">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#90f0e3] print:text-[#0d7d72]">{t.scoreCard.scoreLabel}</p>
                <p className="mt-1 text-2xl [font-family:var(--font-display)]">{t.scoreCard.score}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 print:border-gray-300 print:bg-gray-50">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#90f0e3] print:text-[#0d7d72]">{t.metrics.slaLabel}</p>
                <p className="mt-1 text-2xl [font-family:var(--font-display)]">24h</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 print:border-gray-300 print:bg-gray-50">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#90f0e3] print:text-[#0d7d72]">{t.metrics.packageLabel}</p>
                <p className="mt-1 text-2xl [font-family:var(--font-display)]">300MB</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-full bg-[#66d9cb] px-5 py-2.5 text-sm font-bold text-[#08100f] transition hover:bg-[#8de6dc]"
              >
                <Download className="h-4 w-4" />
                {t.nav.downloadPdf}
              </button>
              <p className="text-xs text-[#9db0c4]">{t.nav.pdfHint}</p>
            </div>
          </article>

          <article className="pdf-section relative overflow-hidden rounded-3xl border border-[#66d9cb]/30 bg-[linear-gradient(175deg,rgba(13,23,32,0.95),rgba(10,15,21,0.9))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] print:border-gray-300 print:bg-white print:shadow-none sm:p-8">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#66d9cb]/20 blur-3xl print:hidden" />
            <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-[#f6ba4f]/20 blur-3xl print:hidden" />

            <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 20deg, rgba(102,217,203,0.95), rgba(102,217,203,0.15) 45%, rgba(246,186,79,0.9) 70%, rgba(102,217,203,0.95) 100%)",
                }}
              />
              <div className="absolute inset-[10px] rounded-full bg-[#070b11]/95 print:bg-gray-100" />
              <div className="absolute inset-[28px] rounded-full border border-white/15 bg-[#121821] print:border-gray-300 print:bg-white" />
              <div className="relative rounded-2xl border border-white/20 bg-black/35 px-6 py-4 text-center shadow-[0_10px_26px_rgba(0,0,0,0.4)] print:border-gray-300 print:bg-gray-50">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white [font-family:var(--font-mono)] print:text-[#0d7d72]">
                  {t.scoreCard.title}
                </p>
                <p className="mt-1 text-5xl [font-family:var(--font-display)] text-white print:text-black">{t.scoreCard.score}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#dbd6cf] print:text-gray-700">{t.scoreCard.scoreLabel}</p>
              </div>
            </div>

            <h2 className="mt-6 text-xl [font-family:var(--font-display)] sm:text-2xl">{t.scoreCard.subtitle}</h2>
            <ul className="mt-4 space-y-2">
              {t.scoreCard.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#d0cad0] print:text-[#2e2e2e]">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#66d9cb] print:text-[#0d7d72]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-sm uppercase tracking-[0.22em] text-[#66d9cb] [font-family:var(--font-mono)] print:text-[#0d7d72]">
            {t.visuals.title}
          </h2>
          <div className="grid gap-4 md:grid-cols-3 print:grid-cols-1">
            {t.visuals.cards.map((card, index) => (
              <article
                key={card.title}
                className="pdf-section overflow-hidden rounded-2xl border border-white/10 bg-[#111723]/90 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.34)] print:border-gray-300 print:bg-white print:shadow-none"
              >
                <div className="relative mb-4 h-36 rounded-xl border border-white/10 bg-[linear-gradient(160deg,rgba(102,217,203,0.12),rgba(14,20,30,0.7))] p-3 print:border-gray-300 print:bg-gray-50">
                  {index === 0 && (
                    <svg viewBox="0 0 260 120" className="h-full w-full">
                      <rect x="70" y="20" width="120" height="80" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(102,217,203,0.65)" />
                      <circle cx="130" cy="60" r="18" fill="none" stroke="rgba(246,186,79,0.95)" strokeWidth="4" />
                      <rect x="18" y="42" width="28" height="36" rx="6" fill="rgba(102,217,203,0.2)" />
                      <rect x="214" y="42" width="28" height="36" rx="6" fill="rgba(102,217,203,0.2)" />
                      <line x1="46" y1="60" x2="70" y2="60" stroke="rgba(102,217,203,0.7)" strokeWidth="3" />
                      <line x1="190" y1="60" x2="214" y2="60" stroke="rgba(102,217,203,0.7)" strokeWidth="3" />
                    </svg>
                  )}
                  {index === 1 && (
                    <svg viewBox="0 0 260 120" className="h-full w-full">
                      <rect x="22" y="26" width="216" height="68" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(102,217,203,0.5)" />
                      <line x1="36" y1="60" x2="224" y2="60" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
                      <text x="34" y="52" fill="rgba(246,186,79,0.95)" fontSize="10">supplierCode</text>
                      <text x="118" y="52" fill="rgba(102,217,203,0.95)" fontSize="10">productCode</text>
                      <text x="34" y="76" fill="rgba(255,255,255,0.78)" fontSize="10">view_lighting_version</text>
                      <circle cx="34" cy="18" r="4" fill="rgba(102,217,203,0.8)" />
                      <circle cx="48" cy="18" r="4" fill="rgba(246,186,79,0.9)" />
                      <circle cx="62" cy="18" r="4" fill="rgba(139,187,255,0.85)" />
                    </svg>
                  )}
                  {index === 2 && (
                    <svg viewBox="0 0 260 120" className="h-full w-full">
                      <rect x="22" y="14" width="80" height="92" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(102,217,203,0.45)" />
                      <rect x="112" y="14" width="64" height="92" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(102,217,203,0.45)" />
                      <rect x="184" y="14" width="54" height="92" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(246,186,79,0.65)" />
                      <circle cx="62" cy="34" r="8" fill="rgba(102,217,203,0.6)" />
                      <circle cx="144" cy="34" r="8" fill="rgba(102,217,203,0.6)" />
                      <circle cx="211" cy="34" r="8" fill="rgba(246,186,79,0.85)" />
                      <rect x="38" y="50" width="48" height="8" rx="3" fill="rgba(255,255,255,0.18)" />
                      <rect x="122" y="50" width="40" height="8" rx="3" fill="rgba(255,255,255,0.18)" />
                      <rect x="194" y="50" width="34" height="8" rx="3" fill="rgba(255,255,255,0.18)" />
                    </svg>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-[#f4efe6] print:text-black">{card.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#c3bbc3] print:text-[#2e2e2e]">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pdf-section mt-8 rounded-2xl border border-white/10 bg-[#0f1218]/90 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.34)] print:border-gray-300 print:bg-white print:shadow-none sm:p-6">
          <h2 className="text-sm uppercase tracking-[0.22em] text-[#66d9cb] [font-family:var(--font-mono)] print:text-[#0d7d72]">
            {t.flowTitle}
          </h2>
          <div className="mt-4 hidden h-px bg-gradient-to-r from-[#66d9cb]/70 via-[#f6ba4f]/40 to-transparent md:block print:hidden" />
          <div className="mt-4 grid gap-3 md:grid-cols-4 print:grid-cols-2">
            {t.flowSteps.map((step, index) => (
              <article key={step.title} className="pdf-section rounded-xl border border-white/10 bg-white/[0.03] p-4 print:border-gray-300 print:bg-gray-50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[#8fdad0] [font-family:var(--font-mono)] print:text-[#0d7d72]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#66d9cb]" />
                </div>
                <h3 className="text-sm font-semibold text-[#f6f2e9] print:text-black">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#bdb6bf] print:text-[#2e2e2e]">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pdf-break-before mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-1">
          {t.sections.map((section) => {
            const Icon = sectionIcons[section.key];
            return (
              <article
                key={section.key}
                className="pdf-section group rounded-2xl border border-white/10 bg-[#0e121b]/85 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-0.5 hover:border-[#66d9cb]/40 print:border-gray-300 print:bg-white print:shadow-none"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#66d9cb]/35 bg-[#66d9cb]/15 print:border-gray-300 print:bg-gray-100">
                    <Icon className="h-4 w-4 text-[#66d9cb] print:text-[#0d7d72]" />
                  </div>
                  <h3 className="text-base leading-tight text-[#f2ede4] print:text-black">{section.title}</h3>
                </div>
                <ul className="space-y-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2 text-sm text-[#c2bac0] print:text-[#2e2e2e]">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#66d9cb] print:bg-[#0d7d72]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="pdf-break-before mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] print:grid-cols-1">
          <article className="pdf-section rounded-2xl border border-white/10 bg-[#0b1017]/90 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.34)] print:border-gray-300 print:bg-white print:shadow-none">
            <h3 className="text-sm uppercase tracking-[0.22em] text-[#66d9cb] [font-family:var(--font-mono)] print:text-[#0d7d72]">
              {t.namingTemplateTitle}
            </h3>
            <p className="mt-3 text-sm text-[#c9c2b7] print:text-[#2e2e2e]">{t.namingTemplateDescription}</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 print:border-gray-300 print:bg-gray-50">
              <code className="text-sm text-[#f7f2e9] [font-family:var(--font-mono)] print:text-black">{t.namingTemplate}</code>
            </div>
          </article>

          <article className="pdf-section rounded-2xl border border-[#f6ba4f]/30 bg-[#13100b]/88 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.3)] print:border-gray-300 print:bg-white print:shadow-none">
            <h3 className="text-sm uppercase tracking-[0.22em] text-[#f6ba4f] [font-family:var(--font-mono)] print:text-[#b17008]">
              {t.packageTitle}
            </h3>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/35 p-4 print:border-gray-300 print:bg-gray-50">
              <pre className="text-xs leading-6 text-[#f9f2e8] [font-family:var(--font-mono)] print:text-black">
                {t.packageStructure.join("\n")}
              </pre>
            </div>
          </article>
        </section>

        <section className="pdf-section mt-8 rounded-2xl border border-white/10 bg-[#0f1218]/90 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.34)] print:border-gray-300 print:bg-white print:shadow-none">
          <h3 className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[#66d9cb] [font-family:var(--font-mono)] print:text-[#0d7d72]">
            <CheckCircle2 className="h-4 w-4" />
            {t.checklistTitle}
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 print:grid-cols-1">
            {t.checklist.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#d5cec4] print:border-gray-300 print:bg-gray-50 print:text-[#2e2e2e]">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-full bg-[#66d9cb] px-5 py-2.5 text-sm font-bold text-[#08100f] transition hover:bg-[#8de6dc]"
            >
              <Download className="h-4 w-4" />
              {t.nav.downloadPdf}
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-[#ece7de] transition hover:border-white/35 hover:bg-white/10"
            >
              {t.nav.login} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
