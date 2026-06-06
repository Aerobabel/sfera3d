'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { useState } from 'react';

const LOGO_SOURCES = [
    '/logo_brown.png',
    '/logo_brown.svg',
    '/logo_brown.webp',
    '/logo_brown.jpg',
    '/logo_brown.jpeg',
    '/logo_brown',
] as const;

const SIZE_CLASSES = {
    sm: 'h-7 sm:h-8',
    md: 'h-9 sm:h-10',
    lg: 'h-11 sm:h-12',
    xl: 'h-14 sm:h-16',
} as const;

const FALLBACK_SIZE_CLASSES = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-4xl sm:text-5xl',
} as const;

type SferaLogoProps = {
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    size?: keyof typeof SIZE_CLASSES;
};

export default function SferaLogo({
    className,
    imageClassName,
    priority = false,
    size = 'md',
}: SferaLogoProps) {
    const [sourceIndex, setSourceIndex] = useState(0);
    const [showFallback, setShowFallback] = useState(false);

    const handleImageError = () => {
        if (sourceIndex < LOGO_SOURCES.length - 1) {
            setSourceIndex((currentIndex) => currentIndex + 1);
            return;
        }

        setShowFallback(true);
    };

    return (
        <span className={clsx('inline-flex items-center', className)} aria-label="3DSFERA">
            {showFallback ? (
                <span
                    className={clsx(
                        'font-semibold tracking-tight text-[#f5f1e9] drop-shadow-[0_10px_28px_rgba(246,186,79,0.22)]',
                        FALLBACK_SIZE_CLASSES[size]
                    )}
                >
                    3DSFERA
                </span>
            ) : (
                <Image
                    src={LOGO_SOURCES[sourceIndex]}
                    alt=""
                    width={220}
                    height={72}
                    priority={priority}
                    unoptimized
                    onError={handleImageError}
                    className={clsx(
                        'w-auto object-contain drop-shadow-[0_10px_28px_rgba(246,186,79,0.22)]',
                        SIZE_CLASSES[size],
                        imageClassName
                    )}
                />
            )}
        </span>
    );
}
