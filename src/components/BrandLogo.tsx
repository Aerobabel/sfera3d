'use client';

import clsx from 'clsx';
import Image from 'next/image';

const LOGO_SIZE_CLASSES = {
    sm: 'h-8 w-8 sm:h-9 sm:w-9',
    md: 'h-10 w-10 sm:h-12 sm:w-12',
    lg: 'h-12 w-12 sm:h-14 sm:w-14',
    xl: 'h-16 w-16 sm:h-24 sm:w-24',
} as const;

type BrandLogoProps = {
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    size?: keyof typeof LOGO_SIZE_CLASSES;
};

export default function BrandLogo({ className, imageClassName, priority = false, size = 'md' }: BrandLogoProps) {
    return (
        <span className={clsx('inline-flex items-center', className)} aria-label="3DSFERA">
            <Image
                src="/3dsfera-logo-mark.png"
                alt="3DSFERA"
                width={438}
                height={456}
                priority={priority}
                className={clsx(
                    'block shrink-0 object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.38)]',
                    imageClassName,
                    LOGO_SIZE_CLASSES[size]
                )}
            />
        </span>
    );
}
