'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './i18n/LanguageProvider';

interface StreamPixelPlayerProps {
    appId: string;
    onPixelStreamingResponse?: (response: string) => void;
    onVideoInitialized?: (videoElement: HTMLVideoElement) => void;
    mobileInputMode?: 'joystick' | 'touch';
    isMobileDevice?: boolean;
    keyboardInputEnabled?: boolean;
    blockedKeyboardCodes?: string[];
    desktopMouseMode?: 'locked' | 'hovering';
    mouseSensitivity?: number;
}

type ToStreamerHandler = (messageData?: Array<number | string>) => void;

type StreamPixelStream = {
    toStreamerHandlers?: Map<string, ToStreamerHandler>;
    videoElementParent?: HTMLElement;
    config?: {
        setFlagEnabled?: (flagName: string, enabled: boolean) => void;
    };
    _webRtcController?: {
        streamController?: {
            audioElement?: HTMLMediaElement | null;
        };
    };
    disconnect?: () => void;
};

type StreamPixelCompatibleWindow = Window & {
    ps?: StreamPixelStream;
};

type StreamPixelController = {
    addResponseEventListener?: (name: string, listener: (response: string) => void) => void;
    removeResponseEventListener?: (name: string) => void;
    disconnect?: () => void;
};

type StreamPixelAppStream = {
    rootElement?: HTMLElement;
    stream?: StreamPixelStream;
    onConnectAction?: (() => void) | null;
    onVideoInitialized?: (() => void) | null;
    onWebRtcSdp?: (() => void) | null;
    onWebRtcConnecting?: (() => void) | null;
    onWebRtcConnected?: (() => void) | null;
};

type StreamPixelSdkResult = {
    appStream?: StreamPixelAppStream;
    pixelStreaming?: StreamPixelController;
};

type StreamPixelSdkModule = {
    StreamPixelApplication?: (config: Record<string, unknown>) => StreamPixelSdkResult;
    default?: {
        StreamPixelApplication?: (config: Record<string, unknown>) => StreamPixelSdkResult;
    };
};

type DesktopMouseMode = 'locked' | 'hovering';

const importRuntimeModule = new Function(
    'modulePath',
    'return import(modulePath);'
) as (modulePath: string) => Promise<unknown>;

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

export default function StreamPixelPlayer({
    appId,
    onPixelStreamingResponse,
    onVideoInitialized,
    mobileInputMode = 'joystick',
    isMobileDevice = false,
    keyboardInputEnabled = true,
    blockedKeyboardCodes = [],
    desktopMouseMode: preferredDesktopMouseMode,
    mouseSensitivity = 0.85,
}: StreamPixelPlayerProps) {
    const { language } = useLanguage();
    const text = {
        en: {
            initializing: 'Initializing...',
            missingAppId: 'StreamPixel app ID is empty.',
            missingStatus: 'Missing StreamPixel app ID',
            connecting: (value: string, label: string) => `Connecting to ${value} (${label})...`,
            connectedWait: 'Connected resources. Waiting for video...',
            streaming: 'Streaming Active',
            setupError: (message: string) => `Setup Error: ${message}`,
        },
        ru: {
            initializing: 'Initializing...',
            missingAppId: 'StreamPixel app ID is empty.',
            missingStatus: 'Missing StreamPixel app ID',
            connecting: (value: string, label: string) => `Connecting to ${value} (${label})...`,
            connectedWait: 'Connected resources. Waiting for video...',
            streaming: 'Streaming Active',
            setupError: (message: string) => `Setup Error: ${message}`,
        },
        zh: {
            initializing: 'Initializing...',
            missingAppId: 'StreamPixel app ID is empty.',
            missingStatus: 'Missing StreamPixel app ID',
            connecting: (value: string, label: string) => `Connecting to ${value} (${label})...`,
            connectedWait: 'Connected resources. Waiting for video...',
            streaming: 'Streaming Active',
            setupError: (message: string) => `Setup Error: ${message}`,
        },
    }[language];

    const wrapperRef = useRef<HTMLDivElement>(null);
    const streamRef = useRef<StreamPixelStream | null>(null);
    const controllerRef = useRef<StreamPixelController | null>(null);
    const keyboardInputEnabledRef = useRef(keyboardInputEnabled);
    const blockedKeyboardCodesRef = useRef<Set<string>>(new Set());
    const onPixelStreamingResponseRef = useRef(onPixelStreamingResponse);
    const onVideoInitializedRef = useRef(onVideoInitialized);
    const mouseSensitivityRef = useRef(mouseSensitivity);
    const textRef = useRef(text);
    const teardownRef = useRef<(() => void) | null>(null);
    const lastDiagnosticMessageRef = useRef('');
    const lastStreamTextRef = useRef('');
    const hasVideoElementRef = useRef(false);

    const [status, setStatus] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [diagnosticEvents, setDiagnosticEvents] = useState<string[]>([]);
    const [streamTextSnapshot, setStreamTextSnapshot] = useState('');
    const [hasVideoElement, setHasVideoElement] = useState(false);
    const [hasSdpSignal, setHasSdpSignal] = useState(false);
    const [hasConnectAction, setHasConnectAction] = useState(false);
    const [hasWebRtcConnected, setHasWebRtcConnected] = useState(false);
    const [hasVideoInitialized, setHasVideoInitialized] = useState(false);

    useEffect(() => {
        textRef.current = text;
    }, [text]);

    useEffect(() => {
        keyboardInputEnabledRef.current = keyboardInputEnabled;
        streamRef.current?.config?.setFlagEnabled?.('KeyboardInput', keyboardInputEnabled);
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
        mouseSensitivityRef.current = mouseSensitivity;
    }, [mouseSensitivity]);

    useEffect(() => {
        const disconnectForPageExit = () => {
            teardownRef.current?.();
        };

        window.addEventListener('pagehide', disconnectForPageExit);
        window.addEventListener('beforeunload', disconnectForPageExit);
        window.addEventListener('unload', disconnectForPageExit);

        return () => {
            window.removeEventListener('pagehide', disconnectForPageExit);
            window.removeEventListener('beforeunload', disconnectForPageExit);
            window.removeEventListener('unload', disconnectForPageExit);
        };
    }, []);

    useEffect(() => {
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

        const trimmedAppId = appId.trim();
        if (!trimmedAppId) {
            setIsStreaming(false);
            setError(textRef.current.missingAppId);
            setStatus(textRef.current.missingStatus);
            return;
        }

        let cancelled = false;
        let responseListener: ((response: string) => void) | null = null;
        let syncTimer: number | null = null;
        let exposedStream: StreamPixelStream | null = null;
        let domObserver: MutationObserver | null = null;
        let hasTornDown = false;

        const desktopMouseMode = resolveDesktopMouseMode(preferredDesktopMouseMode);
        const useTouchScreenInput = mobileInputMode === 'touch';
        const emulateMouseFromTouches = isMobileDevice && (mobileInputMode === 'touch' || mobileInputMode === 'joystick');
        const useHoveringMouse = isMobileDevice ? true : desktopMouseMode === 'hovering';
        const inputLabel = !isMobileDevice
            ? `desktop-${desktopMouseMode}`
            : (useTouchScreenInput ? 'touch' : 'joystick');

        streamRef.current?.disconnect?.();
        controllerRef.current?.disconnect?.();
        streamRef.current = null;
        controllerRef.current = null;
        wrapperElement.innerHTML = '';
        setIsStreaming(false);
        setError(null);
        setStatus(textRef.current.connecting(trimmedAppId, inputLabel));
        setDiagnosticEvents([]);
        setStreamTextSnapshot('');
        setHasVideoElement(false);
        setHasSdpSignal(false);
        setHasConnectAction(false);
        setHasWebRtcConnected(false);
        setHasVideoInitialized(false);
        lastDiagnosticMessageRef.current = '';
        lastStreamTextRef.current = '';
        hasVideoElementRef.current = false;

        const pushDiagnosticEvent = (message: string) => {
            if (!message || lastDiagnosticMessageRef.current === message) return;

            lastDiagnosticMessageRef.current = message;
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
            const entry = `${timestamp} ${message}`;

            console.info(`[FastView] ${message}`);
            setDiagnosticEvents((previous) => [...previous.slice(-7), entry]);
        };

        pushDiagnosticEvent(`init ${trimmedAppId} (${inputLabel})`);

        const syncVideoElement = () => {
            const videoElement = wrapperElement.querySelector('video');
            const hasDetectedVideoElement = videoElement instanceof HTMLVideoElement;

            if (hasVideoElementRef.current !== hasDetectedVideoElement) {
                hasVideoElementRef.current = hasDetectedVideoElement;
                setHasVideoElement(hasDetectedVideoElement);
                pushDiagnosticEvent(hasDetectedVideoElement ? 'video element detected' : 'video element removed');
            }

            if (videoElement instanceof HTMLVideoElement) {
                onVideoInitializedRef.current?.(videoElement);
                return true;
            }

            return false;
        };

        const syncStreamTextSnapshot = () => {
            const normalizedText = wrapperElement.textContent?.replace(/\s+/g, ' ').trim() ?? '';
            const nextSnapshot = normalizedText.slice(0, 180);

            if (!nextSnapshot || lastStreamTextRef.current === nextSnapshot) return;

            lastStreamTextRef.current = nextSnapshot;
            setStreamTextSnapshot(nextSnapshot);
            pushDiagnosticEvent(`stream text: ${nextSnapshot}`);
        };

        const teardown = () => {
            if (hasTornDown) return;
            hasTornDown = true;

            if (syncTimer !== null) {
                window.clearInterval(syncTimer);
                syncTimer = null;
            }

            if (domObserver) {
                domObserver.disconnect();
                domObserver = null;
            }

            if (responseListener) {
                controllerRef.current?.removeResponseEventListener?.('handle_responses');
                responseListener = null;
            }

            controllerRef.current?.disconnect?.();
            streamRef.current?.disconnect?.();
            controllerRef.current = null;
            streamRef.current = null;

            // Reset the SDK singleton guard so a subsequent mount can
            // call StreamPixelApplication again (React Strict Mode, HMR, etc.)
            (globalThis as Record<string, unknown>).__resetStreamPixelSdk
                && ((globalThis as Record<string, unknown>).__resetStreamPixelSdk as () => void)();

            const psWindow = window as StreamPixelCompatibleWindow;
            if (psWindow.ps === exposedStream) {
                delete psWindow.ps;
            }

            wrapperElement.innerHTML = '';

            if (teardownRef.current === teardown) {
                teardownRef.current = null;
            }
        };

        teardownRef.current = teardown;

        let hasWrappedMouseMove = false;
        const wrapMouseMoveForSensitivity = (stream: StreamPixelStream) => {
            if (hasWrappedMouseMove) return;
            const handlers = stream.toStreamerHandlers;
            const originalMouseMove = handlers?.get('MouseMove');
            if (!originalMouseMove || !handlers) return;

            hasWrappedMouseMove = true;
            const wrappedMouseMove: typeof originalMouseMove = (messageData) => {
                if (!messageData || messageData.length < 4) {
                    originalMouseMove(messageData);
                    return;
                }

                const scaledMessageData = [...messageData];
                const sensitivity = mouseSensitivityRef.current;

                if (typeof scaledMessageData[2] === 'number') {
                    scaledMessageData[2] = Math.round(scaledMessageData[2] * sensitivity);
                }

                if (typeof scaledMessageData[3] === 'number') {
                    scaledMessageData[3] = Math.round(scaledMessageData[3] * sensitivity);
                }

                originalMouseMove(scaledMessageData);
            };

            handlers.set('MouseMove', wrappedMouseMove);
        };

        const initialize = async () => {
            try {
                const sdkModule = await importRuntimeModule('/streampixel-sdk') as StreamPixelSdkModule;
                if (cancelled) return;

                const streamPixelApplication =
                    sdkModule.StreamPixelApplication ?? sdkModule.default?.StreamPixelApplication;

                if (typeof streamPixelApplication !== 'function') {
                    throw new Error('StreamPixelApplication export not found.');
                }

                // Reset the SDK singleton guard in case it's still set from a
                // previous mount (module stays cached across React re-mounts).
                (globalThis as Record<string, unknown>).__resetStreamPixelSdk
                    && ((globalThis as Record<string, unknown>).__resetStreamPixelSdk as () => void)();

                pushDiagnosticEvent('calling StreamPixelApplication (v1.3 async)...');

                // The v1.3 SDK fetches project config (region, codecs, signalling
                // URL) from Streampixel's API internally and returns a Promise.
                // Only appId and AutoConnect are required — the SDK resolves
                // everything else from the dashboard project settings.
                const result = await (streamPixelApplication as (config: Record<string, unknown>) => Promise<StreamPixelSdkResult>)({
                    appId: trimmedAppId,
                    AutoConnect: true,
                    AutoPlayVideo: true,
                    StartVideoMuted: true,
                    MaxReconnectAttempts: 0,
                    hoverMouse: useHoveringMouse,
                    keyBoardInput: keyboardInputEnabledRef.current,
                    fakeMouseWithTouches: emulateMouseFromTouches,
                    resX: window.innerWidth,
                    resY: window.innerHeight,
                });

                if (cancelled) {
                    result?.pixelStreaming?.disconnect?.();
                    result?.appStream?.stream?.disconnect?.();
                    return;
                }

                const { appStream, pixelStreaming } = result;
                pushDiagnosticEvent('SDK initialized successfully');

                if (appStream?.rootElement instanceof HTMLElement) {
                    wrapperElement.appendChild(appStream.rootElement);
                }

                // Suppress the SDK's built-in overlays. These include:
                //  - "Click To Restart" / "Click to try again" clickable overlays that
                //    create new backend sessions on every click (session leak).
                //  - Full-screen centered text overlays ("DISCONNECTED: APPLICATION NOT
                //    FOUND", "No streamers available", etc.) that cover our own UI.
                // We hide them entirely and surface the info via our diagnostics panel.
                const suppressSdkOverlays = () => {
                    wrapperElement
                        .querySelectorAll<HTMLElement>('[class*="clickableState"], [class*="clickable"]')
                        .forEach((el) => {
                            if (el.style.pointerEvents !== 'none') {
                                el.style.pointerEvents = 'none';
                                pushDiagnosticEvent('blocked SDK clickable overlay');
                            }
                        });

                    // The SDK renders centered text overlays as direct children
                    // (typically divs with inline styles for centering). Hide any
                    // non-video, non-canvas overlay elements so our diagnostics
                    // panel is the single source of status information.
                    wrapperElement
                        .querySelectorAll<HTMLElement>('div')
                        .forEach((el) => {
                            if (el === wrapperElement) return;
                            // Keep elements that contain the video player.
                            if (el.querySelector('video') || el.querySelector('canvas')) return;
                            // Target SDK overlay text containers — they use centered
                            // positioning and uppercase text for status messages.
                            const text = el.textContent?.trim() ?? '';
                            const isStatusOverlay =
                                /DISCONNECTED|CLICK TO RESTART|No streamer|Application Not Found|You are in Queue/i.test(text);
                            if (isStatusOverlay && el.style.display !== 'none') {
                                el.style.display = 'none';
                                pushDiagnosticEvent('hid SDK status overlay');
                            }
                        });
                };

                domObserver = new MutationObserver(() => {
                    if (cancelled) return;
                    suppressSdkOverlays();
                    syncStreamTextSnapshot();
                    syncVideoElement();
                });
                domObserver.observe(wrapperElement, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                });
                syncStreamTextSnapshot();
                syncVideoElement();

                const stream = appStream?.stream;
                if (!stream) {
                    throw new Error('StreamPixel stream was not created.');
                }

                streamRef.current = stream;
                controllerRef.current = pixelStreaming ?? null;

                stream.config?.setFlagEnabled?.('KeyboardInput', keyboardInputEnabledRef.current);
                stream.config?.setFlagEnabled?.('HoveringMouseMode', useHoveringMouse);
                stream.config?.setFlagEnabled?.('FakeMouseWithTouches', emulateMouseFromTouches);
                stream.config?.setFlagEnabled?.('StartVideoMuted', true);

                const resolvedVideoElementParent =
                    appStream?.rootElement instanceof HTMLElement
                        ? appStream.rootElement
                        : stream.videoElementParent ?? wrapperElement;

                exposedStream = {
                    get toStreamerHandlers() {
                        return stream.toStreamerHandlers;
                    },
                    get videoElementParent() {
                        return resolvedVideoElementParent;
                    },
                    get config() {
                        return stream.config;
                    },
                    get _webRtcController() {
                        return stream._webRtcController;
                    },
                    disconnect: () => {
                        stream.disconnect?.();
                    },
                };

                (window as StreamPixelCompatibleWindow).ps = exposedStream;

                appStream.onConnectAction = () => {
                    if (cancelled) return;
                    setHasConnectAction(true);
                    pushDiagnosticEvent('sdk requested connect action');
                };

                appStream.onWebRtcSdp = () => {
                    if (cancelled) return;
                    setHasSdpSignal(true);
                    pushDiagnosticEvent('webrtc SDP stage reached');
                };

                appStream.onWebRtcConnecting = () => {
                    if (cancelled) return;
                    setStatus(textRef.current.connecting(trimmedAppId, inputLabel));
                    pushDiagnosticEvent('webrtc connecting');
                };

                appStream.onWebRtcConnected = () => {
                    if (cancelled) return;
                    setIsStreaming(false);
                    setError(null);
                    setStatus(textRef.current.connectedWait);
                    setHasWebRtcConnected(true);
                    pushDiagnosticEvent('webrtc connected, waiting for video');
                    wrapMouseMoveForSensitivity(stream);
                    syncVideoElement();
                    syncStreamTextSnapshot();
                };

                appStream.onVideoInitialized = () => {
                    if (cancelled) return;
                    setIsStreaming(true);
                    setError(null);
                    setStatus(textRef.current.streaming);
                    setHasVideoInitialized(true);
                    pushDiagnosticEvent('video initialized');
                    wrapMouseMoveForSensitivity(stream);
                    syncVideoElement();
                    syncStreamTextSnapshot();
                };

                responseListener = (response: string) => {
                    pushDiagnosticEvent('received Unreal response');
                    onPixelStreamingResponseRef.current?.(response);
                };
                pixelStreaming?.addResponseEventListener?.('handle_responses', responseListener);

                syncTimer = window.setInterval(() => {
                    if (cancelled) return;
                    wrapMouseMoveForSensitivity(stream);
                    syncVideoElement();
                    syncStreamTextSnapshot();
                }, 500);
            } catch (caughtError) {
                if (cancelled) return;

                const message = caughtError instanceof Error ? caughtError.message : 'Unknown setup error';
                setIsStreaming(false);
                setError(textRef.current.setupError(message));
                setStatus(textRef.current.setupError(message));
                pushDiagnosticEvent(`setup error: ${message}`);
            }
        };

        void initialize();

        return () => {
            cancelled = true;
            teardown();
        };
    }, [appId, isMobileDevice, mobileInputMode, preferredDesktopMouseMode]);

    return (
        <div className="relative h-full w-full overflow-hidden bg-black">
            <div ref={wrapperRef} className="h-full w-full" />

            {(!isStreaming || error) && (
                <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-sm rounded-xl border border-white/10 bg-black/65 px-4 py-3 text-xs text-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
                    <p className="font-semibold uppercase tracking-[0.18em] text-cyan-300">Stream</p>
                    <p className="mt-2 leading-relaxed">{error ?? status}</p>
                </div>
            )}

            {(!isStreaming || error) && (
                <div className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-md rounded-xl border border-cyan-400/20 bg-slate-950/78 px-4 py-3 text-[11px] text-slate-200 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
                    <p className="font-semibold uppercase tracking-[0.18em] text-cyan-300">FastView Diagnostics</p>
                    <div className="mt-3 space-y-1 text-slate-300">
                        <p><span className="text-slate-500">App ID:</span> {appId}</p>
                        <p><span className="text-slate-500">Status:</span> {status}</p>
                        <p><span className="text-slate-500">Wrapper text:</span> {streamTextSnapshot || 'none'}</p>
                        <p><span className="text-slate-500">Video element:</span> {hasVideoElement ? 'detected' : 'missing'}</p>
                        <p><span className="text-slate-500">Connect action:</span> {hasConnectAction ? 'yes' : 'no'}</p>
                        <p><span className="text-slate-500">SDP stage:</span> {hasSdpSignal ? 'yes' : 'no'}</p>
                        <p><span className="text-slate-500">WebRTC connected:</span> {hasWebRtcConnected ? 'yes' : 'no'}</p>
                        <p><span className="text-slate-500">Video initialized:</span> {hasVideoInitialized ? 'yes' : 'no'}</p>
                    </div>
                    {diagnosticEvents.length > 0 && (
                        <div className="mt-3 border-t border-white/10 pt-3">
                            <p className="font-semibold uppercase tracking-[0.16em] text-slate-400">Recent Events</p>
                            <div className="mt-2 space-y-1 text-slate-300">
                                {diagnosticEvents.map((event) => (
                                    <p key={event}>{event}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
