'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const copy = {
  en: {
    subtitle: "Supplier authentication for the exhibition dashboard",
    email: "Email address",
    password: "Password",
    remember: "Remember me",
    forgot: "Forgot password?",
    signIn: "Sign in to Dashboard",
    signUp: "Create Supplier Account",
    modeSignIn: "Already have an account?",
    modeSignUp: "Need a supplier account?",
    switchToSignIn: "Sign in",
    switchToSignUp: "Create account",
    loading: "Processing...",
    signupHint: "Create a supplier account for Nonagon Tech pavilion access.",
    checkEmail: "Account created. If email confirmation is enabled, confirm your inbox first.",
    missingConfig:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    defaultError: "Authentication failed. Please try again.",
    newSupplier: "New supplier?",
    apply: "Apply for access",
  },
  ru: {
    subtitle: "Авторизация поставщика для панели выставки",
    email: "Email",
    password: "Пароль",
    remember: "Запомнить меня",
    forgot: "Забыли пароль?",
    signIn: "Войти в кабинет",
    signUp: "Создать аккаунт поставщика",
    modeSignIn: "Уже есть аккаунт?",
    modeSignUp: "Нужен аккаунт поставщика?",
    switchToSignIn: "Войти",
    switchToSignUp: "Создать аккаунт",
    loading: "Обработка...",
    signupHint: "Создайте аккаунт поставщика для павильона Nonagon Tech.",
    checkEmail:
      "Аккаунт создан. Если подтверждение email включено, сначала подтвердите почту.",
    missingConfig:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    defaultError: "Ошибка авторизации. Повторите попытку.",
    newSupplier: "Новый поставщик?",
    apply: "Подать заявку",
  },
  zh: {
    subtitle: "供应商展厅后台登录",
    email: "邮箱地址",
    password: "密码",
    remember: "记住我",
    forgot: "忘记密码？",
    signIn: "登录控制台",
    signUp: "创建供应商账号",
    modeSignIn: "已有账号？",
    modeSignUp: "需要供应商账号？",
    switchToSignIn: "登录",
    switchToSignUp: "创建账号",
    loading: "处理中...",
    signupHint: "创建用于 Nonagon Tech 展馆的供应商账号。",
    checkEmail: "账号已创建。如启用了邮箱确认，请先完成邮箱验证。",
    missingConfig:
      "Supabase 未配置。请添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    defaultError: "认证失败，请重试。",
    newSupplier: "新供应商？",
    apply: "申请访问权限",
  },
} as const;

export default function LoginPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const router = useRouter();

  const [email, setEmail] = useState("nonagon@sfera3d.com");
  const [password, setPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    if (isSubmitting) return t.loading;
    return isSignUpMode ? t.signUp : t.signIn;
  }, [isSignUpMode, isSubmitting, t.loading, t.signIn, t.signUp]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setErrorMessage(t.missingConfig);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUpMode) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              supplier_id: "sup_nonagon",
              supplier_name: "Nonagon Tech",
              pavilion_id: "pav_nonagon",
              role: "supplier",
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push("/supplier/dashboard");
          router.refresh();
          return;
        }

        setInfoMessage(t.checkEmail);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      router.push("/supplier/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.defaultError;
      setErrorMessage(message || t.defaultError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl mix-blend-screen animate-pulse delay-700" />
      </div>

      <div className="z-10 w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h2 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-4xl font-black tracking-tighter text-transparent">
              3DSFERA
            </h2>
          </Link>
          <p className="mt-2 text-sm text-gray-400">{t.subtitle}</p>
          {isSignUpMode && <p className="mt-2 text-xs text-cyan-300">{t.signupHint}</p>}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="mb-1 block text-sm font-medium text-gray-300">
                {t.email}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="block w-full rounded-lg border-0 bg-white/5 px-3 py-2.5 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 transition focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"
                placeholder="supplier@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
                {t.password}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUpMode ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-lg border-0 bg-white/5 px-3 py-2.5 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 transition focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"
                placeholder="********"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                {t.remember}
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-400 transition hover:text-indigo-300">
                {t.forgot}
              </a>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {infoMessage && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              {infoMessage}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500">
          {isSignUpMode ? t.modeSignIn : t.modeSignUp}{" "}
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setInfoMessage(null);
              setIsSignUpMode((previous) => !previous);
            }}
            className="text-gray-300 hover:underline"
          >
            {isSignUpMode ? t.switchToSignIn : t.switchToSignUp}
          </button>
        </div>

        <div className="text-center text-xs text-gray-500">
          {t.newSupplier}{" "}
          <Link href="#" className="text-gray-300 hover:underline">
            {t.apply}
          </Link>
        </div>
      </div>
    </div>
  );
}
