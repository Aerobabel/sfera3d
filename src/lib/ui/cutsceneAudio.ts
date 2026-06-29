'use client';

const DEFAULT_TAIL_SECONDS = 1.35;
const DEFAULT_EXIT_FADE_MS = 600;
const AUDIO_FADING_FLAG = 'cutsceneAudioFading';

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

export const resetCutsceneAudio = (video: HTMLMediaElement | null, volume = 1) => {
    if (!video) return;

    video.volume = clampVolume(volume);
};

export const softenCutsceneAudioTail = (
    video: HTMLMediaElement | null,
    tailSeconds = DEFAULT_TAIL_SECONDS
) => {
    if (!video || video.muted || video.dataset[AUDIO_FADING_FLAG] === 'true') return;

    const duration = video.duration;
    const currentTime = video.currentTime;

    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) {
        resetCutsceneAudio(video);
        return;
    }

    const remaining = duration - currentTime;

    if (remaining >= tailSeconds) {
        resetCutsceneAudio(video);
        return;
    }

    const tailProgress = clampVolume(remaining / tailSeconds);
    video.volume = Math.sin(tailProgress * Math.PI * 0.5);
};

export const fadeOutCutsceneAudio = (
    video: HTMLMediaElement | null,
    onComplete: () => void,
    durationMs = DEFAULT_EXIT_FADE_MS
) => {
    if (typeof window === 'undefined' || !video || video.muted || video.volume <= 0 || durationMs <= 0) {
        onComplete();
        return;
    }

    const startTime = performance.now();
    const startVolume = video.volume;
    let isComplete = false;
    video.dataset[AUDIO_FADING_FLAG] = 'true';

    const complete = () => {
        if (isComplete) return;

        isComplete = true;
        video.volume = 0;
        onComplete();
        delete video.dataset[AUDIO_FADING_FLAG];
    };

    const tick = (now: number) => {
        if (isComplete) return;

        const progress = clampVolume((now - startTime) / durationMs);
        video.volume = startVolume * Math.cos(progress * Math.PI * 0.5);

        if (progress >= 1) {
            complete();
            return;
        }

        window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
};
