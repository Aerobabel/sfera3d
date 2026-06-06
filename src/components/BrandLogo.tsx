import Image from 'next/image';
import clsx from 'clsx';

const LOGO_SRC = '/logo_brown';

const SIZE_CLASSES = {
    sm: 'h-7 sm:h-8',
    md: 'h-9 sm:h-10',
    lg: 'h-11 sm:h-12',
    xl: 'h-14 sm:h-16',
} as const;

type BrandLogoProps = {
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    size?: keyof typeof SIZE_CLASSES;
};

export default function BrandLogo({
    className,
    imageClassName,
    priority = false,
    size = 'md',
}: BrandLogoProps) {
    return (
        <span className={clsx('inline-flex items-center', className)}>
            <Image
                src={LOGO_SRC}
                alt="3DSFERA"
                width={220}
                height={72}
                priority={priority}
                className={clsx(
                    'w-auto object-contain drop-shadow-[0_10px_28px_rgba(246,186,79,0.22)]',
                    SIZE_CLASSES[size],
                    imageClassName
                )}
            />
        </span>
    );
}
