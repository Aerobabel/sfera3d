'use client';

import { Check, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';

export default function RewardVideoSequence({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const next = () => setStep((current) => current === 1 ? 2 : 3);
    return <div className="pointer-events-auto absolute inset-0 z-[180] grid place-items-center bg-black/90 p-4 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Phone reward">
        <button type="button" onClick={onClose} aria-label="Close reward video" className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40"><X className="h-4 w-4" /></button>
        {step < 3 ? <div className="w-[min(92vw,70rem)]"><p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100">{step === 1 ? 'Phone won' : 'Delivery confirmed'}</p><video key={step} autoPlay controls playsInline onEnded={next} className="max-h-[78vh] w-full rounded-2xl border border-white/15 bg-black shadow-[0_40px_120px_rgba(0,0,0,.8)]" src={step === 1 ? '/cutscenes/afterphonewin.mp4' : '/cutscenes/phonewaterdelivered.mp4'} /><button type="button" onClick={next} className="ml-auto mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-300">Continue <ChevronRight className="h-4 w-4" /></button></div> : <div className="max-w-xl text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cyan-100 text-slate-950 shadow-[0_0_45px_rgba(103,232,249,.35)]"><Check /></span><p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100">Reward secured</p><h2 className="mt-3 text-4xl font-black tracking-[-.06em] sm:text-6xl">Your phone and water are on their way.</h2><p className="mt-4 text-slate-400">Check your dashboard for delivery updates.</p><a href="/player/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950">Open dashboard <ChevronRight className="h-4 w-4" /></a></div>}
    </div>;
}
