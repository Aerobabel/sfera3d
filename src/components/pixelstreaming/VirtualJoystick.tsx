'use client';

import React, { useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
    onMove: (x: number, y: number) => void;
    onStop: () => void;
    size?: number; // Size of the joystick base
    stickSize?: number; // Size of the movable stick
    className?: string;
}

export default function VirtualJoystick({
    onMove,
    onStop,
    size = 100,
    stickSize = 50,
    className = ''
}: VirtualJoystickProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isActive, setIsActive] = useState(false);
    const touchIdRef = useRef<number | null>(null);

    // Center coordinates relative to the joystick wrapper
    // Since we rely on absolute positioning logic inside the component,
    // we calculate center based on props.
    const maxDistance = (size - stickSize) / 2;

    const handleStart = (clientX: number, clientY: number) => {
        setIsActive(true);
        updatePosition(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isActive) return;
        updatePosition(clientX, clientY);
    };

    const handleEnd = () => {
        setIsActive(false);
        setPosition({ x: 0, y: 0 });
        touchIdRef.current = null;
        onStop();
    };

    const updatePosition = (clientX: number, clientY: number) => {
        if (!wrapperRef.current) return;

        const rect = wrapperRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp distance
        let clampedDx = dx;
        let clampedDy = dy;

        if (distance > maxDistance) {
            const angle = Math.atan2(dy, dx);
            clampedDx = Math.cos(angle) * maxDistance;
            clampedDy = Math.sin(angle) * maxDistance;
        }

        setPosition({ x: clampedDx, y: clampedDy });

        // Normalize output (-1 to 1)
        // Invert Y because screen Y grows downwards but game Y usually grows upwards (or use standard screen coords)
        // Standard Joystick: Up is negative Y in screen space, typically mapped to Positive Y in game space.
        // Let's return raw screen-space normalized values (Up = -1, Down = 1)
        const normalizedX = clampedDx / maxDistance;
        const normalizedY = clampedDy / maxDistance;

        onMove(normalizedX, normalizedY);
    };

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const onTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.changedTouches[0];
            touchIdRef.current = touch.identifier;
            handleStart(touch.clientX, touch.clientY);
        };

        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isActive) return;

            // Find the touch that started this interaction
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchIdRef.current) {
                    handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                    break;
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchIdRef.current) {
                    handleEnd();
                    break;
                }
            }
        };

        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleStart(e.clientX, e.clientY);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isActive) return;
            e.preventDefault();
            e.stopPropagation();
            handleMove(e.clientX, e.clientY);
        };

        const onMouseUp = (e: MouseEvent) => {
            if (isActive) {
                e.preventDefault();
                e.stopPropagation();
                handleEnd();
            }
        };

        wrapper.addEventListener('touchstart', onTouchStart, { passive: false });
        wrapper.addEventListener('touchmove', onTouchMove, { passive: false });
        wrapper.addEventListener('touchend', onTouchEnd);
        wrapper.addEventListener('touchcancel', onTouchEnd);

        wrapper.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove); // Window for dragging outside
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            wrapper.removeEventListener('touchstart', onTouchStart);
            wrapper.removeEventListener('touchmove', onTouchMove);
            wrapper.removeEventListener('touchend', onTouchEnd);
            wrapper.removeEventListener('touchcancel', onTouchEnd);

            wrapper.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isActive]);

    return (
        <div
            ref={wrapperRef}
            className={`relative rounded-full bg-white/10 backdrop-blur-sm border border-white/20 touch-none select-none ${className}`}
            style={{ width: size, height: size }}
        >
            <div
                className="absolute rounded-full bg-white/80 shadow-lg pointer-events-none"
                style={{
                    width: stickSize,
                    height: stickSize,
                    left: (size - stickSize) / 2 + position.x,
                    top: (size - stickSize) / 2 + position.y,
                    transition: isActive ? 'none' : 'all 0.2s ease-out'
                }}
            />
        </div>
    );
}
