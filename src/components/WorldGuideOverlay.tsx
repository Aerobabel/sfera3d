'use client';

import { LocateFixed, MapPin } from 'lucide-react';
import { useMemo } from 'react';

export type WorldMapName = 'CityStreets' | 'Sfera' | 'ZombieShooting';
export type WorldPosition = { map: WorldMapName; x: number; y: number; yaw: number };

type Landmark = { id: string; name: string; x: number; y: number; yaw: number; shortLabel: string };

const LANDMARKS: Record<WorldMapName, Landmark[]> = {
    CityStreets: [
        { id: 'city-start', name: 'Starting point', x: 16229, y: 11830, yaw: -69, shortLabel: 'START' },
        { id: 'atm', name: 'ATM', x: 16787, y: -15015, yaw: -179, shortLabel: 'ATM' },
        { id: 'water', name: 'Water', x: 16808, y: -14726, yaw: -179, shortLabel: 'H₂O' },
        { id: 'arcade', name: 'Arcade', x: 16987, y: -16404, yaw: -176.8, shortLabel: 'PLAY' },
        { id: 'zombie-hall', name: 'Zombie hall', x: 20888, y: -17957, yaw: -88.2, shortLabel: 'Z' },
        { id: 'sfera', name: '3D Sfera', x: 18682, y: -17886, yaw: -88.2, shortLabel: '3D' },
    ],
    Sfera: [
        { id: 'hall-start', name: 'Starting point', x: -2962, y: 1848, yaw: -60, shortLabel: 'START' },
        { id: 'double-lin', name: 'Zhejiang Double Lin', x: -1248, y: 636, yaw: 19, shortLabel: 'DL' },
        { id: 'youbo', name: 'Zhejiang Youbo', x: -4833, y: 98.7, yaw: 46.25, shortLabel: 'YB' },
        { id: 'wheel', name: 'Wheel of Fortune', x: -1689, y: 2949, yaw: 4.4, shortLabel: 'WIN' },
        { id: 'hall-exit', name: 'Exit', x: -2926, y: 2769, yaw: 94, shortLabel: 'EXIT' },
    ],
    ZombieShooting: [
        { id: 'range-start', name: 'Starting point', x: 4510, y: 40, yaw: 0, shortLabel: 'START' },
        { id: 'range-exit', name: 'Exit to city', x: 7886, y: 590.7, yaw: 15, shortLabel: 'EXIT' },
    ],
};

const LABELS: Record<WorldMapName, string> = {
    CityStreets: 'City streets',
    Sfera: '3D Sfera hall',
    ZombieShooting: 'Zombie shooting',
};

const MAP_RANGE: Record<WorldMapName, number> = {
    CityStreets: 5200,
    Sfera: 3200,
    ZombieShooting: 3800,
};

export function parseWorldPosition(message: string): WorldPosition | null {
    const normalized = message.trim().replace(/^"|"$/g, '');
    const [map = '', x = '', y = '', yaw = ''] = normalized.split('|');
    if (isWorldMapName(map) && [x, y, yaw].every((value) => Number.isFinite(Number(value)))) {
        return { map, x: Number(x), y: Number(y), yaw: Number(yaw) };
    }

    try {
        const payload = JSON.parse(message) as Record<string, unknown>;
        const source = payload.position && typeof payload.position === 'object'
            ? payload.position as Record<string, unknown>
            : payload;
        const mapName = String(source.map ?? source.mapName ?? source.level ?? '');
        if (!isWorldMapName(mapName)) return null;
        if (![source.x, source.y, source.yaw].every((value) => Number.isFinite(Number(value)))) return null;
        return { map: mapName, x: Number(source.x), y: Number(source.y), yaw: Number(source.yaw) };
    } catch {
        return null;
    }
}

export default function WorldGuideOverlay({
    position,
    questObjective,
    focusLandmarkId,
    shootingEnabled = true,
}: {
    position: WorldPosition;
    questObjective?: string | null;
    focusLandmarkId?: string | null;
    shootingEnabled?: boolean;
}) {
    const points = LANDMARKS[position.map];
    const plotted = useMemo(
        () => points.map((point) => plotOnRadar(point, position, MAP_RANGE[position.map])),
        [points, position],
    );
    const nearest = useMemo(
        () => points
            .map((point) => ({ point, distance: Math.hypot(point.x - position.x, point.y - position.y) }))
            .sort((a, b) => a.distance - b.distance)[0],
        [points, position.x, position.y],
    );
    const questFocus = focusLandmarkId
        ? plotted.find(({ point }) => point.id === focusLandmarkId) ?? null
        : null;
    const roadPoints = plotted.map(({ left, top }) => `${left},${top}`).join(' ');

    return (
        <section
            className="sfera-glass pointer-events-auto absolute bottom-4 left-4 z-[58] w-[min(17.5rem,calc(100vw-2rem))] select-none overflow-hidden rounded-[1.15rem] text-white [@media(max-height:560px)]:bottom-auto [@media(max-height:560px)]:top-20 [@media(max-height:560px)]:w-52 sm:bottom-5 sm:left-5"
            aria-label={`${LABELS[position.map]} minimap`}
        >
            <div className="relative h-36 overflow-hidden border-b border-white/10 bg-[#050d0d] [@media(max-height:560px)]:h-24">
                <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(33deg,transparent_46%,rgba(146,181,171,.12)_47%,rgba(146,181,171,.12)_49%,transparent_50%),linear-gradient(147deg,transparent_46%,rgba(146,181,171,.09)_47%,rgba(146,181,171,.09)_49%,transparent_50%)] [background-size:92px_76px]" />
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(103,232,249,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.13)_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(103,232,249,.16),transparent_42%),linear-gradient(to_bottom,transparent,rgba(0,0,0,.28))]" />
                <div className="absolute inset-2 rounded-xl border border-cyan-100/[.06]" />
                <div className="absolute left-3 top-2 z-20 rounded-full border border-cyan-100/15 bg-[#03100e]/80 px-2 py-1 text-[8px] font-black uppercase tracking-[.17em] text-cyan-100 shadow-[0_6px_18px_rgba(0,0,0,.35)]">
                    {LABELS[position.map]}
                </div>
                <div className="absolute right-3 top-2 z-20 text-[8px] font-black text-cyan-50/60">N</div>
                <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 text-[7px] font-black text-white/25">S</div>
                <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2 text-[7px] font-black text-white/25">W</div>
                <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2 text-[7px] font-black text-white/25">E</div>

                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <linearGradient id="radar-route" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(103,232,249,.18)" /><stop offset="1" stopColor="rgba(165,243,252,.95)" /></linearGradient>
                    </defs>
                    <polyline points={roadPoints} fill="none" stroke="rgba(0,0,0,.58)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
                    <polyline points={roadPoints} fill="none" stroke="rgba(222,245,239,.14)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                    {questFocus && <><line x1="50" y1="50" x2={questFocus.left} y2={questFocus.top} stroke="rgba(0,0,0,.72)" strokeWidth="2.8" vectorEffect="non-scaling-stroke" /><line x1="50" y1="50" x2={questFocus.left} y2={questFocus.top} stroke="url(#radar-route)" strokeWidth="1.1" strokeDasharray="3 1.8" vectorEffect="non-scaling-stroke" /></>}
                    <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
                    <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
                    <path d="M50 3v5M50 92v5M3 50h5M92 50h5" stroke="rgba(165,243,252,.22)" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
                </svg>

                {plotted.map(({ point, left, top, outside }) => {
                    const isQuestFocus = point.id === focusLandmarkId;
                    if (outside && !isQuestFocus) return null;
                    return (
                        <div
                            key={point.id}
                            title={point.name}
                            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
                            style={{ left: `${left}%`, top: `${top}%` }}
                        >
                            {isQuestFocus && <span className="sfera-signal-pulse absolute h-8 w-8 rounded-full border border-cyan-100/45 bg-cyan-300/10" />}
                            <span className={`relative grid h-5 min-w-5 place-items-center rounded-full border px-1 font-mono text-[6px] font-black shadow-[0_4px_12px_rgba(0,0,0,.45)] ${isQuestFocus ? 'border-cyan-50 bg-cyan-100 text-slate-950 ring-4 ring-cyan-300/15' : 'border-white/28 bg-[#020806]/90 text-white/80'}`}>{point.shortLabel}</span>
                            {isQuestFocus && <span className="absolute left-1/2 top-5 max-w-28 -translate-x-1/2 truncate rounded-full border border-cyan-100/15 bg-black/75 px-2 py-1 text-[7px] font-bold text-cyan-50 shadow-lg">{point.name}</span>}
                        </div>
                    );
                })}

                <div className="absolute left-1/2 top-1/2 z-20 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/90 bg-[#06111a] text-cyan-100 shadow-[0_0_0_5px_rgba(0,0,0,.42),0_0_25px_rgba(103,232,249,.34)]">
                    <PlayerHeadingArrow yaw={position.yaw} />
                </div>
                <div className="absolute bottom-2 right-3 z-20 flex items-end gap-1 text-[6px] font-bold uppercase tracking-[.12em] text-white/35"><span className="mb-0.5 block h-px w-8 bg-cyan-100/35" />Live radar</div>
            </div>

            <div className="flex items-center gap-3 bg-[linear-gradient(100deg,rgba(131,232,220,.06),transparent)] px-3 py-2.5 [@media(max-height:560px)]:py-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                    <MapPin className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <small className="sfera-kicker block !text-[7px]">{questObjective ? 'Active objective' : 'Nearest location'}</small>
                    <strong className="mt-1 block truncate text-[13px] font-semibold leading-none tracking-[-.01em]">{questObjective ?? nearest.point.name}</strong>
                    <span className="mt-1 block truncate font-mono text-[7px] uppercase tracking-[.12em] text-slate-500">Route synchronized</span>
                </span>
                <span className="shrink-0 text-right">
                    <b className="flex items-center justify-end gap-1 text-[10px] text-cyan-100"><LocateFixed className="h-3 w-3" />{formatDistance(questFocus ? Math.hypot(questFocus.point.x - position.x, questFocus.point.y - position.y) : nearest.distance)}</b>
                    <small className="mt-1 block max-w-20 truncate text-[7px] uppercase tracking-[.12em] text-slate-500">{questFocus ? questFocus.point.name : 'Live position'}</small>
                </span>
            </div>

            {position.map === 'ZombieShooting' && (
                <div className={`border-t px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-[.16em] ${shootingEnabled ? 'border-rose-300/15 bg-rose-300/[.06] text-rose-100' : 'border-emerald-300/15 bg-emerald-300/[.06] text-emerald-100'}`}>
                    {shootingEnabled ? 'Shoot · P or LMB' : 'Arena clear · Follow EXIT'}
                </div>
            )}
        </section>
    );
}

function plotOnRadar(point: Landmark, position: WorldPosition, range: number) {
    // Unreal yaw is measured from +X toward +Y. Keep the radar in that same
    // frame: +X is screen-right and +Y is screen-up. As a calibration check,
    // the screenshot position to the supplied 3DSFERA point has a -68 degree
    // bearing, closely matching the live -80 degree player yaw.
    const rawLeft = 50 + ((point.x - position.x) / range) * 44;
    const rawTop = 50 - ((point.y - position.y) / range) * 44;
    const outside = rawLeft < 7 || rawLeft > 93 || rawTop < 10 || rawTop > 90;
    return {
        point,
        left: clamp(rawLeft, 7, 93),
        top: clamp(rawTop, 10, 90),
        outside,
    };
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function PlayerHeadingArrow({ yaw }: { yaw: number }) {
    return (
        <svg className="h-5 w-5 origin-center drop-shadow-[0_0_5px_rgba(103,232,249,.8)]" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${-yaw}deg)` }}>
            <path d="M22 12 3.5 3.5 7.8 12l-4.3 8.5L22 12Z" fill="currentColor" stroke="white" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
    );
}
function isWorldMapName(value: string): value is WorldMapName { return value === 'CityStreets' || value === 'Sfera' || value === 'ZombieShooting'; }
function formatDistance(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`; }
