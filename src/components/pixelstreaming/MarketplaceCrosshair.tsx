'use client';

export default function MarketplaceCrosshair() {
    return (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center select-none">
            <div className="relative h-16 w-16 md:h-20 md:w-20">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border border-cyan-300/35 shadow-[0_0_20px_rgba(34,211,238,0.2)]" />

                {/* Soft pulse ring */}
                <div className="absolute inset-[6px] rounded-full border border-cyan-200/20 animate-pulse" />

                {/* Cardinal ticks */}
                <div className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-cyan-100/80" />
                <div className="absolute left-1/2 bottom-0 h-2 w-px -translate-x-1/2 bg-cyan-100/80" />
                <div className="absolute top-1/2 left-0 h-px w-2 -translate-y-1/2 bg-cyan-100/80" />
                <div className="absolute top-1/2 right-0 h-px w-2 -translate-y-1/2 bg-cyan-100/80" />

                {/* Center marker */}
                <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
            </div>
        </div>
    );
}
