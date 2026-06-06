'use client';

import clsx from 'clsx';
import { useState } from 'react';

const LOGO_SRC = '/logo_brown';

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

type BrandLogoProps = {
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    size?: keyof typeof SIZE_CLASSES;
};

export default function BrandLogo({ className, imageClassName, size = 'md' }: BrandLogoProps) {
    const [showFallback, setShowFallback] = useState(false);

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
                // The logo lives in /public and may be extensionless in the deployed branch.
                // Use a plain image so Vercel/Next does not need to optimize or statically
                // analyze the file path during build.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={LOGO_SRC}
                    alt=""
                    decoding="async"
                    loading="eager"
                    onError={() => setShowFallback(true)}
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
