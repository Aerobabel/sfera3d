'use client';

import { useEffect, useRef } from 'react';

interface StreamPixelPlayerProps {
    appId: string;
    onPixelStreamingResponse?: (response: string) => void;
    onVideoInitialized?: (videoElement: HTMLVideoElement | null) => void;
    onConnectionError?: (message: string | null) => void;
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
    StreamPixelApplication?: (config: Record<string, unknown>) => Promise<StreamPixelSdkResult> | StreamPixelSdkResult;
    default?: {
        StreamPixelApplication?: (config: Record<string, unknown>) => Promise<StreamPixelSdkResult> | StreamPixelSdkResult;
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
    onConnectionError,
    mobileInputMode = 'joystick',
    isMobileDevice = false,
    keyboardInputEnabled = true,
    blockedKeyboardCodes = [],
    desktopMouseMode: preferredDesktopMouseMode,
    mouseSensitivity = 0.85,
}: StreamPixelPlayerProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const streamRef = useRef<StreamPixelStream | null>(null);
    const controllerRef = useRef<StreamPixelController | null>(null);
    const keyboardInputEnabledRef = useRef(keyboardInputEnabled);
    const blockedKeyboardCodesRef = useRef<Set<string>>(new Set());
    const onPixelStreamingResponseRef = useRef(onPixelStreamingResponse);
    const onVideoInitializedRef = useRef(onVideoInitialized);
    const onConnectionErrorRef = useRef(onConnectionError);
    const mouseSensitivityRef = useRef(mouseSensitivity);
    const teardownRef = useRef<(() => void) | null>(null);
    const lastLogMessageRef = useRef('');
    const lastVideoElementRef = useRef<HTMLVideoElement | null>(null);

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
        onConnectionErrorRef.current = onConnectionError;
    }, [onConnectionError]);

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
            onVideoInitializedRef.current?.(null);
            onConnectionErrorRef.current?.('StreamPixel app ID is empty.');
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

        const logEvent = (message: string) => {
            if (!message || lastLogMessageRef.current === message) return;
            lastLogMessageRef.current = message;
            console.info(`[FastView] ${message}`);
        };

        const reportConnectionError = (message: string | null) => {
            onConnectionErrorRef.current?.(message);
        };

        streamRef.current?.disconnect?.();
        controllerRef.current?.disconnect?.();
        streamRef.current = null;
        controllerRef.current = null;
        wrapperElement.innerHTML = '';
        lastLogMessageRef.current = '';
        lastVideoElementRef.current = null;
        onVideoInitializedRef.current?.(null);
        reportConnectionError(null);

        logEvent(`init ${trimmedAppId} (${inputLabel})`);

        const syncVideoElement = () => {
            const videoElement = wrapperElement.querySelector('video');

            if (videoElement instanceof HTMLVideoElement) {
                if (lastVideoElementRef.current !== videoElement) {
                    lastVideoElementRef.current = videoElement;
                    onVideoInitializedRef.current?.(videoElement);
                    logEvent('video element detected');
                }
                return true;
            }

            if (lastVideoElementRef.current) {
                lastVideoElementRef.current = null;
                onVideoInitializedRef.current?.(null);
                logEvent('video element removed');
            }

            return false;
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

            const resetStreamPixelSdk = (globalThis as Record<string, unknown>).__resetStreamPixelSdk;
            if (typeof resetStreamPixelSdk === 'function') {
                (resetStreamPixelSdk as () => void)();
            }

            const psWindow = window as StreamPixelCompatibleWindow;
            if (psWindow.ps === exposedStream) {
                delete psWindow.ps;
            }

            lastVideoElementRef.current = null;
            onVideoInitializedRef.current?.(null);
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

                const resetStreamPixelSdk = (globalThis as Record<string, unknown>).__resetStreamPixelSdk;
                if (typeof resetStreamPixelSdk === 'function') {
                    (resetStreamPixelSdk as () => void)();
                }

                logEvent('calling StreamPixelApplication (v1.3 async)...');

                const result = await Promise.resolve(streamPixelApplication({
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
                }));

                if (cancelled) {
                    result?.pixelStreaming?.disconnect?.();
                    result?.appStream?.stream?.disconnect?.();
                    return;
                }

                const { appStream, pixelStreaming } = result;
                reportConnectionError(null);
                logEvent('SDK initialized successfully');

                if (appStream?.rootElement instanceof HTMLElement) {
                    wrapperElement.appendChild(appStream.rootElement);
                }

                const suppressSdkOverlays = () => {
                    wrapperElement
                        .querySelectorAll<HTMLElement>('[class*="clickableState"], [class*="clickable"]')
                        .forEach((el) => {
                            if (el.style.pointerEvents !== 'none') {
                                el.style.pointerEvents = 'none';
                                logEvent('blocked SDK clickable overlay');
                            }
                        });

                    wrapperElement
                        .querySelectorAll<HTMLElement>('div')
                        .forEach((el) => {
                            if (el === wrapperElement) return;
                            if (el.querySelector('video') || el.querySelector('canvas')) return;
                            const text = el.textContent?.trim() ?? '';
                            const isStatusOverlay =
                                /DISCONNECTED|CLICK TO RESTART|No streamer|Application Not Found|You are in Queue/i.test(text);
                            if (isStatusOverlay && el.style.display !== 'none') {
                                el.style.display = 'none';
                                logEvent('hid SDK status overlay');
                            }
                        });
                };

                domObserver = new MutationObserver(() => {
                    if (cancelled) return;
                    suppressSdkOverlays();
                    syncVideoElement();
                });
                domObserver.observe(wrapperElement, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                });
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
                    logEvent('sdk requested connect action');
                };

                appStream.onWebRtcSdp = () => {
                    if (cancelled) return;
                    logEvent('webrtc SDP stage reached');
                };

                appStream.onWebRtcConnecting = () => {
                    if (cancelled) return;
                    reportConnectionError(null);
                    logEvent('webrtc connecting');
                };

                appStream.onWebRtcConnected = () => {
                    if (cancelled) return;
                    reportConnectionError(null);
                    logEvent('webrtc connected, waiting for video');
                    wrapMouseMoveForSensitivity(stream);
                    syncVideoElement();
                };

                appStream.onVideoInitialized = () => {
                    if (cancelled) return;
                    reportConnectionError(null);
                    logEvent('video initialized');
                    wrapMouseMoveForSensitivity(stream);
                    syncVideoElement();
                };

                responseListener = (response: string) => {
                    onPixelStreamingResponseRef.current?.(response);
                };
                pixelStreaming?.addResponseEventListener?.('handle_responses', responseListener);

                syncTimer = window.setInterval(() => {
                    if (cancelled) return;
                    wrapMouseMoveForSensitivity(stream);
                    syncVideoElement();
                }, 500);
            } catch (caughtError) {
                if (cancelled) return;

                const message = caughtError instanceof Error ? caughtError.message : 'Unknown setup error';
                reportConnectionError(message);
                logEvent(`setup error: ${message}`);
            }
        };

        void initialize();

        return () => {
            cancelled = true;
            teardown();
        };
    }, [appId, isMobileDevice, mobileInputMode, preferredDesktopMouseMode]);

    return (
        <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(102,217,203,0.16),transparent_42%),linear-gradient(160deg,#04070d,#09111c)]">
            <div ref={wrapperRef} className="h-full w-full" />
        </div>
    );
}
