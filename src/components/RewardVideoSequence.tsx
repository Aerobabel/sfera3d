'use client';

import { Check, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function RewardVideoSequence({ onClose, onOpenDashboard }: { onClose: () => void; onOpenDashboard: () => void }) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const next = () => setStep((current) => current === 1 ? 2 : 3);

    useEffect(() => {
        if (step === 3) window.dispatchEvent(new Event('sfera:success'));
    }, [step]);

    return (
        <div className="pointer-events-auto absolute inset-0 z-[180] grid place-items-center overflow-hidden bg-[#020405]/94 p-4 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Phone reward">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 border-b border-white/[.06] bg-black/50" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 border-t border-white/[.06] bg-black/50" />
            <div className="grain-overlay opacity-[.045]" />
            <button type="button" onClick={onClose} aria-label="Close reward video" data-sfera-sound="soft" className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-black/46 text-white/70 backdrop-blur-md transition hover:border-white/28 hover:text-white"><X className="h-4 w-4" /></button>

            <div className="absolute left-5 top-5 z-20 flex items-center gap-2">
                {[1, 2, 3].map((item) => (
                    <span key={item} className={`h-1 rounded-full transition-all duration-700 ${item <= step ? 'w-8 bg-cyan-100' : 'w-3 bg-white/15'}`} />
                ))}
            </div>

            {step < 3 ? (
                <div className="sfera-page-enter w-[min(94vw,72rem)]">
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                            <p className="sfera-kicker">Chapter 0{step}</p>
                            <h2 className="sfera-display mt-2 text-2xl sm:text-4xl">{step === 1 ? 'The reward is yours.' : 'Delivery is in motion.'}</h2>
                        </div>
                        <p className="hidden max-w-xs text-right text-xs leading-5 text-slate-500 sm:block">A verified moment from your 3DSFERA journey.</p>
                    </div>
                    <div className="relative overflow-hidden rounded-[1.4rem] border border-white/12 bg-black shadow-[0_45px_140px_rgba(0,0,0,.82)]">
                        <video key={step} autoPlay controls playsInline onEnded={next} className="cinematic-cutscene-video max-h-[72vh] w-full bg-black object-contain" src={step === 1 ? '/cutscenes/afterphonewin.mp4' : '/cutscenes/phonewaterdelivered.mp4'} />
                        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[.05]" />
                    </div>
                    <button type="button" onClick={next} data-sfera-sound="confirm" className="ml-auto mt-4 flex items-center gap-2 rounded-full border border-white/12 bg-white/[.045] px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-300 transition hover:border-cyan-100/30 hover:text-cyan-50">Continue <ChevronRight className="h-4 w-4" /></button>
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
