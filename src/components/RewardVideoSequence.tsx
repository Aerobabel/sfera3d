'use client';

import { Check, ChevronRight, Play, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import {
    fadeOutCutsceneAudio,
    resetCutsceneAudio,
    softenCutsceneAudioTail,
} from '@/lib/ui/cutsceneAudio';

const REWARD_VIDEO_SRC = '/cutscenes/phone-reward-sequence.mp4';

export default function RewardVideoSequence({ onClose, onOpenDashboard }: { onClose: () => void; onOpenDashboard: () => void }) {
    const [phase, setPhase] = useState<'video' | 'complete'>('video');
    const [hasStartedWithSound, setHasStartedWithSound] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const pauseAndResetVideo = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        video.pause();
        try {
            video.currentTime = 0;
        } catch {
            // Reset is best-effort when the media element has not loaded yet.
        }
        resetCutsceneAudio(video);
    }, []);

    const completeSequence = useCallback(() => {
        pauseAndResetVideo();
        setHasStartedWithSound(false);
        setPhase('complete');
    }, [pauseAndResetVideo]);

    const startWithSound = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        setHasStartedWithSound(true);
        video.muted = false;
        resetCutsceneAudio(video);
        void video.play().catch(() => {
            setHasStartedWithSound(false);
        });
    }, []);

    const skipSequence = useCallback(() => {
        fadeOutCutsceneAudio(videoRef.current, completeSequence);
    }, [completeSequence]);

    const closeSequence = useCallback(() => {
        pauseAndResetVideo();
        onClose();
    }, [onClose, pauseAndResetVideo]);

    useEffect(() => {
        if (phase !== 'complete') return;
        window.dispatchEvent(new Event('sfera:success'));
    }, [phase]);

    useEffect(() => {
        if (phase !== 'video' || hasStartedWithSound) return;

        const startFromKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            startWithSound();
        };

        window.addEventListener('keydown', startFromKey, { once: true });
        return () => window.removeEventListener('keydown', startFromKey);
    }, [hasStartedWithSound, phase, startWithSound]);

    useEffect(() => pauseAndResetVideo, [pauseAndResetVideo]);

    useEffect(() => {
        const backgroundMedia = Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'))
            .filter((media) => media !== videoRef.current && media.dataset.cutsceneVideo !== 'true')
            .map((media) => ({ media, wasMuted: media.muted }));

        backgroundMedia.forEach(({ media }) => {
            media.muted = true;
        });

        return () => {
            backgroundMedia.forEach(({ media, wasMuted }) => {
                if (media.isConnected) media.muted = wasMuted;
            });
        };
    }, []);

    return (
        <div
            className="pointer-events-auto absolute inset-0 z-[140] overflow-hidden bg-[#05070b] text-white"
            role="dialog"
            aria-modal="true"
            aria-label="Phone reward cutscene"
            onClick={phase === 'video' && !hasStartedWithSound ? startWithSound : undefined}
        >
            {phase === 'video' ? (
                <>
                    <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden bg-black sm:top-20">
                        <video
                            ref={videoRef}
                            className="cinematic-cutscene-video h-full w-full scale-[1.035] bg-black object-cover"
                            src={REWARD_VIDEO_SRC}
                            data-cutscene-video="true"
                            muted={!hasStartedWithSound}
                            playsInline
                            preload="auto"
                            disablePictureInPicture
                            controls={false}
                            controlsList="nodownload noplaybackrate noremoteplayback"
                            onContextMenu={(event) => event.preventDefault()}
                            onTimeUpdate={(event) => softenCutsceneAudioTail(event.currentTarget)}
                            onEnded={completeSequence}
                            onError={completeSequence}
                        />

                        <div className="pointer-events-none absolute inset-0 z-[4] bg-[radial-gradient(circle_at_50%_42%,transparent_0%,transparent_48%,rgba(0,0,0,0.34)_76%,rgba(0,0,0,0.72)_100%)]" />
                        <div className="grain-overlay z-[5] opacity-[0.075]" />
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-[clamp(3.25rem,7vh,5.25rem)] bg-gradient-to-b from-black/78 via-black/34 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-[clamp(5.5rem,14vh,8.5rem)] bg-gradient-to-t from-black/88 via-black/42 to-transparent" />

                        <div className="pointer-events-none absolute bottom-5 left-4 z-[21] hidden w-[min(38vw,19rem)] overflow-hidden rounded-r-2xl border-y border-r border-cyan-200/18 bg-black/82 px-4 py-3 text-cyan-100 shadow-[0_18px_70px_rgba(0,0,0,0.5)] backdrop-blur-md sm:block">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.08] via-white/[0.02] to-transparent" />
                            <div className="relative flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-white/72">3DSFERA reward signal</p>
                                    <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.18em]">Phone secured · delivery confirmed</p>
                                </div>
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/14 bg-white/[0.06]">
                                    <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
                                </span>
                            </div>
                            <div className="relative mt-3 h-px overflow-hidden rounded-full bg-white/12">
                                <span className="absolute inset-y-0 left-0 w-2/3 animate-[shimmer_2.4s_linear_infinite] bg-gradient-to-r from-cyan-200/80 via-cyan-200/18 to-transparent" />
                            </div>
                        </div>

                        <div className="pointer-events-none absolute bottom-5 right-4 z-[21] hidden w-[min(26vw,13rem)] overflow-hidden rounded-l-2xl border-y border-l border-white/12 bg-black/64 px-4 py-3 text-right text-white shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-md sm:block">
                            <div className="absolute inset-0 bg-gradient-to-l from-white/[0.08] via-white/[0.02] to-transparent" />
                            <p className="relative text-[9px] font-black uppercase tracking-[0.22em] text-white/70">Prize transmission</p>
                            <p className="relative mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-white">One continuous film</p>
                        </div>
                    </div>

                    <header className="absolute inset-x-0 top-0 z-[80] border-b border-white/15 bg-[#090b10]/95 shadow-[0_16px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-center gap-3">
                                <BrandLogo size="md" priority />
                                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300 sm:flex">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                                    Reward online
                                </div>
                            </div>

                            <p className="hidden max-w-[34rem] text-center text-[10px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-[#9fcfdf] md:block">
                                Your phone is secured. Watch the complete delivery sequence.
                            </p>

                            <div className="flex items-center gap-2">
                                {!hasStartedWithSound && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            startWithSound();
                                        }}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#66d9cb]/30 bg-[#66d9cb]/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/[0.18] sm:px-4"
                                    >
                                        <Volume2 className="h-4 w-4" />
                                        <span className="hidden sm:inline">Start with sound</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        skipSequence();
                                    }}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/30 hover:bg-white/[0.14] sm:px-4"
                                    aria-label="Skip reward cutscene"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="hidden sm:inline">Skip</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    {!hasStartedWithSound && (
                        <div className="absolute inset-x-4 bottom-0 top-16 z-30 flex flex-col items-center justify-center sm:top-20">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    startWithSound();
                                }}
                                className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl border border-[#66d9cb]/35 bg-black/55 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-[#66d9cb]/60 hover:bg-[#66d9cb]/[0.16] sm:px-6"
                            >
                                <Play className="h-4 w-4 shrink-0 text-[#66d9cb]" />
                                <span className="truncate">Play reward film</span>
                                <Volume2 className="h-4 w-4 shrink-0 text-[#66d9cb]" />
                            </button>
                            <p className="mt-3 max-w-md text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300/80">
                                Press any key or tap to start with sound
                            </p>
                        </div>
                    )}
                </>
            ) : (
                <div className="sfera-page-enter absolute inset-0 grid place-items-center bg-[#020405] px-4 text-center">
                    <div className="grain-overlay opacity-[.045]" />
                    <button type="button" onClick={closeSequence} aria-label="Close reward" data-sfera-sound="soft" className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-black/46 text-white/70 backdrop-blur-md transition hover:border-white/28 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                    <div className="relative max-w-2xl">
                        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/[.08] blur-3xl" />
                        <span className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-cyan-100/30 bg-cyan-100 text-slate-950 shadow-[0_0_70px_rgba(131,232,220,.28)]"><Check className="h-8 w-8" strokeWidth={2.5} /></span>
                        <p className="sfera-kicker relative mt-9">Reward secured</p>
                        <h2 className="sfera-display relative mt-4 text-4xl leading-[.95] sm:text-7xl">Your prize is already on its way.</h2>
                        <p className="relative mx-auto mt-5 max-w-md text-sm leading-7 text-slate-400">Delivery status, wallet history, and your next objective are waiting in the player dashboard.</p>
                        <button type="button" onClick={onOpenDashboard} data-sfera-sound="success" className="sfera-btn-primary relative mt-8 inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-[.1em] shadow-[0_20px_60px_rgba(131,232,220,.18)]">Open player dashboard <ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
