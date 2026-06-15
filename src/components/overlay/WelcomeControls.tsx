'use client';

// Welcome / loading splash rendered inside the FastView launch overlay
// while the stream connects. Shows an animated 3DSFERA emblem, a progress
// shimmer, and a compact controls guide so the user doesn't see a black
// screen between click-to-start and the first video frame.
//
// Localised via useLanguage().

import { ArrowDown, Mouse, MousePointer2, Space } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { AppLanguage } from '@/lib/i18n';

type Copy = {
    heading: string;
    subheading: string;
    controls: string;
    move: string;
    moveHint: string;
    look: string;
    lookHint: string;
    interact: string;
    interactHint: string;
    talk: string;
    talkHint: string;
    exit: string;
    exitHint: string;
    sprint: string;
    sprintHint: string;
    pavilionTriggerHeading: string;
    pavilionTriggerBody: string;
    pavilionTriggerBadge: string;
};

const COPY: Record<AppLanguage, Copy> = {
    en: {
        heading: 'Preparing your live showroom',
        subheading: 'Take a moment to learn the controls.',
        controls: 'Controls',
        move: 'Move',
        moveHint: 'Walk around',
        look: 'Look',
        lookHint: 'Turn the camera',
        interact: 'Interact',
        interactHint: 'Open doors & select',
        talk: 'Talk',
        talkHint: 'Hold to speak',
        exit: 'Exit inspect',
        exitHint: 'Leave focus mode',
        sprint: 'Sprint',
        sprintHint: 'Move faster',
        pavilionTriggerHeading: 'Walk up to the glowing pedestal',
        pavilionTriggerBody: 'Each pavilion has a bright cylinder at its entrance. Walk up close — the catalogue opens automatically when you step inside.',
        pavilionTriggerBadge: 'How to open the catalogue',
    },
    ru: {
        heading: 'Готовим ваш онлайн-шоурум',
        subheading: 'Уделите пару секунд, чтобы изучить управление.',
        controls: 'Управление',
        move: 'Движение',
        moveHint: 'Перемещение',
        look: 'Обзор',
        lookHint: 'Поворот камеры',
        interact: 'Взаимодействие',
        interactHint: 'Двери и выбор',
        talk: 'Голос',
        talkHint: 'Удерживайте для речи',
        exit: 'Выход из осмотра',
        exitHint: 'Выйти из фокуса',
        sprint: 'Ускорение',
        sprintHint: 'Быстрее',
        pavilionTriggerHeading: 'Подойдите к светящемуся столбу',
        pavilionTriggerBody: 'У входа в каждый павильон стоит яркий цилиндр. Подойдите к нему вплотную — каталог откроется автоматически.',
        pavilionTriggerBadge: 'Как открыть каталог',
    },
    zh: {
        heading: '正在准备您的直播展厅',
        subheading: '花几秒时间了解一下操作。',
        controls: '操作说明',
        move: '移动',
        moveHint: '四处走动',
        look: '视角',
        lookHint: '转动镜头',
        interact: '互动',
        interactHint: '开门与选取',
        talk: '语音',
        talkHint: '按住说话',
        exit: '退出查看',
        exitHint: '离开聚焦',
        sprint: '加速',
        sprintHint: '快速移动',
        pavilionTriggerHeading: '走近发光的柱子',
        pavilionTriggerBody: '每个展馆入口处都有一根明亮的圆柱。走近它——目录会自动打开。',
        pavilionTriggerBadge: '如何打开目录',
    },
};

// A single keycap glyph — used for WASD / F / T / X.
const KeyCap = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => (
    <span
        className={`inline-flex items-center justify-center ${wide ? 'px-3 min-w-[3rem]' : 'w-8'} h-8 rounded-md border border-white/20 bg-gradient-to-b from-white/15 to-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.4)]`}
    >
        {children}
    </span>
);

const ControlRow = ({
    visual,
    label,
    hint,
}: {
    visual: React.ReactNode;
    label: string;
    hint: string;
}) => (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06] hover:border-white/15">
        <div className="flex items-center justify-center min-w-[4.5rem] gap-1">{visual}</div>
        <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-white">{label}</div>
            <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{hint}</div>
        </div>
    </div>
);

interface WelcomeControlsProps {
    /** Progress 0..1 of the connection sequence, or null for indeterminate. */
    progress?: number | null;
    /** Title shown above the hero. Overrides default "heading" copy. */
    title?: string;
    /** Subtitle — falls back to default "subheading" copy if omitted. */
    subtitle?: string;
}

export default function WelcomeControls({ progress = null, title, subtitle }: WelcomeControlsProps) {
    const { language } = useLanguage();
    const copy = COPY[language];
    const pct = progress === null ? null : Math.max(0, Math.min(1, progress));

    return (
        <div className="relative flex flex-col gap-5">
            {/* Animated hero */}
            <div className="relative flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0">
                    {/* Orbit rings */}
                    <span className="absolute inset-0 rounded-2xl border border-[#66d9cb]/40 animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <span className="absolute inset-1 rounded-xl border border-[#66d9cb]/60" />
                    <span className="absolute inset-0 rounded-2xl bg-[#66d9cb]/10 shadow-[0_0_40px_rgba(102,217,203,0.35)]" />
                    {/* Core */}
                    <span className="absolute inset-[30%] rounded-full bg-[#66d9cb] shadow-[0_0_20px_rgba(102,217,203,0.8)] animate-pulse" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                        {title ?? copy.heading}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">{subtitle ?? copy.subheading}</p>
                </div>
            </div>

            {/* Progress shimmer */}
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
                {pct === null ? (
                    <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#66d9cb] to-transparent animate-[shimmer_1.4s_linear_infinite]" />
                ) : (
                    <div
                        className="absolute inset-y-0 left-0 bg-[#66d9cb] shadow-[0_0_12px_rgba(102,217,203,0.6)] transition-all duration-500 ease-out"
                        style={{ width: `${Math.round(pct * 100)}%` }}
                    />
                )}
            </div>

            {/* Controls grid */}
            <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-gray-400">
                    {copy.controls}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ControlRow
                        visual={
                            <div className="flex flex-col items-center gap-1">
                                <KeyCap>W</KeyCap>
                                <div className="flex gap-1">
                                    <KeyCap>A</KeyCap>
                                    <KeyCap>S</KeyCap>
                                    <KeyCap>D</KeyCap>
                                </div>
                            </div>
                        }
                        label={copy.move}
                        hint={copy.moveHint}
                    />
                    <ControlRow
                        visual={
                            <div className="flex items-center gap-2 text-white/80">
                                <Mouse size={22} strokeWidth={1.8} />
                                <MousePointer2 size={14} strokeWidth={1.8} className="text-[#66d9cb]" />
                            </div>
                        }
                        label={copy.look}
                        hint={copy.lookHint}
                    />
                    <ControlRow
                        visual={<KeyCap>F</KeyCap>}
                        label={copy.interact}
                        hint={copy.interactHint}
                    />
                    <ControlRow
                        visual={<KeyCap>X</KeyCap>}
                        label={copy.exit}
                        hint={copy.exitHint}
                    />
                    <ControlRow
                        visual={
                            <div className="flex items-center gap-1 text-white/80">
                                <KeyCap wide>Shift</KeyCap>
                                <span className="text-gray-500 text-xs">+</span>
                                <Space size={18} strokeWidth={1.8} className="opacity-40" />
                            </div>
                        }
                        label={copy.sprint}
                        hint={copy.sprintHint}
                    />
                </div>
            </div>

            {/* Pavilion trigger visual — "walk up to the glowing cylinder".
                Mirrors the in-game trigger (a bright white cylindrical
                pedestal at each pavilion entrance) so first-time users know
                exactly what to look for. */}
            <div className="relative overflow-hidden rounded-2xl border border-[#66d9cb]/25 bg-[linear-gradient(135deg,rgba(102,217,203,0.08),rgba(102,217,203,0.02))] p-4">
                <div className="flex items-center gap-5">
                    {/* Animated pedestal */}
                    <div className="relative shrink-0 w-20 h-24 flex flex-col items-center justify-end">
                        {/* Bouncing down arrow */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[#66d9cb] animate-bounce">
                            <ArrowDown size={18} strokeWidth={2.5} />
                        </div>
                        {/* Crosshair target at top of cylinder */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-[#66d9cb]/80 flex items-center justify-center">
                            <div className="h-1 w-1 rounded-full bg-[#66d9cb] shadow-[0_0_6px_rgba(102,217,203,0.9)]" />
                        </div>
                        {/* Cylinder body — glowing white pedestal */}
                        <div className="relative w-12 h-16 rounded-t-full rounded-b-sm bg-gradient-to-b from-white via-[#e6fffb] to-[#a8ece1] shadow-[0_0_30px_rgba(102,217,203,0.55),inset_-4px_0_10px_rgba(102,217,203,0.3)]">
                            {/* Pulsing halo around the cylinder */}
                            <span className="absolute inset-0 rounded-t-full rounded-b-sm bg-[#66d9cb]/30 blur-md animate-pulse" />
                        </div>
                        {/* Ground shadow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-black/50 blur-md rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#66d9cb]">
                            {copy.pavilionTriggerBadge}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white leading-tight">
                            {copy.pavilionTriggerHeading}
                        </div>
                        <div className="mt-1 text-[11px] text-gray-400 leading-relaxed">
                            {copy.pavilionTriggerBody}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
