'use client';

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { clearServerAuthSession, syncServerAuthSession } from "@/lib/auth/browser";
import {
  getAudienceFromRole,
  getDefaultRedirectPath,
  getPavilionStaffRedirect,
  getUserRole,
  isRoleAllowedForPath,
  normalizeNextPath,
  type AppAudience,
} from "@/lib/auth/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMethod = "password" | "otp";

const isInvalidOtpError = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("token has expired") ||
    lower.includes("token is expired") ||
    lower.includes("expired or invalid") ||
    lower.includes("invalid token") ||
    lower.includes("otp") && lower.includes("invalid") ||
    lower.includes("email link is invalid") ||
    lower.includes("verification") && lower.includes("invalid")
  );
};

const copy = {
  en: {
    visitorTab: "Visitor Access",
    playerTab: "Player Access",
    supplierTab: "Supplier Access",
    visitorSubtitle: "Sign in to unlock the exhibition experience.",
    playerSubtitle: "Sign in to enter the live scene. Your player dashboard is available from the scene menu.",
    supplierSubtitle: "Authentication for the supplier dashboard and live inquiry console.",
    email: "Email address",
    password: "Password",
    otpCode: "Email code",
    passwordMethod: "Password",
    otpMethod: "Email code or link",
    signIn: "Sign in",
    sendOtp: "Send code",
    resendOtp: "Resend code",
    verifyOtp: "Verify code",
    loading: "Processing...",
    playerPasswordHint: "Use your player email and password to enter the scene. New player accounts are created by the Sfera team.",
    otpHintVisitor: "Email OTP works only for existing visitor accounts.",
    otpHintSupplier: "Email OTP works only for existing supplier accounts.",
    otpSent:
      "Check your inbox. Enter the code here, or use the magic link if your Supabase email template sends one.",
    otpCodeHint: "Enter the code from your email. If a magic link was sent instead, open it and this page will continue automatically.",
    missingConfig:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    defaultError: "Authentication failed. Please try again.",
    invalidCredentials: "This email does not exist, or the password is incorrect.",
    invalidOtp: "This code is invalid or expired. Use the newest code from your email, or request a new one.",
    networkError: "Couldn't reach the authentication service. Check your connection and try again.",
    rateLimited: "The email provider is temporarily blocking another code request. Wait about a minute, then press Resend code again. Also check spam.",
    otpDelivered: "We sent a sign-in email.",
    forgotPassword: "Forgot password?",
    resetPasswordSent: "Password reset email sent. Open the link, choose a new password, then continue.",
    enterEmailForReset: "Enter your email first, then request a password reset.",
    newPassword: "New password",
    updatePassword: "Update password",
    passwordUpdated: "Password updated. Sign in with the new password.",
    passwordResetHint: "Choose a new password for this account.",
    backToSignIn: "Back to sign in",
    newSupplier: "New supplier?",
    apply: "Apply for access",
    newPlayer: "Need a player account?",
    preRegister: "Pre-register",
  },
  ru: {
    visitorTab: "Доступ посетителя",
    playerTab: "Доступ игрока",
    supplierTab: "Доступ поставщика",
    visitorSubtitle: "Войдите, чтобы открыть цифровой опыт.",
    playerSubtitle: "Войдите, чтобы попасть в live-сцену. Панель игрока доступна из меню сцены.",
    supplierSubtitle: "Авторизация для панели поставщика и live-очереди запросов.",
    email: "Email",
    password: "Пароль",
    otpCode: "Код из email",
    passwordMethod: "Пароль",
    otpMethod: "Код или ссылка по email",
    signIn: "Войти",
    sendOtp: "Отправить код",
    resendOtp: "Отправить снова",
    verifyOtp: "Подтвердить код",
    loading: "Обработка...",
    playerPasswordHint: "Используйте email и пароль игрока, чтобы войти в сцену. Новые аккаунты игроков создает команда Sfera.",
    otpHintVisitor:
      "Вход по email-коду доступен только для существующих аккаунтов посетителей.",
    otpHintSupplier: "Вход по email-коду доступен только для существующих аккаунтов поставщиков.",
    otpSent:
      "Проверьте почту. Введите код здесь или используйте magic link, если именно его отправляет шаблон Supabase.",
    otpCodeHint:
      "Введите код из письма. Если пришла только magic link-ссылка, откройте ее и страница продолжит вход автоматически.",
    missingConfig:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    defaultError: "Ошибка авторизации. Повторите попытку.",
    invalidCredentials: "Такой email отсутствует, либо пароль введён неверно.",
    invalidOtp: "Этот код неверный или устарел. Используйте самый новый код из email или запросите новый.",
    networkError: "Не удалось связаться с сервисом авторизации. Проверьте подключение и попробуйте снова.",
    rateLimited: "Почтовый сервис временно блокирует повторный код. Подождите около минуты, затем нажмите «Отправить снова». Проверьте также спам.",
    otpDelivered: "Мы отправили письмо для входа.",
    forgotPassword: "Забыли пароль?",
    resetPasswordSent: "Письмо для сброса пароля отправлено. Откройте ссылку, задайте новый пароль и продолжайте.",
    enterEmailForReset: "Сначала введите email, затем запросите сброс пароля.",
    newPassword: "Новый пароль",
    updatePassword: "Обновить пароль",
    passwordUpdated: "Пароль обновлен. Войдите с новым паролем.",
    passwordResetHint: "Задайте новый пароль для этого аккаунта.",
    backToSignIn: "Назад ко входу",
    newSupplier: "Новый поставщик?",
    apply: "Подать заявку",
    newPlayer: "Нужен аккаунт игрока?",
    preRegister: "Предварительная регистрация",
  },
  zh: {
    visitorTab: "访客访问",
    playerTab: "玩家访问",
    supplierTab: "供应商访问",
    visitorSubtitle: "登录后即可进入展厅体验。",
    playerSubtitle: "登录后进入实时场景。玩家仪表盘可从场景菜单打开。",
    supplierSubtitle: "用于供应商后台和实时询盘控制台的身份验证。",
    email: "邮箱地址",
    password: "密码",
    otpCode: "邮箱验证码",
    passwordMethod: "密码",
    otpMethod: "邮箱验证码或链接",
    signIn: "登录",
    sendOtp: "发送验证码",
    resendOtp: "重新发送",
    verifyOtp: "验证验证码",
    loading: "处理中...",
    playerPasswordHint: "使用玩家邮箱和密码进入场景。新玩家账号由 Sfera 团队创建。",
    otpHintVisitor: "邮箱 OTP 仅适用于现有访客账号。",
    otpHintSupplier: "邮箱 OTP 仅适用于现有供应商账号。",
    otpSent: "请检查收件箱。在这里输入验证码，或直接使用邮件中的 magic link。",
    otpCodeHint: "输入邮件中的验证码。如果邮件只包含 magic link，打开链接后此页会自动继续登录。",
    missingConfig:
      "Supabase 未配置。请添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    defaultError: "认证失败，请重试。",
    invalidCredentials: "该邮箱不存在，或密码输入错误。",
    invalidOtp: "验证码无效或已过期。请使用邮箱中最新的验证码，或重新请求一个。",
    networkError: "无法连接到认证服务。请检查网络后重试。",
    rateLimited: "邮件服务暂时阻止再次发送验证码。请等待约一分钟后重新发送，也请检查垃圾邮件。",
    otpDelivered: "登录邮件已发送。",
    forgotPassword: "忘记密码？",
    resetPasswordSent: "密码重置邮件已发送。请打开链接，设置新密码后继续。",
    enterEmailForReset: "请先输入邮箱，然后请求重置密码。",
    newPassword: "新密码",
    updatePassword: "更新密码",
    passwordUpdated: "密码已更新。请使用新密码登录。",
    passwordResetHint: "为此账号设置新密码。",
    backToSignIn: "返回登录",
    newSupplier: "新供应商？",
    apply: "申请访问权限",
    newPlayer: "需要玩家账户？",
    preRegister: "预注册",
  },
} as const;

function LoginPageSkeleton() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#090b10] px-3 py-6 text-white sm:px-4">
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

const isOtpRateLimitError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("rate limit") ||
    message.includes("for security purposes") ||
    message.includes("you can only request")
  );
};

const isPasswordRecoveryUrl = () => {
  if (typeof window === "undefined") return false;

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("mode") === "recovery" || hash.get("type") === "recovery";
};

function LoginPageContent() {
  const { language } = useLanguage();
  const t = copy[language];
  const searchParams = useSearchParams();

  const roleParam = searchParams.get("role");
  const requestedAudience: AppAudience = roleParam === "supplier" ? "supplier" : "user";
  const requestedNext = searchParams.get("next");
  const normalizedRequestedNext = normalizeNextPath(requestedNext, "");
  const isPlayerLoginRequest =
    roleParam === "player" ||
    normalizedRequestedNext.startsWith("/player/dashboard") ||
    (normalizedRequestedNext.startsWith("/fastview") && normalizedRequestedNext.includes("mode=player"));

  const [audience, setAudience] = useState<AppAudience>(requestedAudience);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    setAudience(requestedAudience);
    setAuthMethod("password");
    setOtpRequested(false);
    setOtpCode("");
    setIsPasswordResetMode(false);
    setErrorMessage(null);
    setInfoMessage(null);
  }, [isPlayerLoginRequest, requestedAudience]);

  const redirectPath = useMemo(() => {
    const fallback = getDefaultRedirectPath(audience);
    return normalizeNextPath(requestedNext, fallback);
  }, [audience, requestedNext]);

  const buildEmailRedirectTo = useCallback(() => {
    const origin = getAuthRedirectOrigin();
    if (!origin) return undefined;

    const url = new URL("/login", origin);
    url.searchParams.set("role", isPlayerLoginRequest ? "player" : audience);
    url.searchParams.set("next", redirectPath);
    return url.toString();
  }, [audience, isPlayerLoginRequest, redirectPath]);

  const buildPasswordRecoveryRedirectTo = useCallback(() => {
    const origin = getAuthRedirectOrigin();
    if (!origin) return undefined;

    const url = new URL("/login", origin);
    url.searchParams.set("role", isPlayerLoginRequest ? "player" : audience);
    url.searchParams.set("next", redirectPath);
    url.searchParams.set("mode", "recovery");
    return url.toString();
  }, [audience, isPlayerLoginRequest, redirectPath]);

  const resetMessages = useCallback(() => {
    setErrorMessage(null);
    setInfoMessage(null);
  }, []);

  const resolveRedirectPath = useCallback(
    (session: Session) => {
      // Pavilion staff always land in their inbox, regardless of the
      // requested `?next=` or their role tab selection.
      const staffRedirect = getPavilionStaffRedirect(session.user);
      if (staffRedirect) return staffRedirect;

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
    setIsBootstrappingAuth(true);

    const bootstrapSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session) {
          if (isPasswordRecoveryUrl()) {
            setAuthMethod("password");
            setIsPasswordResetMode(true);
            setPassword("");
            setIsBootstrappingAuth(false);
            return;
          }

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

            if (isMounted) {
              setIsBootstrappingAuth(false);
            }
            return;
          }

          await finishAuthentication(session);
          return;
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (event === "PASSWORD_RECOVERY") {
            setAuthMethod("password");
            setIsPasswordResetMode(true);
            setPassword("");
            setIsBootstrappingAuth(false);
            return;
          }

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
        setIsBootstrappingAuth(false);
      } catch {
        // The page already surfaces missing Supabase config during submit.
        if (isMounted) {
          setIsBootstrappingAuth(false);
        }
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
    if (isPasswordResetMode) return t.updatePassword;
    return t.signIn;
  }, [isPasswordResetMode, isSubmitting, t.loading, t.signIn, t.updatePassword]);

  const syncAndRedirect = useCallback(
    async (session: Session | null) => {
      if (!session) {
        throw new Error(t.defaultError);
      }

      const sessionRole = getUserRole(session.user);
      // Pavilion staff accounts are detected by email/metadata heuristics
      // (see getPavilionStaffRedirect). They don't carry the "supplier"
      // role, so the supplier-audience gate below would reject them even
      // though they legitimately need to sign in (often from either tab).
      // Skip the gate for them — they get routed to /pavilion-inbox
      // by resolveRedirectPath regardless.
      const isPavilionStaff = Boolean(getPavilionStaffRedirect(session.user));
      // Use `audience` (current tab state) not `requestedAudience` (frozen
      // from URL param at page load). Otherwise landing with ?role=supplier
      // and then clicking the Visitor tab still triggers the supplier gate.
      if (!isPavilionStaff && audience === "supplier" && sessionRole !== "supplier") {
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
    [finishAuthentication, language, audience, t.defaultError]
  );

  const sendOtp = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: buildEmailRedirectTo(),
      },
    });

    if (error) {
      // Supabase rate-limits OTP sends (e.g. "For security purposes, you
      // can only request this after N seconds" or "email rate limit
      // exceeded"). Do not claim delivery here; the previous email may
      // have been delayed or blocked by the provider.
      if (isOtpRateLimitError(error)) {
        setInfoMessage(t.rateLimited);
        return;
      }
      throw error;
    }

    setOtpRequested(true);
    setInfoMessage(otpRequested ? t.otpSent : `${t.otpDelivered} ${t.otpSent}`);
  }, [buildEmailRedirectTo, email, otpRequested, t.otpDelivered, t.otpSent, t.rateLimited]);

  const verifyOtp = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });

    if (!error && data.session) {
      await syncAndRedirect(data.session);
      return;
    }

    throw error ?? new Error(t.defaultError);
  }, [email, otpCode, syncAndRedirect, t.defaultError]);

  const requestPasswordReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage(t.enterEmailForReset);
      return;
    }

    setIsSendingPasswordReset(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: buildPasswordRecoveryRedirectTo(),
      });

      if (error) throw error;
      setInfoMessage(t.resetPasswordSent);
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : "";
      setErrorMessage(rawMessage || t.defaultError);
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  const updateRecoveredPassword = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      await syncAndRedirect(session);
      return;
    }

    setPassword("");
    setIsPasswordResetMode(false);
    setInfoMessage(t.passwordUpdated);
  };

  const handlePasswordSubmit = async () => {
    const supabase = getSupabaseBrowserClient();

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
      if (isPasswordResetMode) {
        await updateRecoveredPassword();
      } else if (authMethod === "otp") {
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
      } else if (authMethod === "otp" && isInvalidOtpError(rawMessage)) {
        friendly = t.invalidOtp;
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
    isPasswordResetMode
      ? t.passwordResetHint
      : isPlayerLoginRequest && authMethod === "password"
        ? t.playerPasswordHint
      : authMethod === "otp"
      ? audience === "supplier"
        ? t.otpHintSupplier
        : t.otpHintVisitor
      : null;

  const subtitle =
    isPlayerLoginRequest
      ? t.playerSubtitle
      : audience === "supplier" ? t.supplierSubtitle : t.visitorSubtitle;

  const handleAudienceChange = (nextAudience: AppAudience) => {
    setAudience(nextAudience);
    setAuthMethod("password");
    setOtpRequested(false);
    setOtpCode("");
    setIsPasswordResetMode(false);
    setPassword("");
    resetMessages();
  };

  if (isBootstrappingAuth) {
    return <LoginPageSkeleton />;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090b10] px-4 text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#66d9cb]/20 blur-3xl mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#f6ba4f]/18 blur-3xl mix-blend-screen animate-pulse delay-700" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="sfera-card z-10 w-full max-w-md space-y-5 rounded-2xl p-5 shadow-2xl sm:space-y-6 sm:p-8">
        <div className="text-center">
          <Link href="/" className="inline-flex justify-center">
            <BrandLogo size="xl" priority />
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
            {isPlayerLoginRequest ? t.playerTab : t.visitorTab}
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

        {!isPasswordResetMode && (
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
        )}

        {hintText && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/8 px-3 py-2 text-sm text-cyan-100">
            {hintText}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isPasswordResetMode && (
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
            )}

            {authMethod === "password" ? (
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
                  {isPasswordResetMode ? t.newPassword : t.password}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isPasswordResetMode ? "new-password" : "current-password"}
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

            {authMethod === "password" && !isPasswordResetMode && (
              <button
                type="button"
                disabled={isSendingPasswordReset}
                onClick={() => {
                  resetMessages();
                  void requestPasswordReset();
                }}
                className="flex w-full justify-center rounded-lg border border-white/15 px-3 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingPasswordReset ? t.loading : t.forgotPassword}
              </button>
            )}

            {isPasswordResetMode && (
              <button
                type="button"
                onClick={() => {
                  setIsPasswordResetMode(false);
                  setPassword("");
                  resetMessages();
                }}
                className="flex w-full justify-center rounded-lg border border-white/15 px-3 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
              >
                {t.backToSignIn}
              </button>
            )}

            {authMethod === "otp" && otpRequested && (
              <button
                type="button"
                disabled={isResendingOtp}
                onClick={() => {
                  resetMessages();
                  setIsResendingOtp(true);
                  void sendOtp()
                    .catch((error: unknown) => {
                      const rawMessage = error instanceof Error ? error.message : '';
                      const lower = rawMessage.toLowerCase();
                      let friendly = rawMessage || t.defaultError;
                      if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
                        friendly = t.invalidCredentials;
                      } else if (isInvalidOtpError(rawMessage)) {
                        friendly = t.invalidOtp;
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
                      setIsResendingOtp(false);
                    });
                }}
                className="flex w-full justify-center rounded-lg border border-white/15 px-3 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResendingOtp ? t.loading : t.resendOtp}
              </button>
            )}
          </div>
        </form>

        <div className="text-center text-xs text-gray-500">
          <div>
            {t.newPlayer}{" "}
            <Link href="/pre-register" className="text-cyan-100 hover:underline">
              {t.preRegister}
            </Link>
          </div>
          <div className="mt-2">
          {t.newSupplier}{" "}
          <Link href="/supplier/upload" className="text-gray-300 hover:underline">
            {t.apply}
          </Link>
          </div>
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
