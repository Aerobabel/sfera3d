'use client';

// Full-screen pavilion "exposition" overlay. Activated when the Unreal
// blueprint sends `entered_pavilion:<id>` through handle_responses.
//
// Tabs: Products | Contact | Chat | Book Meeting.
// - Products grid uses the hero image from the per-pavilion manifest.
// - Contact form persists to public.pavilion_contact_requests (Supabase).
// - Chat is a lightweight pavilion-scoped supplier chat (reuses the existing
//   supplier-chat API conventions but is stateless — messages aren't persisted
//   beyond the session for the initial cut).
// - Book Meeting generates 30-min slots (9:00-18:00 local), marks taken
//   slots using GET /api/pavilion-booking, and posts on confirm.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Mail, MessageSquare, Package, Send, X } from 'lucide-react';
import type { Pavilion, PavilionProduct } from '@/lib/pavilions';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { readSupplierChatApiResponse, type SupplierChatApiMessage } from '@/lib/supplierChat';

type Tab = 'products' | 'contact' | 'chat' | 'meeting';

interface PavilionExpositionProps {
    pavilion: Pavilion;
    onClose: () => void;
}

type ChatEntry = {
    id: string;
    role: 'visitor' | 'pavilion' | 'system';
    text: string;
    timestamp: number;
    originalText?: string;
    isTranslated?: boolean;
};

// Pavilion chat reuses the existing supplier_messages infrastructure with the
// pavilion id namespaced as `pav_<id>` so rows don't collide with real
// suppliers and the auto-translate pipeline works for free.
const toSupplierId = (pavilionId: string) => `pav_${pavilionId}`;
const POLL_INTERVAL_MS = 3000;

const toChatEntry = (message: SupplierChatApiMessage): ChatEntry => ({
    id: `msg-${message.id}`,
    role: message.senderRole === 'supplier' ? 'pavilion' : 'visitor',
    text: message.text,
    timestamp: message.createdAt,
    originalText: message.originalText,
    isTranslated: message.isTranslated,
});

const TABS: Array<{ id: Tab; label: string; icon: typeof Package }> = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'meeting', label: 'Book Meeting', icon: Calendar },
];

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;

const generateSlots = (baseDay: Date): Date[] => {
    const day = new Date(baseDay.getFullYear(), baseDay.getMonth(), baseDay.getDate());
    const slots: Date[] = [];
    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
            slots.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0));
        }
    }
    return slots;
};

const generateDayOptions = (): Date[] => {
    const days: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
        const day = new Date(base);
        day.setDate(base.getDate() + offset);
        const dow = day.getDay();
        if (dow === 0 || dow === 6) continue; // skip weekends
        days.push(day);
    }
    return days;
};

const formatDay = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const formatSlot = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export default function PavilionExposition({ pavilion, onClose }: PavilionExpositionProps) {
    const { language } = useLanguage();
    const [tab, setTab] = useState<Tab>('products');
    const [selectedProduct, setSelectedProduct] = useState<PavilionProduct | null>(null);

    // --- Contact form state ---
    const [contactName, setContactName] = useState('');
    const [contactCompany, setContactCompany] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [contactError, setContactError] = useState<string | null>(null);

    // --- Chat state (backed by supplier_messages with supplierId = pav_<id>) ---
    const supplierId = useMemo(() => toSupplierId(pavilion.id), [pavilion.id]);
    const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSendingChat, setIsSendingChat] = useState(false);
    const [isSyncingChat, setIsSyncingChat] = useState(false);
    const [chatAuthError, setChatAuthError] = useState<string | null>(null);
    const chatScrollRef = useRef<HTMLDivElement | null>(null);

    // --- Meeting state ---
    const dayOptions = useMemo(() => generateDayOptions(), []);
    const [selectedDayIso, setSelectedDayIso] = useState<string>(() => dayOptions[0]?.toISOString() ?? '');
    const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
    const [meetingName, setMeetingName] = useState('');
    const [meetingEmail, setMeetingEmail] = useState('');
    const [meetingCompany, setMeetingCompany] = useState('');
    const [meetingNotes, setMeetingNotes] = useState('');
    const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
    const [meetingStatus, setMeetingStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [meetingError, setMeetingError] = useState<string | null>(null);

    // Fetch taken slots when the tab opens or pavilion changes.
    useEffect(() => {
        if (tab !== 'meeting') return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(
                    `/api/pavilion-booking?pavilionId=${encodeURIComponent(pavilion.id)}&from=${encodeURIComponent(new Date().toISOString())}`
                );
                const body = (await res.json()) as { taken?: Array<{ slotAt: string }> };
                if (cancelled) return;
                const next = new Set<string>();
                for (const row of body.taken ?? []) {
                    next.add(new Date(row.slotAt).toISOString());
                }
                setTakenSlots(next);
            } catch {
                // ignore — show all slots as available
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [pavilion.id, tab]);

    // Auto-scroll chat to the bottom on new messages.
    useEffect(() => {
        const el = chatScrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [chatEntries]);

    const handleSubmitContact = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (contactStatus === 'sending') return;
        setContactStatus('sending');
        setContactError(null);
        try {
            const res = await fetch('/api/pavilion-contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pavilionId: pavilion.id,
                    name: contactName,
                    company: contactCompany,
                    email: contactEmail,
                    phone: contactPhone,
                    message: contactMessage,
                }),
            });
            const body = (await res.json()) as { success?: boolean; error?: string };
            if (!res.ok || !body.success) {
                throw new Error(body.error || 'Failed to send.');
            }
            setContactStatus('sent');
            setContactName('');
            setContactCompany('');
            setContactEmail('');
            setContactPhone('');
            setContactMessage('');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to send.';
            setContactStatus('error');
            setContactError(msg);
        }
    };

    const syncChat = useCallback(async () => {
        setIsSyncingChat(true);
        try {
            const res = await fetch(
                `/api/supplier-chat?supplierId=${encodeURIComponent(supplierId)}&viewerLanguage=${encodeURIComponent(language)}`,
                { cache: 'no-store' }
            );
            const body = await readSupplierChatApiResponse(res);
            if (res.status === 401) {
                setChatAuthError('Sign in to chat with the pavilion team.');
                return;
            }
            if (!res.ok || !body.success) {
                throw new Error(body.error || 'Unable to load messages.');
            }
            setChatAuthError(null);
            setChatEntries((body.messages ?? []).map(toChatEntry));
        } catch (err) {
            // Keep any previously loaded messages; surface errors once only.
            if (chatEntries.length === 0) {
                const msg = err instanceof Error ? err.message : 'Connection issue.';
                setChatEntries([{
                    id: 'sys-error',
                    role: 'system',
                    text: msg,
                    timestamp: Date.now(),
                }]);
            }
        } finally {
            setIsSyncingChat(false);
        }
    }, [supplierId, language, chatEntries.length]);

    const handleSendChat = useCallback(async () => {
        const text = chatInput.trim();
        if (!text || isSendingChat) return;
        setChatInput('');
        setIsSendingChat(true);

        // Optimistic visitor entry; real id arrives after sync.
        const optimisticId = `local-${Date.now()}`;
        setChatEntries((prev) => [
            ...prev,
            { id: optimisticId, role: 'visitor', text, timestamp: Date.now() },
        ]);

        try {
            const res = await fetch('/api/supplier-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId,
                    senderRole: 'buyer',
                    senderName: 'Guest',
                    text,
                    senderLanguage: language,
                }),
            });
            const body = await readSupplierChatApiResponse(res);
            if (res.status === 401) {
                setChatAuthError('Sign in to chat with the pavilion team.');
                return;
            }
            if (!res.ok || !body.success) {
                throw new Error(body.error || 'Unable to send message.');
            }
            setChatAuthError(null);
            await syncChat();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Connection issue.';
            setChatEntries((prev) => [
                ...prev,
                { id: `sys-${Date.now()}`, role: 'system', text: msg, timestamp: Date.now() },
            ]);
        } finally {
            setIsSendingChat(false);
        }
    }, [chatInput, isSendingChat, supplierId, language, syncChat]);

    // Load + poll chat messages while the Chat tab is visible.
    useEffect(() => {
        if (tab !== 'chat') return;
        void syncChat();
        const id = window.setInterval(() => void syncChat(), POLL_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [tab, syncChat]);

    const handleSubmitMeeting = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedSlotIso) {
            setMeetingError('Pick a meeting slot.');
            setMeetingStatus('error');
            return;
        }
        setMeetingStatus('sending');
        setMeetingError(null);
        try {
            const res = await fetch('/api/pavilion-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pavilionId: pavilion.id,
                    name: meetingName,
                    email: meetingEmail,
                    company: meetingCompany,
                    slotAt: selectedSlotIso,
                    durationMinutes: SLOT_MINUTES,
                    notes: meetingNotes,
                }),
            });
            const body = (await res.json()) as { success?: boolean; error?: string };
            if (!res.ok || !body.success) {
                throw new Error(body.error || 'Failed to book.');
            }
            setMeetingStatus('sent');
            setTakenSlots((prev) => new Set([...prev, selectedSlotIso]));
            setSelectedSlotIso(null);
            setMeetingName('');
            setMeetingEmail('');
            setMeetingCompany('');
            setMeetingNotes('');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to book.';
            setMeetingStatus('error');
            setMeetingError(msg);
        }
    };

    const selectedDay = useMemo(() => {
        if (!selectedDayIso) return null;
        const match = dayOptions.find((d) => d.toISOString() === selectedDayIso);
        return match ?? null;
    }, [dayOptions, selectedDayIso]);

    const slotsForDay = useMemo(() => (selectedDay ? generateSlots(selectedDay) : []), [selectedDay]);

    return (
        <div
            className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="relative bg-slate-950/60 backdrop-blur-2xl border border-white/10 w-full max-w-6xl h-[88vh] rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Ambient glow scoped to pavilion */}
                <div className={`pointer-events-none absolute -top-20 -right-20 w-[32rem] h-[32rem] rounded-full blur-[120px] opacity-70 bg-gradient-to-br ${pavilion.heroColor}`} />
                <div className="pointer-events-none absolute -bottom-20 -left-20 w-[28rem] h-[28rem] rounded-full blur-[100px] opacity-50 bg-gradient-to-tr from-white/5 to-cyan-500/10" />

                {/* Header */}
                <div className="relative p-6 border-b border-white/5 bg-black/30 z-10">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80 font-bold">Pavilion</div>
                            <h2 className="mt-1 text-3xl font-black uppercase tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                                {pavilion.name}
                            </h2>
                            <p className="mt-1 text-sm text-gray-400 max-w-xl">{pavilion.tagline}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white border border-white/10"
                            aria-label="Close pavilion"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const isActive = tab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => { setTab(id); setSelectedProduct(null); }}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition ${
                                        isActive
                                            ? 'bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                                    }`}
                                >
                                    <Icon size={14} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Body */}
                <div className="relative flex-1 overflow-y-auto custom-scrollbar z-10">
                    {tab === 'products' && (
                        <div className="p-6">
                            <p className="text-sm text-gray-400 mb-6 max-w-3xl">{pavilion.description}</p>
                            {pavilion.products.length === 0 ? (
                                <div className="text-gray-500 text-sm">No products catalogued yet.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {pavilion.products.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => setSelectedProduct(product)}
                                            className="group text-left bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:bg-white/10 rounded-2xl overflow-hidden transition duration-300 flex flex-col"
                                        >
                                            <div className="relative aspect-square bg-black/40 overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={product.hero}
                                                    alt={product.code}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <div className="font-bold text-white text-sm tracking-wider">{product.code}</div>
                                                <div className="text-[11px] text-cyan-300/70 uppercase tracking-widest mt-1">
                                                    Contact for quote
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'contact' && (
                        <div className="p-6 max-w-2xl">
                            <div className="mb-4 text-sm text-gray-400">
                                Send a direct message to <span className="text-white">{pavilion.name}</span>. The sales team will reply to the email you provide.
                            </div>
                            <div className="mb-6 text-xs text-gray-500 space-y-1">
                                <div>Email: <span className="text-cyan-300">{pavilion.contactEmail}</span></div>
                                {pavilion.contactPhone && <div>Phone: <span className="text-cyan-300">{pavilion.contactPhone}</span></div>}
                                {pavilion.website && (
                                    <div>Website: <a href={pavilion.website} target="_blank" rel="noreferrer noopener" className="text-cyan-300 hover:underline">{pavilion.website}</a></div>
                                )}
                            </div>
                            <form onSubmit={handleSubmitContact} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        required
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="Your name *"
                                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500"
                                    />
                                    <input
                                        value={contactCompany}
                                        onChange={(e) => setContactCompany(e.target.value)}
                                        placeholder="Company"
                                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500"
                                    />
                                    <input
                                        required
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        placeholder="Email *"
                                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500"
                                    />
                                    <input
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="Phone"
                                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500"
                                    />
                                </div>
                                <textarea
                                    required
                                    value={contactMessage}
                                    onChange={(e) => setContactMessage(e.target.value)}
                                    placeholder="Tell us about the products or quantities you need..."
                                    rows={5}
                                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500 resize-none"
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={contactStatus === 'sending'}
                                        className="px-5 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-widest transition disabled:opacity-50"
                                    >
                                        {contactStatus === 'sending' ? 'Sending...' : 'Send message'}
                                    </button>
                                    {contactStatus === 'sent' && (
                                        <span className="text-xs text-emerald-400">Message received. The team will reply soon.</span>
                                    )}
                                    {contactStatus === 'error' && contactError && (
                                        <span className="text-xs text-rose-400">{contactError}</span>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {tab === 'chat' && (
                        <div className="flex flex-col h-full">
                            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-3">
                                {chatEntries.length === 0 && !isSyncingChat && !chatAuthError && (
                                    <div className="text-sm text-gray-500">
                                        Say hi — messages are delivered to the {pavilion.name} team in real time and auto-translated.
                                    </div>
                                )}
                                {chatEntries.map((entry) => {
                                    if (entry.role === 'system') {
                                        return (
                                            <div key={entry.id} className="text-center text-xs text-amber-300/80 italic">
                                                {entry.text}
                                            </div>
                                        );
                                    }
                                    const isVisitor = entry.role === 'visitor';
                                    return (
                                        <div
                                            key={entry.id}
                                            className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                                                isVisitor
                                                    ? 'ml-auto bg-cyan-500 text-slate-950'
                                                    : 'bg-white/5 text-gray-100 border border-white/10'
                                            }`}
                                        >
                                            {entry.isTranslated && (
                                                <div className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${isVisitor ? 'text-slate-700/80' : 'text-cyan-300/80'}`}>
                                                    Translated
                                                </div>
                                            )}
                                            <div>{entry.text}</div>
                                            {entry.originalText && entry.originalText !== entry.text && (
                                                <div className={`mt-2 pt-2 text-xs border-t ${isVisitor ? 'border-slate-800/20 text-slate-700' : 'border-white/10 text-gray-400'}`}>
                                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-70">Original</div>
                                                    <div>{entry.originalText}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {isSyncingChat && chatEntries.length === 0 && (
                                    <div className="text-xs text-gray-500">Loading messages…</div>
                                )}
                            </div>
                            <div className="border-t border-white/5 bg-black/30 p-4">
                                {chatAuthError && (
                                    <div className="mb-2 text-xs text-amber-300">{chatAuthError}</div>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        disabled={Boolean(chatAuthError) || isSendingChat}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                void handleSendChat();
                                            }
                                        }}
                                        placeholder={`Message the ${pavilion.name} team...`}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500 disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleSendChat()}
                                        disabled={Boolean(chatAuthError) || isSendingChat || !chatInput.trim()}
                                        className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Send message"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'meeting' && (
                        <div className="p-6">
                            <div className="mb-4 text-sm text-gray-400">
                                Reserve a 30-minute video walkthrough with the {pavilion.name} sales team.
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-4">
                                {/* Day picker */}
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                    {dayOptions.map((day) => {
                                        const iso = day.toISOString();
                                        const isActive = iso === selectedDayIso;
                                        return (
                                            <button
                                                key={iso}
                                                onClick={() => { setSelectedDayIso(iso); setSelectedSlotIso(null); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition ${
                                                    isActive
                                                        ? 'bg-white text-slate-900 border-white'
                                                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                {formatDay(day)}
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Slots */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 content-start">
                                    {slotsForDay.map((slot) => {
                                        const iso = slot.toISOString();
                                        const isTaken = takenSlots.has(iso);
                                        const isSelected = iso === selectedSlotIso;
                                        const isPast = slot.getTime() < Date.now();
                                        const disabled = isTaken || isPast;
                                        return (
                                            <button
                                                key={iso}
                                                disabled={disabled}
                                                onClick={() => setSelectedSlotIso(iso)}
                                                className={`px-2 py-2 rounded-lg text-xs font-bold tracking-wider border transition ${
                                                    disabled
                                                        ? 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed line-through'
                                                        : isSelected
                                                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                                                          : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/10 hover:border-cyan-400/40'
                                                }`}
                                            >
                                                {formatSlot(slot)}
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Form */}
                                <form onSubmit={handleSubmitMeeting} className="space-y-3 bg-black/30 border border-white/10 rounded-xl p-4">
                                    <input
                                        required
                                        value={meetingName}
                                        onChange={(e) => setMeetingName(e.target.value)}
                                        placeholder="Your name *"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500"
                                    />
                                    <input
                                        required
                                        type="email"
                                        value={meetingEmail}
                                        onChange={(e) => setMeetingEmail(e.target.value)}
                                        placeholder="Email *"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500"
                                    />
                                    <input
                                        value={meetingCompany}
                                        onChange={(e) => setMeetingCompany(e.target.value)}
                                        placeholder="Company"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500"
                                    />
                                    <textarea
                                        value={meetingNotes}
                                        onChange={(e) => setMeetingNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Topics / products you want to discuss"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:bg-white/10 outline-none text-white text-sm placeholder-gray-500 resize-none"
                                    />
                                    <div className="text-xs text-gray-400">
                                        {selectedSlotIso ? (
                                            <>Selected: <span className="text-white font-bold">{new Date(selectedSlotIso).toLocaleString()}</span></>
                                        ) : (
                                            <>Pick a day and slot to continue.</>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedSlotIso || meetingStatus === 'sending'}
                                        className="w-full px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-widest transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {meetingStatus === 'sending' ? 'Booking...' : 'Confirm booking'}
                                    </button>
                                    {meetingStatus === 'sent' && (
                                        <div className="text-xs text-emerald-400">Booking confirmed. Check your email for a calendar invite.</div>
                                    )}
                                    {meetingStatus === 'error' && meetingError && (
                                        <div className="text-xs text-rose-400">{meetingError}</div>
                                    )}
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Product lightbox (overlays the tab area) */}
                {selectedProduct && (
                    <div
                        className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setSelectedProduct(null)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-slate-900/90 border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] max-w-4xl w-full max-h-[85vh] flex flex-col md:flex-row overflow-hidden"
                        >
                            <div className="md:w-1/2 bg-black/60 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedProduct.hero}
                                    alt={selectedProduct.code}
                                    className="max-h-[80vh] w-full object-contain"
                                />
                            </div>
                            <div className="md:w-1/2 p-6 flex flex-col gap-4 overflow-y-auto">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80 font-bold">{pavilion.name}</div>
                                        <h3 className="mt-1 text-2xl font-black text-white tracking-wider">{selectedProduct.code}</h3>
                                        <div className="mt-2 text-cyan-300 text-sm font-bold uppercase tracking-widest">Contact for quote</div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedProduct(null)}
                                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white border border-white/10"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="text-sm text-gray-400">
                                    Request the full spec sheet, MOQ, and lead time by sending a message on the Contact tab or booking a video walkthrough.
                                </div>
                                <div className="mt-auto flex gap-2">
                                    <button
                                        onClick={() => { setSelectedProduct(null); setTab('contact'); setContactMessage((prev) => prev || `Hi, I'd like a quote on ${selectedProduct.code}.`); }}
                                        className="flex-1 px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-widest"
                                    >
                                        Request quote
                                    </button>
                                    <button
                                        onClick={() => { setSelectedProduct(null); setTab('meeting'); }}
                                        className="flex-1 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest border border-white/10"
                                    >
                                        Book meeting
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
