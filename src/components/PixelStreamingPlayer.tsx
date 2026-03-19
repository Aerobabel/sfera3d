'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Config, Flags, PixelStreaming } from '@epicgames-ps/lib-pixelstreamingfrontend-ue5.4';
import { useLanguage } from './i18n/LanguageProvider';

interface PixelStreamingPlayerProps {
    signalingServerUrl: string;
    onPixelStreamingResponse?: (response: string) => void;
    onVideoInitialized?: (videoElement: HTMLVideoElement) => void;
    mobileInputMode?: 'joystick' | 'touch';
    isMobileDevice?: boolean;
    keyboardInputEnabled?: boolean;
    blockedKeyboardCodes?: string[];
    desktopMouseMode?: 'locked' | 'hovering';
}

type PixelStreamingDebugWindow = Window & {
    ps?: PixelStreaming;
};

type DesktopMouseMode = 'locked' | 'hovering';

const normalizeSignalingUrl = (inputUrl: string) => {
    let nextUrl = inputUrl.trim();
    if (!nextUrl) return nextUrl;

    if (nextUrl.startsWith("https://")) {
        nextUrl = nextUrl.replace("https://", "wss://");
    } else if (nextUrl.startsWith("http://")) {
        nextUrl = nextUrl.replace("http://", "ws://");
    } else if (!nextUrl.startsWith("ws://") && !nextUrl.startsWith("wss://")) {
        const preferredProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        nextUrl = `${preferredProtocol}${nextUrl}`;
    }

    // Browsers block insecure WebSockets from secure pages.
    if (window.location.protocol === "https:" && nextUrl.startsWith("ws://")) {
        nextUrl = nextUrl.replace("ws://", "wss://");
    }

    return nextUrl;
};

const hasLiveVideoStream = (container: HTMLDivElement | null) => {
    if (!container) return false;
    const video = container.querySelector('video');
    if (!(video instanceof HTMLVideoElement)) return false;

    const mediaStream = video.srcObject;
    if (mediaStream instanceof MediaStream) {
        return mediaStream.getVideoTracks().some((track) => track.readyState === 'live');
    }

    return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.paused && !video.ended;
};

const resolveDesktopMouseMode = (
    preferredMode?: DesktopMouseMode
): DesktopMouseMode => {
    if (preferredMode) return preferredMode;

    if (typeof window !== 'undefined') {
        const fromQuery = new URLSearchParams(window.location.search).get('desktop_mouse')?.trim().toLowerCase();
        if (fromQuery === 'locked' || fromQuery === 'hovering') {
            return fromQuery;
        }
    }

    const fromEnv = process.env.NEXT_PUBLIC_PIXELSTREAM_DESKTOP_MOUSE_MODE?.trim().toLowerCase();
    if (fromEnv === 'locked' || fromEnv === 'hovering') {
        return fromEnv;
    }

    return 'locked';
};

const parseNonNegativeInteger = (rawValue: string | undefined, fallback: number) => {
    if (!rawValue) return fallback;
    const parsed = Number.parseInt(rawValue.trim(), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const reconnectEnabledEnv = process.env.NEXT_PUBLIC_PIXELSTREAM_RECONNECT_ENABLED?.trim().toLowerCase();
const RECONNECT_ENABLED = reconnectEnabledEnv === undefined || reconnectEnabledEnv === '' || reconnectEnabledEnv === '1' || reconnectEnabledEnv === 'true';
const RECONNECT_BASE_DELAY_MS = Math.max(
    300,
    parseNonNegativeInteger(process.env.NEXT_PUBLIC_PIXELSTREAM_RECONNECT_BASE_DELAY_MS, 1200)
);
const RECONNECT_MAX_DELAY_MS = Math.max(
    RECONNECT_BASE_DELAY_MS,
    parseNonNegativeInteger(process.env.NEXT_PUBLIC_PIXELSTREAM_RECONNECT_MAX_DELAY_MS, 12000)
);
// 0 means unlimited retries.
const RECONNECT_MAX_ATTEMPTS = parseNonNegativeInteger(
    process.env.NEXT_PUBLIC_PIXELSTREAM_RECONNECT_MAX_ATTEMPTS,
    0
);

const stallWatchdogEnabledEnv = process.env.NEXT_PUBLIC_PIXELSTREAM_STALL_WATCHDOG_ENABLED?.trim().toLowerCase();
const STALL_WATCHDOG_ENABLED =
    stallWatchdogEnabledEnv === undefined ||
    stallWatchdogEnabledEnv === '' ||
    stallWatchdogEnabledEnv === '1' ||
    stallWatchdogEnabledEnv === 'true';
const STALL_WATCHDOG_TIMEOUT_MS = Math.max(
    3000,
    parseNonNegativeInteger(process.env.NEXT_PUBLIC_PIXELSTREAM_STALL_WATCHDOG_TIMEOUT_MS, 8000)
);
const STALL_WATCHDOG_INTERVAL_MS = Math.max(
    500,
    parseNonNegativeInteger(process.env.NEXT_PUBLIC_PIXELSTREAM_STALL_WATCHDOG_INTERVAL_MS, 2000)
);
const STALL_WATCHDOG_GRACE_MS = Math.max(
    1000,
    parseNonNegativeInteger(process.env.NEXT_PUBLIC_PIXELSTREAM_STALL_WATCHDOG_GRACE_MS, 3000)
);
const STALL_WATCHDOG_DISCONNECT_RECHECK_MS = 2500;

const getReconnectDelayMs = (attempt: number) => {
    const scaledDelay = RECONNECT_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1));
    return Math.min(scaledDelay, RECONNECT_MAX_DELAY_MS);
};

type VideoFrameWatchVideo = HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number;
    cancelVideoFrameCallback?: (handle: number) => void;
};

export default function PixelStreamingPlayer({
    signalingServerUrl: initialUrl,
    onPixelStreamingResponse,
    onVideoInitialized,
    mobileInputMode = 'joystick',
    isMobileDevice = false,
    keyboardInputEnabled = true,
    blockedKeyboardCodes = [],
    desktopMouseMode: preferredDesktopMouseMode
}: PixelStreamingPlayerProps) {
    const { language } = useLanguage();
    const text = {
        en: {
            initializing: 'Initializing...',
            missingUrl: 'Signaling URL is empty.',
            missingStatus: 'Missing signaling URL',
            connecting: (url: string, label: string) => `Connecting to ${url} (${label})...`,
            connectedWait: 'Connected resources. Waiting for video...',
            streaming: 'Streaming Active',
            disconnected: 'Disconnected',
            webrtcFailed: 'WebRTC Connection Failed. Check console.',
            setupError: (message: string) => `Setup Error: ${message}`,
            reload: 'Set & Reload',
            tryHint: 'Try:',
            live: 'Live',
        },
        ru: {
            initializing: 'Инициализация...',
            missingUrl: 'URL сигнального сервера пуст.',
            missingStatus: 'Нет URL сигнального сервера',
            connecting: (url: string, label: string) => `Подключение к ${url} (${label})...`,
            connectedWait: 'Ресурсы подключены. Ожидание видео...',
            streaming: 'Поток активен',
            disconnected: 'Отключено',
            webrtcFailed: 'Ошибка WebRTC. Проверьте консоль.',
            setupError: (message: string) => `Ошибка запуска: ${message}`,
            reload: 'Применить и перезагрузить',
            tryHint: 'Пример:',
            live: 'Поток',
        },
        zh: {
            initializing: '初始化中...',
            missingUrl: '信令服务 URL 为空。',
            missingStatus: '缺少信令服务 URL',
            connecting: (url: string, label: string) => `正在连接 ${url}（${label}）...`,
            connectedWait: '连接成功，等待视频流...',
            streaming: '推流已激活',
            disconnected: '已断开连接',
            webrtcFailed: 'WebRTC 连接失败，请检查控制台。',
            setupError: (message: string) => `初始化错误：${message}`,
            reload: '设置并刷新',
            tryHint: '可尝试：',
            live: '在线',
        },
    }[language];
    const textRef = useRef(text);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [url, setUrl] = useState(initialUrl);
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState(text.initializing);
    const [error, setError] = useState<string | null>(null);
    const [reconnectNonce, setReconnectNonce] = useState(0);

    const psRef = useRef<PixelStreaming | null>(null);
    const connectionGenerationRef = useRef(0);
    const keyboardInputEnabledRef = useRef(keyboardInputEnabled);
    const blockedKeyboardCodesRef = useRef<Set<string>>(new Set());
    const onPixelStreamingResponseRef = useRef(onPixelStreamingResponse);
    const onVideoInitializedRef = useRef(onVideoInitialized);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimerRef = useRef<number | null>(null);
    const reconnectRequestedRef = useRef(false);
    const stallWatchdogTimerRef = useRef<number | null>(null);
    const stallWatchdogVideoRef = useRef<VideoFrameWatchVideo | null>(null);
    const stallWatchdogVideoCallbackIdRef = useRef<number | null>(null);
    const stallWatchdogGraceUntilRef = useRef(0);
    const lastMediaProgressAtRef = useRef(0);
    const lastVideoTimeRef = useRef(0);
    const lastVideoStatsRef = useRef({
        initialized: false,
        bytesReceived: 0,
        framesDecoded: 0,
        lastPacketReceivedTimestamp: 0
    });

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const clearStallWatchdog = useCallback(() => {
        if (stallWatchdogTimerRef.current !== null) {
            window.clearInterval(stallWatchdogTimerRef.current);
            stallWatchdogTimerRef.current = null;
        }

        const watchedVideo = stallWatchdogVideoRef.current;
        if (
            watchedVideo &&
            stallWatchdogVideoCallbackIdRef.current !== null &&
            typeof watchedVideo.cancelVideoFrameCallback === 'function'
        ) {
            watchedVideo.cancelVideoFrameCallback(stallWatchdogVideoCallbackIdRef.current);
        }

        stallWatchdogVideoRef.current = null;
        stallWatchdogVideoCallbackIdRef.current = null;
    }, []);

    useEffect(() => {
        textRef.current = text;
    }, [text]);

    useEffect(() => {
        keyboardInputEnabledRef.current = keyboardInputEnabled;
    }, [keyboardInputEnabled]);

    useEffect(() => {
        const nextBlockedCodes = new Set<string>();
        for (const blockedCode of blockedKeyboardCodes) {
            const normalized = blockedCode.trim();
            if (!normalized) continue;
            nextBlockedCodes.add(normalized);
            nextBlockedCodes.add(normalized.toLowerCase());
        }
        blockedKeyboardCodesRef.current = nextBlockedCodes;
    }, [blockedKeyboardCodes]);

    useEffect(() => {
        onPixelStreamingResponseRef.current = onPixelStreamingResponse;
    }, [onPixelStreamingResponse]);

    useEffect(() => {
        onVideoInitializedRef.current = onVideoInitialized;
    }, [onVideoInitialized]);

    useEffect(() => {
        setUrl(initialUrl);
    }, [initialUrl]);

    useEffect(() => {
        // Capture phase runs before Pixel Streaming's own document listeners.
        const stopBlockedKeysFromReachingStreamer = (event: KeyboardEvent) => {
            if (!keyboardInputEnabledRef.current) return;

            const blockedCodes = blockedKeyboardCodesRef.current;
            if (blockedCodes.size === 0) return;

            const eventCode = event.code;
            const eventKey = event.key;
            const keyCodeString = String(event.keyCode);

            if (
                blockedCodes.has(eventCode) ||
                blockedCodes.has(eventCode.toLowerCase()) ||
                blockedCodes.has(eventKey) ||
                blockedCodes.has(eventKey.toLowerCase()) ||
                blockedCodes.has(keyCodeString)
            ) {
                event.stopImmediatePropagation();
            }
        };

        document.addEventListener('keydown', stopBlockedKeysFromReachingStreamer, true);
        document.addEventListener('keyup', stopBlockedKeysFromReachingStreamer, true);

        return () => {
            document.removeEventListener('keydown', stopBlockedKeysFromReachingStreamer, true);
            document.removeEventListener('keyup', stopBlockedKeysFromReachingStreamer, true);
        };
    }, []);

    useEffect(() => {
        const wrapperElement = wrapperRef.current;
        if (!wrapperElement) return;

        const isReconnectAttempt = reconnectRequestedRef.current;
        reconnectRequestedRef.current = false;
        if (!isReconnectAttempt) {
            reconnectAttemptRef.current = 0;
        }

        connectionGenerationRef.current += 1;
        const generation = connectionGenerationRef.current;
        clearReconnectTimer();
        clearStallWatchdog();

        if (psRef.current) {
            psRef.current.disconnect();
            psRef.current = null;
            wrapperElement.innerHTML = '';
        }

        lastVideoTimeRef.current = 0;
        lastVideoStatsRef.current = {
            initialized: false,
            bytesReceived: 0,
            framesDecoded: 0,
            lastPacketReceivedTimestamp: 0
        };

        setIsConnected(false);
        setError(null);

        const connectUrl = normalizeSignalingUrl(url || initialUrl);
        if (!connectUrl) {
            setError(textRef.current.missingUrl);
            setStatus(textRef.current.missingStatus);
            return;
        }

        const useTouchScreenInput = mobileInputMode === 'touch';
        // Only enable touch-to-mouse emulation on mobile devices.
        // Desktop should keep the native mouse path.
        const emulateMouseFromTouches = isMobileDevice && (mobileInputMode === 'touch' || mobileInputMode === 'joystick');
        const desktopMouseMode = resolveDesktopMouseMode(preferredDesktopMouseMode);
        const useHoveringMouse = isMobileDevice ? true : desktopMouseMode === 'hovering';

        console.log(`Initializing Pixel Streaming with URL: ${connectUrl}`);
        const inputLabel = !isMobileDevice
            ? `desktop-${desktopMouseMode}`
            : (useTouchScreenInput ? 'touch' : 'joystick');
        setStatus(textRef.current.connecting(connectUrl, inputLabel));

        const scheduleReconnect = (failureMessage?: string) => {
            if (generation !== connectionGenerationRef.current) return;
            clearStallWatchdog();

            if (!RECONNECT_ENABLED) {
                setIsConnected(false);
                setStatus(textRef.current.disconnected);
                if (failureMessage) {
                    setError(failureMessage);
                }
                return;
            }

            if (reconnectTimerRef.current !== null) return;

            const nextAttempt = reconnectAttemptRef.current + 1;
            if (RECONNECT_MAX_ATTEMPTS > 0 && nextAttempt > RECONNECT_MAX_ATTEMPTS) {
                setIsConnected(false);
                setStatus('Disconnected. Reconnect limit reached.');
                setError(failureMessage ?? 'Unable to restore connection automatically.');
                return;
            }

            reconnectAttemptRef.current = nextAttempt;
            const delayMs = getReconnectDelayMs(nextAttempt);
            const waitSeconds = Math.ceil(delayMs / 1000);
            setIsConnected(false);
            setError(failureMessage ?? null);
            setStatus(`Connection lost. Reconnecting in ${waitSeconds}s (attempt ${nextAttempt})...`);

            reconnectTimerRef.current = window.setTimeout(() => {
                reconnectTimerRef.current = null;
                if (generation !== connectionGenerationRef.current) return;
                reconnectRequestedRef.current = true;
                setReconnectNonce((value) => value + 1);
            }, delayMs);
        };

        const markMediaProgress = () => {
            lastMediaProgressAtRef.current = Date.now();
        };

        const resetWatchdogGraceWindow = () => {
            const now = Date.now();
            lastMediaProgressAtRef.current = now;
            stallWatchdogGraceUntilRef.current = now + STALL_WATCHDOG_GRACE_MS;
        };

        const attachVideoFrameWatchdog = (videoElement: HTMLVideoElement | null) => {
            if (!videoElement) return;
            const candidateVideo = videoElement as VideoFrameWatchVideo;
            if (typeof candidateVideo.requestVideoFrameCallback !== 'function') {
                return;
            }

            stallWatchdogVideoRef.current = candidateVideo;
            const onVideoFrame: VideoFrameRequestCallback = () => {
                if (generation !== connectionGenerationRef.current) return;
                markMediaProgress();
                if (stallWatchdogVideoRef.current !== candidateVideo) return;
                stallWatchdogVideoCallbackIdRef.current = candidateVideo.requestVideoFrameCallback?.(onVideoFrame) ?? null;
            };
            stallWatchdogVideoCallbackIdRef.current = candidateVideo.requestVideoFrameCallback(onVideoFrame);
        };

        const startStallWatchdog = () => {
            if (!STALL_WATCHDOG_ENABLED || stallWatchdogTimerRef.current !== null) return;

            resetWatchdogGraceWindow();
            stallWatchdogTimerRef.current = window.setInterval(() => {
                if (generation !== connectionGenerationRef.current) return;
                if (reconnectTimerRef.current !== null) return;
                if (document.hidden) {
                    // Mobile browsers can freeze timers/media while hidden.
                    // Re-arm the grace window and evaluate once visible again.
                    stallWatchdogGraceUntilRef.current = Date.now() + STALL_WATCHDOG_GRACE_MS;
                    return;
                }

                const video = wrapperElement.querySelector('video');
                if (!(video instanceof HTMLVideoElement)) return;
                if (video.ended) return;

                if (!video.paused && Number.isFinite(video.currentTime) && video.currentTime > lastVideoTimeRef.current + 0.001) {
                    lastVideoTimeRef.current = video.currentTime;
                    markMediaProgress();
                }

                if (Date.now() < stallWatchdogGraceUntilRef.current) return;

                const noProgressDuration = Date.now() - lastMediaProgressAtRef.current;
                if (noProgressDuration < STALL_WATCHDOG_TIMEOUT_MS) return;

                scheduleReconnect('Stream stalled. Attempting recovery...');
            }, STALL_WATCHDOG_INTERVAL_MS);
        };

        const handleVisibilityOrPageShow = () => {
            if (generation !== connectionGenerationRef.current) return;
            if (document.hidden) return;

            const staleForMs = Date.now() - lastMediaProgressAtRef.current;
            if (staleForMs >= STALL_WATCHDOG_TIMEOUT_MS) {
                scheduleReconnect('Resuming stream after interruption...');
                return;
            }

            resetWatchdogGraceWindow();
        };

        const config = new Config({
            initialSettings: {
                AutoPlayVideo: true,
                AutoConnect: true,
                ss: connectUrl,
                StartVideoMuted: true,
                HoveringMouse: useHoveringMouse,
                FakeMouseWithTouches: emulateMouseFromTouches,
                TouchInput: !emulateMouseFromTouches,
                MouseInput: true,
                KeyboardInput: true
            }
        });

        try {
            const ps = new PixelStreaming(config, {
                videoElementParent: wrapperElement
            });

            psRef.current = ps;
            ps.config.setFlagEnabled(Flags.KeyboardInput, keyboardInputEnabledRef.current);

            (window as PixelStreamingDebugWindow).ps = ps; // Debugging

            ps.addEventListener('webRtcConnected', () => {
                if (generation !== connectionGenerationRef.current) return;
                console.log("WebRTC Connected");
                reconnectAttemptRef.current = 0;
                clearReconnectTimer();
                resetWatchdogGraceWindow();
                setIsConnected(true);
                setStatus(textRef.current.connectedWait);
            });

            ps.addEventListener('webRtcDisconnected', (e: Event) => {
                if (generation !== connectionGenerationRef.current) return;
                console.log("Disconnected", e);

                 // Some stacks can report signaling disconnect while media keeps flowing.
                if (hasLiveVideoStream(wrapperElement)) {
                    setIsConnected(true);
                    setStatus(textRef.current.streaming);
                    stallWatchdogGraceUntilRef.current = Date.now() + STALL_WATCHDOG_DISCONNECT_RECHECK_MS;
                    return;
                }

                scheduleReconnect();
            });

            ps.addEventListener('videoInitialized', () => {
                if (generation !== connectionGenerationRef.current) return;
                console.log("Video Initialized");
                reconnectAttemptRef.current = 0;
                clearReconnectTimer();
                resetWatchdogGraceWindow();
                setIsConnected(true);
                setStatus(textRef.current.streaming);

                // Expose the video element if the parent needs it (e.g. for mobile controls)
                // The video element is created inside the wrapperRef.current
                const video = wrapperElement.querySelector('video');
                if (video && onVideoInitializedRef.current) {
                    onVideoInitializedRef.current(video as HTMLVideoElement);
                }
                if (video) {
                    lastVideoTimeRef.current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
                    attachVideoFrameWatchdog(video);
                    const onPotentialStall = () => {
                        if (generation !== connectionGenerationRef.current) return;
                        if (document.hidden) return;
                        stallWatchdogGraceUntilRef.current = Math.min(
                            stallWatchdogGraceUntilRef.current,
                            Date.now() + 1200
                        );
                    };
                    video.addEventListener('stalled', onPotentialStall);
                    video.addEventListener('waiting', onPotentialStall);
                    video.addEventListener(
                        'playing',
                        () => {
                            if (generation !== connectionGenerationRef.current) return;
                            resetWatchdogGraceWindow();
                            setIsConnected(true);
                            setStatus(textRef.current.streaming);
                        },
                        { once: true }
                    );
                }
            });

            ps.addEventListener('statsReceived', (event: Event) => {
                if (generation !== connectionGenerationRef.current) return;

                const typedEvent = event as Event & {
                    data?: {
                        aggregatedStats?: {
                            inboundVideoStats?: {
                                bytesReceived?: number;
                                framesDecoded?: number;
                                lastPacketReceivedTimestamp?: number;
                            };
                        };
                    };
                };

                const videoStats = typedEvent.data?.aggregatedStats?.inboundVideoStats;
                if (!videoStats) return;

                const bytesReceived = Number(videoStats.bytesReceived ?? 0);
                const framesDecoded = Number(videoStats.framesDecoded ?? 0);
                const lastPacketReceivedTimestamp = Number(videoStats.lastPacketReceivedTimestamp ?? 0);
                const previous = lastVideoStatsRef.current;

                if (
                    !previous.initialized ||
                    bytesReceived > previous.bytesReceived ||
                    framesDecoded > previous.framesDecoded ||
                    lastPacketReceivedTimestamp > previous.lastPacketReceivedTimestamp
                ) {
                    markMediaProgress();
                }

                lastVideoStatsRef.current = {
                    initialized: true,
                    bytesReceived,
                    framesDecoded,
                    lastPacketReceivedTimestamp
                };
            });

            ps.addResponseEventListener('handle_responses', (response: string) => {
                console.log("RECEIVED FROM UNREAL:", response);
                if (onPixelStreamingResponseRef.current) {
                    onPixelStreamingResponseRef.current(response);
                }
            });

            ps.addEventListener('webRtcFailed', () => {
                if (generation !== connectionGenerationRef.current) return;
                console.error("WebRTC Failed");
                scheduleReconnect(textRef.current.webrtcFailed);
            });

        } catch (err: unknown) {
            if (generation !== connectionGenerationRef.current) return;
            console.error("Setup Error:", err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown setup error';
            scheduleReconnect(textRef.current.setupError(errorMessage));
        }

        startStallWatchdog();
        document.addEventListener('visibilitychange', handleVisibilityOrPageShow);
        window.addEventListener('pageshow', handleVisibilityOrPageShow);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityOrPageShow);
            window.removeEventListener('pageshow', handleVisibilityOrPageShow);
            clearReconnectTimer();
            clearStallWatchdog();
            if (psRef.current) {
                psRef.current.disconnect();
                psRef.current = null;
            }
            if (wrapperElement) {
                wrapperElement.innerHTML = '';
            }
        };
    }, [url, initialUrl, mobileInputMode, isMobileDevice, preferredDesktopMouseMode, reconnectNonce, clearReconnectTimer, clearStallWatchdog]);

    useEffect(() => {
        const ps = psRef.current;
        if (!ps) return;

        ps.config.setFlagEnabled(Flags.KeyboardInput, keyboardInputEnabled);
    }, [keyboardInputEnabled]);

    return (
        <div className="relative w-full h-full bg-black group">
            {/* Visual Status Overlay */}
            {!isConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-black/80 p-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
                    <p className="font-mono text-sm">{status}</p>
                    {error && <p className="text-red-400 mt-2 text-xs max-w-md text-center">{error}</p>}

                    {/* Debug: Manual URL Input */}
                    <div className="mt-8 flex flex-col gap-2 pointer-events-auto items-center">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs w-64 text-white"
                            />
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-indigo-600 px-3 py-1 rounded text-xs hover:bg-indigo-500"
                            >
                                {text.reload}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400">
                            {text.tryHint} <code>ws://127.0.0.1</code> / <code>wss://127.0.0.1</code>
                        </p>
                    </div>
                </div>
            )}

            {/* The Wrapper where Pixel Streaming will inject the video */}
            <div
                ref={wrapperRef}
                className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
            />
        </div>
    );
}
