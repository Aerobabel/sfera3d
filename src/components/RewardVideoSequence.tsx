'use client';

import { Check, ChevronRight, Play, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const STALL_PROMPT_DELAY_MS = 2200;

const rewardVideos = [
    '/cutscenes/afterphonewin.mp4',
    '/cutscenes/phonewaterdelivered.mp4',
] as const;

export default function RewardVideoSequence({ onClose, onOpenDashboard }: { onClose: () => void; onOpenDashboard: () => void }) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [showPlaybackPrompt, setShowPlaybackPrompt] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const stallTimerRef = useRef<number | null>(null);
    const next = () => {
        setShowPlaybackPrompt(false);
        setStep((current) => current === 1 ? 2 : 3);
    };

    const clearStallTimer = useCallback(() => {
        if (stallTimerRef.current === null) return;
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
    }, []);

    const requestPlayback = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        clearStallTimer();
        try {
            await video.play();
            setShowPlaybackPrompt(false);
        } catch {
            // Browsers can reject delayed autoplay even though the spin itself
            // started with a click. Surface a cinematic play action instead of
            // leaving the user on an inert native controls bar.
            setShowPlaybackPrompt(true);
        }
    }, [clearStallTimer]);

    const handlePlaybackWaiting = useCallback(() => {
        clearStallTimer();
        stallTimerRef.current = window.setTimeout(() => {
            setShowPlaybackPrompt(true);
            stallTimerRef.current = null;
        }, STALL_PROMPT_DELAY_MS);
    }, [clearStallTimer]);

    const handlePlaybackActive = useCallback(() => {
        clearStallTimer();
        setShowPlaybackPrompt(false);
    }, [clearStallTimer]);

    useEffect(() => {
        if (step === 3) window.dispatchEvent(new Event('sfera:success'));
    }, [step]);

    useEffect(() => {
        if (step === 3) return;
        const frame = window.requestAnimationFrame(() => {
            void requestPlayback();
        });

        return () => {
            window.cancelAnimationFrame(frame);
            clearStallTimer();
        };
    }, [clearStallTimer, requestPlayback, step]);

    return (
        <div className="pointer-events-auto absolute inset-0 z-20 grid place-items-center overflow-hidden bg-[#020405] text-white" aria-label="Phone reward cutscene">
            <div className="grain-overlay opacity-[.045]" />
            <button type="button" onClick={onClose} aria-label="Close reward video" data-sfera-sound="soft" className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-black/46 text-white/70 backdrop-blur-md transition hover:border-white/28 hover:text-white"><X className="h-4 w-4" /></button>

            <div className="absolute left-5 top-5 z-20 flex items-center gap-2">
                {[1, 2, 3].map((item) => (
                    <span key={item} className={`h-1 rounded-full transition-all duration-700 ${item <= step ? 'w-8 bg-cyan-100' : 'w-3 bg-white/15'}`} />
                ))}
            </div>

            {step < 3 ? (
                <div className="sfera-page-enter absolute inset-0 overflow-hidden bg-black">
                    <video
                        ref={videoRef}
                        key={step}
                        autoPlay
                        playsInline
                        preload="auto"
                        disablePictureInPicture
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        data-cutscene-video="true"
                        onCanPlay={() => void requestPlayback()}
                        onPlaying={handlePlaybackActive}
                        onWaiting={handlePlaybackWaiting}
                        onStalled={handlePlaybackWaiting}
                        onEnded={next}
                        onError={next}
                        className="cinematic-cutscene-video h-full w-full scale-[1.02] bg-black object-cover"
                        src={rewardVideos[step - 1]}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,transparent_48%,rgba(0,0,0,0.36)_78%,rgba(0,0,0,0.78)_100%)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 to-transparent" />

                    <div className="pointer-events-none absolute bottom-5 left-5 z-10 max-w-[min(72vw,30rem)] border-l border-cyan-100/35 bg-black/48 px-4 py-3 backdrop-blur-md">
                        <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-100">3DSFERA reward signal</p>
                        <h2 className="sfera-display mt-1 text-xl sm:text-3xl">{step === 1 ? 'The reward is yours.' : 'Delivery is in motion.'}</h2>
                        <span className="mt-3 block h-px w-full overflow-hidden bg-white/10">
                            <span className="block h-full w-2/3 animate-[shimmer_1.4s_linear_infinite] bg-gradient-to-r from-transparent via-cyan-100 to-transparent" />
                        </span>
                    </div>

                    {showPlaybackPrompt && (
                        <div className="absolute inset-0 z-20 grid place-items-center bg-black/48 p-5 backdrop-blur-sm">
                            <div className="max-w-sm text-center">
                                <button type="button" onClick={() => void requestPlayback()} className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-cyan-100/40 bg-cyan-100 text-slate-950 shadow-[0_0_60px_rgba(131,232,220,.32)] transition hover:scale-105" aria-label="Play reward cutscene">
                                    <Play className="ml-1 h-6 w-6" fill="currentColor" />
                                </button>
                                <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-white">Continue the reward cutscene</p>
                                <button type="button" onClick={next} className="mt-3 text-[10px] font-bold uppercase tracking-[.16em] text-white/55 transition hover:text-white">Skip this scene</button>
                            </div>
                        </div>
                    )}

                    <button type="button" onClick={next} data-sfera-sound="confirm" className="absolute bottom-5 right-5 z-20 flex items-center gap-2 rounded-full border border-white/14 bg-black/52 px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-200 backdrop-blur-md transition hover:border-cyan-100/35 hover:text-cyan-50">Skip <ChevronRight className="h-4 w-4" /></button>
                </div>
            ) : (
                <div className="sfera-page-enter relative max-w-2xl px-4 text-center">
                    <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/[.08] blur-3xl" />
                    <span className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-cyan-100/30 bg-cyan-100 text-slate-950 shadow-[0_0_70px_rgba(131,232,220,.28)]"><Check className="h-8 w-8" strokeWidth={2.5} /></span>
                    <p className="sfera-kicker relative mt-9">Reward secured</p>
                    <h2 className="sfera-display relative mt-4 text-4xl leading-[.95] sm:text-7xl">Your prize is already on its way.</h2>
                    <p className="relative mx-auto mt-5 max-w-md text-sm leading-7 text-slate-400">Delivery status, wallet history, and your next objective are waiting in the player dashboard.</p>
                    <button type="button" onClick={onOpenDashboard} data-sfera-sound="success" className="sfera-btn-primary relative mt-8 inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-[.1em] shadow-[0_20px_60px_rgba(131,232,220,.18)]">Open player dashboard <ChevronRight className="h-4 w-4" /></button>
                </div>
            )}
        </div>
    );
}
