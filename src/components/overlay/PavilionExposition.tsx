'use client';

// Full-screen pavilion "exposition" overlay. Activated when the Unreal
// blueprint sends `entered_pavilion:<id>` through handle_responses.
//
// Tabs: Products | Contact | Chat | Book Meeting.
// - Products grid uses the hero image from the per-pavilion manifest,
//   served through next/image so users get AVIF/WebP, automatic sizing,
//   lazy loading and blur-up placeholders.
// - Contact form persists to public.pavilion_contact_requests (Supabase).
// - Chat is backed by the existing supplier_messages infrastructure with
//   supplierId="pav_<id>"; auto-translation is inherited.
// - Book Meeting generates 30-min slots (9:00-18:00 local), marks taken
//   slots using GET /api/pavilion-booking, and posts on confirm.
//
// Copy is localised (en/ru/zh) via useLanguage().

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Calendar, Mail, MessageSquare, Package, Send, X } from 'lucide-react';
import type { Pavilion, PavilionProduct } from '@/lib/pavilions';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { readSupplierChatApiResponse, type SupplierChatApiMessage } from '@/lib/supplierChat';
import type { AppLanguage } from '@/lib/i18n';

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
        if (dow === 0 || dow === 6) continue;
        days.push(day);
    }
    return days;
};

// --- i18n strings ---
type Copy = {
    pavilionLabel: string;
    close: string;
    tabs: Record<Tab, string>;
    productsIntro: string;
    productsEmpty: string;
    quote: string;
    collectionLabel: string;
    piecesCount: (count: number) => string;
    authorizedCatalogue: string;
    viewPiece: string;
    contactHeadline: string;
    contactEmail: string;
    contactPhone: string;
    contactWebsite: string;
    fieldName: string;
    fieldCompany: string;
    fieldEmail: string;
    fieldPhone: string;
    fieldMessage: string;
    fieldMessagePlaceholder: string;
    sendMessage: string;
    sending: string;
    sent: string;
    chatWelcome: (name: string) => string;
    chatSigninHint: string;
    chatInputPlaceholder: (name: string) => string;
    chatLoading: string;
    chatTranslated: string;
    chatOriginal: string;
    meetingHeadline: (name: string) => string;
    pickDayHint: string;
    selectedLabel: string;
    confirmBooking: string;
    booking: string;
    bookingConfirmed: string;
    notesPlaceholder: string;
    productDetailBody: string;
    requestQuote: string;
    bookMeeting: string;
    quotePrefill: (code: string) => string;
    dateLocale: string;
};

const COPY: Record<AppLanguage, Copy> = {
    en: {
        pavilionLabel: 'Pavilion',
        close: 'Close',
        tabs: { products: 'Products', contact: 'Contact', chat: 'Chat', meeting: 'Book Meeting' },
        productsIntro: 'Authorized collection — tap any item to view details.',
        productsEmpty: 'No products catalogued yet.',
        quote: 'Available on request',
        collectionLabel: 'Collection',
        piecesCount: (count) => `${count} pieces`,
        authorizedCatalogue: 'Authorized catalogue',
        viewPiece: 'View',
        contactHeadline: 'Send a direct message — the sales team replies by email.',
        contactEmail: 'Email',
        contactPhone: 'Phone',
        contactWebsite: 'Website',
        fieldName: 'Your name *',
        fieldCompany: 'Company',
        fieldEmail: 'Email *',
        fieldPhone: 'Phone',
        fieldMessage: 'Message',
        fieldMessagePlaceholder: 'Tell us about the products or quantities you need...',
        sendMessage: 'Send message',
        sending: 'Sending...',
        sent: 'Message received. The team will reply soon.',
        chatWelcome: (name) => `Say hi — messages reach the ${name} team in real time and are auto-translated.`,
        chatSigninHint: 'Sign in to chat with the pavilion team.',
        chatInputPlaceholder: (name) => `Message the ${name} team...`,
        chatLoading: 'Loading messages…',
        chatTranslated: 'Translated',
        chatOriginal: 'Original',
        meetingHeadline: (name) => `Reserve a 30-minute video walkthrough with the ${name} sales team.`,
        pickDayHint: 'Pick a day and slot to continue.',
        selectedLabel: 'Selected',
        confirmBooking: 'Confirm booking',
        booking: 'Booking...',
        bookingConfirmed: 'Booking confirmed. Check your email for a calendar invite.',
        notesPlaceholder: 'Topics / products you want to discuss',
        productDetailBody:
            'Request the full spec sheet, MOQ and lead time by sending a message on the Contact tab or booking a video walkthrough.',
        requestQuote: 'Request quote',
        bookMeeting: 'Book meeting',
        quotePrefill: (code) => `Hi, I'd like a quote on ${code}.`,
        dateLocale: 'en-US',
    },
    ru: {
        pavilionLabel: 'Павильон',
        close: 'Закрыть',
        tabs: { products: 'Товары', contact: 'Контакты', chat: 'Чат', meeting: 'Встреча' },
        productsIntro: 'Официальная коллекция — нажмите на товар, чтобы открыть детали.',
        productsEmpty: 'Каталог пока пуст.',
        quote: 'Цена по запросу',
        collectionLabel: 'Коллекция',
        piecesCount: (count) => `${count} изделий`,
        authorizedCatalogue: 'Официальный каталог',
        viewPiece: 'Открыть',
        contactHeadline: 'Напишите напрямую — отдел продаж ответит на email.',
        contactEmail: 'Email',
        contactPhone: 'Телефон',
        contactWebsite: 'Сайт',
        fieldName: 'Ваше имя *',
        fieldCompany: 'Компания',
        fieldEmail: 'Email *',
        fieldPhone: 'Телефон',
        fieldMessage: 'Сообщение',
        fieldMessagePlaceholder: 'Напишите, какие товары и количества вас интересуют...',
        sendMessage: 'Отправить',
        sending: 'Отправка...',
        sent: 'Сообщение получено. Команда скоро ответит.',
        chatWelcome: (name) => `Напишите нам — сообщения приходят команде ${name} в реальном времени и переводятся автоматически.`,
        chatSigninHint: 'Войдите, чтобы общаться с командой павильона.',
        chatInputPlaceholder: (name) => `Сообщение для команды ${name}...`,
        chatLoading: 'Загрузка сообщений…',
        chatTranslated: 'Перевод',
        chatOriginal: 'Оригинал',
        meetingHeadline: (name) => `Забронируйте 30-минутную видеоэкскурсию с командой ${name}.`,
        pickDayHint: 'Выберите день и слот для продолжения.',
        selectedLabel: 'Выбрано',
        confirmBooking: 'Подтвердить',
        booking: 'Бронируем...',
        bookingConfirmed: 'Встреча забронирована. Приглашение придёт на email.',
        notesPlaceholder: 'Темы / товары для обсуждения',
        productDetailBody:
            'Запросите полную спецификацию, минимальный заказ и сроки — через вкладку Контакты или забронируйте видеовстречу.',
        requestQuote: 'Запросить цену',
        bookMeeting: 'Записаться',
        quotePrefill: (code) => `Здравствуйте, подскажите цену на ${code}.`,
        dateLocale: 'ru-RU',
    },
    zh: {
        pavilionLabel: '展馆',
        close: '关闭',
        tabs: { products: '产品', contact: '联系', chat: '聊天', meeting: '预约会议' },
        productsIntro: '授权产品集合 — 点击查看详情。',
        productsEmpty: '暂无产品。',
        quote: '询价供货',
        collectionLabel: '合集',
        piecesCount: (count) => `${count} 件作品`,
        authorizedCatalogue: '官方目录',
        viewPiece: '查看',
        contactHeadline: '直接留言，销售团队将通过邮件回复。',
        contactEmail: '邮箱',
        contactPhone: '电话',
        contactWebsite: '网站',
        fieldName: '您的姓名 *',
        fieldCompany: '公司',
        fieldEmail: '邮箱 *',
        fieldPhone: '电话',
        fieldMessage: '留言',
        fieldMessagePlaceholder: '请说明您需要的产品或数量...',
        sendMessage: '发送',
        sending: '发送中...',
        sent: '留言已收到，我们会尽快回复。',
        chatWelcome: (name) => `发送消息 — ${name} 团队将实时收到并自动翻译。`,
        chatSigninHint: '登录后即可与展馆团队聊天。',
        chatInputPlaceholder: (name) => `给 ${name} 团队发送消息...`,
        chatLoading: '正在加载消息…',
        chatTranslated: '已翻译',
        chatOriginal: '原文',
        meetingHeadline: (name) => `预约 30 分钟与 ${name} 销售团队的视频会议。`,
        pickDayHint: '选择日期与时间继续。',
        selectedLabel: '已选',
        confirmBooking: '确认预约',
        booking: '预约中...',
        bookingConfirmed: '预约成功，日历邀请已发送至您的邮箱。',
        notesPlaceholder: '想要讨论的主题 / 产品',
        productDetailBody:
            '可通过「联系」选项卡索取完整规格、最小起订量和交期，或预约视频演示。',
        requestQuote: '咨询报价',
        bookMeeting: '预约会议',
        quotePrefill: (code) => `您好，请提供 ${code} 的报价。`,
        dateLocale: 'zh-CN',
    },
};

export default function PavilionExposition({ pavilion, onClose }: PavilionExpositionProps) {
    const { language } = useLanguage();
    const copy = COPY[language];
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

    const TAB_DEFS: Array<{ id: Tab; icon: typeof Package }> = [
        { id: 'products', icon: Package },
        { id: 'contact', icon: Mail },
        { id: 'chat', icon: MessageSquare },
        { id: 'meeting', icon: Calendar },
    ];

    const formatDay = useCallback(
        (d: Date) => d.toLocaleDateString(copy.dateLocale, { weekday: 'short', month: 'short', day: 'numeric' }),
        [copy.dateLocale]
    );
    const formatSlot = useCallback(
        (d: Date) => d.toLocaleTimeString(copy.dateLocale, { hour: '2-digit', minute: '2-digit' }),
        [copy.dateLocale]
    );

    // Fetch taken slots when the Meeting tab opens.
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
                for (const row of body.taken ?? []) next.add(new Date(row.slotAt).toISOString());
                setTakenSlots(next);
            } catch { /* ignore */ }
        };
        void load();
        return () => { cancelled = true; };
    }, [pavilion.id, tab]);

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
            if (!res.ok || !body.success) throw new Error(body.error || 'Failed to send.');
            setContactStatus('sent');
            setContactName(''); setContactCompany(''); setContactEmail('');
            setContactPhone(''); setContactMessage('');
        } catch (err) {
            setContactStatus('error');
            setContactError(err instanceof Error ? err.message : 'Failed to send.');
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
            if (res.status === 401) { setChatAuthError(copy.chatSigninHint); return; }
            if (!res.ok || !body.success) throw new Error(body.error || 'Unable to load messages.');
            setChatAuthError(null);
            setChatEntries((body.messages ?? []).map(toChatEntry));
        } catch (err) {
            if (chatEntries.length === 0) {
                const msg = err instanceof Error ? err.message : 'Connection issue.';
                setChatEntries([{ id: 'sys-error', role: 'system', text: msg, timestamp: Date.now() }]);
            }
        } finally {
            setIsSyncingChat(false);
        }
    }, [supplierId, language, chatEntries.length, copy.chatSigninHint]);

    const handleSendChat = useCallback(async () => {
        const text = chatInput.trim();
        if (!text || isSendingChat) return;
        setChatInput('');
        setIsSendingChat(true);
        const optimisticId = `local-${Date.now()}`;
        setChatEntries((prev) => [...prev, { id: optimisticId, role: 'visitor', text, timestamp: Date.now() }]);
        try {
            const res = await fetch('/api/supplier-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplierId, senderRole: 'buyer', senderName: 'Guest', text, senderLanguage: language }),
            });
            const body = await readSupplierChatApiResponse(res);
            if (res.status === 401) { setChatAuthError(copy.chatSigninHint); return; }
            if (!res.ok || !body.success) throw new Error(body.error || 'Unable to send message.');
            setChatAuthError(null);
            await syncChat();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Connection issue.';
            setChatEntries((prev) => [...prev, { id: `sys-${Date.now()}`, role: 'system', text: msg, timestamp: Date.now() }]);
        } finally {
            setIsSendingChat(false);
        }
    }, [chatInput, isSendingChat, supplierId, language, syncChat, copy.chatSigninHint]);

    useEffect(() => {
        if (tab !== 'chat') return;
        void syncChat();
        const id = window.setInterval(() => void syncChat(), POLL_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [tab, syncChat]);

    const handleSubmitMeeting = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedSlotIso) {
            setMeetingError(copy.pickDayHint);
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
                    name: meetingName, email: meetingEmail, company: meetingCompany,
                    slotAt: selectedSlotIso, durationMinutes: SLOT_MINUTES, notes: meetingNotes,
                }),
            });
            const body = (await res.json()) as { success?: boolean; error?: string };
            if (!res.ok || !body.success) throw new Error(body.error || 'Failed to book.');
            setMeetingStatus('sent');
            setTakenSlots((prev) => new Set([...prev, selectedSlotIso]));
            setSelectedSlotIso(null);
            setMeetingName(''); setMeetingEmail(''); setMeetingCompany(''); setMeetingNotes('');
        } catch (err) {
            setMeetingStatus('error');
            setMeetingError(err instanceof Error ? err.message : 'Failed to book.');
        }
    };

    const selectedDay = useMemo(() => {
        if (!selectedDayIso) return null;
        return dayOptions.find((d) => d.toISOString() === selectedDayIso) ?? null;
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
            <div className="relative bg-[linear-gradient(160deg,rgba(8,12,20,0.95),rgba(15,22,36,0.92))] backdrop-blur-2xl border border-white/10 w-full max-w-6xl h-[88vh] rounded-3xl shadow-[0_40px_120px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Ambient glow */}
                <div className={`pointer-events-none absolute -top-32 -right-32 w-[40rem] h-[40rem] rounded-full blur-[140px] opacity-60 bg-gradient-to-br ${pavilion.heroColor}`} />
                <div className="pointer-events-none absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full blur-[120px] opacity-40 bg-gradient-to-tr from-white/5 to-cyan-500/10" />
                {/* Subtle grid texture */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Header */}
                <div className="relative p-8 border-b border-white/5 bg-black/20 z-10">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/80 font-bold">{copy.pavilionLabel}</div>
                            <h2 className="mt-2 text-4xl font-black uppercase tracking-[0.05em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]">
                                {pavilion.name}
                            </h2>
                            <p className="mt-2 text-sm text-gray-400 max-w-2xl leading-relaxed">{pavilion.tagline}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white border border-white/10"
                            aria-label={copy.close}
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="mt-7 flex flex-wrap gap-2">
                        {TAB_DEFS.map(({ id, icon: Icon }) => {
                            const isActive = tab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => { setTab(id); setSelectedProduct(null); }}
                                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] transition ${
                                        isActive
                                            ? 'bg-white text-slate-900 shadow-[0_0_25px_rgba(255,255,255,0.25)]'
                                            : 'bg-white/[0.04] text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                                    }`}
                                >
                                    <Icon size={13} strokeWidth={2.5} />
                                    {copy.tabs[id]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Body */}
                <div className="relative flex-1 overflow-y-auto custom-scrollbar z-10">
                    {tab === 'products' && (
                        <div className="relative">
                            {/* Editorial hero band */}
                            <div className="relative border-b border-white/5 bg-[radial-gradient(circle_at_20%_0%,rgba(196,154,108,0.08),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] px-8 py-10">
                                <div className="flex items-start justify-between gap-8 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                        {/* Eyebrow: Collection · N° 001 (own line, same type scale, no awkward mixed alignment) */}
                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#c49a6c]">
                                            <span className="h-px w-8 bg-[#c49a6c]/60" />
                                            <span>{copy.collectionLabel}</span>
                                            <span className="text-[#c49a6c]/40">·</span>
                                            <span className="font-mono tracking-[0.2em]">N° 001</span>
                                        </div>
                                        {/* Headline: tagline on its own, uppercase heavy, tight tracking */}
                                        <h3 className="mt-4 text-[clamp(1.5rem,3vw,2.5rem)] font-black uppercase tracking-[0.01em] text-white leading-[1.1]">
                                            {pavilion.tagline}
                                        </h3>
                                        <p className="mt-4 max-w-2xl text-[13px] text-gray-400 leading-relaxed">{copy.productsIntro}</p>
                                    </div>
                                    {/* Piece count — right-aligned, clean vertical stack, no blue-bleed */}
                                    <div className="shrink-0 text-right border-l border-white/10 pl-6">
                                        <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                            {copy.authorizedCatalogue}
                                        </div>
                                        <div className="mt-2 font-mono text-3xl font-light text-white leading-none">
                                            {String(pavilion.products.length).padStart(3, '0')}
                                        </div>
                                        <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-gray-500">
                                            {copy.piecesCount(pavilion.products.length)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Product grid */}
                            <div className="p-8">
                                {pavilion.products.length === 0 ? (
                                    <div className="text-gray-500 text-sm">{copy.productsEmpty}</div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
                                        {pavilion.products.map((product, idx) => {
                                            const indexLabel = String(idx + 1).padStart(3, '0');
                                            return (
                                                <button
                                                    key={product.id}
                                                    onClick={() => setSelectedProduct(product)}
                                                    className="group relative text-left flex flex-col transition-all duration-500 hover:-translate-y-1"
                                                >
                                                    {/* Index number — editorial "N° 001" style */}
                                                    <div className="flex items-baseline justify-between mb-2 px-1">
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="font-mono text-[10px] text-[#c49a6c]/70 tracking-[0.2em]">N°</span>
                                                            <span className="font-mono text-[11px] text-gray-400 tracking-[0.15em] group-hover:text-[#c49a6c] transition-colors">{indexLabel}</span>
                                                        </div>
                                                        <div className="h-px flex-1 ml-3 bg-gradient-to-r from-white/5 to-transparent" />
                                                    </div>

                                                    {/* Pedestal: product image with museum-display shadow */}
                                                    <div className="relative">
                                                        <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_bottom,rgba(196,154,108,0.06),rgba(255,255,255,0.02)_40%,rgba(0,0,0,0.3))] shadow-[0_12px_40px_rgba(0,0,0,0.5)] group-hover:border-[#c49a6c]/40 transition-all duration-500">
                                                            <Image
                                                                src={product.hero}
                                                                alt={product.code}
                                                                fill
                                                                sizes="(max-width:768px) 50vw,(max-width:1280px) 33vw,25vw"
                                                                priority={idx < 4}
                                                                loading={idx < 4 ? 'eager' : 'lazy'}
                                                                className="object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
                                                            />
                                                            {/* Vignette */}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                                                            {/* Shine sweep on hover */}
                                                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                                                            {/* Corner brackets — subtle premium detail */}
                                                            <div className="absolute top-3 left-3 w-5 h-5 border-l border-t border-[#c49a6c]/0 group-hover:border-[#c49a6c]/80 transition-all duration-500" />
                                                            <div className="absolute top-3 right-3 w-5 h-5 border-r border-t border-[#c49a6c]/0 group-hover:border-[#c49a6c]/80 transition-all duration-500" />
                                                            <div className="absolute bottom-3 left-3 w-5 h-5 border-l border-b border-[#c49a6c]/0 group-hover:border-[#c49a6c]/80 transition-all duration-500" />
                                                            <div className="absolute bottom-3 right-3 w-5 h-5 border-r border-b border-[#c49a6c]/0 group-hover:border-[#c49a6c]/80 transition-all duration-500" />
                                                            {/* Hover reveal: view arrow */}
                                                            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c49a6c] text-[#0a0e1a] text-[10px] font-bold uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-400 shadow-[0_4px_20px_rgba(196,154,108,0.4)]">
                                                                {copy.viewPiece}
                                                                <ArrowUpRight size={12} strokeWidth={2.5} />
                                                            </div>
                                                        </div>
                                                        {/* Museum pedestal shadow — softer floor glow */}
                                                        <div className="absolute -bottom-4 left-[10%] right-[10%] h-6 bg-black/60 blur-xl rounded-full -z-10" />
                                                    </div>

                                                    {/* Caption */}
                                                    <div className="mt-4 px-1 flex flex-col gap-1">
                                                        <div className="font-mono text-[13px] font-bold text-white tracking-[0.15em] group-hover:text-[#c49a6c] transition-colors">
                                                            {product.code}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-[0.25em]">
                                                            {copy.quote}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'contact' && (
                        <div className="p-8 max-w-2xl">
                            <p className="mb-4 text-sm text-gray-400 leading-relaxed">{copy.contactHeadline}</p>
                            <div className="mb-6 text-xs text-gray-500 space-y-1.5">
                                <div>{copy.contactEmail}: <span className="text-cyan-300">{pavilion.contactEmail}</span></div>
                                {pavilion.contactPhone && <div>{copy.contactPhone}: <span className="text-cyan-300">{pavilion.contactPhone}</span></div>}
                                {pavilion.website && (
                                    <div>{copy.contactWebsite}: <a href={pavilion.website} target="_blank" rel="noreferrer noopener" className="text-cyan-300 hover:underline">{pavilion.website}</a></div>
                                )}
                            </div>
                            <form onSubmit={handleSubmitContact} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={copy.fieldName} className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 transition" />
                                    <input value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} placeholder={copy.fieldCompany} className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 transition" />
                                    <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={copy.fieldEmail} className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 transition" />
                                    <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={copy.fieldPhone} className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 transition" />
                                </div>
                                <textarea required value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder={copy.fieldMessagePlaceholder} rows={5} className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 resize-none transition" />
                                <div className="flex items-center gap-3">
                                    <button type="submit" disabled={contactStatus === 'sending'} className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] uppercase tracking-[0.2em] transition disabled:opacity-50">
                                        {contactStatus === 'sending' ? copy.sending : copy.sendMessage}
                                    </button>
                                    {contactStatus === 'sent' && <span className="text-xs text-emerald-400">{copy.sent}</span>}
                                    {contactStatus === 'error' && contactError && <span className="text-xs text-rose-400">{contactError}</span>}
                                </div>
                            </form>
                        </div>
                    )}

                    {tab === 'chat' && (
                        <div className="flex flex-col h-full">
                            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-3">
                                {chatEntries.length === 0 && !isSyncingChat && !chatAuthError && (
                                    <div className="text-sm text-gray-500">{copy.chatWelcome(pavilion.name)}</div>
                                )}
                                {chatEntries.map((entry) => {
                                    if (entry.role === 'system') {
                                        return <div key={entry.id} className="text-center text-xs text-amber-300/80 italic">{entry.text}</div>;
                                    }
                                    const isVisitor = entry.role === 'visitor';
                                    return (
                                        <div key={entry.id} className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isVisitor ? 'ml-auto bg-cyan-500 text-slate-950' : 'bg-white/[0.06] text-gray-100 border border-white/10'}`}>
                                            {entry.isTranslated && (
                                                <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${isVisitor ? 'text-slate-700/80' : 'text-cyan-300/80'}`}>{copy.chatTranslated}</div>
                                            )}
                                            <div>{entry.text}</div>
                                            {entry.originalText && entry.originalText !== entry.text && (
                                                <div className={`mt-2 pt-2 text-xs border-t ${isVisitor ? 'border-slate-800/20 text-slate-700' : 'border-white/10 text-gray-400'}`}>
                                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">{copy.chatOriginal}</div>
                                                    <div>{entry.originalText}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {isSyncingChat && chatEntries.length === 0 && <div className="text-xs text-gray-500">{copy.chatLoading}</div>}
                            </div>
                            <div className="border-t border-white/5 bg-black/30 p-4">
                                {chatAuthError && (
                                    <div className="mb-2 text-xs text-amber-300">
                                        <a
                                            href="/login"
                                            className="underline decoration-dotted underline-offset-2 hover:text-amber-200"
                                        >
                                            {chatAuthError}
                                        </a>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        disabled={Boolean(chatAuthError) || isSendingChat}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendChat(); }
                                        }}
                                        placeholder={copy.chatInputPlaceholder(pavilion.name)}
                                        className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 disabled:opacity-50 transition"
                                    />
                                    <button type="button" onClick={() => void handleSendChat()} disabled={Boolean(chatAuthError) || isSendingChat || !chatInput.trim()} className="p-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition disabled:opacity-50 disabled:cursor-not-allowed" aria-label={copy.sendMessage}>
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'meeting' && (
                        <div className="p-8">
                            <p className="mb-6 text-sm text-gray-400 leading-relaxed">{copy.meetingHeadline(pavilion.name)}</p>
                            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-4">
                                <div className="space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
                                    {dayOptions.map((day) => {
                                        const iso = day.toISOString();
                                        const isActive = iso === selectedDayIso;
                                        return (
                                            <button
                                                key={iso}
                                                onClick={() => { setSelectedDayIso(iso); setSelectedSlotIso(null); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.15em] border transition ${isActive ? 'bg-white text-slate-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.25)]' : 'bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/10'}`}
                                            >{formatDay(day)}</button>
                                        );
                                    })}
                                </div>
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
                                                className={`px-2 py-2.5 rounded-lg text-xs font-bold tracking-wider border transition ${disabled ? 'bg-white/[0.02] text-gray-600 border-white/5 cursor-not-allowed line-through' : isSelected ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.4)]' : 'bg-white/[0.04] text-gray-200 border-white/10 hover:bg-white/10 hover:border-cyan-400/40'}`}
                                            >{formatSlot(slot)}</button>
                                        );
                                    })}
                                </div>
                                <form onSubmit={handleSubmitMeeting} className="space-y-3 bg-black/20 border border-white/10 rounded-2xl p-5">
                                    <input required value={meetingName} onChange={(e) => setMeetingName(e.target.value)} placeholder={copy.fieldName} className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 transition" />
                                    <input required type="email" value={meetingEmail} onChange={(e) => setMeetingEmail(e.target.value)} placeholder={copy.fieldEmail} className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 transition" />
                                    <input value={meetingCompany} onChange={(e) => setMeetingCompany(e.target.value)} placeholder={copy.fieldCompany} className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 transition" />
                                    <textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} rows={3} placeholder={copy.notesPlaceholder} className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.08] outline-none text-white text-sm placeholder-gray-500 resize-none transition" />
                                    <div className="text-xs text-gray-400">
                                        {selectedSlotIso ? (<>{copy.selectedLabel}: <span className="text-white font-bold">{new Date(selectedSlotIso).toLocaleString(copy.dateLocale)}</span></>) : (<>{copy.pickDayHint}</>)}
                                    </div>
                                    <button type="submit" disabled={!selectedSlotIso || meetingStatus === 'sending'} className="w-full px-4 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] uppercase tracking-[0.2em] transition disabled:opacity-50 disabled:cursor-not-allowed">
                                        {meetingStatus === 'sending' ? copy.booking : copy.confirmBooking}
                                    </button>
                                    {meetingStatus === 'sent' && <div className="text-xs text-emerald-400">{copy.bookingConfirmed}</div>}
                                    {meetingStatus === 'error' && meetingError && <div className="text-xs text-rose-400">{meetingError}</div>}
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Product lightbox */}
                {selectedProduct && (
                    <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedProduct(null)}>
                        <div onClick={(e) => e.stopPropagation()} className="relative bg-[linear-gradient(160deg,rgba(12,18,28,0.96),rgba(20,28,42,0.94))] border border-white/10 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] max-w-5xl w-full max-h-[85vh] flex flex-col md:flex-row overflow-hidden">
                            <div className="md:w-3/5 relative bg-black flex items-center justify-center min-h-[300px]">
                                <Image
                                    src={selectedProduct.hero}
                                    alt={selectedProduct.code}
                                    fill
                                    sizes="(max-width:768px) 100vw, 60vw"
                                    priority
                                    className="object-contain"
                                />
                            </div>
                            <div className="md:w-2/5 p-8 flex flex-col gap-5 overflow-y-auto">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80 font-bold">{pavilion.name}</div>
                                        <h3 className="mt-2 text-3xl font-black text-white tracking-[0.08em]">{selectedProduct.code}</h3>
                                        <div className="mt-2 text-cyan-300 text-xs font-bold uppercase tracking-[0.25em]">{copy.quote}</div>
                                    </div>
                                    <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white border border-white/10" aria-label={copy.close}>
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="text-sm text-gray-400 leading-relaxed">{copy.productDetailBody}</div>
                                <div className="mt-auto flex gap-2">
                                    <button onClick={() => { setSelectedProduct(null); setTab('contact'); setContactMessage((prev) => prev || copy.quotePrefill(selectedProduct.code)); }} className="flex-1 px-4 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] uppercase tracking-[0.2em]">
                                        {copy.requestQuote}
                                    </button>
                                    <button onClick={() => { setSelectedProduct(null); setTab('meeting'); }} className="flex-1 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold text-[11px] uppercase tracking-[0.2em] border border-white/10">
                                        {copy.bookMeeting}
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
