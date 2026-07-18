'use client';

import type { AppLanguage } from '@/lib/i18n';

type ZombieCombatHudProps = {
    ammo: number;
    maxAmmo: number;
    shotSequence: number;
    dryFireSequence: number;
    reloadSequence: number;
    isReloading: boolean;
    reloadDurationMs: number;
    onReload: () => boolean;
    confirmedKills: number;
    damageSequence: number;
    isCleared: boolean;
    language: AppLanguage;
};

const COPY = {
    en: {
        ammo: 'Ammo',
        live: 'Live fire',
        empty: 'Magazine empty',
        emptyHint: 'Press R or use Reload',
        reload: 'Reload',
        reloading: 'Reloading',
        reloadHint: 'R',
        cleared: 'Arena clear',
    },
    ru: {
        ammo: 'Ammo',
        live: 'Live fire',
        empty: 'Magazine empty',
        emptyHint: 'Press R or use Reload',
        reload: 'Reload',
        reloading: 'Reloading',
        reloadHint: 'R',
        cleared: 'Arena clear',
    },
    zh: {
        ammo: '弹药',
        live: '战斗模式',
        empty: '弹匣已空',
        emptyHint: '按 R 或点击换弹',
        reload: '换弹',
        reloading: '正在换弹',
        reloadHint: 'R',
        cleared: '竞技场已清理',
    },
} as const;

const AMMO_SEGMENTS = 18;

export default function ZombieCombatHud({
    ammo,
    maxAmmo,
    shotSequence,
    dryFireSequence,
    reloadSequence,
    isReloading,
    reloadDurationMs,
    onReload,
    confirmedKills,
    damageSequence,
    isCleared,
    language,
}: ZombieCombatHudProps) {
    const copy = COPY[language];
    const ammoRatio = maxAmmo > 0 ? ammo / maxAmmo : 0;
    const filledSegments = Math.ceil(ammoRatio * AMMO_SEGMENTS);
    const isLowAmmo = ammo > 0 && ammoRatio <= 0.25;
    const accentClass = ammo === 0
        ? 'text-rose-300'
        : isLowAmmo
          ? 'text-amber-200'
          : 'text-cyan-100';

    return (
        <div className="pointer-events-none absolute inset-0 z-30 select-none overflow-hidden" aria-live="polite">
            {damageSequence > 0 && (
                <div key={`damage-${damageSequence}`} className="absolute inset-0">
                    <div className="zombie-damage-flash absolute inset-0" />
                    <div className="zombie-damage-vignette absolute inset-0" />
                    <div className="zombie-damage-slash zombie-damage-slash-left absolute left-[12%] top-[8%] h-[68%] w-1.5 -rotate-[24deg] rounded-full bg-gradient-to-b from-transparent via-rose-200/75 to-transparent blur-[1px]" />
                    <div className="zombie-damage-slash zombie-damage-slash-right absolute right-[16%] top-[18%] h-[58%] w-1 -rotate-[18deg] rounded-full bg-gradient-to-b from-transparent via-red-200/65 to-transparent blur-[1px]" />
                </div>
            )}

            {shotSequence > 0 && (
                <div key={`shot-fx-${shotSequence}`} className="absolute inset-0">
                    <div className="zombie-shot-flash absolute inset-0" />
                    <div className="zombie-shot-vignette absolute inset-0" />
                    <div className="zombie-shot-tracer absolute bottom-0 left-1/2 h-[48vh] w-px -translate-x-1/2 origin-bottom bg-gradient-to-t from-amber-100/0 via-amber-100/55 to-white/90" />
                </div>
            )}

            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 md:h-28 md:w-28">
                <div
                    key={`reticle-${isReloading ? `reload-${reloadSequence}` : `shot-${shotSequence}`}`}
                    className={isReloading ? 'zombie-reticle-reload absolute inset-0' : shotSequence > 0 ? 'zombie-reticle-recoil absolute inset-0' : 'absolute inset-0'}
                >
                    <div className="absolute inset-[21%] rounded-full border border-cyan-100/25 shadow-[0_0_24px_rgba(103,232,249,0.2),inset_0_0_16px_rgba(103,232,249,0.1)]" />
                    <div className="absolute left-1/2 top-0 h-[28%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-100/75 to-transparent" />
                    <div className="absolute bottom-0 left-1/2 h-[28%] w-px -translate-x-1/2 bg-gradient-to-t from-transparent via-cyan-100/75 to-transparent" />
                    <div className="absolute left-0 top-1/2 h-px w-[28%] -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-100/75 to-transparent" />
                    <div className="absolute right-0 top-1/2 h-px w-[28%] -translate-y-1/2 bg-gradient-to-l from-transparent via-cyan-100/75 to-transparent" />
                    <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]" />
                </div>

                {confirmedKills > 0 && (
                    <div key={`hit-${confirmedKills}`} className="zombie-hit-confirm absolute inset-[30%] rotate-45">
                        <span className="absolute left-0 top-0 h-px w-[38%] bg-rose-100 shadow-[0_0_8px_rgba(251,113,133,0.95)]" />
                        <span className="absolute right-0 top-0 h-[38%] w-px bg-rose-100 shadow-[0_0_8px_rgba(251,113,133,0.95)]" />
                        <span className="absolute bottom-0 left-0 h-[38%] w-px bg-rose-100 shadow-[0_0_8px_rgba(251,113,133,0.95)]" />
                        <span className="absolute bottom-0 right-0 h-px w-[38%] bg-rose-100 shadow-[0_0_8px_rgba(251,113,133,0.95)]" />
                    </div>
                )}
            </div>

            {dryFireSequence > 0 && ammo === 0 && !isCleared && !isReloading && (
                <div key={`dry-${dryFireSequence}`} className="zombie-dry-fire absolute left-1/2 top-[calc(50%+4.5rem)] -translate-x-1/2 rounded-full border border-rose-300/35 bg-black/70 px-4 py-2 text-center shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-200">{copy.empty}</p>
                    <p className="mt-0.5 hidden text-[9px] text-slate-300 sm:block">{copy.emptyHint}</p>
                </div>
            )}

            {isReloading && !isCleared && (
                <div key={`reload-${reloadSequence}`} className="zombie-reload-prompt absolute left-1/2 top-[calc(50%+4.5rem)] w-48 -translate-x-1/2 rounded-full border border-cyan-200/35 bg-black/75 px-4 py-2.5 text-center shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">{copy.reloading}</p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <span
                            className="zombie-reload-progress block h-full origin-left rounded-full bg-gradient-to-r from-cyan-300 to-white"
                            style={{ animationDuration: `${reloadDurationMs}ms` }}
                        />
                    </div>
                </div>
            )}

            <div className="absolute right-3 top-24 w-[min(11.5rem,38vw)] rounded-2xl border border-white/12 bg-[linear-gradient(145deg,rgba(3,8,14,0.86),rgba(12,18,28,0.66))] p-3 text-white shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-md md:right-5 md:top-auto md:bottom-5 md:w-52">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">{isCleared ? copy.cleared : isReloading ? copy.reloading : copy.live}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-200">{copy.ammo}</p>
                    </div>
                    <div className={`font-mono text-2xl font-black tabular-nums leading-none ${accentClass}`}>
                        {String(ammo).padStart(2, '0')}
                        <span className="ml-1 text-[10px] text-slate-500">/ {maxAmmo}</span>
                    </div>
                </div>
                <div className="mt-3 flex gap-1" aria-hidden="true">
                    {Array.from({ length: AMMO_SEGMENTS }, (_, index) => (
                        <span
                            key={index}
                            className={`h-4 min-w-0 flex-1 skew-x-[-8deg] rounded-[2px] border ${
                                index < filledSegments
                                    ? isLowAmmo
                                        ? 'border-amber-100/60 bg-amber-300/85 shadow-[0_0_8px_rgba(252,211,77,0.35)]'
                                        : 'border-cyan-100/55 bg-cyan-300/80 shadow-[0_0_8px_rgba(103,232,249,0.3)]'
                                    : 'border-white/10 bg-white/[0.04]'
                            }`}
                        />
                    ))}
                </div>
                {!isCleared && (
                    <button
                        type="button"
                        onClick={onReload}
                        disabled={isReloading || ammo >= maxAmmo}
                        className="pointer-events-auto mt-3 flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/[0.07] px-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-200/[0.14] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.025] disabled:text-slate-600"
                    >
                        <span className="grid h-5 min-w-5 place-items-center rounded border border-current/30 px-1 font-mono">{copy.reloadHint}</span>
                        {isReloading ? copy.reloading : copy.reload}
                    </button>
                )}
            </div>
        </div>
    );
}
