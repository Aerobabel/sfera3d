'use client';

import { useEffect } from 'react';

export const useViewportScrollLock = () => {
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        const previousRootOverflow = root.style.overflow;
        const previousRootOverscroll = root.style.overscrollBehavior;
        const previousBodyOverflow = body.style.overflow;
        const previousBodyOverscroll = body.style.overscrollBehavior;

        root.style.overflow = 'hidden';
        root.style.overscrollBehavior = 'none';
        body.style.overflow = 'hidden';
        body.style.overscrollBehavior = 'none';

        return () => {
            root.style.overflow = previousRootOverflow;
            root.style.overscrollBehavior = previousRootOverscroll;
            body.style.overflow = previousBodyOverflow;
            body.style.overscrollBehavior = previousBodyOverscroll;
        };
    }, []);
};
