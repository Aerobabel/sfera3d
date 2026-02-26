'use client';

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Mail,
  Palette,
  Phone,
  Ruler,
  ShieldCheck,
  Sun,
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

const RULE_ICONS: LucideIcon[] = [
  Camera,
  Sun,
  Layers,
  FileText,
  Boxes,
  ShieldCheck,
  Ruler,
  Palette,
  Phone,
];

const INTAKE_EMAIL =
  process.env.NEXT_PUBLIC_SUPPLIER_INTAKE_EMAIL?.trim() || "suppliers@3dsfera.org";

const ONBOARDING_PDFS = {
  en: "/onboarding/english_onboarding.pdf",
  ru: "/onboarding/russian_onboarding.pdf",
  zh: "/onboarding/chinese_onboarding.pdf",
} as const;

const copy = {
  en: {
    nav: {
      back: "Back to Home",
      login: "Supplier Login",
      upload: "Upload Package",
      intakeEmail: "Intake email",
      downloadPdf: "Download PDF",
      pdfHint: "Downloads the prepared PDF for the current language.",
    },
    hero: {
      tag: "Simple Supplier Guide",
      title: "Send us these basics and we can build your 3D pavillon.",
      description:
        "No technical setup needed from your side. Just send clear photos and simple product information.",
    },
    rules: {
      title: "What to send us",
      subtitle: "Think of this like a school checklist.",
      items: [
        {
          title: "Photos from all sides",
          description: "Front, back, left, right, top, bottom, plus one close photo.",
        },
        {
          title: "Good lighting",
          description: "Use daylight or soft white light. Avoid dark shadows.",
        },
        {
          title: "Clean background",
          description: "Use a plain background so the product stands out.",
        },
        {
          title: "Short product description",
          description: "2 to 4 simple sentences: what it is and who it is for.",
        },
        {
          title: "Price and quantity",
          description: "Unit price, minimum order quantity, and current stock.",
        },
        {
          title: "Warranty / guarantee",
          description: "How long the warranty lasts and what it covers.",
        },
        {
          title: "Size and weight",
          description: "Length, width, height, and weight.",
        },
        {
          title: "Colors and versions",
          description: "Tell us colors, sizes, and model names.",
        },
        {
          title: "Contact details",
          description: "Name, email or phone, and how fast you can reply.",
        },
      ],
    },
    sendPack: {
      title: "How to send it",
      steps: [
        "Make one folder per product.",
        "Put all photos in a photos folder.",
        "Add one info.txt file with description, price, quantity, and warranty.",
        "Zip the folder and upload it in the supplier intake portal.",
      ],
      sampleTitle: "Easy folder example",
      sample: [
        "monitor-001/",
        "  photos/",
        "    front.jpg",
        "    back.jpg",
        "    left.jpg",
        "    right.jpg",
        "    top.jpg",
        "    bottom.jpg",
        "    detail.jpg",
        "  info.txt",
      ],
    },
    checklist: {
      title: "Final quick check",
      items: [
        "I added all side photos.",
        "My photos are bright and clear.",
        "I added description, price, and quantity.",
        "I added warranty details.",
        "I added size and weight.",
        "I added my contact details.",
      ],
      footer: "If these are ready, we can build your 3D booth quickly.",
    },
  },
  ru: {
    nav: {
      back: "На главную",
      login: "Вход поставщика",
      upload: "Загрузить пакет",
      intakeEmail: "Почта intake",
      downloadPdf: "Скачать PDF",
      pdfHint: "Скачивает готовый PDF для выбранного языка.",
    },
    hero: {
      tag: "Простой гид для поставщика",
      title: "Пришлите эти базовые данные, и мы соберем ваш 3D павильон.",
      description:
        "От вас не нужна сложная техническая настройка. Нужны только понятные фото и простая информация о товаре.",
    },
    rules: {
      title: "Что нужно отправить",
      subtitle: "Представьте, что это школьный чеклист.",
      items: [
        {
          title: "Фото со всех сторон",
          description: "Front, back, left, right, top, bottom и одно фото крупным планом.",
        },
        {
          title: "Хороший свет",
          description: "Дневной свет или мягкий белый свет. Без темных теней.",
        },
        {
          title: "Чистый фон",
          description: "Простой фон, чтобы товар хорошо выделялся.",
        },
        {
          title: "Короткое описание",
          description: "2-4 простых предложения: что это за товар и для кого он.",
        },
        {
          title: "Цена и количество",
          description: "Цена за единицу, минимальный заказ и остаток на складе.",
        },
        {
          title: "Гарантия",
          description: "Срок гарантии и что в нее входит.",
        },
        {
          title: "Размер и вес",
          description: "Длина, ширина, высота и вес.",
        },
        {
          title: "Цвета и версии",
          description: "Какие есть цвета, размеры и названия моделей.",
        },
        {
          title: "Контакты",
          description: "Имя, email или телефон и скорость ответа.",
        },
      ],
    },
    sendPack: {
      title: "Как отправить",
      steps: [
        "Сделайте отдельную папку на каждый товар.",
        "Положите все фото в папку photos.",
        "Добавьте один файл info.txt с описанием, ценой, количеством и гарантией.",
        "Соберите ZIP и загрузите его через портал поставщика.",
      ],
      sampleTitle: "Простой пример папки",
      sample: [
        "monitor-001/",
        "  photos/",
        "    front.jpg",
        "    back.jpg",
        "    left.jpg",
        "    right.jpg",
        "    top.jpg",
        "    bottom.jpg",
        "    detail.jpg",
        "  info.txt",
      ],
    },
    checklist: {
      title: "Финальная быстрая проверка",
      items: [
        "Я добавил фото со всех сторон.",
        "Фото светлые и четкие.",
        "Я добавил описание, цену и количество.",
        "Я добавил данные по гарантии.",
        "Я добавил размер и вес.",
        "Я добавил контактные данные.",
      ],
      footer: "Если это готово, мы быстро соберем ваш 3D стенд.",
    },
  },
  zh: {
    nav: {
      back: "返回首页",
      login: "供应商登录",
      upload: "上传资料包",
      intakeEmail: "Intake 邮箱",
      downloadPdf: "下载 PDF",
      pdfHint: "将下载当前语言的已准备 PDF。",
    },
    hero: {
      tag: "供应商简易指南",
      title: "把这些基础资料发给我们，我们就能搭建你的 3D 展馆。",
      description:
        "你不需要做复杂技术配置。只要提供清晰照片和简单商品信息即可。",
    },
    rules: {
      title: "你需要提供",
      subtitle: "可以把它当成一份学校作业清单。",
      items: [
        {
          title: "各角度照片",
          description: "front、back、left、right、top、bottom，再加 1 张细节图。",
        },
        {
          title: "光线充足",
          description: "使用日光或柔和白光，避免阴影太重。",
        },
        {
          title: "背景干净",
          description: "使用纯净背景，让商品更突出。",
        },
        {
          title: "简短商品描述",
          description: "2 到 4 句简单文字：它是什么、适合谁。",
        },
        {
          title: "价格和数量",
          description: "单价、最小起订量、当前库存。",
        },
        {
          title: "质保信息",
          description: "质保时长，以及质保范围。",
        },
        {
          title: "尺寸和重量",
          description: "长、宽、高和重量。",
        },
        {
          title: "颜色和版本",
          description: "告诉我们可选颜色、尺寸和型号名称。",
        },
        {
          title: "联系方式",
          description: "姓名、邮箱或电话，以及回复速度。",
        },
      ],
    },
    sendPack: {
      title: "如何发送",
      steps: [
        "每个商品建一个独立文件夹。",
        "把所有照片放进 photos 文件夹。",
        "新增一个 info.txt，写上描述、价格、数量和质保。",
        "将文件夹压缩为 ZIP 并在供应商入口上传。",
      ],
      sampleTitle: "简单目录示例",
      sample: [
        "monitor-001/",
        "  photos/",
        "    front.jpg",
        "    back.jpg",
        "    left.jpg",
        "    right.jpg",
        "    top.jpg",
        "    bottom.jpg",
        "    detail.jpg",
        "  info.txt",
      ],
    },
    checklist: {
      title: "最后快速检查",
      items: [
        "我已上传所有角度照片。",
        "照片清晰、亮度正常。",
        "我已填写描述、价格和数量。",
        "我已填写质保信息。",
        "我已填写尺寸和重量。",
        "我已填写联系方式。",
      ],
      footer: "这些准备好后，我们就能快速开始搭建你的 3D 展位。",
    },
  },
} as const;

export default function OnboardingPage() {
  const { language } = useLanguage();
  const t = copy[language];

  const handleDownloadPdf = () => {
    if (typeof window === "undefined") return;
    const href = ONBOARDING_PDFS[language];
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = href.split("/").at(-1) ?? `onboarding-${language}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} relative min-h-screen overflow-x-clip bg-[#090b10] text-[#f5f1e9] [font-family:var(--font-body)] print:bg-white print:text-black`}
    >
      <div className="pointer-events-none absolute inset-0 print:hidden">
        <div className="absolute -left-28 top-20 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(93,233,214,0.2),rgba(93,233,214,0)_70%)] blur-2xl" />
        <div className="absolute right-[-8rem] top-44 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(246,186,79,0.18),rgba(246,186,79,0)_72%)] blur-2xl" />
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
            <Link
              href="/supplier/upload"
              className="inline-flex items-center gap-2 rounded-full border border-[#66d9cb]/45 bg-[#66d9cb]/10 px-3 py-2 text-[11px] font-semibold tracking-wide text-[#d8fff9] transition hover:bg-[#66d9cb]/20 sm:px-4 sm:text-xs"
            >
              {t.nav.upload}
            </Link>
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

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        <section className="pdf-section rounded-3xl border border-white/10 bg-[linear-gradient(155deg,rgba(13,17,26,0.95),rgba(12,18,28,0.84))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl print:border-gray-300 print:bg-white print:shadow-none sm:p-8 lg:p-10">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#66d9cb] [font-family:var(--font-mono)] sm:text-xs print:text-[#0d7d72]">
            {t.hero.tag}
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl leading-[0.95] tracking-tight [font-family:var(--font-display)] sm:text-5xl lg:text-6xl print:text-black">
            {t.hero.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-[#cbc5bb] sm:text-base print:text-[#2e2e2e]">
            {t.hero.description}
          </p>
          <p className="mt-5 text-xs text-[#9db0c4] print:hidden">{t.nav.pdfHint}</p>
        </section>

        <section className="pdf-section mt-8 rounded-2xl border border-white/10 bg-[#0f1218]/90 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.34)] print:border-gray-300 print:bg-white print:shadow-none sm:p-6">
          <h2 className="text-sm uppercase tracking-[0.22em] text-[#66d9cb] [font-family:var(--font-mono)] print:text-[#0d7d72]">
            {t.rules.title}
          </h2>
          <p className="mt-2 text-sm text-[#bdb6bf] print:text-[#2e2e2e]">{t.rules.subtitle}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-1">
            {t.rules.items.map((item, index) => {
              const Icon = RULE_ICONS[index % RULE_ICONS.length];
              return (
                <article
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 print:border-gray-300 print:bg-gray-50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#66d9cb] print:text-[#0d7d72]" />
                    <h3 className="text-sm font-semibold text-[#f6f2e9] print:text-black">{item.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-[#bdb6bf] print:text-[#2e2e2e]">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="pdf-break-before mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] print:grid-cols-1">
          <article className="pdf-section rounded-2xl border border-white/10 bg-[#0b1017]/90 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.34)] print:border-gray-300 print:bg-white print:shadow-none">
            <h2 className="text-sm uppercase tracking-[0.22em] text-[#66d9cb] [font-family:var(--font-mono)] print:text-[#0d7d72]">
              {t.sendPack.title}
            </h2>
            <ol className="mt-4 space-y-2">
              {t.sendPack.steps.map((step, index) => (
                <li key={step} className="flex gap-2 text-sm text-[#d4ced8] print:text-[#2e2e2e]">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#66d9cb] text-[10px] font-bold text-[#08100f]">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
              <Link
                href="/supplier/upload"
                className="inline-flex items-center gap-2 rounded-full bg-[#66d9cb] px-4 py-2 text-xs font-semibold text-[#08100f] transition hover:bg-[#8de6dc]"
              >
                {t.nav.upload} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href={`mailto:${INTAKE_EMAIL}?subject=${encodeURIComponent("Supplier intake package")}`}
                className="inline-flex items-center gap-2 rounded-full border border-[#f6ba4f]/45 bg-[#f6ba4f]/10 px-4 py-2 text-xs font-semibold text-[#f5dbaa] transition hover:bg-[#f6ba4f]/20"
              >
                <Mail className="h-3.5 w-3.5" />
                {t.nav.intakeEmail}: {INTAKE_EMAIL}
              </a>
            </div>
          </article>

          <article className="pdf-section rounded-2xl border border-[#f6ba4f]/30 bg-[#13100b]/88 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.3)] print:border-gray-300 print:bg-white print:shadow-none">
            <h2 className="text-sm uppercase tracking-[0.22em] text-[#f6ba4f] [font-family:var(--font-mono)] print:text-[#b17008]">
              {t.sendPack.sampleTitle}
            </h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/35 p-4 print:border-gray-300 print:bg-gray-50">
              <pre className="text-xs leading-6 text-[#f9f2e8] [font-family:var(--font-mono)] print:text-black">
                {t.sendPack.sample.join("\n")}
              </pre>
            </div>
          </article>
        </section>

        <section className="pdf-section mt-8 rounded-2xl border border-white/10 bg-[#0f1218]/90 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.34)] print:border-gray-300 print:bg-white print:shadow-none">
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[#66d9cb] [font-family:var(--font-mono)] print:text-[#0d7d72]">
            <CheckCircle2 className="h-4 w-4" />
            {t.checklist.title}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 print:grid-cols-1">
            {t.checklist.items.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#d5cec4] print:border-gray-300 print:bg-gray-50 print:text-[#2e2e2e]">
                {item}
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm text-[#c7c0c8] print:text-[#2e2e2e]">{t.checklist.footer}</p>

          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <Link
              href="/supplier/upload"
              className="inline-flex items-center gap-2 rounded-full bg-[#66d9cb] px-5 py-2.5 text-sm font-bold text-[#08100f] transition hover:bg-[#8de6dc]"
            >
              {t.nav.upload} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-[#ece7de] transition hover:border-white/35 hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              {t.nav.downloadPdf}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
