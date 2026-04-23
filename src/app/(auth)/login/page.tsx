'use client';

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { clearServerAuthSession, syncServerAuthSession } from "@/lib/auth/browser";
import {
  getAudienceFromRole,
  getDefaultRedirectPath,
  getUserRole,
  isRoleAllowedForPath,
  normalizeNextPath,
  type AppAudience,
} from "@/lib/auth/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMethod = "password" | "otp";
type OtpVerificationType = "email" | "signup";

const nameFromEmail = (email: string) => {
  const localPart = email.split("@")[0] ?? "Guest";
  return localPart
    .split(/[._-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const slugFromEmail = (email: string, fallback: string) => {
  const localPart = (email.split("@")[0] ?? "").toLowerCase();
  const slug = localPart.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
};

const getSupplierMetadata = (email: string) => {
  const supplierName = nameFromEmail(email) || "Supplier";
  const supplierSlug = slugFromEmail(email, "supplier");

  return {
    supplier_id: `sup_${supplierSlug}`,
    supplier_name: supplierName,
    pavilion_id: `pav_${supplierSlug}`,
    pavilion_name: `${supplierName} Pavilion`,
    role: "supplier",
  } as const;
};

const getAudienceMetadata = (audience: AppAudience, email: string) => {
  if (audience === "supplier") {
    return getSupplierMetadata(email);
  }

  return {
    role: "buyer",
    full_name: nameFromEmail(email),
  };
};

const copy = {
  en: {
    visitorTab: "Visitor Access",
    supplierTab: "Supplier Access",
    visitorSubtitle: "Sign in to unlock the exhibition experience.",
    supplierSubtitle: "Authentication for the supplier dashboard and live inquiry console.",
    email: "Email address",
    password: "Password",
    otpCode: "Email code",
    passwordMethod: "Password",
    otpMethod: "Email code or link",
    signIn: "Sign in",
    signUp: "Create account",
    sendOtp: "Send code",
    resendOtp: "Resend code",
    verifyOtp: "Verify code",
    loading: "Processing...",
    passwordSignUpVisitor: "Create a visitor account with email and password.",
    passwordSignUpSupplier: "Create a supplier account for your pavilion.",
    otpHintVisitor: "Email OTP can sign in existing visitors or create a new visitor account automatically.",
    otpHintSupplier: "Email OTP works only for existing supplier accounts.",
    otpSent:
      "Check your inbox. Enter the code here, or use the magic link if your Supabase email template sends one.",
    otpCodeHint: "Enter the code from your email. If a magic link was sent instead, open it and this page will continue automatically.",
    checkEmail: "Account created. If email confirmation is enabled, confirm your inbox first.",
    missingConfig:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    defaultError: "Authentication failed. Please try again.",
    invalidCredentials: "This email does not exist, or the password is incorrect.",
    networkError: "Couldn't reach the authentication service. Check your connection and try again.",
    modeSignIn: "Already have an account?",
    modeSignUp: "Need an account?",
    switchToSignIn: "Sign in",
    switchToSignUp: "Create account",
    otpDelivered: "We sent a sign-in email.",
    newSupplier: "New supplier?",
    apply: "Apply for access",
  },
  ru: {
    visitorTab: "Доступ посетителя",
    supplierTab: "Доступ поставщика",
    visitorSubtitle: "Войдите, чтобы открыть выставочный опыт.",
    supplierSubtitle: "Авторизация для панели поставщика и live-очереди запросов.",
    email: "Email",
    password: "Пароль",
    otpCode: "Код из email",
    passwordMethod: "Пароль",
    otpMethod: "Код или ссылка по email",
    signIn: "Войти",
    signUp: "Создать аккаунт",
    sendOtp: "Отправить код",
    resendOtp: "Отправить снова",
    verifyOtp: "Подтвердить код",
    loading: "Обработка...",
    passwordSignUpVisitor: "Создайте аккаунт посетителя по email и паролю.",
    passwordSignUpSupplier: "Создайте аккаунт поставщика для своего павильона.",
    otpHintVisitor:
      "Вход по email-коду подходит для посетителей и может автоматически создать новый аккаунт.",
    otpHintSupplier: "Вход по email-коду доступен только для существующих аккаунтов поставщиков.",
    otpSent:
      "Проверьте почту. Введите код здесь или используйте magic link, если именно его отправляет шаблон Supabase.",
    otpCodeHint:
      "Введите код из письма. Если пришла только magic link-ссылка, откройте ее и страница продолжит вход автоматически.",
    checkEmail: "Аккаунт создан. Если подтверждение email включено, сначала подтвердите почту.",
    missingConfig:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    defaultError: "Ошибка авторизации. Повторите попытку.",
    invalidCredentials: "Такой email отсутствует, либо пароль введён неверно.",
    networkError: "Не удалось связаться с сервисом авторизации. Проверьте подключение и попробуйте снова.",
    modeSignIn: "Уже есть аккаунт?",
    modeSignUp: "Нужен аккаунт?",
    switchToSignIn: "Войти",
    switchToSignUp: "Создать аккаунт",
    otpDelivered: "Мы отправили письмо для входа.",
    newSupplier: "Новый поставщик?",
    apply: "Подать заявку",
  },
  zh: {
    visitorTab: "访客访问",
    supplierTab: "供应商访问",
    visitorSubtitle: "登录后即可进入展厅体验。",
    supplierSubtitle: "用于供应商后台和实时询盘控制台的身份验证。",
    email: "邮箱地址",
    password: "密码",
    otpCode: "邮箱验证码",
    passwordMethod: "密码",
    otpMethod: "邮箱验证码或链接",
    signIn: "登录",
    signUp: "创建账号",
    sendOtp: "发送验证码",
    resendOtp: "重新发送",
    verifyOtp: "验证验证码",
    loading: "处理中...",
    passwordSignUpVisitor: "使用邮箱和密码创建访客账号。",
    passwordSignUpSupplier: "为您的展馆创建供应商账号。",
    otpHintVisitor: "邮箱 OTP 适用于访客登录，也可以自动创建新访客账号。",
    otpHintSupplier: "邮箱 OTP 仅适用于现有供应商账号。",
    otpSent: "请检查收件箱。在这里输入验证码，或直接使用邮件中的 magic link。",
    otpCodeHint: "输入邮件中的验证码。如果邮件只包含 magic link，打开链接后此页会自动继续登录。",
    checkEmail: "账号已创建。如启用了邮箱确认，请先完成邮箱验证。",
    missingConfig:
      "Supabase 未配置。请添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    defaultError: "认证失败，请重试。",
    invalidCredentials: "该邮箱不存在，或密码输入错误。",
    networkError: "无法连接到认证服务。请检查网络后重试。",
    modeSignIn: "已有账号？",
    modeSignUp: "需要新账号？",
    switchToSignIn: "登录",
    switchToSignUp: "创建账号",
    otpDelivered: "登录邮件已发送。",
    newSupplier: "新供应商？",
    apply: "申请访问权限",
  },
} as const;

function LoginPageSkeleton() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090b10] px-4 text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#66d9cb]/20 blur-3xl mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#f6ba4f]/18 blur-3xl mix-blend-screen animate-pulse delay-700" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="sfera-card z-10 h-[34rem] w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl" />
    </div>
  );
}

const getAuthRedirectOrigin = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // Fall back to the current browser origin when the override is invalid.
    }
  }

  if (typeof window === "undefined") return undefined;
  return window.location.origin;
};

function LoginPageContent() {
  const { language } = useLanguage();
  const t = copy[language];
  const searchParams = useSearchParams();

  const roleParam = searchParams.get("role");
  const requestedAudience: AppAudience = roleParam === "supplier" ? "supplier" : "user";
  const requestedNext = searchParams.get("next");

  const [audience, setAudience] = useState<AppAudience>(requestedAudience);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(requestedAudience === "user");
  const [otpRequested, setOtpRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    setAudience(requestedAudience);
    setIsSignUpMode(requestedAudience === "user");
    setAuthMethod("password");
    setOtpRequested(false);
    setOtpCode("");
    setErrorMessage(null);
    setInfoMessage(null);
  }, [requestedAudience]);

  const redirectPath = useMemo(() => {
    const fallback = getDefaultRedirectPath(audience);
    return normalizeNextPath(requestedNext, fallback);
  }, [audience, requestedNext]);

  const buildEmailRedirectTo = useCallback(() => {
    const origin = getAuthRedirectOrigin();
    if (!origin) return undefined;

    const url = new URL("/login", origin);
    url.searchParams.set("role", audience);
    url.searchParams.set("next", redirectPath);
    return url.toString();
  }, [audience, redirectPath]);

  const resetMessages = useCallback(() => {
    setErrorMessage(null);
    setInfoMessage(null);
  }, []);

  const resolveRedirectPath = useCallback(
    (session: Session) => {
      const role = getUserRole(session.user);
      if (isRoleAllowedForPath(role, redirectPath)) {
        return redirectPath;
      }

      return getDefaultRedirectPath(getAudienceFromRole(role));
    },
    [redirectPath]
  );

  const finishAuthentication = useCallback(
    async (session: Session) => {
      await syncServerAuthSession(session);
      window.location.replace(resolveRedirectPath(session));
    },
    [resolveRedirectPath]
  );

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    const bootstrapSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session) {
          const sessionRole = getUserRole(session.user);
          const isSupplierLoginRequest = requestedAudience === "supplier";

          if (isSupplierLoginRequest && sessionRole !== "supplier") {
            try {
              await supabase.auth.signOut();
            } catch {
              // Ignore and still clear the server session cookie.
            }

            try {
              await clearServerAuthSession();
            } catch {
              // Ignore and continue showing the supplier login form.
            }

            return;
          }

          await finishAuthentication(session);
          return;
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!nextSession) return;

          const nextSessionRole = getUserRole(nextSession.user);
          const isSupplierLoginRequest = requestedAudience === "supplier";

          if (isSupplierLoginRequest && nextSessionRole !== "supplier") {
            return;
          }

          void finishAuthentication(nextSession).catch(() => {
            setErrorMessage(t.defaultError);
            setIsSubmitting(false);
          });
        });

        unsubscribe = () => {
          authListener.subscription.unsubscribe();
        };
      } catch {
        // The page already surfaces missing Supabase config during submit.
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [finishAuthentication, requestedAudience, t.defaultError]);

  const otpSubmitLabel = useMemo(() => {
    if (isSubmitting) return t.loading;
    return otpRequested ? t.verifyOtp : t.sendOtp;
  }, [isSubmitting, otpRequested, t.loading, t.sendOtp, t.verifyOtp]);

  const passwordSubmitLabel = useMemo(() => {
    if (isSubmitting) return t.loading;
    return isSignUpMode ? t.signUp : t.signIn;
  }, [isSignUpMode, isSubmitting, t.loading, t.signIn, t.signUp]);

  const syncAndRedirect = useCallback(
    async (session: Session | null) => {
      if (!session) {
        throw new Error(t.defaultError);
      }

      const sessionRole = getUserRole(session.user);
      if (requestedAudience === "supplier" && sessionRole !== "supplier") {
        try {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.signOut();
        } catch {
          // Ignore and still clear the server session cookie.
        }

        try {
          await clearServerAuthSession();
        } catch {
          // Ignore and still surface the auth error.
        }

        throw new Error(
          language === "ru"
            ? "Этот аккаунт не распознан как аккаунт поставщика."
            : language === "zh"
              ? "这个账号没有被识别为供应商账号。"
              : "This account is not recognized as a supplier account."
        );
      }

      await finishAuthentication(session);
    },
    [finishAuthentication, language, requestedAudience, t.defaultError]
  );

  const sendOtp = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: audience === "user",
        emailRedirectTo: buildEmailRedirectTo(),
        data: audience === "user" ? getAudienceMetadata(audience, email) : undefined,
      },
    });

    if (error) throw error;

    setOtpRequested(true);
    setInfoMessage(otpRequested ? t.otpSent : `${t.otpDelivered} ${t.otpSent}`);
  }, [audience, buildEmailRedirectTo, email, otpRequested, t.otpDelivered, t.otpSent]);

  const verifyOtp = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const attemptTypes: OtpVerificationType[] =
      audience === "user" ? ["email", "signup"] : ["email"];

    let lastError: Error | null = null;

    for (const type of attemptTypes) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type,
      });

      if (!error && data.session) {
        await syncAndRedirect(data.session);
        return;
      }

      lastError = error ?? new Error(t.defaultError);
    }

    throw lastError ?? new Error(t.defaultError);
  }, [audience, email, otpCode, syncAndRedirect, t.defaultError]);

  const handlePasswordSubmit = async () => {
    const supabase = getSupabaseBrowserClient();

    if (isSignUpMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: getAudienceMetadata(audience, email),
          emailRedirectTo: buildEmailRedirectTo(),
        },
      });

      if (error) throw error;

      if (data.session) {
        await syncAndRedirect(data.session);
        return;
      }

      setInfoMessage(t.checkEmail);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    await syncAndRedirect(data.session);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    let supabaseAvailable = true;
    try {
      getSupabaseBrowserClient();
    } catch {
      supabaseAvailable = false;
    }

    if (!supabaseAvailable) {
      setErrorMessage(t.missingConfig);
      return;
    }

    setIsSubmitting(true);

    try {
      if (authMethod === "otp") {
        if (otpRequested) {
          await verifyOtp();
        } else {
          await sendOtp();
        }
      } else {
        await handlePasswordSubmit();
      }
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : '';
      const lower = rawMessage.toLowerCase();
      // Map common Supabase / network errors to friendly universal copy.
      // "Invalid login credentials" is what Supabase returns for both
      // "email doesn't exist" and "wrong password" — we deliberately don't
      // tell the user which it was (credential-stuffing protection).
      let friendly = rawMessage || t.defaultError;
      if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        friendly = t.invalidCredentials;
      } else if (
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('network error') ||
        lower.includes('load failed')
      ) {
        friendly = t.networkError;
      }
      setErrorMessage(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hintText =
    authMethod === "otp"
      ? audience === "supplier"
        ? t.otpHintSupplier
        : t.otpHintVisitor
      : isSignUpMode
        ? audience === "supplier"
          ? t.passwordSignUpSupplier
          : t.passwordSignUpVisitor
        : null;

  const subtitle =
    audience === "supplier" ? t.supplierSubtitle : t.visitorSubtitle;

  const handleAudienceChange = (nextAudience: AppAudience) => {
    setAudience(nextAudience);
    setAuthMethod("password");
    setIsSignUpMode(nextAudience === "user");
    setOtpRequested(false);
    setOtpCode("");
    resetMessages();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090b10] px-4 text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#66d9cb]/20 blur-3xl mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#f6ba4f]/18 blur-3xl mix-blend-screen animate-pulse delay-700" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="sfera-card z-10 w-full max-w-md space-y-6 rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h2 className="bg-gradient-to-r from-[#66d9cb] to-[#f6ba4f] bg-clip-text text-4xl font-black tracking-tighter text-transparent">
              3DSFERA
            </h2>
          </Link>
          <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => void handleAudienceChange("user")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              audience === "user"
                ? "bg-[#66d9cb] text-[#04110f]"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            {t.visitorTab}
          </button>
          <button
            type="button"
            onClick={() => void handleAudienceChange("supplier")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              audience === "supplier"
                ? "bg-[#f6ba4f] text-[#1a1204]"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            {t.supplierTab}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMethod("password");
              setOtpRequested(false);
              setOtpCode("");
              resetMessages();
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              authMethod === "password"
                ? "bg-white/12 text-white"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            {t.passwordMethod}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod("otp");
              setOtpRequested(false);
              setOtpCode("");
              resetMessages();
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              authMethod === "otp"
                ? "bg-white/12 text-white"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            {t.otpMethod}
          </button>
        </div>

        {hintText && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/8 px-3 py-2 text-sm text-cyan-100">
            {hintText}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
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
                className="block w-full rounded-lg border-0 bg-white/5 px-3 py-2.5 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 transition focus:ring-2 focus:ring-[#66d9cb] sm:text-sm sm:leading-6"
                placeholder="name@example.com"
              />
            </div>

            {authMethod === "password" ? (
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
                  className="block w-full rounded-lg border-0 bg-white/5 px-3 py-2.5 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 transition focus:ring-2 focus:ring-[#66d9cb] sm:text-sm sm:leading-6"
                  placeholder="********"
                />
              </div>
            ) : otpRequested ? (
              <div>
                <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-gray-300">
                  {t.otpCode}
                </label>
                <input
                  id="otp-code"
                  name="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.trim())}
                  className="block w-full rounded-lg border-0 bg-white/5 px-3 py-2.5 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 transition focus:ring-2 focus:ring-[#66d9cb] sm:text-sm sm:leading-6"
                  placeholder="123456"
                />
                <p className="mt-2 text-xs text-gray-400">{t.otpCodeHint}</p>
              </div>
            ) : null}
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

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="sfera-btn-primary group relative flex w-full justify-center rounded-lg px-3 py-3 text-sm font-semibold transition shadow-[0_0_20px_rgba(102,217,203,0.3)] hover:shadow-[0_0_30px_rgba(102,217,203,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authMethod === "otp" ? otpSubmitLabel : passwordSubmitLabel}
            </button>

            {authMethod === "otp" && otpRequested && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  resetMessages();
                  setIsSubmitting(true);
                  void sendOtp()
                    .catch((error: unknown) => {
                      const rawMessage = error instanceof Error ? error.message : '';
                      const lower = rawMessage.toLowerCase();
                      let friendly = rawMessage || t.defaultError;
                      if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
                        friendly = t.invalidCredentials;
                      } else if (
                        lower.includes('failed to fetch') ||
                        lower.includes('networkerror') ||
                        lower.includes('network error') ||
                        lower.includes('load failed')
                      ) {
                        friendly = t.networkError;
                      }
                      setErrorMessage(friendly);
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
                className="flex w-full justify-center rounded-lg border border-white/15 px-3 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t.loading : t.resendOtp}
              </button>
            )}
          </div>
        </form>

        {authMethod === "password" && (
          <div className="text-center text-xs text-gray-500">
            {isSignUpMode ? t.modeSignIn : t.modeSignUp}{" "}
            <button
              type="button"
              onClick={() => {
                setOtpRequested(false);
                setOtpCode("");
                resetMessages();
                setIsSignUpMode((previous) => !previous);
              }}
              className="text-gray-300 hover:underline"
            >
              {isSignUpMode ? t.switchToSignIn : t.switchToSignUp}
            </button>
          </div>
        )}

        <div className="text-center text-xs text-gray-500">
          {t.newSupplier}{" "}
          <Link href="/supplier/upload" className="text-gray-300 hover:underline">
            {t.apply}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}
