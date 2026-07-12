'use client';

import { Check, LocateFixed, Navigation } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export type WorldMapName = 'CityStreets' | 'Sfera' | 'ZombieShooting';
export type WorldPosition = { map: WorldMapName; x: number; y: number; yaw: number };

type Landmark = { id: string; name: string; x: number; y: number; note: string };

const LANDMARKS: Record<WorldMapName, Landmark[]> = {
    CityStreets: [
        { id: 'city-start', name: 'Starting point', x: 16229, y: 11830, note: 'City arrival' },
        { id: 'atm', name: 'ATM', x: 16787, y: -15015, note: 'Reward terminal' },
        { id: 'water', name: 'Water', x: 16808, y: -14726, note: 'Delivery quest' },
        { id: 'arcade', name: 'Arcade', x: 16987, y: -16404, note: 'Win the phone' },
        { id: 'zombie-hall', name: 'Zombie hall', x: 20888, y: -17957, note: 'Combat challenge' },
        { id: 'sfera', name: '3D Sfera', x: 18682, y: -17886, note: 'Exhibition hall' },
    ],
    Sfera: [
        { id: 'hall-start', name: 'Starting point', x: -2962, y: 1848, note: 'Hall entrance' },
        { id: 'double-lin', name: 'Zhejiang Double Lin', x: -1248, y: 636, note: 'Supplier pavilion' },
        { id: 'youbo', name: 'Zhejiang Youbo', x: -4833, y: 98.7, note: 'Supplier pavilion' },
        { id: 'wheel', name: 'Wheel of Fortune', x: -1689, y: 2949, note: 'Phone prize' },
        { id: 'hall-exit', name: 'Exit', x: -2926, y: 2769, note: 'Return to city' },
    ],
    ZombieShooting: [
        { id: 'range-start', name: 'Starting point', x: 4510, y: 40, note: 'P or LMB to shoot' },
        { id: 'range-exit', name: 'Exit', x: 7886, y: 590.7, note: 'Return to city' },
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

const ENTER_RADIUS = 180;
const EXIT_RADIUS = 300;

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

export default function WorldGuideOverlay({ position }: { position: WorldPosition }) {
    const points = LANDMARKS[position.map];
    const [targetId, setTargetId] = useState(() => points[1]?.id ?? points[0].id);
    const [visited, setVisited] = useState<Set<string>>(new Set());
    const activeZonesRef = useRef<Set<string>>(new Set());
    const activeMapRef = useRef(position.map);
    const currentTargetId = points.some((point) => point.id === targetId)
        ? targetId
        : points[1]?.id ?? points[0].id;

    useEffect(() => {
        if (activeMapRef.current !== position.map) {
            activeMapRef.current = position.map;
            activeZonesRef.current = new Set();
        }

        const nextActive = new Set(activeZonesRef.current);
        const newlyEntered: string[] = [];
        for (const point of LANDMARKS[position.map]) {
            const distance = Math.hypot(point.x - position.x, point.y - position.y);
            if (nextActive.has(point.id)) {
                if (distance >= EXIT_RADIUS) nextActive.delete(point.id);
            } else if (distance <= ENTER_RADIUS) {
                nextActive.add(point.id);
                newlyEntered.push(point.id);
            }
        }
        activeZonesRef.current = nextActive;
        if (newlyEntered.length === 0) return;
        // Position packets are an external event stream; arriving at a point
        // intentionally advances the active destination.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisited((current) => new Set([...current, ...newlyEntered]));
        if (!newlyEntered.includes(currentTargetId)) return;
        const index = LANDMARKS[position.map].findIndex((point) => point.id === currentTargetId);
        const next = LANDMARKS[position.map][index + 1];
        if (next) setTargetId(next.id);
    }, [currentTargetId, position]);

    const target = points.find((point) => point.id === currentTargetId) ?? points[0];
    const distance = Math.hypot(target.x - position.x, target.y - position.y);
    const bearing = Math.atan2(target.y - position.y, target.x - position.x) * 180 / Math.PI;
    const plotted = useMemo(
        () => points.map((point) => plotOnRadar(point, position, MAP_RANGE[position.map])),
        [points, position],
    );
    const targetPlot = plotted.find(({ point }) => point.id === target.id) ?? plotted[0];

    return (
        <section
            className="pointer-events-auto absolute bottom-4 left-4 z-[58] w-[min(18rem,calc(100vw-2rem))] select-none overflow-hidden rounded-2xl border border-white/15 bg-[#07100d]/92 text-white shadow-[0_18px_60px_rgba(0,0,0,.62)] backdrop-blur-md [@media(max-height:560px)]:bottom-auto [@media(max-height:560px)]:top-20 [@media(max-height:560px)]:w-52 sm:bottom-6 sm:left-6"
            aria-label={`${LABELS[position.map]} minimap`}
        >
            <div className="relative h-40 overflow-hidden border-b border-white/10 bg-[#08120f] [@media(max-height:560px)]:h-24">
                <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(103,232,249,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.12)_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(103,232,249,.12),transparent_56%)]" />
                <div className="absolute left-3 top-2 z-20 rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[8px] font-black uppercase tracking-[.17em] text-cyan-100">
                    {LABELS[position.map]}
                </div>

                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="50" y1="50" x2={targetPlot.left} y2={targetPlot.top} stroke="rgba(103,232,249,.72)" strokeWidth=".8" strokeDasharray="2.5 2" vectorEffect="non-scaling-stroke" />
                    <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
                    <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
                </svg>

                {plotted.map(({ point, left, top, outside }) => {
                    if (outside && point.id !== target.id) return null;
                    const selected = point.id === target.id;
                    return (
                        <button
                            type="button"
                            key={point.id}
                            title={`Navigate to ${point.name}`}
                            aria-label={`Navigate to ${point.name}`}
                            onClick={() => setTargetId(point.id)}
                            className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border transition ${selected ? 'h-6 w-6 border-cyan-100 bg-cyan-100 text-slate-950 shadow-[0_0_18px_rgba(103,232,249,.7)]' : visited.has(point.id) ? 'h-4 w-4 border-emerald-200/60 bg-emerald-300/25 text-emerald-100' : 'h-4 w-4 border-white/45 bg-black/75 text-white hover:border-cyan-100'}`}
                            style={{ left: `${left}%`, top: `${top}%` }}
                        >
                            {visited.has(point.id) && !selected ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </button>
                    );
                })}

                <div className="absolute left-1/2 top-1/2 z-20 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-slate-950 text-cyan-100 shadow-[0_0_0_5px_rgba(0,0,0,.38)]">
                    <Navigation className="h-4 w-4 fill-current" style={{ rotate: `${position.yaw + 90}deg` }} />
                </div>
            </div>

            <div className="flex items-center gap-3 px-3 py-2.5 [@media(max-height:560px)]:py-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                    <Navigation className="h-4 w-4" style={{ rotate: `${bearing - position.yaw + 90}deg` }} />
                </span>
                <span className="min-w-0 flex-1">
                    <small className="block text-[8px] font-black uppercase tracking-[.17em] text-cyan-100">Next destination</small>
                    <strong className="mt-0.5 block truncate text-sm leading-none">{target.name}</strong>
                    <span className="mt-1 block truncate text-[9px] text-slate-400">{target.note}</span>
                </span>
                <span className="shrink-0 text-right">
                    <b className="flex items-center justify-end gap-1 text-[10px] text-cyan-100"><LocateFixed className="h-3 w-3" />{distance <= ENTER_RADIUS ? 'Arrived' : formatDistance(distance)}</b>
                    <small className="mt-1 block text-[8px] text-slate-500">{turnText(bearing, position.yaw)}</small>
                </span>
            </div>

            {position.map === 'ZombieShooting' && (
                <div className="border-t border-rose-300/15 bg-rose-300/[.06] px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-[.16em] text-rose-100">
                    Shoot · P or LMB
                </div>
            )}
        </section>
    );
}

function plotOnRadar(point: Landmark, position: WorldPosition, range: number) {
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
function isWorldMapName(value: string): value is WorldMapName { return value === 'CityStreets' || value === 'Sfera' || value === 'ZombieShooting'; }
function formatDistance(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`; }
function turnText(bearing: number, yaw: number) { const delta = ((bearing - yaw + 540) % 360) - 180; return Math.abs(delta) < 18 ? 'Straight' : delta > 0 ? `Right ${Math.round(Math.abs(delta))}°` : `Left ${Math.round(Math.abs(delta))}°`; }
