'use client';

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy = {
  en: {
    subtitle: "Access your immersive exhibition account",
    email: "Email address",
    password: "Password",
    remember: "Remember me",
    forgot: "Forgot password?",
    signIn: "Sign in to Dashboard",
    newSupplier: "New supplier?",
    apply: "Apply for access",
  },
  ru: {
    subtitle: "Вход в иммерсивный аккаунт выставки",
    email: "Email",
    password: "Пароль",
    remember: "Запомнить меня",
    forgot: "Забыли пароль?",
    signIn: "Войти в кабинет",
    newSupplier: "Новый поставщик?",
    apply: "Подать заявку",
  },
  zh: {
    subtitle: "登录你的沉浸式展览账户",
    email: "邮箱地址",
    password: "密码",
    remember: "记住我",
    forgot: "忘记密码？",
    signIn: "登录控制台",
    newSupplier: "新供应商？",
    apply: "申请访问权限",
  },
} as const;

export default function LoginPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl mix-blend-screen animate-pulse delay-700"></div>
      </div>

      <div className="z-10 w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h2 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-4xl font-black tracking-tighter text-transparent">
              3DSFERA
            </h2>
          </Link>
          <p className="mt-2 text-sm text-gray-400">{t.subtitle}</p>
        </div>

        <form className="mt-8 space-y-6" action="#">
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
                className="block w-full rounded-lg border-0 bg-white/5 px-3 py-2.5 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 transition focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"
                placeholder="you@example.com"
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
                autoComplete="current-password"
                required
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

          <div>
            <Link
              href="/experience"
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              {t.signIn}
            </Link>
          </div>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500">
          {t.newSupplier} <Link href="#" className="text-gray-300 hover:underline">{t.apply}</Link>
        </div>
      </div>
    </div>
  );
}
