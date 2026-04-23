'use client';

// Pavilion-staff inbox: lists every thread that visitors (or other pavilions'
// staff) have started with MY pavilion, and lets me reply inline. Identity
// comes from auth metadata — `user_metadata.pavilion_staff_for = 'pav_<id>'`.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Inbox, Loader2, Send, X } from 'lucide-react';
import type { PavilionMessage, PavilionThreadSummary } from '@/lib/pavilionChat';
import { getPavilionById, type Pavilion } from '@/lib/pavilions';

const POLL_INTERVAL_MS = 4000;

type InboxResponse = {
    success?: boolean;
    error?: string;
    pavilionId?: string;
    threads?: PavilionThreadSummary[];
};

type ThreadResponse = {
    success?: boolean;
    error?: string;
    messages?: PavilionMessage[];
    counterpartyUserId?: string;
};

const formatRelativeTime = (ms: number): string => {
    const diff = Date.now() - ms;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ms).toLocaleDateString();
};

export default function PavilionInboxPage() {
    const [threads, setThreads] = useState<PavilionThreadSummary[]>([]);
    const [pavilionId, setPavilionId] = useState<string | null>(null);
    const [selectedCounterparty, setSelectedCounterparty] = useState<string | null>(null);
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

    const loadInbox = useCallback(async () => {
        try {
            const res = await fetch('/api/pavilion-inbox', { cache: 'no-store' });
            if (res.status === 401) { setNotAuthorized(true); setError('Sign in required.'); return; }
            if (res.status === 403) { setNotAuthorized(true); setError('Your account is not a pavilion staff account.'); return; }
            const body = (await res.json()) as InboxResponse;
            if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load inbox.');
            setNotAuthorized(false);
            setError(null);
            setThreads(body.threads ?? []);
            setPavilionId(body.pavilionId ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection issue.');
        } finally {
            setIsLoadingInbox(false);
        }
    }, []);

    const loadThread = useCallback(async (counterpartyUserId: string) => {
        if (!pavilionId) return;
        setIsLoadingThread(true);
        try {
            const short = pavilionId.replace(/^pav_/, '');
            const res = await fetch(
                `/api/pavilion-chat?pavilionId=${encodeURIComponent(short)}&counterpartyUserId=${encodeURIComponent(counterpartyUserId)}`,
                { cache: 'no-store' }
            );
            const body = (await res.json()) as ThreadResponse;
            if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load thread.');
            setMessages(body.messages ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection issue.');
        } finally {
            setIsLoadingThread(false);
        }
    }, [pavilionId]);

    // Initial load + polling for inbox list.
    useEffect(() => {
        void loadInbox();
        const id = window.setInterval(() => void loadInbox(), POLL_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [loadInbox]);

    // Poll the selected thread while it's open.
    useEffect(() => {
        if (!selectedCounterparty) return;
        void loadThread(selectedCounterparty);
        const id = window.setInterval(() => void loadThread(selectedCounterparty), POLL_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [selectedCounterparty, loadThread]);

    // Autoscroll to bottom on new messages.
    useEffect(() => {
        const el = feedRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || !selectedCounterparty || !pavilionId || isSending) return;
        setIsSending(true);
        setInput('');
        const short = pavilionId.replace(/^pav_/, '');
        // Optimistic append — real id arrives after poll.
        const optimisticId = `local-${Date.now()}`;
        setMessages((prev) => [...prev, {
            id: optimisticId,
            pavilionId,
            counterpartyUserId: selectedCounterparty,
            senderKind: 'pavilion',
            senderUserId: 'me',
            senderDisplayName: 'You',
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
            await loadThread(selectedCounterparty);
            await loadInbox();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection issue.');
        } finally {
            setIsSending(false);
        }
    }, [input, selectedCounterparty, pavilionId, isSending, loadThread, loadInbox]);

    const selectedThread = useMemo(
        () => threads.find((t) => t.counterpartyUserId === selectedCounterparty) ?? null,
        [threads, selectedCounterparty]
    );

    if (notAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
                <div className="max-w-md text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-400/30 mb-4">
                        <Inbox size={20} className="text-amber-300" />
                    </div>
                    <h1 className="text-xl font-semibold">Pavilion Inbox</h1>
                    <p className="mt-2 text-sm text-slate-400">{error}</p>
                    <p className="mt-4 text-xs text-slate-500">
                        Pavilion staff accounts need <code className="text-slate-300">user_metadata.pavilion_staff_for = &quot;pav_&lt;id&gt;&quot;</code> set in Supabase.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Link href="/login" className="px-5 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-[0.2em]">
                            Sign in
                        </Link>
                        <Link href="/" className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-[0.2em] border border-white/10">
                            Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(102,217,203,0.08),transparent_42%),linear-gradient(160deg,rgba(3,8,14,0.98),rgba(6,13,24,0.96))] text-white">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#66d9cb]">Pavilion Inbox</div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            {pavilion ? pavilion.name : 'Loading…'}
                        </h1>
                        {pavilion && (
                            <p className="mt-1 text-sm text-slate-400">{pavilion.tagline}</p>
                        )}
                    </div>
                    <Link href="/fastview" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-[0.2em]">
                        <ArrowLeft size={14} /> Back to pavilion
                    </Link>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[70vh]">
                    {/* Thread list */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                Threads · {threads.length}
                            </div>
                            {isLoadingInbox && <Loader2 size={14} className="animate-spin text-slate-500" />}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {threads.length === 0 && !isLoadingInbox && (
                                <div className="p-6 text-center text-xs text-slate-500">No messages yet.</div>
                            )}
                            {threads.map((thread) => {
                                const isActive = thread.counterpartyUserId === selectedCounterparty;
                                const name = thread.counterpartyDisplayName || thread.counterpartyEmail || 'Visitor';
                                return (
                                    <button
                                        key={thread.counterpartyUserId}
                                        onClick={() => setSelectedCounterparty(thread.counterpartyUserId)}
                                        className={`w-full text-left px-4 py-3 border-b border-white/5 transition ${isActive ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className={`text-sm font-semibold truncate ${isActive ? 'text-cyan-200' : 'text-white'}`}>
                                                {name}
                                            </span>
                                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                                {formatRelativeTime(thread.lastMessage.createdAt)}
                                            </span>
                                        </div>
                                        {thread.counterpartyEmail && thread.counterpartyEmail !== name && (
                                            <div className="text-[11px] text-slate-500 truncate">{thread.counterpartyEmail}</div>
                                        )}
                                        <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                                            {thread.lastMessage.senderKind === 'pavilion' && (
                                                <span className="text-[#c49a6c] font-bold mr-1">You:</span>
                                            )}
                                            {thread.lastMessage.body}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Thread view */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden flex flex-col">
                        {!selectedCounterparty ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                                Select a thread on the left to view messages.
                            </div>
                        ) : (
                            <>
                                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-white truncate">
                                            {selectedThread?.counterpartyDisplayName || selectedThread?.counterpartyEmail || 'Visitor'}
                                        </div>
                                        {selectedThread?.counterpartyEmail && (
                                            <div className="text-[11px] text-slate-500 truncate">{selectedThread.counterpartyEmail}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedCounterparty(null)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 lg:hidden"
                                        aria-label="Close thread"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div ref={feedRef} className="flex-1 overflow-y-auto p-5 space-y-3">
                                    {isLoadingThread && messages.length === 0 && (
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <Loader2 size={12} className="animate-spin" /> Loading messages…
                                        </div>
                                    )}
                                    {messages.map((message) => {
                                        const isMine = message.senderKind === 'pavilion';
                                        return (
                                            <div
                                                key={message.id}
                                                className={`w-fit max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                                    isMine
                                                        ? 'ml-auto bg-[#c49a6c] text-slate-950'
                                                        : 'bg-white/[0.06] text-gray-100 border border-white/10'
                                                }`}
                                            >
                                                <div>{message.body}</div>
                                                <div className={`mt-1 text-[10px] ${isMine ? 'text-slate-800/70' : 'text-slate-500'}`}>
                                                    {new Date(message.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-white/5 bg-black/40 p-4 flex gap-2">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                void handleSend();
                                            }
                                        }}
                                        placeholder="Reply..."
                                        disabled={isSending}
                                        className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-[#c49a6c]/50 focus:bg-white/10 outline-none text-white text-sm placeholder-slate-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleSend()}
                                        disabled={!input.trim() || isSending}
                                        className="px-4 py-2.5 rounded-lg bg-[#c49a6c] hover:bg-[#d4aa7a] text-slate-950 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Send reply"
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
