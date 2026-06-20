'use client';

type SferaUiSound = 'start' | 'select' | 'open' | 'progress' | 'reward' | 'warning';

type AudioWindow = Window & {
    webkitAudioContext?: typeof AudioContext;
};

type ToneStep = {
    delay: number;
    duration: number;
    frequency: number;
    gain: number;
    type?: OscillatorType;
};

const SOUND_PATTERNS: Record<SferaUiSound, ToneStep[]> = {
    start: [
        { delay: 0, duration: 0.08, frequency: 220, gain: 0.03, type: 'sine' },
        { delay: 0.07, duration: 0.12, frequency: 440, gain: 0.04, type: 'triangle' },
        { delay: 0.17, duration: 0.16, frequency: 660, gain: 0.035, type: 'triangle' },
    ],
    select: [
        { delay: 0, duration: 0.055, frequency: 480, gain: 0.025, type: 'triangle' },
    ],
    open: [
        { delay: 0, duration: 0.07, frequency: 320, gain: 0.03, type: 'sine' },
        { delay: 0.06, duration: 0.09, frequency: 520, gain: 0.028, type: 'sine' },
    ],
    progress: [
        { delay: 0, duration: 0.07, frequency: 560, gain: 0.025, type: 'triangle' },
        { delay: 0.08, duration: 0.09, frequency: 760, gain: 0.025, type: 'triangle' },
    ],
    reward: [
        { delay: 0, duration: 0.09, frequency: 392, gain: 0.035, type: 'triangle' },
        { delay: 0.09, duration: 0.1, frequency: 523.25, gain: 0.04, type: 'triangle' },
        { delay: 0.19, duration: 0.16, frequency: 783.99, gain: 0.035, type: 'sine' },
    ],
    warning: [
        { delay: 0, duration: 0.12, frequency: 180, gain: 0.028, type: 'sawtooth' },
        { delay: 0.14, duration: 0.1, frequency: 150, gain: 0.023, type: 'sawtooth' },
    ],
};

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (typeof window === 'undefined') return null;

    const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    audioContext ??= new AudioContextConstructor();
    return audioContext;
};

export const playSferaUiSound = (sound: SferaUiSound = 'select') => {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === 'suspended') {
        void context.resume();
    }

    const now = context.currentTime + 0.01;
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.75, now);
    masterGain.connect(context.destination);

    for (const step of SOUND_PATTERNS[sound]) {
        const start = now + step.delay;
        const end = start + step.duration;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = step.type ?? 'sine';
        oscillator.frequency.setValueAtTime(step.frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(step.frequency * 1.018, end);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(step.gain, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
    }
};
