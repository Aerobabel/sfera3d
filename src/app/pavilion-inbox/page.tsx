'use client';

// Pavilion-staff inbox: lists every thread that visitors (or other pavilions'
// staff) have started with MY pavilion, and lets me reply inline. Identity
// comes from auth metadata: `pavilion_staff_for = 'pav_<id>'` or
// `pavilion_staff_for = ['pav_youbo', 'pav_doublelin']`.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Inbox, Loader2, Send, X } from 'lucide-react';
import type { PavilionMessage, PavilionThreadSummary } from '@/lib/pavilionChat';
import { getPavilionById, type Pavilion } from '@/lib/pavilions';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { AppLanguage } from '@/lib/i18n';
import TranslatableText from '@/components/chat/TranslatableText';

const POLL_INTERVAL_MS = 4000;

type Copy = {
    loading: string;
    title: string;
    back: string;
    notAuthorizedTitle: string;
    notAuthorizedBody: string;
    metadataHint: string;
    signIn: string;
    home: string;
    threadsLabel: (count: number) => string;
    noMessages: string;
    loadingMessages: string;
    selectThread: string;
    replyPlaceholder: string;
    you: string;
    visitor: string;
    justNow: string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
    closeThread: string;
    send: string;
    signInRequired: string;
    notStaffAccount: string;
    connectionIssue: string;
    dateLocale: string;
};

const COPY: Record<AppLanguage, Copy> = {
    en: {
        loading: 'Loading…',
        title: 'Pavilion Inbox',
        back: 'Back to pavilion',
        notAuthorizedTitle: 'Pavilion Inbox',
        notAuthorizedBody: 'Sign in required.',
        metadataHint: 'Pavilion staff accounts need the email local-part to match a pavilion (e.g. doublelin@…), or user_metadata.pavilion_staff_for = "pav_<id>" / ["pav_youbo","pav_doublelin"] set in Supabase.',
        signIn: 'Sign in',
        home: 'Home',
        threadsLabel: (count) => `Threads · ${count}`,
        noMessages: 'No messages yet.',
        loadingMessages: 'Loading messages…',
        selectThread: 'Select a thread on the left to view messages.',
        replyPlaceholder: 'Reply…',
        you: 'You',
        visitor: 'Visitor',
        justNow: 'just now',
        minutesAgo: (n) => `${n}m ago`,
        hoursAgo: (n) => `${n}h ago`,
        closeThread: 'Close thread',
        send: 'Send reply',
        signInRequired: 'Sign in required.',
        notStaffAccount: 'Your account is not a pavilion staff account.',
        connectionIssue: 'Connection issue.',
        dateLocale: 'en-US',
    },
    ru: {
        loading: 'Загрузка…',
        title: 'Ящик павильона',
        back: 'В павильон',
        notAuthorizedTitle: 'Ящик павильона',
        notAuthorizedBody: 'Требуется вход.',
        metadataHint: 'Для аккаунта персонала павильона префикс email должен совпадать с ID павильона (например, doublelin@…) или в user_metadata должен быть указан pavilion_staff_for = "pav_<id>" / ["pav_youbo","pav_doublelin"].',
        signIn: 'Войти',
        home: 'Главная',
        threadsLabel: (count) => `Диалоги · ${count}`,
        noMessages: 'Сообщений пока нет.',
        loadingMessages: 'Загрузка сообщений…',
        selectThread: 'Выберите диалог слева, чтобы открыть переписку.',
        replyPlaceholder: 'Ответить…',
        you: 'Вы',
        visitor: 'Посетитель',
        justNow: 'только что',
        minutesAgo: (n) => `${n} мин назад`,
        hoursAgo: (n) => `${n} ч назад`,
        closeThread: 'Закрыть диалог',
        send: 'Отправить ответ',
        signInRequired: 'Требуется вход.',
        notStaffAccount: 'Ваш аккаунт не является аккаунтом персонала павильона.',
        connectionIssue: 'Проблема с подключением.',
        dateLocale: 'ru-RU',
    },
    zh: {
        loading: '加载中…',
        title: '展馆收件箱',
        back: '返回展馆',
        notAuthorizedTitle: '展馆收件箱',
        notAuthorizedBody: '请先登录。',
        metadataHint: '展馆员工账号需满足：邮箱前缀与展馆 ID 匹配（如 doublelin@…），或在 user_metadata 中设置 pavilion_staff_for = "pav_<id>" / ["pav_youbo","pav_doublelin"]。',
        signIn: '登录',
        home: '首页',
        threadsLabel: (count) => `对话 · ${count}`,
        noMessages: '暂无消息。',
        loadingMessages: '正在加载消息…',
        selectThread: '在左侧选择一个对话以查看消息。',
        replyPlaceholder: '回复…',
        you: '你',
        visitor: '访客',
        justNow: '刚刚',
        minutesAgo: (n) => `${n} 分钟前`,
        hoursAgo: (n) => `${n} 小时前`,
        closeThread: '关闭对话',
        send: '发送回复',
        signInRequired: '请先登录。',
        notStaffAccount: '该账号不是展馆员工账号。',
        connectionIssue: '连接异常。',
        dateLocale: 'zh-CN',
    },
};

type InboxResponse = {
    success?: boolean;
    error?: string;
    pavilionId?: string;
    pavilionIds?: string[];
    threads?: PavilionThreadSummary[];
};

type ThreadResponse = {
    success?: boolean;
    error?: string;
    messages?: PavilionMessage[];
    counterpartyUserId?: string;
};

const formatRelativeTime = (ms: number, copy: Copy): string => {
    const diff = Date.now() - ms;
    if (diff < 60_000) return copy.justNow;
    if (diff < 3_600_000) return copy.minutesAgo(Math.floor(diff / 60_000));
    if (diff < 86_400_000) return copy.hoursAgo(Math.floor(diff / 3_600_000));
    return new Date(ms).toLocaleDateString(copy.dateLocale);
};

export default function PavilionInboxPage() {
    const { language } = useLanguage();
    const copy = COPY[language];
    const [threads, setThreads] = useState<PavilionThreadSummary[]>([]);
    const [pavilionId, setPavilionId] = useState<string | null>(null);
    const [pavilionIds, setPavilionIds] = useState<string[]>([]);
    const [selectedCounterparty, setSelectedCounterparty] = useState<string | null>(null);
    const [selectedPavilionId, setSelectedPavilionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<PavilionMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoadingInbox, setIsLoadingInbox] = useState(true);
    const [isLoadingThread, setIsLoadingThread] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notAuthorized, setNotAuthorized] = useState(false);
    const feedRef = useRef<HTMLDivElement | null>(null);

    const pavilion: Pavilion | null = useMemo(() => {
        if (!pavilionId) return null;
        return getPavilionById(pavilionId.replace(/^pav_/, ''));
    }, [pavilionId]);
    const assignedPavilions = useMemo(
        () => pavilionIds
            .map((id) => getPavilionById(id.replace(/^pav_/, '')))
            .filter((value): value is Pavilion => Boolean(value)),
        [pavilionIds]
    );
    const inboxTitle = assignedPavilions.length > 1
        ? assignedPavilions.map((item) => item.name).join(' / ')
        : pavilion?.name ?? copy.loading;
    const inboxSubtitle = assignedPavilions.length > 1
        ? assignedPavilions.map((item) => item.tagline).join(' · ')
        : pavilion?.tagline ?? null;

    const loadInbox = useCallback(async () => {
        try {
            const res = await fetch('/api/pavilion-inbox', { cache: 'no-store' });
            if (res.status === 401) { setNotAuthorized(true); setError(copy.signInRequired); return; }
            if (res.status === 403) { setNotAuthorized(true); setError(copy.notStaffAccount); return; }
            const body = (await res.json()) as InboxResponse;
            if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load inbox.');
            setNotAuthorized(false);
            setError(null);
            setThreads(body.threads ?? []);
            setPavilionId(body.pavilionId ?? null);
            setPavilionIds(body.pavilionIds ?? (body.pavilionId ? [body.pavilionId] : []));
        } catch (err) {
            setError(err instanceof Error ? err.message : copy.connectionIssue);
        } finally {
            setIsLoadingInbox(false);
        }
    }, [copy.signInRequired, copy.notStaffAccount, copy.connectionIssue]);

    const loadThread = useCallback(async (counterpartyUserId: string, threadPavilionId: string) => {
        setIsLoadingThread(true);
        try {
            const short = threadPavilionId.replace(/^pav_/, '');
            const res = await fetch(
                `/api/pavilion-chat?pavilionId=${encodeURIComponent(short)}&counterpartyUserId=${encodeURIComponent(counterpartyUserId)}`,
                { cache: 'no-store' }
            );
            const body = (await res.json()) as ThreadResponse;
            if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load thread.');
            setMessages(body.messages ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : copy.connectionIssue);
        } finally {
            setIsLoadingThread(false);
        }
    }, [copy.connectionIssue]);

    // Initial load + polling for inbox list.
    useEffect(() => {
        void loadInbox();
        const id = window.setInterval(() => void loadInbox(), POLL_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [loadInbox]);

    // Poll the selected thread while it's open.
    useEffect(() => {
        if (!selectedCounterparty || !selectedPavilionId) return;
        void loadThread(selectedCounterparty, selectedPavilionId);
        const id = window.setInterval(() => void loadThread(selectedCounterparty, selectedPavilionId), POLL_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [selectedCounterparty, selectedPavilionId, loadThread]);

    // Autoscroll to bottom on new messages.
    useEffect(() => {
        const el = feedRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || !selectedCounterparty || !selectedPavilionId || isSending) return;
        setIsSending(true);
        setInput('');
        const short = selectedPavilionId.replace(/^pav_/, '');
        // Optimistic append — real id arrives after poll.
        const optimisticId = `local-${Date.now()}`;
        setMessages((prev) => [...prev, {
            id: optimisticId,
            pavilionId: selectedPavilionId,
            counterpartyUserId: selectedCounterparty,
            senderKind: 'pavilion',
            senderUserId: 'me',
            senderDisplayName: copy.you,
            body: text,
            createdAt: Date.now(),
        }]);
        try {
            const res = await fetch('/api/pavilion-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pavilionId: short,
                    counterpartyUserId: selectedCounterparty,
                    body: text,
                }),
            });
            const body = (await res.json()) as { success?: boolean; error?: string };
            if (!res.ok || !body.success) throw new Error(body.error || 'Failed to send.');
            await loadThread(selectedCounterparty, selectedPavilionId);
            await loadInbox();
        } catch (err) {
            setError(err instanceof Error ? err.message : copy.connectionIssue);
        } finally {
            setIsSending(false);
        }
    }, [input, selectedCounterparty, selectedPavilionId, isSending, loadThread, loadInbox, copy.connectionIssue, copy.you]);

    const selectedThread = useMemo(
        () => threads.find((t) => t.counterpartyUserId === selectedCounterparty && t.pavilionId === selectedPavilionId) ?? null,
        [threads, selectedCounterparty, selectedPavilionId]
    );

    if (notAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
                <div className="max-w-md text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-400/30 mb-4">
                        <Inbox size={20} className="text-amber-300" />
                    </div>
                    <h1 className="text-xl font-semibold">{copy.notAuthorizedTitle}</h1>
                    <p className="mt-2 text-sm text-slate-400">{error}</p>
                    <p className="mt-4 text-xs text-slate-500">
                        {copy.metadataHint}
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Link href="/login" className="px-5 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-[0.2em]">
                            {copy.signIn}
                        </Link>
                        <Link href="/" className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-[0.2em] border border-white/10">
                            {copy.home}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(102,217,203,0.08),transparent_42%),linear-gradient(160deg,rgba(3,8,14,0.98),rgba(6,13,24,0.96))] text-white">
            <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#66d9cb]">{copy.title}</div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            {inboxTitle}
                        </h1>
                        {inboxSubtitle && (
                            <p className="mt-1 text-sm text-slate-400">{inboxSubtitle}</p>
                        )}
                    </div>
                    <Link href="/fastview" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] hover:bg-white/10 sm:tracking-[0.2em]">
                        <ArrowLeft size={14} /> {copy.back}
                    </Link>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {error}
                    </div>
                )}

                <div className="grid min-h-[70dvh] grid-cols-1 gap-4 lg:h-[70vh] lg:grid-cols-[320px_1fr]">
                    {/* Thread list */}
                    <div className={`rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden flex flex-col ${selectedCounterparty ? 'hidden lg:flex' : 'min-h-[42dvh]'}`}>
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                {copy.threadsLabel(threads.length)}
                            </div>
                            {isLoadingInbox && <Loader2 size={14} className="animate-spin text-slate-500" />}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {threads.length === 0 && !isLoadingInbox && (
                                <div className="p-6 text-center text-xs text-slate-500">{copy.noMessages}</div>
                            )}
                            {threads.map((thread) => {
                                const threadPavilion = getPavilionById(thread.pavilionId.replace(/^pav_/, ''));
                                const isActive = thread.counterpartyUserId === selectedCounterparty && thread.pavilionId === selectedPavilionId;
                                const name = thread.counterpartyDisplayName || thread.counterpartyEmail || copy.visitor;
                                return (
                                    <button
                                        key={`${thread.pavilionId}:${thread.counterpartyUserId}`}
                                        onClick={() => {
                                            setSelectedCounterparty(thread.counterpartyUserId);
                                            setSelectedPavilionId(thread.pavilionId);
                                        }}
                                        className={`w-full text-left px-4 py-3 border-b border-white/5 transition ${isActive ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}
                                    >
                                        {threadPavilion && assignedPavilions.length > 1 && (
                                            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#66d9cb]">
                                                {threadPavilion.name}
                                            </div>
                                        )}
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className={`text-sm font-semibold truncate ${isActive ? 'text-cyan-200' : 'text-white'}`}>
                                                {name}
                                            </span>
                                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                                {formatRelativeTime(thread.lastMessage.createdAt, copy)}
                                            </span>
                                        </div>
                                        {thread.counterpartyEmail && thread.counterpartyEmail !== name && (
                                            <div className="text-[11px] text-slate-500 truncate">{thread.counterpartyEmail}</div>
                                        )}
                                        <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                                            {thread.lastMessage.senderKind === 'pavilion' && (
                                                <span className="text-[#c49a6c] font-bold mr-1">{copy.you}:</span>
                                            )}
                                            {thread.lastMessage.body}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Thread view */}
                    <div className={`rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden flex flex-col ${selectedCounterparty ? 'min-h-[70dvh]' : 'hidden lg:flex'}`}>
                        {!selectedCounterparty ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                                {copy.selectThread}
                            </div>
                        ) : (
                            <>
                                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-white truncate">
                                            {selectedThread?.counterpartyDisplayName || selectedThread?.counterpartyEmail || copy.visitor}
                                        </div>
                                        {selectedThread?.counterpartyEmail && (
                                            <div className="text-[11px] text-slate-500 truncate">{selectedThread.counterpartyEmail}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedCounterparty(null);
                                            setSelectedPavilionId(null);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 lg:hidden"
                                        aria-label={copy.closeThread}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
                                    {isLoadingThread && messages.length === 0 && (
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <Loader2 size={12} className="animate-spin" /> {copy.loadingMessages}
                                        </div>
                                    )}
                                    {messages.map((message) => {
                                        const isMine = message.senderKind === 'pavilion';
                                        const hideTranslate = message.id.startsWith('local-');
                                        return (
                                            <div
                                                key={message.id}
                                                className={`w-fit max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 ${
                                                    isMine
                                                        ? 'ml-auto bg-[#c49a6c] text-slate-950'
                                                        : 'bg-white/[0.06] text-gray-100 border border-white/10'
                                                }`}
                                            >
                                                <TranslatableText
                                                    text={message.body}
                                                    tone={isMine ? 'onLight' : 'onDark'}
                                                    hideAction={hideTranslate}
                                                />
                                                <div className={`mt-1 text-[10px] ${isMine ? 'text-slate-800/70' : 'text-slate-500'}`}>
                                                    {new Date(message.createdAt).toLocaleString(copy.dateLocale)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="grid gap-2 border-t border-white/5 bg-black/40 p-3 sm:flex sm:p-4">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                void handleSend();
                                            }
                                        }}
                                        placeholder={copy.replyPlaceholder}
                                        disabled={isSending}
                                        className="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder-slate-500 focus:border-[#c49a6c]/50 focus:bg-white/10 sm:flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleSend()}
                                        disabled={!input.trim() || isSending}
                                        className="min-h-11 rounded-lg bg-[#c49a6c] px-4 py-2.5 text-slate-950 transition hover:bg-[#d4aa7a] disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label={copy.send}
                                    >
                                        {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
