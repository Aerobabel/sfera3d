'use client';

import { useEffect, useRef } from 'react';

type ToneName = 'soft' | 'confirm' | 'success';

const toneProfile: Record<ToneName, { from: number; to: number; duration: number; gain: number }> = {
    soft: { from: 190, to: 225, duration: 0.045, gain: 0.009 },
    confirm: { from: 280, to: 390, duration: 0.075, gain: 0.012 },
    success: { from: 420, to: 620, duration: 0.16, gain: 0.014 },
};

export default function CinematicInterface() {
    const contextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        const play = (name: ToneName) => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            const AudioContextClass = window.AudioContext;
            if (!AudioContextClass) return;
            const context = contextRef.current ?? new AudioContextClass();
            contextRef.current = context;
            const profile = toneProfile[name];
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const now = context.currentTime;

            oscillator.type = name === 'success' ? 'sine' : 'triangle';
            oscillator.frequency.setValueAtTime(profile.from, now);
            oscillator.frequency.exponentialRampToValueAtTime(profile.to, now + profile.duration);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(profile.gain, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(now);
            oscillator.stop(now + profile.duration + 0.02);
        };

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target instanceof Element
                ? event.target.closest<HTMLElement>('[data-sfera-sound], .sfera-btn-primary, .sfera-btn-secondary')
                : null;
            if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
            const requested = target.dataset.sferaSound;
            play(requested === 'success' ? 'success' : requested === 'confirm' ? 'confirm' : 'soft');
        };

        const handleSuccess = () => play('success');
        document.addEventListener('pointerdown', handlePointerDown, { capture: true });
        window.addEventListener('sfera:success', handleSuccess);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
            window.removeEventListener('sfera:success', handleSuccess);
            void contextRef.current?.close();
            contextRef.current = null;
        };
    }, []);

    return null;
}

