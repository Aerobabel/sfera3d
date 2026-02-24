'use client';

import { useEffect, useRef, useState } from 'react';
import { Config, Flags, PixelStreaming } from '@epicgames-ps/lib-pixelstreamingfrontend-ue5.4';
import { useLanguage } from './i18n/LanguageProvider';

interface PixelStreamingPlayerProps {
    signalingServerUrl: string;
    onPixelStreamingResponse?: (response: string) => void;
    onVideoInitialized?: (videoElement: HTMLVideoElement) => void;
    mobileInputMode?: 'joystick' | 'touch';
    isMobileDevice?: boolean;
    keyboardInputEnabled?: boolean;
}

type PixelStreamingDebugWindow = Window & {
    ps?: PixelStreaming;
};

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

export default function PixelStreamingPlayer({
    signalingServerUrl: initialUrl,
    onPixelStreamingResponse,
    onVideoInitialized,
    mobileInputMode = 'joystick',
    isMobileDevice = false,
    keyboardInputEnabled = true
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

    const psRef = useRef<PixelStreaming | null>(null);
    const connectionGenerationRef = useRef(0);
    const keyboardInputEnabledRef = useRef(keyboardInputEnabled);
    const onPixelStreamingResponseRef = useRef(onPixelStreamingResponse);
    const onVideoInitializedRef = useRef(onVideoInitialized);

    useEffect(() => {
        textRef.current = text;
    }, [text]);

    useEffect(() => {
        keyboardInputEnabledRef.current = keyboardInputEnabled;
    }, [keyboardInputEnabled]);

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
        const wrapperElement = wrapperRef.current;
        if (!wrapperElement) return;

        connectionGenerationRef.current += 1;
        const generation = connectionGenerationRef.current;

        if (psRef.current) {
            psRef.current.disconnect();
            psRef.current = null;
            wrapperElement.innerHTML = '';
        }

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

        console.log(`Initializing Pixel Streaming with URL: ${connectUrl}`);
        const inputLabel = !isMobileDevice ? 'desktop' : (useTouchScreenInput ? 'touch' : 'joystick');
        setStatus(textRef.current.connecting(connectUrl, inputLabel));

        const config = new Config({
            initialSettings: {
                AutoPlayVideo: true,
                AutoConnect: true,
                ss: connectUrl,
                StartVideoMuted: true,
                HoveringMouse: true,
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
                    return;
                }

                setIsConnected(false);
                setStatus(textRef.current.disconnected);
            });

            ps.addEventListener('videoInitialized', () => {
                if (generation !== connectionGenerationRef.current) return;
                console.log("Video Initialized");
                setIsConnected(true);
                setStatus(textRef.current.streaming);

                // Expose the video element if the parent needs it (e.g. for mobile controls)
                // The video element is created inside the wrapperRef.current
                const video = wrapperElement.querySelector('video');
                if (video && onVideoInitializedRef.current) {
                    onVideoInitializedRef.current(video as HTMLVideoElement);
                }
                if (video) {
                    video.addEventListener(
                        'playing',
                        () => {
                            if (generation !== connectionGenerationRef.current) return;
                            setIsConnected(true);
                            setStatus(textRef.current.streaming);
                        },
                        { once: true }
                    );
                }
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
                setIsConnected(false);
                setError(textRef.current.webrtcFailed);
            });

        } catch (err: unknown) {
            if (generation !== connectionGenerationRef.current) return;
            console.error("Setup Error:", err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown setup error';
            setIsConnected(false);
            setError(textRef.current.setupError(errorMessage));
        }

        return () => {
            if (psRef.current) {
                psRef.current.disconnect();
                psRef.current = null;
            }
            if (wrapperElement) {
                wrapperElement.innerHTML = '';
            }
        };
    }, [url, initialUrl, mobileInputMode, isMobileDevice]);

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
