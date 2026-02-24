'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import VirtualJoystick from './VirtualJoystick';

interface MobileControlsProps {
    videoElement: HTMLVideoElement | null;
}

type ToStreamerHandler = (messageData?: Array<number | string>) => void;

interface PixelStreamingWindow extends Window {
    ps?: {
        toStreamerHandlers?: Map<string, ToStreamerHandler>;
    };
}

const LOOK_DEAD_ZONE = 0.06;
const LOOK_SMOOTHING = 0.22;
const LOOK_RESPONSE_EXPONENT = 2.1;
const LOOK_FINE_ZONE = 0.45;
const LOOK_FINE_SENSITIVITY_PX = 4.5;
const LOOK_SENSITIVITY_PX = 10;
const LOOK_MAX_DELTA_PX = 14;
const HOLD_LEFT_MOUSE_WHILE_LOOKING = false;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const applyLookCurve = (value: number) => {
    const magnitude = Math.abs(value);
    if (magnitude <= LOOK_DEAD_ZONE) return 0;

    // Remap outside dead zone to 0..1, then apply an exponential precision curve.
    const normalized = (magnitude - LOOK_DEAD_ZONE) / (1 - LOOK_DEAD_ZONE);
    const curved = Math.pow(normalized, LOOK_RESPONSE_EXPONENT);
    return Math.sign(value) * curved;
};

export default function MobileControls({ videoElement }: MobileControlsProps) {
    const activeKeys = useRef<Set<string>>(new Set());

    // --- Keyboard Simulation Helper(Left Stick) ---
    const simulateKey = (key: string, type: 'keydown' | 'keyup') => {
        if (type === 'keydown') {
            if (activeKeys.current.has(key)) return;
            activeKeys.current.add(key);
        } else {
            if (!activeKeys.current.has(key)) return;
            activeKeys.current.delete(key);
        }

        let code = '';
        let keyCode = 0;
        if (key === 'w') { code = 'KeyW'; keyCode = 87; }
        else if (key === 's') { code = 'KeyS'; keyCode = 83; }
        else if (key === 'a') { code = 'KeyA'; keyCode = 65; }
        else if (key === 'd') { code = 'KeyD'; keyCode = 68; }

        const event = new KeyboardEvent(type, {
            key: key,
            code: code,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true,
            view: window
        });
        document.dispatchEvent(event);
    };

    // --- Left Stick (Movement: WASD) ---
    const handleMoveJoystick = useCallback((x: number, y: number) => {
        const threshold = 0.5;
        // Forward/Backward
        if (y < -threshold) { simulateKey('w', 'keydown'); simulateKey('s', 'keyup'); }
        else if (y > threshold) { simulateKey('s', 'keydown'); simulateKey('w', 'keyup'); }
        else { simulateKey('w', 'keyup'); simulateKey('s', 'keyup'); }

        // Left/Right
        if (x < -threshold) { simulateKey('a', 'keydown'); simulateKey('d', 'keyup'); }
        else if (x > threshold) { simulateKey('d', 'keydown'); simulateKey('a', 'keyup'); }
        else { simulateKey('a', 'keyup'); simulateKey('d', 'keyup'); }
    }, []);

    const handleStopMove = useCallback(() => {
        ['w', 'a', 's', 'd'].forEach(key => simulateKey(key, 'keyup'));
    }, []);


    // --- Right Stick (Look: direct MouseMove to Pixel Streaming) ---
    const lookRafRef = useRef<number | null>(null);
    const lastFrameRef = useRef<number | null>(null);
    const lookVector = useRef({ x: 0, y: 0 });
    const smoothedLookVector = useRef({ x: 0, y: 0 });
    const virtualCursor = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const isLookingRef = useRef(false);

    const getLookTarget = useCallback((): HTMLElement | null => {
        if (videoElement?.parentElement instanceof HTMLElement) {
            return videoElement.parentElement;
        }

        const fallbackVideo = document.querySelector('#player-container video');
        if (fallbackVideo?.parentElement instanceof HTMLElement) {
            return fallbackVideo.parentElement;
        }

        const fallbackContainer = document.querySelector('#player-container');
        if (fallbackContainer instanceof HTMLElement) {
            return fallbackContainer;
        }

        return document.body;
    }, [videoElement]);

    const getToStreamerHandler = useCallback((messageName: string): ToStreamerHandler | null => {
        const psWindow = window as PixelStreamingWindow;
        return psWindow.ps?.toStreamerHandlers?.get(messageName) ?? null;
    }, []);

    const sendLookDelta = useCallback((deltaX: number, deltaY: number) => {
        const target = getLookTarget();
        if (!target) {
            return;
        }

        const rect = target.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return;
        }

        const mouseMoveHandler = getToStreamerHandler('MouseMove');
        if (mouseMoveHandler) {
            const normalizedDeltaX = Math.round((deltaX / (rect.width * 0.5)) * 32767);
            const normalizedDeltaY = Math.round((deltaY / (rect.height * 0.5)) * 32767);
            mouseMoveHandler([32768, 32768, normalizedDeltaX, normalizedDeltaY]);
            return;
        }

        if (virtualCursor.current.x === 0 && virtualCursor.current.y === 0) {
            virtualCursor.current = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }

        virtualCursor.current.x = clamp(virtualCursor.current.x + deltaX, rect.left, rect.right);
        virtualCursor.current.y = clamp(virtualCursor.current.y + deltaY, rect.top, rect.bottom);

        target.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            view: window,
            movementX: deltaX,
            movementY: deltaY,
            button: 0,
            buttons: 0,
            clientX: virtualCursor.current.x,
            clientY: virtualCursor.current.y
        }));
    }, [getLookTarget, getToStreamerHandler]);

    const stopLookLoop = useCallback(() => {
        if (lookRafRef.current !== null) {
            cancelAnimationFrame(lookRafRef.current);
            lookRafRef.current = null;
        }

        if (HOLD_LEFT_MOUSE_WHILE_LOOKING && isLookingRef.current) {
            const mouseUpHandler = getToStreamerHandler('MouseUp');
            mouseUpHandler?.([0, 32768, 32768]);
            isLookingRef.current = false;
        }

        lookVector.current = { x: 0, y: 0 };
        smoothedLookVector.current = { x: 0, y: 0 };
        virtualCursor.current = { x: 0, y: 0 };
        lastFrameRef.current = null;
    }, [getToStreamerHandler]);

    const startLookLoop = useCallback(() => {
        if (lookRafRef.current !== null) {
            return;
        }

        if (HOLD_LEFT_MOUSE_WHILE_LOOKING && !isLookingRef.current) {
            const mouseEnterHandler = getToStreamerHandler('MouseEnter');
            mouseEnterHandler?.();

            const mouseDownHandler = getToStreamerHandler('MouseDown');
            mouseDownHandler?.([0, 32768, 32768]);
            isLookingRef.current = true;
        }

        const tick = (timestamp: number) => {
            const previousTimestamp = lastFrameRef.current ?? timestamp;
            const frameScale = clamp((timestamp - previousTimestamp) / 16.6667, 0.5, 2);
            lastFrameRef.current = timestamp;

            smoothedLookVector.current.x += (lookVector.current.x - smoothedLookVector.current.x) * LOOK_SMOOTHING;
            smoothedLookVector.current.y += (lookVector.current.y - smoothedLookVector.current.y) * LOOK_SMOOTHING;

            const x = applyLookCurve(smoothedLookVector.current.x);
            const y = applyLookCurve(smoothedLookVector.current.y);

            if (x !== 0 || y !== 0) {
                const xSensitivity = Math.abs(x) < LOOK_FINE_ZONE ? LOOK_FINE_SENSITIVITY_PX : LOOK_SENSITIVITY_PX;
                const ySensitivity = Math.abs(y) < LOOK_FINE_ZONE ? LOOK_FINE_SENSITIVITY_PX : LOOK_SENSITIVITY_PX;

                const deltaX = clamp(x * xSensitivity * frameScale, -LOOK_MAX_DELTA_PX, LOOK_MAX_DELTA_PX);
                const deltaY = clamp(y * ySensitivity * frameScale, -LOOK_MAX_DELTA_PX, LOOK_MAX_DELTA_PX);
                sendLookDelta(deltaX, deltaY);
            }

            lookRafRef.current = requestAnimationFrame(tick);
        };

        lookRafRef.current = requestAnimationFrame(tick);
    }, [getToStreamerHandler, sendLookDelta]);

    const handleLookJoystick = useCallback((x: number, y: number) => {
        lookVector.current = { x, y };
        if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
            startLookLoop();
        }
    }, [startLookLoop]);

    const handleStopLook = useCallback(() => {
        stopLookLoop();
    }, [stopLookLoop]);

    const sendCenterInteraction = useCallback(() => {
        const target = getLookTarget();
        if (!target) return;

        const mouseEnterHandler = getToStreamerHandler('MouseEnter');
        const mouseDownHandler = getToStreamerHandler('MouseDown');
        const mouseUpHandler = getToStreamerHandler('MouseUp');

        // Normalized center coordinates expected by Pixel Streaming mouse handlers.
        const center = 32768;

        if (mouseDownHandler && mouseUpHandler) {
            mouseEnterHandler?.();
            mouseDownHandler([0, center, center]);
            mouseUpHandler([0, center, center]);
            return;
        }

        // Fallback for environments where direct toStreamer handlers are unavailable.
        const rect = target.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;

        target.dispatchEvent(new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            buttons: 1,
            clientX,
            clientY
        }));
        target.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            buttons: 0,
            clientX,
            clientY
        }));
        target.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            buttons: 0,
            clientX,
            clientY
        }));
    }, [getLookTarget, getToStreamerHandler]);

    const handleInteractPress = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        sendCenterInteraction();
    }, [sendCenterInteraction]);

    // Clean up
    useEffect(() => {
        return () => stopLookLoop();
    }, [stopLookLoop]);


    return (
        <div className="absolute inset-0 pointer-events-none z-[110] select-none">
            {/* Left Stick - Move */}
            <div
                className="absolute flex flex-col items-center gap-2"
                style={{
                    left: 'max(12px, env(safe-area-inset-left))',
                    bottom: 'max(12px, env(safe-area-inset-bottom))'
                }}
            >
                <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/80 backdrop-blur">
                    MOVE
                </span>
                <div className="pointer-events-auto rounded-2xl border border-white/15 bg-black/35 p-2 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-md">
                    <VirtualJoystick
                        onMove={handleMoveJoystick}
                        onStop={handleStopMove}
                        size={112}
                        stickSize={46}
                    />
                </div>
            </div>

            {/* Right Stick - Look */}
            <div
                className="absolute flex flex-col items-center gap-2"
                style={{
                    right: 'max(12px, env(safe-area-inset-right))',
                    bottom: 'max(12px, env(safe-area-inset-bottom))'
                }}
            >
                <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/80 backdrop-blur">
                    LOOK
                </span>
                <div className="pointer-events-auto rounded-2xl border border-white/15 bg-black/35 p-2 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-md">
                    <VirtualJoystick
                        onMove={handleLookJoystick}
                        onStop={handleStopLook}
                        size={112}
                        stickSize={46}
                    />
                </div>
            </div>

            {/* Center Action Button - click the crosshair target */}
            <div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
                style={{
                    bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 6px))'
                }}
            >
                <button
                    onPointerDown={handleInteractPress}
                    className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-2 text-[11px] font-bold tracking-[0.18em] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)] backdrop-blur active:scale-95"
                >
                    INTERACT
                </button>
            </div>
        </div>
    );
}
