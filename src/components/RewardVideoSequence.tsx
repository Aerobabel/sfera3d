'use client';

import { Check, ChevronRight, Play, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CutsceneCinematicOverlay, CutsceneSiteHeader } from '@/components/CutscenePresentation';
import {
    fadeOutCutsceneAudio,
    resetCutsceneAudio,
    softenCutsceneAudioTail,
} from '@/lib/ui/cutsceneAudio';

const REWARD_VIDEO_SRC = '/cutscenes/phone-reward-sequence.mp4';
const REWARD_CUTSCENE_COPY = {
    sferaSignal: '3DSFERA reward signal',
    accessFilm: 'Prize transmission',
    premiumSignal: 'Reward delivery film',
} as const;

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
        video.play().catch(() => {
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
            className="pointer-events-auto fixed inset-0 z-[140] overflow-hidden bg-[#05070b] text-white"
            role="dialog"
            aria-modal="true"
            aria-label="Phone reward cutscene"
            onClick={phase === 'video' && !hasStartedWithSound ? startWithSound : undefined}
        >
            {phase === 'video' ? (
                <>
                    <div className="absolute inset-0 overflow-hidden bg-black">
                        <video
                            ref={videoRef}
                            className="cinematic-cutscene-video h-full w-full scale-[1.04] bg-black object-cover"
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
                        <CutsceneCinematicOverlay
                            tone="water"
                            label="Phone reward delivery"
                            copy={REWARD_CUTSCENE_COPY}
                        />
                    </div>

                    {!hasStartedWithSound && (
                        <div className="absolute inset-x-4 bottom-0 top-16 z-10 flex flex-col items-center justify-center sm:top-20">
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

                    <CutsceneSiteHeader
                        statusOnline="Reward online"
                        instruction="Your phone is secured. Watch the complete delivery sequence."
                        skipLabel="Skip"
                        onSkip={skipSequence}
                        startLabel={!hasStartedWithSound ? 'Start with sound' : undefined}
                        onStart={!hasStartedWithSound ? startWithSound : undefined}
                    />
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
