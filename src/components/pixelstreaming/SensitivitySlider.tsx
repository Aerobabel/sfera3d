'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';

interface SensitivitySliderProps {
    value: number;
    onChange: (value: number) => void;
}

const MIN = 0.1;
const MAX = 1.0;
const STEP = 0.05;
const DEFAULT = 1.0;

const LABELS = {
    en: { sensitivity: 'SENSITIVITY', reset: 'Reset' },
    ru: { sensitivity: 'ЧУВСТВИТЕЛЬНОСТЬ', reset: 'Сброс' },
    zh: { sensitivity: '灵敏度', reset: '重置' },
} as const;

export default function SensitivitySlider({ value, onChange }: SensitivitySliderProps) {
    const { language } = useLanguage();
    const label = LABELS[language];
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(parseFloat(e.target.value));
    }, [onChange]);

    const handleReset = useCallback(() => {
        onChange(DEFAULT);
    }, [onChange]);

    // Close panel when clicking outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClick);
        return () => document.removeEventListener('pointerdown', handleClick);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    const displayValue = value.toFixed(1);
    const percentage = ((value - MIN) / (MAX - MIN)) * 100;

    return (
        <div ref={panelRef} className="relative pointer-events-auto">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group relative p-2.5 bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/5 rounded-full transition overflow-hidden"
                title={label.sensitivity}
            >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition duration-300" />
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white relative z-10"
                >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
            </button>

            {/* Slider Panel */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 p-3 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em]">
                            {label.sensitivity}
                        </span>
                        <button
                            onClick={handleReset}
                            className="text-[9px] font-mono text-cyan-400/70 hover:text-cyan-300 transition uppercase tracking-wider"
                        >
                            {label.reset}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min={MIN}
                            max={MAX}
                            step={STEP}
                            value={value}
                            onChange={handleChange}
                            className="flex-1 h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
                                [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.5)] [&::-moz-range-thumb]:cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, rgba(34,211,238,0.5) 0%, rgba(34,211,238,0.5) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`
                            }}
                        />
                        <span className="w-8 text-right text-xs font-mono text-white/80 tabular-nums">
                            {displayValue}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
