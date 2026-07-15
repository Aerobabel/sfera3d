'use client';

import { Volume2, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

export type CutsceneTone = 'opening' | 'hall' | 'water';

export type CutsceneOverlayCopy = {
    sferaSignal: string;
    accessFilm: string;
    premiumSignal: string;
};

export function CutsceneCinematicOverlay({
    tone,
    label,
    copy,
}: {
    tone: CutsceneTone;
    label: string;
    copy: CutsceneOverlayCopy;
}) {
    const toneClass = {
        opening: 'border-cyan-200/18 text-cyan-100',
        hall: 'border-fuchsia-200/18 text-fuchsia-100',
        water: 'border-amber-200/22 text-amber-100',
    }[tone];
    const glowClass = {
        opening: 'from-cyan-200/80 via-cyan-200/18',
        hall: 'from-fuchsia-200/80 via-cyan-200/18',
        water: 'from-amber-200/80 via-cyan-200/18',
    }[tone];

    return (
        <>
            <div className="pointer-events-none absolute inset-0 z-[4] bg-[radial-gradient(circle_at_50%_42%,transparent_0%,transparent_48%,rgba(0,0,0,0.34)_76%,rgba(0,0,0,0.72)_100%)]" />
            <div className="grain-overlay z-[5] opacity-[0.075]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-[clamp(3.25rem,7vh,5.25rem)] bg-gradient-to-b from-black/78 via-black/34 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-[clamp(5.5rem,14vh,8.5rem)] bg-gradient-to-t from-black/88 via-black/42 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 z-[7] h-[34vh] w-[min(44vw,34rem)] bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.86),rgba(0,0,0,0.42)_42%,transparent_72%)]" />
            <div className="pointer-events-none absolute bottom-8 right-4 z-[20] hidden h-32 w-32 rounded-2xl border border-white/8 bg-black/72 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:block" />
            <div className={`pointer-events-none absolute bottom-5 left-4 z-[21] hidden w-[min(38vw,17rem)] overflow-hidden rounded-r-2xl border-y border-r bg-black/82 px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.5)] backdrop-blur-md sm:block ${toneClass}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.08] via-white/[0.02] to-transparent" />
                <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-white/72">{copy.sferaSignal}</p>
                        <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.18em]">{label}</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/14 bg-white/[0.06]">
                        <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
                    </span>
                </div>
                <div className="relative mt-3 h-px overflow-hidden rounded-full bg-white/12">
                    <span className={`absolute inset-y-0 left-0 w-2/3 animate-[shimmer_2.4s_linear_infinite] bg-gradient-to-r ${glowClass} to-transparent`} />
                </div>
            </div>
            <div className="pointer-events-none absolute bottom-5 right-4 z-[21] hidden w-[min(26vw,13rem)] overflow-hidden rounded-l-2xl border-y border-l border-white/12 bg-black/64 px-4 py-3 text-right text-white shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-md sm:block">
                <div className="absolute inset-0 bg-gradient-to-l from-white/[0.08] via-white/[0.02] to-transparent" />
                <p className="relative text-[9px] font-black uppercase tracking-[0.22em] text-white/70">{copy.accessFilm}</p>
                <p className="relative mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-white">{copy.premiumSignal}</p>
                <div className="relative mt-3 ml-auto grid w-20 grid-cols-5 gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <span key={index} className="h-1 rounded-full bg-white/20" />
                    ))}
                </div>
            </div>
        </>
    );
}

export function CutsceneSiteHeader({
    statusOnline,
    instruction,
    skipLabel,
    onSkip,
    startLabel,
    onStart,
}: {
    statusOnline: string;
    instruction: string;
    skipLabel: string;
    onSkip: () => void;
    startLabel?: string;
    onStart?: () => void;
}) {
    return (
        <header className="absolute inset-x-0 top-0 z-[80] border-b border-white/15 bg-[#090b10]/95 shadow-[0_16px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:h-20 sm:gap-3 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <BrandLogo size="md" priority />
                    <div className="hidden w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300 sm:flex">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                        {statusOnline}
                    </div>
                </div>

                <p className="hidden max-w-[34rem] text-center text-[10px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-[#9fcfdf] md:block">
                    {instruction}
                </p>

                <div className="flex items-center gap-2">
                    {startLabel && onStart && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onStart();
                            }}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#66d9cb]/30 bg-[#66d9cb]/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/[0.18] sm:px-4"
                        >
                            <Volume2 className="h-4 w-4" />
                            <span className="hidden sm:inline">{startLabel}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onSkip();
                        }}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/30 hover:bg-white/[0.14] sm:px-4"
                        aria-label={skipLabel}
                    >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">{skipLabel}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
