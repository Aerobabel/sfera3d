'use client';

import clsx from 'clsx';
import { useId } from 'react';

const LOGO_SIZE_CLASSES = {
    sm: 'h-8 w-[9.75rem]',
    md: 'h-10 w-[12rem]',
    lg: 'h-12 w-[14.5rem]',
    xl: 'h-20 w-[19rem]',
} as const;

type BrandLogoProps = {
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    size?: keyof typeof LOGO_SIZE_CLASSES;
};

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

export default function BrandLogo({ className, imageClassName, size = 'md' }: BrandLogoProps) {
    const id = sanitizeId(useId());
    const goldId = `sfera-gold-${id}`;
    const darkId = `sfera-dark-${id}`;
    const edgeId = `sfera-edge-${id}`;
    const glowId = `sfera-glow-${id}`;

    return (
        <span className={clsx('inline-flex items-center', className)} aria-label="3DSFERA">
            <svg
                viewBox="0 0 430 124"
                role="img"
                aria-labelledby={`${id}-title`}
                className={clsx(
                    'block shrink-0 overflow-visible drop-shadow-[0_18px_40px_rgba(0,0,0,0.38)]',
                    LOGO_SIZE_CLASSES[size],
                    imageClassName
                )}
            >
                <title id={`${id}-title`}>3DSFERA</title>
                <defs>
                    <linearGradient id={goldId} x1="42" y1="14" x2="98" y2="112" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#fff1b8" />
                        <stop offset="0.38" stopColor="#c9953d" />
                        <stop offset="0.7" stopColor="#7b4c17" />
                        <stop offset="1" stopColor="#e0bd72" />
                    </linearGradient>
                    <linearGradient id={darkId} x1="18" y1="19" x2="102" y2="102" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#303331" />
                        <stop offset="0.55" stopColor="#151817" />
                        <stop offset="1" stopColor="#050607" />
                    </linearGradient>
                    <linearGradient id={edgeId} x1="20" y1="6" x2="104" y2="44" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#f7e2a2" />
                        <stop offset="0.5" stopColor="#ab762b" />
                        <stop offset="1" stopColor="#f0d38d" />
                    </linearGradient>
                    <filter id={glowId} x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
                        <feDropShadow dx="0" dy="12" stdDeviation="7" floodColor="#000000" floodOpacity="0.4" />
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#c9953d" floodOpacity="0.24" />
                    </filter>
                </defs>

                <g filter={`url(#${glowId})`}>
                    <path
                        d="M61 8 114 38 100 48 61 27 22 48 8 38 61 8Z"
                        fill={`url(#${edgeId})`}
                    />
                    <path
                        d="M8 38 22 48v47l30 17V66l9-6V27L22 48 8 38Z"
                        fill={`url(#${darkId})`}
                    />
                    <path
                        d="M114 38 100 48v47l-30 17V66l-9-6V27l39 21 14-10Z"
                        fill={`url(#${darkId})`}
                    />
                    <path
                        d="M52 66 61 60l9 6v46L61 106l-9 6V66Z"
                        fill={`url(#${goldId})`}
                    />
                    <path
                        d="M22 48 61 27 100 48 88 55 61 41 34 55 22 48Z"
                        fill="#f8edd2"
                        opacity="0.9"
                    />
                    <path
                        d="M34 55 61 41 88 55 70 66 61 60 52 66 34 55Z"
                        fill={`url(#${goldId})`}
                    />
                    <path
                        d="M22 48v47l30 17M100 48v47l-30 17M8 38 61 8l53 30"
                        fill="none"
                        stroke="#f2d993"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.4"
                        opacity="0.62"
                    />
                    <path
                        d="M52 66v46M70 66v46"
                        fill="none"
                        stroke="#fff2bd"
                        strokeLinecap="round"
                        strokeWidth="1.2"
                        opacity="0.5"
                    />
                </g>

                <g transform="translate(140 35)">
                    <text
                        x="0"
                        y="48"
                        fill="#f6f1e8"
                        fontFamily="Arial, Helvetica, sans-serif"
                        fontSize="45"
                        fontWeight="500"
                        letterSpacing="13"
                    >
                        3DSFERA
                    </text>
                    <path d="M274 49 281 32l8 17h-15Z" fill={`url(#${goldId})`} opacity="0.95" />
                    <path d="M0 67h118" stroke="#f2d993" strokeWidth="1.4" opacity="0.35" />
                    <path d="M180 67h96" stroke="#f2d993" strokeWidth="1.4" opacity="0.35" />
                    <rect x="148" y="62" width="9" height="9" rx="1.5" fill={`url(#${goldId})`} transform="rotate(45 152.5 66.5)" />
                </g>
            </svg>
        </span>
    );
}
