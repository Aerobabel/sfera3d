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
    emitUIInteraction?: (descriptor: string | Record<string, unknown>) => void;
};

type StreamPixelCompatibleWindow = Window & {
    ps?: StreamPixelStream;
};

type StreamPixelController = {
    addResponseEventListener?: (name: string, listener: (response: string) => void) => void;
    removeResponseEventListener?: (name: string) => void;
    disconnect?: () => void;
    emitConsoleCommand?: (command: string) => void;
    emitUIInteraction?: (descriptor: string | Record<string, unknown>) => void;
};

// Console commands issued as soon as the UE video starts streaming. These
// suppress stock UE in-viewport debug banners ("LIGHTING NEEDS TO BE REBUILT",
// "REFLECTION CAPTURES NEED TO BE REBUILT", etc.) which are baked into the
// video frames by the engine and therefore cannot be hidden via CSS.
//
// NOTE: UE 5.x Pixel Streaming silently rejects console commands unless the
// stream was launched with `-PixelStreamingAllowConsoleCommands` or the
// cvar `PixelStreaming.AllowPixelStreamingCommands` is set to 1. If this
// keeps failing, add `ExecuteConsoleCommand("DisableAllScreenMessages")`
// to the level blueprint BeginPlay — that's the reliable fix.
const INITIAL_CONSOLE_COMMANDS = ['DisableAllScreenMessages', 'r.UnbuiltLightingWarnings 0'];

const diagnoseStream = (controller: StreamPixelController | null, stream: StreamPixelStream | null) => {
    const handlerKeys = stream?.toStreamerHandlers
        ? Array.from(stream.toStreamerHandlers.keys())
        : [];
    console.info('[FastView] toStreamerHandlers keys:', handlerKeys);
    console.info('[FastView] controller has emitConsoleCommand:', typeof controller?.emitConsoleCommand === 'function');
    console.info('[FastView] controller has emitUIInteraction:', typeof controller?.emitUIInteraction === 'function');
};

const sendConsoleCommand = (
    controller: StreamPixelController | null,
    stream: StreamPixelStream | null,
    command: string
): boolean => {
    let delivered = false;

    // 1. SDK helper (most reliable when exposed).
    if (typeof controller?.emitConsoleCommand === 'function') {
        try { controller.emitConsoleCommand(command); delivered = true; } catch { /* fall through */ }
    }

    // 2. Also send via UIInteraction so a blueprint listener can pick it up
    //    and call ExecuteConsoleCommand itself. This bypasses the UE-side
    //    `PixelStreamingAllowConsoleCommands` gate.
    if (typeof controller?.emitUIInteraction === 'function') {
        try {
            controller.emitUIInteraction({ type: 'ConsoleCommand', command });
        } catch { /* ignore */ }
    }

    // 3. Raw toStreamer Command channel fallback.
    const handlers = stream?.toStreamerHandlers;
    if (handlers) {
        const handlerKey = ['Command', 'command', 'ConsoleCommand'].find((k) => handlers.has(k));
        const handler = handlerKey ? handlers.get(handlerKey) : undefined;
        if (handler) {
            try { handler([JSON.stringify({ ConsoleCommand: command })]); delivered = true; } catch { /* ignore */ }
        }
    }

    return delivered;
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
    mouseSensitivity = 0.5,
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
        let resizeObserver: ResizeObserver | null = null;
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

            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
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
        // Sub-pixel carry. The SDK only accepts integer mouse deltas, so when
        // sensitivity < 1 a naive Math.round drops every fractional event to
        // zero and slow precision motion becomes visible "скачок" stutter.
        // We accumulate the fractional remainder per-axis and emit it the
        // moment it crosses an integer boundary.
        let mouseDeltaCarryX = 0;
        let mouseDeltaCarryY = 0;
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

                const sensitivity = mouseSensitivityRef.current;

                // Fast path: at sensitivity = 1 the SDK's integer deltas are
                // already correct, no scaling/rounding is needed.
                if (sensitivity === 1) {
                    originalMouseMove(messageData);
                    return;
                }

                const scaledMessageData = [...messageData];

                if (typeof scaledMessageData[2] === 'number') {
                    const raw = scaledMessageData[2] * sensitivity + mouseDeltaCarryX;
                    const intPart = Math.trunc(raw);
                    mouseDeltaCarryX = raw - intPart;
                    scaledMessageData[2] = intPart;
                }

                if (typeof scaledMessageData[3] === 'number') {
                    const raw = scaledMessageData[3] * sensitivity + mouseDeltaCarryY;
                    const intPart = Math.trunc(raw);
                    mouseDeltaCarryY = raw - intPart;
                    scaledMessageData[3] = intPart;
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
                    // NOTE: Do NOT disable pointer-events on [class*="clickable"]
                    // elements — those are the SDK's click-to-lock-pointer handlers.
                    // Disabling them prevents pointer lock acquisition and breaks
                    // mouse orbit. The player container sits at z-0 so React UI at
                    // z-10+ still receives clicks normally.

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

                // Force the SDK to re-fit when the player container changes
                // size. Fixes the "stream looks wrong on Chrome until I zoom"
                // bug: SDK reads window.innerWidth/innerHeight once at init,
                // but on Windows + DPR scaling those values can be stale until
                // the first paint settles. ResizeObserver fires once layout
                // stabilises and dispatching a resize event triggers the
                // SDK's internal refit handler.
                let lastResizeAt = 0;
                resizeObserver = new ResizeObserver(() => {
                    if (cancelled) return;
                    const now = Date.now();
                    if (now - lastResizeAt < 120) return;
                    lastResizeAt = now;
                    try { window.dispatchEvent(new Event('resize')); } catch { /* ignore */ }
                });
                resizeObserver.observe(wrapperElement);

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
                    emitUIInteraction: (descriptor) => {
                        pixelStreaming?.emitUIInteraction?.(descriptor);
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
                    // Suppress UE in-viewport debug banners once the stream is
                    // live. Retry a couple of times: on very slow connects the
                    // data channel isn't ready at the first video frame.
                    const dispatchInitialCommands = (attempt: number) => {
                        if (cancelled) return;
                        const controller = controllerRef.current;
                        if (attempt === 0) diagnoseStream(controller, stream);
                        const allDelivered = INITIAL_CONSOLE_COMMANDS.every((cmd) =>
                            sendConsoleCommand(controller, stream, cmd)
                        );
                        if (!allDelivered && attempt < 5) {
                            window.setTimeout(() => dispatchInitialCommands(attempt + 1), 500);
                        } else if (allDelivered) {
                            logEvent(`initial console commands dispatched (attempt ${attempt + 1})`);
                        } else {
                            console.warn('[FastView] could not dispatch console commands — UE likely needs -PixelStreamingAllowConsoleCommands or a blueprint handler. See StreamPixelPlayer.tsx comment.');
                        }
                    };
                    dispatchInitialCommands(0);
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
