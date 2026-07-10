'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  Settings,
  Bell,
  Search,
  User,
  LogOut,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { clearServerAuthSession } from '@/lib/auth/browser';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PavilionMessage, PavilionThreadSummary } from '@/lib/pavilionChat';
import { getPavilionById } from '@/lib/pavilions';

type InboxResponse = {
  success?: boolean;
  error?: string;
  pavilionId?: string | null;
  pavilionIds?: string[];
  threads?: PavilionThreadSummary[];
};

type ThreadResponse = {
  success?: boolean;
  error?: string;
  messages?: PavilionMessage[];
};

const getThreadKey = (thread: Pick<PavilionThreadSummary, 'pavilionId' | 'counterpartyUserId'>) =>
  `${thread.pavilionId}:${thread.counterpartyUserId}`;

const supplierNameFromEmail = (email: string | null | undefined) => {
  if (!email) return 'Supplier';
  const localPart = email.split('@')[0] ?? 'Supplier';
  return localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');
};

const readStringMetadata = (metadata: Record<string, unknown>, key: string) => {
  const value = metadata[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const titleFromSlug = (value: string) =>
  value
    .split(/[._-\s]+/g)
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');

const pavilionNameFromMetadata = (metadata: Record<string, unknown>) => {
  const explicitName = readStringMetadata(metadata, 'pavilion_name');
  if (explicitName) return explicitName;

  const pavilionId = readStringMetadata(metadata, 'pavilion_id');
  if (!pavilionId) return null;

  const normalized = pavilionId.replace(/^pav[_-]?/i, '');
  const title = titleFromSlug(normalized);
  return title ? `${title} Pavilion` : null;
};

export default function SupplierDashboard() {
  const { language } = useLanguage();
  const router = useRouter();

  const t = {
    en: {
      portal: 'Supplier Portal',
      liveChat: 'Live Chat',
      analytics: 'Analytics',
      settings: 'Settings',
      admin: 'Supplier',
      inquiries: 'Live Inquiries',
      controlCenter: 'Control Center',
      messageQueue: 'Message Queue',
      noMessages: 'No messages yet',
      waiting: 'Waiting for buyers to connect...',
      onlineNow: 'Online now',
      replyPlaceholder: 'Reply to buyer...',
      composeLabel: 'Direct reply channel',
      send: 'Send',
      resolve: 'Mark as Resolved',
      activeBuyers: 'Active buyers',
      todayVolume: 'Messages today',
      avgReply: 'Avg reply SLA',
      lastMessage: 'Last message',
      queueHint: 'High-touch supplier support for live buyer inquiries.',
      notConfigured:
        'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      loadFailed: 'Failed to load messages.',
      supplierPavilion: 'Supplier Pavilion',
      signOut: 'Sign out',
      authenticating: 'Authenticating supplier session...',
      requiresLogin: 'Please sign in to access the supplier dashboard.',
      originalLabel: 'Original',
      translatedLabel: 'Translated',
    },
    ru: {
      portal: 'Портал поставщика',
      liveChat: 'Живой чат',
      analytics: 'Аналитика',
      settings: 'Настройки',
      admin: 'Поставщик',
      inquiries: 'Живые обращения',
      controlCenter: 'Центр управления',
      messageQueue: 'Очередь сообщений',
      noMessages: 'Сообщений пока нет',
      waiting: 'Ожидаем подключения покупателей...',
      onlineNow: 'Сейчас онлайн',
      replyPlaceholder: 'Ответить покупателю...',
      composeLabel: 'Прямой канал ответа',
      send: 'Отправить',
      resolve: 'Отметить как решенное',
      activeBuyers: 'Активные покупатели',
      todayVolume: 'Сообщений сегодня',
      avgReply: 'Средний SLA ответа',
      lastMessage: 'Последнее сообщение',
      queueHint: 'Премиальная поддержка поставщика для обращений покупателей в реальном времени.',
      notConfigured:
        'Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      loadFailed: 'Не удалось загрузить сообщения.',
      supplierPavilion: 'Павильон поставщика',
      signOut: 'Выйти',
      authenticating: 'Проверяем сессию поставщика...',
      requiresLogin: 'Для доступа к панели поставщика выполните вход.',
      originalLabel: 'Оригинал',
      translatedLabel: 'Перевод',
    },
    zh: {
      portal: '供应商门户',
      liveChat: '实时聊天',
      analytics: '数据分析',
      settings: '设置',
      admin: '供应商',
      inquiries: '实时咨询',
      controlCenter: '控制中心',
      messageQueue: '消息队列',
      noMessages: '暂无消息',
      waiting: '等待买家连接中...',
      onlineNow: '在线',
      replyPlaceholder: '回复买家...',
      composeLabel: '直连回复通道',
      send: '发送',
      resolve: '标记为已处理',
      activeBuyers: '活跃买家',
      todayVolume: '今日消息量',
      avgReply: '平均回复 SLA',
      lastMessage: '最近消息',
      queueHint: '为实时买家咨询提供高质量供应商支持。',
      notConfigured:
        'Supabase 未配置。请添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。',
      loadFailed: '消息加载失败。',
      supplierPavilion: '供应商展馆',
      signOut: '退出登录',
      authenticating: '正在验证供应商会话...',
      requiresLogin: '请先登录后访问供应商后台。',
      originalLabel: '原文',
      translatedLabel: '翻译',
    },
  }[language];

  const [threads, setThreads] = useState<PavilionThreadSummary[]>([]);
  const [messages, setMessages] = useState<PavilionMessage[]>([]);
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState('Supplier');
  const [supplierPavilionName, setSupplierPavilionName] = useState<string | null>(null);
  const [supplierEmail, setSupplierEmail] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const latestBuyerMessageId = useMemo(() => {
    const buyerThreads = threads.filter((thread) => thread.lastMessage.senderKind === 'visitor');
    return buyerThreads.length ? buyerThreads[0].lastMessage.id : null;
  }, [threads]);

  const activeBuyerCount = useMemo(() => {
    return new Set(threads.map((thread) => thread.counterpartyUserId)).size;
  }, [threads]);

  const todayMessageCount = useMemo(() => {
    const now = new Date();
    return threads.reduce((count, thread) => {
      const created = new Date(thread.lastMessage.createdAt);
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth() &&
        created.getDate() === now.getDate()
      ) ? count + thread.messageCount : count;
    }, 0);
  }, [threads]);

  const lastMessageTime = useMemo(() => {
    if (!threads.length) return '--';
    return new Date(threads[0].lastMessage.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [threads]);

  const selectedThread = useMemo(
    () => threads.find((thread) => getThreadKey(thread) === selectedThreadKey) ?? null,
    [threads, selectedThreadKey]
  );

  const selectedPavilion = useMemo(() => {
    if (!selectedThread) return null;
    return getPavilionById(selectedThread.pavilionId.replace(/^pav_/, ''));
  }, [selectedThread]);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/login?role=supplier');
          return;
        }

        const metadata =
          session.user.user_metadata && typeof session.user.user_metadata === 'object'
            ? (session.user.user_metadata as Record<string, unknown>)
            : {};
        const displayNameFromMetadata =
          readStringMetadata(metadata, 'supplier_name') || supplierNameFromEmail(session.user.email);
        const supplierPavilionName = pavilionNameFromMetadata(metadata);

        if (mounted) {
          setSupplierName(displayNameFromMetadata || 'Supplier');
          setSupplierPavilionName(supplierPavilionName);
          setSupplierEmail(session.user.email ?? null);
          setAuthReady(true);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!nextSession) {
            void clearServerAuthSession().finally(() => {
              router.replace('/login?role=supplier');
            });
          }
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch {
        if (mounted) {
          setErrorMessage(t.notConfigured);
        }
      }

      return undefined;
    };

    const unsubscribePromise = verifySession();

    return () => {
      mounted = false;
      unsubscribePromise.then((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [router, t.notConfigured]);

  useEffect(() => {
    if (!authReady) return;

    let isStopped = false;

    const fetchInbox = async () => {
      try {
        const response = await fetch('/api/pavilion-inbox', {
          cache: 'no-store',
        });
        const data = (await response.json()) as InboxResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.error || t.loadFailed);
        }

        if (!isStopped) {
          const nextThreads = Array.isArray(data.threads) ? data.threads : [];
          setThreads(nextThreads);
          setSelectedThreadKey((current) => {
            if (current && nextThreads.some((thread) => getThreadKey(thread) === current)) return current;
            return nextThreads[0] ? getThreadKey(nextThreads[0]) : null;
          });
          setErrorMessage(null);
        }
      } catch (error: unknown) {
        if (isStopped) return;
        const message = error instanceof Error ? error.message : t.loadFailed;
        setErrorMessage(message);
      }
    };

    void fetchInbox();
    const interval = window.setInterval(fetchInbox, 3000);

    return () => {
      isStopped = true;
      window.clearInterval(interval);
    };
  }, [authReady, t.loadFailed]);

  const loadSelectedThread = useCallback(async () => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }

    try {
      const shortPavilionId = selectedThread.pavilionId.replace(/^pav_/, '');
      const response = await fetch(
        `/api/pavilion-chat?pavilionId=${encodeURIComponent(shortPavilionId)}&counterpartyUserId=${encodeURIComponent(selectedThread.counterpartyUserId)}`,
        { cache: 'no-store' }
      );
      const data = (await response.json()) as ThreadResponse;
      if (!response.ok || !data.success) throw new Error(data.error || t.loadFailed);
      setMessages(data.messages ?? []);
      setErrorMessage(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.loadFailed;
      setErrorMessage(message);
    }
  }, [selectedThread, t.loadFailed]);

  useEffect(() => {
    if (!authReady) return;
    void loadSelectedThread();
    const interval = window.setInterval(() => void loadSelectedThread(), 3000);
    return () => window.clearInterval(interval);
  }, [authReady, loadSelectedThread]);

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore and still redirect.
    }

    try {
      await clearServerAuthSession();
    } catch {
      // Ignore and still redirect.
    }

    router.replace('/login?role=supplier');
  };

  const sendReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || !selectedThread || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch('/api/pavilion-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pavilionId: selectedThread.pavilionId.replace(/^pav_/, ''),
          counterpartyUserId: selectedThread.counterpartyUserId,
          body: trimmed,
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.loadFailed);
      }

      setReplyText('');
      setErrorMessage(null);

      await loadSelectedThread();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.loadFailed;
      setErrorMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  if (!authReady) {
    return (
      <div
        className={`min-h-screen bg-[#070b14] px-4 text-center text-slate-200 [font-family:var(--font-dashboard-display)]`}
      >
        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{t.authenticating}</p>
            {errorMessage && <p className="mt-3 text-sm text-red-300">{errorMessage}</p>}
            {!errorMessage && <p className="mt-3 text-xs text-slate-400">{t.requiresLogin}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[#070b14] text-[#e8edf7] [font-family:var(--font-dashboard-display)]`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(35,222,189,0.26),rgba(35,222,189,0)_72%)] blur-2xl" />
        <div className="absolute right-[-6rem] top-44 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(247,188,84,0.2),rgba(247,188,84,0)_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-80 flex-col border-r border-white/10 bg-[#0c1220]/85 backdrop-blur-xl xl:flex">
          <div className="p-7">
            <BrandLogo size="lg" priority />
            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">{t.portal}</p>
            <p className="mt-4 inline-flex rounded-full border border-[#66d9cb]/35 bg-[#66d9cb]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78e9dc]">
              {supplierPavilionName || t.supplierPavilion}
            </p>
          </div>

          <nav className="flex-1 px-4 pb-6">
            <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <Link
                href="/pavilion-inbox"
                className="flex items-center gap-3 rounded-xl border border-[#66d9cb]/30 bg-[#66d9cb]/14 px-4 py-3 text-sm font-semibold text-[#7af0e2] transition hover:bg-[#66d9cb]/20"
              >
                <MessageSquare size={18} /> Pavilion inbox
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
              >
                <LayoutDashboard size={18} /> {t.analytics}
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
              >
                <Settings size={18} /> {t.settings}
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-[linear-gradient(145deg,rgba(16,26,41,0.92),rgba(11,17,27,0.92))] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{t.controlCenter}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{t.queueHint}</p>
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#66d9cb]/35 bg-[#66d9cb]/12 text-[#73eee0]">
                  <User size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{supplierName}</p>
                  <p className="truncate text-xs text-slate-400">{supplierEmail || t.admin}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <LogOut size={14} /> {t.signOut}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-white/10 bg-[#0b1222]/72 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#66d9cb]">{t.controlCenter}</p>
                <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{t.inquiries}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/pavilion-inbox"
                  className="inline-flex items-center gap-2 rounded-full border border-[#66d9cb]/25 bg-[#66d9cb]/10 px-3 py-2 text-xs font-semibold text-[#7af0e2] transition hover:bg-[#66d9cb]/18"
                >
                  <MessageSquare size={16} /> Pavilion inbox
                </Link>
                <button className="rounded-full border border-white/15 bg-white/[0.04] p-2.5 text-slate-300 transition hover:bg-white/[0.12] hover:text-white">
                  <Search size={18} />
                </button>
                <button className="relative rounded-full border border-white/15 bg-white/[0.04] p-2.5 text-slate-300 transition hover:bg-white/[0.12] hover:text-white">
                  <Bell size={18} />
                  {latestBuyerMessageId && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#66d9cb] shadow-[0_0_10px_rgba(102,217,203,0.9)]" />
                  )}
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-6">
            <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(12,19,31,0.9),rgba(9,14,23,0.92))] shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
                {errorMessage && (
                  <div className="m-4 rounded-xl border border-red-400/30 bg-red-500/12 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-200">{t.messageQueue}</p>
                  <span className="rounded-full border border-[#66d9cb]/35 bg-[#66d9cb]/10 px-3 py-1 text-xs font-semibold text-[#7cefe2]">
                    {threads.length}
                  </span>
                </div>

                <div className="grid h-[min(58vh,700px)] min-h-[460px] grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
                  {threads.length === 0 ? (
                    <div className="my-auto rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-6 py-12 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300">
                        <MessageSquare size={24} />
                      </div>
                      <h3 className="text-base font-semibold text-white">{t.noMessages}</h3>
                      <p className="mt-2 text-sm text-slate-400">{t.waiting}</p>
                    </div>
                  ) : (
                    <>
                      <aside className="overflow-y-auto border-b border-white/10 bg-black/10 lg:border-b-0 lg:border-r">
                        {threads.map((thread) => {
                          const key = getThreadKey(thread);
                          const isActive = key === selectedThreadKey;
                          const pavilion = getPavilionById(thread.pavilionId.replace(/^pav_/, ''));
                          const name = thread.counterpartyDisplayName || thread.counterpartyEmail || 'Guest';
                          const lastSender = thread.lastMessage.senderKind === 'pavilion' ? 'Supplier' : 'Visitor';
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedThreadKey(key)}
                              className={`w-full border-b border-white/8 px-4 py-3 text-left transition ${isActive ? 'bg-[#66d9cb]/12' : 'hover:bg-white/[0.04]'}`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#66d9cb]">
                                  {pavilion?.name || thread.pavilionId}
                                </span>
                                <span className="shrink-0 text-[10px] text-slate-500">
                                  {thread.messageCount}
                                </span>
                              </div>
                              <p className="truncate text-sm font-semibold text-white">{name}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                                <span className={thread.lastMessage.senderKind === 'pavilion' ? 'text-[#66d9cb]' : 'text-violet-300'}>
                                  {lastSender}:
                                </span>{' '}
                                {thread.lastMessage.body}
                              </p>
                            </button>
                          );
                        })}
                      </aside>

                      <div className="flex min-h-0 flex-col">
                        <div className="border-b border-white/10 px-5 py-3">
                          <p className="text-sm font-semibold text-white">
                            {selectedThread?.counterpartyDisplayName || selectedThread?.counterpartyEmail || 'Guest'}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {selectedPavilion?.name || selectedThread?.pavilionId || 'Pavilion'}
                          </p>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-6">
                          {messages.map((msg) => {
                            const isMine = msg.senderKind === 'pavilion';
                            const senderName = isMine
                              ? supplierName
                              : selectedThread?.counterpartyDisplayName || selectedThread?.counterpartyEmail || 'Guest';
                            return (
                              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <article
                                  className={`w-full max-w-3xl rounded-2xl border p-4 sm:p-5 ${isMine
                                    ? 'border-[#66d9cb]/30 bg-[linear-gradient(150deg,rgba(19,56,61,0.45),rgba(16,34,48,0.55))]'
                                    : 'border-white/12 bg-white/[0.04]'
                                    }`}
                                >
                                  <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${isMine
                                          ? 'bg-[linear-gradient(135deg,#66d9cb,#2da7d8)]'
                                          : 'bg-[linear-gradient(135deg,#8c7bff,#cf5cf0)]'
                                          }`}
                                      >
                                        {senderName.substring(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-semibold text-white">{senderName}</p>
                                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${isMine
                                            ? 'border-[#66d9cb]/30 bg-[#66d9cb]/10 text-[#7af0e2]'
                                            : 'border-violet-300/25 bg-violet-300/10 text-violet-200'
                                            }`}>
                                            {isMine ? 'Supplier' : 'Visitor'}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-emerald-300">{t.onlineNow}</p>
                                      </div>
                                    </div>
                                    <span className="text-[11px] text-slate-400 [font-family:var(--font-dashboard-mono)]">
                                      {new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-relaxed text-slate-100">
                                    <p>{msg.body}</p>
                                  </div>
                                </article>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <aside className="hidden gap-4 xl:flex xl:flex-col">
                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(150deg,rgba(13,20,34,0.94),rgba(8,13,23,0.92))] p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t.controlCenter}</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[11px] text-slate-400">{t.activeBuyers}</p>
                      <p className="mt-1 text-2xl font-semibold text-white">{activeBuyerCount}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[11px] text-slate-400">{t.todayVolume}</p>
                      <p className="mt-1 text-2xl font-semibold text-white">{todayMessageCount}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[11px] text-slate-400">{t.avgReply}</p>
                      <p className="mt-1 text-2xl font-semibold text-white">02:10</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[11px] text-slate-400">{t.lastMessage}</p>
                      <p className="mt-1 text-lg font-semibold text-white [font-family:var(--font-dashboard-mono)]">
                        {lastMessageTime}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#0b1222]/72 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="mx-auto max-w-5xl rounded-2xl border border-white/12 bg-white/[0.04] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">{t.composeLabel}</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void sendReply();
                    }
                  }}
                  placeholder={t.replyPlaceholder}
                  disabled={!selectedThread || isSending}
                  className="min-w-[220px] flex-1 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#66d9cb]/60 focus:ring-2 focus:ring-[#66d9cb]/25"
                />
                <button
                  onClick={() => void sendReply()}
                  disabled={!replyText.trim() || !selectedThread || isSending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#66d9cb] px-5 py-3 text-sm font-semibold text-[#031413] transition hover:bg-[#88eade] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Send size={14} /> {t.send}
                </button>
                <button className="rounded-xl border border-white/20 bg-white/[0.02] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.1]">
                  {t.resolve}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
