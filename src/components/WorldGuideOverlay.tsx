'use client';

import { Check, ChevronRight, LocateFixed, Map, Navigation, X } from 'lucide-react';
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
    const [open, setOpen] = useState(false);
    const [targetId, setTargetId] = useState(() => LANDMARKS[position.map][1]?.id ?? LANDMARKS[position.map][0].id);
    const [visited, setVisited] = useState<Set<string>>(new Set());
    const activeZonesRef = useRef<Set<string>>(new Set());
    const activeMapRef = useRef(position.map);
    const points = LANDMARKS[position.map];
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
        // Unreal position packets are an external event stream; entering a
        // zone intentionally updates the guide state here.
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
    const plotted = useMemo(() => plotPoints(points), [points]);
    const player = plotPlayer(position, points);

    return (
        <div className="pointer-events-none absolute bottom-4 left-4 z-[58] text-white sm:bottom-6 sm:left-6">
            <button type="button" onClick={() => setOpen(true)} className="pointer-events-auto flex min-w-[15rem] items-center gap-3 rounded-2xl border border-cyan-200/20 bg-[#071018]/90 p-3 text-left shadow-[0_24px_70px_rgba(0,0,0,.48)] backdrop-blur-xl transition hover:border-cyan-200/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-100"><Map className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><small className="block text-[9px] font-black uppercase tracking-[.18em] text-cyan-100">Live world guide</small><strong className="mt-1 block truncate text-sm">{target.name}</strong><span className="mt-0.5 block text-[10px] text-slate-400">{formatDistance(distance)} · {LABELS[position.map]}</span></span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>

            {open && (
                <div className="pointer-events-auto fixed inset-0 z-[160] grid place-items-center bg-[#02060b]/86 p-3 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="World guide">
                    <section className="relative grid h-[min(88vh,48rem)] w-[min(94vw,72rem)] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#07100d] shadow-[0_50px_160px_rgba(0,0,0,.75)] lg:grid-cols-[1fr_19rem]">
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close world guide" className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/35 text-slate-300"><X className="h-4 w-4" /></button>
                        <div className="relative min-h-[28rem] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(103,232,249,.09),transparent_38%),linear-gradient(145deg,#0a1512,#050908)]">
                            <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(103,232,249,.11)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.11)_1px,transparent_1px)] [background-size:42px_42px]" />
                            <div className="absolute left-6 top-6 z-10"><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-100">Live navigation</p><h2 className="mt-2 text-3xl font-black uppercase tracking-[-.05em] sm:text-5xl">{LABELS[position.map]}</h2><p className="mt-2 font-mono text-[10px] text-slate-500">X {Math.round(position.x)} · Y {Math.round(position.y)} · {Math.round(position.yaw)}°</p></div>
                            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={plotted.map((point) => `${point.left},${point.top}`).join(' ')} fill="none" stroke="rgba(103,232,249,.3)" strokeWidth=".35" strokeDasharray="1.4 1.4" vectorEffect="non-scaling-stroke" /></svg>
                            {plotted.map(({ point, left, top }, index) => <button type="button" key={point.id} onClick={() => setTargetId(point.id)} className="absolute z-10 flex -translate-y-1/2 items-center gap-2 text-left" style={{ left: `${left}%`, top: `${top}%` }}><i className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-black not-italic ${point.id === target.id ? 'border-cyan-100 bg-cyan-100 text-slate-950 shadow-[0_0_28px_rgba(103,232,249,.45)]' : visited.has(point.id) ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100' : 'border-white/15 bg-black/60 text-slate-300'}`}>{visited.has(point.id) ? <Check className="h-3 w-3" /> : index + 1}</i><span className="hidden max-w-28 text-[10px] font-bold text-slate-300 sm:block">{point.name}</span></button>)}
                            <div className="absolute z-20 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-white text-slate-950 shadow-[0_0_0_7px_rgba(255,255,255,.07)]" style={{ left: `${player.left}%`, top: `${player.top}%`, rotate: `${position.yaw + 90}deg` }}><Navigation className="h-4 w-4" /></div>
                        </div>
                        <aside className="relative flex flex-col justify-end border-t border-white/10 bg-white/[.025] p-6 lg:border-l lg:border-t-0">
                            <span className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100"><Navigation className="h-7 w-7" style={{ rotate: `${bearing - position.yaw + 90}deg` }} /></span>
                            <p className="mt-8 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">Next destination</p><h3 className="mt-2 text-3xl font-black tracking-[-.05em]">{target.name}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{target.note}</p>
                            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs"><span className="inline-flex items-center gap-2 text-cyan-100"><LocateFixed className="h-4 w-4" />{distance <= ENTER_RADIUS ? 'You have arrived' : formatDistance(distance)}</span><span className="text-slate-500">{turnText(bearing, position.yaw)}</span></div>
                            {position.map === 'ZombieShooting' && <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[.06] p-3 text-xs font-black uppercase tracking-[.12em] text-rose-100">Shoot · P or LMB</div>}
                        </aside>
                    </section>
                </div>
            )}
        </div>
    );
}

function isWorldMapName(value: string): value is WorldMapName { return value === 'CityStreets' || value === 'Sfera' || value === 'ZombieShooting'; }
function formatDistance(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`; }
function turnText(bearing: number, yaw: number) { const delta = ((bearing - yaw + 540) % 360) - 180; return Math.abs(delta) < 18 ? 'Straight ahead' : delta > 0 ? `Right ${Math.round(Math.abs(delta))}°` : `Left ${Math.round(Math.abs(delta))}°`; }
function bounds(points: Landmark[]) { const xs = points.map((point) => point.x); const ys = points.map((point) => point.y); return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }; }
function plot(x: number, y: number, box: ReturnType<typeof bounds>) { return { left: 10 + ((x - box.minX) / Math.max(1, box.maxX - box.minX)) * 76, top: 18 + (1 - ((y - box.minY) / Math.max(1, box.maxY - box.minY))) * 68 }; }
function plotPoints(points: Landmark[]) { const box = bounds(points); return points.map((point) => ({ point, ...plot(point.x, point.y, box) })); }
function plotPlayer(position: WorldPosition, points: Landmark[]) { return plot(position.x, position.y, bounds(points)); }
