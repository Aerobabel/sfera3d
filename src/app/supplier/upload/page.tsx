'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Loader2,
  Mail,
  UploadCloud,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type SubmissionStatus = "received" | "in_review" | "approved" | "needs_update";

type SubmissionRecord = {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  productName: string;
  sku: string;
  colors?: string;
  stockQty?: string;
};

type IntakeFormState = {
  supplierName: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  productName: string;
  sku: string;
  description: string;
  price: string;
  currency: string;
  minOrderQty: string;
  stockQty: string;
  warranty: string;
  dimensions: string;
  weight: string;
  colors: string;
  notes: string;
};

type SupplierIntakeGetResponse = {
  success?: boolean;
  submissions?: SubmissionRecord[];
  error?: string;
};

type SupplierIntakePostResponse = {
  success?: boolean;
  error?: string;
};

const MAX_ARCHIVE_MB = 350;
const DEFAULT_CURRENCY = "USD";
const FALLBACK_INTAKE_EMAIL = "suppliers@3dsfera.org";
const INTAKE_EMAIL =
  process.env.NEXT_PUBLIC_SUPPLIER_INTAKE_EMAIL?.trim() || FALLBACK_INTAKE_EMAIL;

const createInitialForm = (
  supplierName: string,
  contactEmail: string
): IntakeFormState => ({
  supplierName,
  companyName: "",
  contactName: "",
  contactEmail,
  phone: "",
  productName: "",
  sku: "",
  description: "",
  price: "",
  currency: DEFAULT_CURRENCY,
  minOrderQty: "",
  stockQty: "",
  warranty: "",
  dimensions: "",
  weight: "",
  colors: "",
  notes: "",
});

const supplierNameFromEmail = (email: string | null | undefined) => {
  if (!email) return "Supplier";
  const localPart = email.split("@")[0] ?? "Supplier";
  return localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
};

const fieldConfig: Array<{
  key: keyof IntakeFormState;
  required?: boolean;
  type?: "text" | "email";
  textarea?: boolean;
  wide?: boolean;
}> = [
  { key: "supplierName", required: true },
  { key: "companyName" },
  { key: "contactName" },
  { key: "contactEmail", required: true, type: "email" },
  { key: "phone" },
  { key: "productName" },
  { key: "sku" },
  { key: "colors", wide: true },
  { key: "stockQty" },
  { key: "description", textarea: true, wide: true },
  { key: "notes", textarea: true, wide: true },
];

const PACKAGE_TIPS: Record<"en" | "ru" | "zh", string[]> = {
  en: [
    "One ZIP can include many products (phones, tablets, TVs, etc.).",
    "Use folders per product inside the ZIP.",
    "Include a simple list of categories and approximate item count.",
  ],
  ru: [
    "Один ZIP может включать много товаров (телефоны, планшеты, ТВ и т.д.).",
    "Внутри ZIP используйте отдельные папки на каждый товар.",
    "Добавьте список категорий и примерное количество позиций.",
  ],
  zh: [
    "一个 ZIP 可以包含多个商品（手机、平板、电视等）。",
    "请在 ZIP 内按商品分文件夹。",
    "填写商品类别和大概数量即可。",
  ],
};

const PACKAGE_FIELD_LABELS: Record<
  "en" | "ru" | "zh",
  Partial<Record<keyof IntakeFormState, string>>
> = {
  en: {
    productName: "Package title",
    sku: "Package reference / primary SKU (optional)",
    colors: "Categories in this ZIP (e.g. phones, tablets, TV)",
    stockQty: "Approximate number of products",
    description: "What is included in this package",
    notes: "Notes for onboarding team",
  },
  ru: {
    productName: "Название пакета",
    sku: "Референс пакета / основной SKU (опционально)",
    colors: "Категории в ZIP (например: телефоны, планшеты, ТВ)",
    stockQty: "Примерное количество товаров",
    description: "Что входит в этот пакет",
    notes: "Комментарий для команды онбординга",
  },
  zh: {
    productName: "资料包名称",
    sku: "资料包参考编号 / 主 SKU（可选）",
    colors: "ZIP 内商品类别（如：手机、平板、电视）",
    stockQty: "大概商品数量",
    description: "该资料包包含内容",
    notes: "给入驻团队的备注",
  },
};

const PACKAGE_SCOPE_HINT: Record<"en" | "ru" | "zh", string> = {
  en: "This is package-level intake. You can include multiple product categories in one ZIP.",
  ru: "Это пакетная отправка. В одном ZIP можно передать несколько категорий товаров.",
  zh: "这是资料包级提交。一个 ZIP 可包含多个商品类别。",
};

const copy = {
  en: {
    title: "Supplier Intake Upload",
    subtitle: "Upload your ZIP package and track review status in one place.",
    signInRequired: "You need to sign in as a supplier first.",
    signIn: "Go to supplier login",
    notConfigured:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    loadFailed: "Failed to load submissions.",
    uploadFailed: "Failed to submit package.",
    uploadSuccess: "Package submitted successfully.",
    tipsTitle: "What to upload",
    tips: [
      "ZIP can include one product or multiple products.",
      "Photos from all sides and one close-up.",
      "Include price, quantity, warranty, size, and weight.",
    ],
    fallbackTitle: "Need help?",
    fallbackDescription: "If portal upload fails, send your ZIP package by email.",
    sendEmail: "Email intake team",
    uploadSection: "New Submission",
    historySection: "Submission History",
    noSubmissions: "No submissions yet.",
    refresh: "Refresh",
    submitting: "Uploading...",
    submit: "Submit package",
    archiveLabel: "ZIP package",
    archiveHint: "Only .zip files, up to 350 MB.",
    required: "Required",
    backToOnboarding: "Back to onboarding",
    backToHome: "Back to home",
    createdAt: "Submitted",
    fields: {
      supplierName: "Supplier name",
      companyName: "Company name",
      contactName: "Contact person",
      contactEmail: "Contact email",
      phone: "Phone",
      productName: "Product name",
      sku: "SKU / product code",
      description: "Short product description",
      price: "Unit price",
      currency: "Currency",
      minOrderQty: "Minimum order quantity",
      stockQty: "Available stock",
      warranty: "Warranty",
      dimensions: "Dimensions",
      weight: "Weight",
      colors: "Colors / variants",
      notes: "Notes",
    },
    statuses: {
      received: "Received",
      in_review: "In review",
      approved: "Approved",
      needs_update: "Needs update",
    },
  },
  ru: {
    title: "Загрузка пакета поставщика",
    subtitle: "Загрузите ZIP и отслеживайте статус проверки в одном месте.",
    signInRequired: "Сначала нужно войти как поставщик.",
    signIn: "Перейти к входу поставщика",
    notConfigured:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    loadFailed: "Не удалось загрузить отправки.",
    uploadFailed: "Не удалось отправить пакет.",
    uploadSuccess: "Пакет успешно отправлен.",
    tipsTitle: "Что загружать",
    tips: [
      "Один ZIP на один товар.",
      "Фото со всех сторон и один крупный план.",
      "Добавьте цену, количество, гарантию, размер и вес.",
    ],
    fallbackTitle: "Нужна помощь?",
    fallbackDescription:
      "Если загрузка через портал не работает, отправьте ZIP по email.",
    sendEmail: "Написать команде intake",
    uploadSection: "Новая отправка",
    historySection: "История отправок",
    noSubmissions: "Пока нет отправок.",
    refresh: "Обновить",
    submitting: "Загрузка...",
    submit: "Отправить пакет",
    archiveLabel: "ZIP пакет",
    archiveHint: "Только .zip, до 350 МБ.",
    required: "Обязательно",
    backToOnboarding: "Назад к онбордингу",
    backToHome: "На главную",
    createdAt: "Отправлено",
    fields: {
      supplierName: "Имя поставщика",
      companyName: "Компания",
      contactName: "Контактное лицо",
      contactEmail: "Контактный email",
      phone: "Телефон",
      productName: "Название товара",
      sku: "SKU / код товара",
      description: "Короткое описание товара",
      price: "Цена за единицу",
      currency: "Валюта",
      minOrderQty: "Мин. партия",
      stockQty: "Остаток на складе",
      warranty: "Гарантия",
      dimensions: "Размеры",
      weight: "Вес",
      colors: "Цвета / версии",
      notes: "Комментарий",
    },
    statuses: {
      received: "Получено",
      in_review: "На проверке",
      approved: "Одобрено",
      needs_update: "Нужны правки",
    },
  },
  zh: {
    title: "供应商资料上传",
    subtitle: "在一个页面完成 ZIP 上传并查看审核状态。",
    signInRequired: "请先以供应商身份登录。",
    signIn: "前往供应商登录",
    notConfigured:
      "Supabase 未配置。请添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    loadFailed: "加载提交记录失败。",
    uploadFailed: "提交资料失败。",
    uploadSuccess: "资料提交成功。",
    tipsTitle: "上传内容",
    tips: [
      "每个商品上传一个 ZIP。",
      "包含商品各角度照片和 1 张细节图。",
      "填写价格、数量、质保、尺寸和重量。",
    ],
    fallbackTitle: "需要帮助？",
    fallbackDescription: "如果门户上传失败，请通过邮件发送 ZIP。",
    sendEmail: "邮件联系 intake 团队",
    uploadSection: "新提交",
    historySection: "提交历史",
    noSubmissions: "暂无提交记录。",
    refresh: "刷新",
    submitting: "上传中...",
    submit: "提交资料包",
    archiveLabel: "ZIP 文件",
    archiveHint: "仅支持 .zip，最大 350 MB。",
    required: "必填",
    backToOnboarding: "返回入驻规范",
    backToHome: "返回首页",
    createdAt: "提交时间",
    fields: {
      supplierName: "供应商名称",
      companyName: "公司名称",
      contactName: "联系人",
      contactEmail: "联系邮箱",
      phone: "联系电话",
      productName: "商品名称",
      sku: "SKU / 商品编码",
      description: "商品简述",
      price: "单价",
      currency: "币种",
      minOrderQty: "最小起订量",
      stockQty: "库存数量",
      warranty: "质保",
      dimensions: "尺寸",
      weight: "重量",
      colors: "颜色 / 版本",
      notes: "备注",
    },
    statuses: {
      received: "已接收",
      in_review: "审核中",
      approved: "已通过",
      needs_update: "需补充",
    },
  },
} as const;

export default function SupplierUploadPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const router = useRouter();
  const mailtoUrl = useMemo(
    () =>
      `mailto:${INTAKE_EMAIL}?subject=${encodeURIComponent(
        "Supplier intake package"
      )}`,
    []
  );

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [form, setForm] = useState<IntakeFormState>(() =>
    createInitialForm("", "")
  );
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let cleanupAuth: (() => void) | undefined;

    const setup = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session) {
          setIsAuthenticated(false);
          setToken("");
          setIsAuthLoading(false);
          return;
        }

        const email = session.user.email ?? "";
        const metadata =
          session.user.user_metadata &&
          typeof session.user.user_metadata === "object"
            ? (session.user.user_metadata as Record<string, unknown>)
            : {};

        const supplierName =
          typeof metadata.supplier_name === "string" &&
          metadata.supplier_name.trim().length > 0
            ? metadata.supplier_name.trim()
            : supplierNameFromEmail(email);

        setToken(session.access_token);
        setIsAuthenticated(true);
        setForm((current) => ({
          ...current,
          supplierName: current.supplierName || supplierName,
          contactEmail: current.contactEmail || email,
        }));
        setAuthError(null);
        setIsAuthLoading(false);

        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, nextSession) => {
            if (!nextSession) {
              setIsAuthenticated(false);
              setToken("");
              router.replace("/login");
              return;
            }

            setToken(nextSession.access_token);
            setIsAuthenticated(true);
          }
        );

        cleanupAuth = () => {
          listener.subscription.unsubscribe();
        };
      } catch {
        if (!active) return;
        setAuthError(t.notConfigured);
        setIsAuthLoading(false);
      }
    };

    void setup();

    return () => {
      active = false;
      cleanupAuth?.();
    };
  }, [router, t.notConfigured]);

  const loadSubmissions = useCallback(
    async (accessToken: string) => {
      if (!accessToken) return;

      setIsLoadingSubmissions(true);
      setHistoryError(null);

      try {
        const response = await fetch("/api/supplier-intake", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const data = (await response.json()) as SupplierIntakeGetResponse;
        if (!response.ok || !data.success) {
          throw new Error(data.error || t.loadFailed);
        }

        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : t.loadFailed;
        setHistoryError(message);
      } finally {
        setIsLoadingSubmissions(false);
      }
    },
    [t.loadFailed]
  );

  useEffect(() => {
    if (!token) return;
    void loadSubmissions(token);
  }, [loadSubmissions, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!token) {
      setSubmitError(t.signInRequired);
      return;
    }

    if (!archiveFile) {
      setSubmitError(`${t.archiveLabel}: ${t.required}.`);
      return;
    }

    if (!archiveFile.name.toLowerCase().endsWith(".zip")) {
      setSubmitError(t.archiveHint);
      return;
    }

    if (archiveFile.size > MAX_ARCHIVE_MB * 1024 * 1024) {
      setSubmitError(t.archiveHint);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      (
        Object.keys(form) as Array<keyof IntakeFormState>
      ).forEach((key: keyof IntakeFormState) => {
        formData.append(key, form[key]);
      });
      formData.append("archive", archiveFile);

      const response = await fetch("/api/supplier-intake", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = (await response.json()) as SupplierIntakePostResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.uploadFailed);
      }

      setSubmitSuccess(t.uploadSuccess);
      setArchiveFile(null);
      setFileInputKey((key) => key + 1);

      setForm((current) => ({
        ...current,
        productName: "",
        sku: "",
        colors: "",
        stockQty: "",
        description: "",
        notes: "",
      }));

      await loadSubmissions(token);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.uploadFailed;
      if (message.toLowerCase().includes("maximum allowed size")) {
        setSubmitError(
          `${t.archiveHint} Server bucket limit is lower than expected; retry once in 10-20 seconds.`
        );
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-[#f1ece1]">
      <header className="border-b border-white/10 bg-[#080b12]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md border border-[#66d9cb]/50 bg-[#66d9cb]/15 shadow-[0_0_18px_rgba(102,217,203,0.35)]" />
            <span className="text-lg tracking-tight">
              3D<span className="text-[#66d9cb]">SFERA</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/onboarding"
              className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/85 transition hover:border-white/35 hover:bg-white/10"
            >
              {t.backToOnboarding}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/85 transition hover:border-white/35 hover:bg-white/10"
            >
              {t.backToHome}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:px-8 lg:py-10">
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(155deg,rgba(10,15,23,0.95),rgba(11,16,26,0.92))] p-6 shadow-[0_16px_44px_rgba(0,0,0,0.4)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#66d9cb]">
              Supplier Intake
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#c9c3b9] sm:text-base">
              {t.subtitle}
            </p>

            <div className="mt-5 rounded-2xl border border-[#66d9cb]/30 bg-[#66d9cb]/10 p-4">
              <p className="text-sm font-semibold text-[#8bf0e3]">{t.tipsTitle}</p>
              <ul className="mt-3 space-y-2 text-sm text-[#c8efe9]">
                {PACKAGE_TIPS[language].map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#66d9cb]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-[#f6ba4f]/30 bg-[#f6ba4f]/10 p-4">
              <p className="text-sm font-semibold text-[#ffd78f]">{t.fallbackTitle}</p>
              <p className="mt-2 text-sm text-[#ead9b6]">{t.fallbackDescription}</p>
              <a
                href={mailtoUrl}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#f6ba4f]/45 bg-[#f6ba4f]/15 px-4 py-2 text-xs font-semibold text-[#ffe5b2] transition hover:bg-[#f6ba4f]/28"
              >
                <Mail className="h-3.5 w-3.5" />
                {t.sendEmail}: {INTAKE_EMAIL}
              </a>
            </div>
          </div>

          {isAuthLoading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#66d9cb]" />
            </div>
          ) : !isAuthenticated ? (
            <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6">
              <p className="text-sm text-red-100">{authError || t.signInRequired}</p>
              <Link
                href="/login"
                className="mt-3 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                {t.signIn}
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/10 bg-[linear-gradient(155deg,rgba(10,15,23,0.95),rgba(11,16,26,0.92))] p-6 shadow-[0_16px_44px_rgba(0,0,0,0.4)]"
            >
              <div className="mb-5 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-[#66d9cb]" />
                <h2 className="text-lg font-semibold">{t.uploadSection}</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {fieldConfig.map((field) => {
                  const label =
                    PACKAGE_FIELD_LABELS[language][field.key] ?? t.fields[field.key];
                  const isRequired = !!field.required;
                  const baseClass =
                    "w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#66d9cb]/65";
                  const wrapperClass = field.wide ? "sm:col-span-2" : "";

                  return (
                    <label key={field.key} className={`space-y-1.5 text-sm ${wrapperClass}`}>
                      <span>
                        {label}
                        {isRequired ? ` (${t.required})` : ""}
                      </span>
                      {field.textarea ? (
                        <textarea
                          value={form[field.key]}
                          rows={3}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          className={baseClass}
                        />
                      ) : (
                        <input
                          required={isRequired}
                          type={field.type || "text"}
                          value={form[field.key]}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          className={baseClass}
                        />
                      )}
                    </label>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-slate-400">
                {PACKAGE_SCOPE_HINT[language]}
              </p>

              <div className="mt-5 rounded-2xl border border-white/15 bg-black/20 p-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-[#66d9cb]" />
                    {t.archiveLabel} ({t.required})
                  </span>
                  <input
                    key={fileInputKey}
                    required
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={(event) => setArchiveFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-[#66d9cb] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#06120f]"
                  />
                  <span className="text-xs text-slate-400">{t.archiveHint}</span>
                </label>
              </div>

              {submitError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2.5 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#66d9cb] px-5 py-3 text-sm font-semibold text-[#06120f] transition hover:bg-[#87ebe0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? t.submitting : t.submit}
              </button>
            </form>
          )}
        </section>

        <aside className="rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(11,16,25,0.95),rgba(8,12,20,0.95))] p-6 shadow-[0_16px_44px_rgba(0,0,0,0.4)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t.historySection}</h2>
            {isAuthenticated && (
              <button
                onClick={() => void loadSubmissions(token)}
                disabled={isLoadingSubmissions}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50"
              >
                {t.refresh}
              </button>
            )}
          </div>

          {historyError && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {historyError}
            </div>
          )}

          {isLoadingSubmissions ? (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-[#66d9cb]" />
              {t.refresh}
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
              {t.noSubmissions}
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => {
                const status = t.statuses[submission.status] ?? t.statuses.received;
                const statusClass =
                  submission.status === "approved"
                    ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-100"
                    : submission.status === "needs_update"
                    ? "border-amber-400/40 bg-amber-500/12 text-amber-100"
                    : submission.status === "in_review"
                    ? "border-cyan-400/40 bg-cyan-500/12 text-cyan-100"
                    : "border-white/20 bg-white/10 text-slate-100";

                return (
                  <article
                    key={submission.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {submission.productName || submission.sku}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClass}`}
                      >
                        {status}
                      </span>
                    </div>
                    {submission.sku ? (
                      <p className="mt-1 text-xs text-slate-400">Reference: {submission.sku}</p>
                    ) : null}
                    {submission.colors ? (
                      <p className="mt-1 text-xs text-slate-400">Categories: {submission.colors}</p>
                    ) : null}
                    {submission.stockQty ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Approx products: {submission.stockQty}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">
                      {t.createdAt}: {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
