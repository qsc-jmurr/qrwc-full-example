"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bandResponse, formatHz, logFrequencies, type EqBand } from "@/lib/dsp";
import { cx } from "./primitives";

export type EqCurveBand = EqBand & { id: number };
type Patch = Partial<Pick<EqBand, "frequency" | "gain" | "bandwidth">>;

type Props = {
  bands: EqCurveBand[];
  bypassed?: boolean;
  freqRange?: [number, number];
  gainRange?: [number, number];
  bwRange?: [number, number];
  selected: number | null;
  onSelect: (id: number) => void;
  onBandChange: (id: number, patch: Patch) => void;
  className?: string;
};

const W = 800;
const H = 300;
const PAD = { l: 40, r: 12, t: 12, b: 26 };
const FREQS = logFrequencies(20, 20000, 240);
const GRID_F = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const bandColour = (i: number) => `var(--band-${(i % 6) + 1})`;

/**
 * Interactive parametric EQ curve — the thing a UCI can't do.
 *   drag a node        → frequency + gain
 *   scroll on a node   → bandwidth
 *   double-click       → gain back to 0 dB
 *   keyboard (focused) → ←/→ frequency, ↑/↓ gain, +/− bandwidth
 * Pure UI: it never talks to Q-SYS, it just calls onBandChange.
 */
export function EqCurve({
  bands,
  bypassed = false,
  freqRange = [20, 20000],
  gainRange = [-18, 18],
  bwRange = [0.03, 4],
  selected,
  onSelect,
  onBandChange,
  className,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Optimistic overrides: what the user is doing NOW beats what the Core said 100 ms ago.
  const [overrides, setOverrides] = useState<Record<number, Patch>>({});
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const dragging = useRef<number | null>(null);
  const [readout, setReadout] = useState<number | null>(null);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  // React's onWheel is passive; stop the page scrolling while adjusting a node's bandwidth.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const block = (e: WheelEvent) => {
      if ((e.target as Element).closest("[role=slider]")) e.preventDefault();
    };
    el.addEventListener("wheel", block, { passive: false });
    return () => el.removeEventListener("wheel", block);
  }, []);

  const [gLo, gHi] = [Math.max(gainRange[0], -18), Math.min(gainRange[1], 18)];
  const x = (f: number) => PAD.l + (Math.log(f / 20) / Math.log(1000)) * (W - PAD.l - PAD.r);
  const fx = (px: number) => 20 * Math.pow(1000, (px - PAD.l) / (W - PAD.l - PAD.r));
  const y = (db: number) => PAD.t + ((gHi - Math.max(gLo, Math.min(gHi, db))) / (gHi - gLo)) * (H - PAD.t - PAD.b);
  const gy = (py: number) => gHi - ((py - PAD.t) / (H - PAD.t - PAD.b)) * (gHi - gLo);
  const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, v));

  const shown = useMemo(
    () => bands.map((b) => ({ ...b, ...overrides[b.id] })),
    [bands, overrides],
  );

  const change = (id: number, patch: Patch, settle = true) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }));
    onBandChange(id, patch);
    const old = timers.current.get(id);
    if (old) clearTimeout(old);
    if (settle) {
      timers.current.set(
        id,
        setTimeout(() => {
          if (dragging.current === id) return;
          setOverrides((o) => {
            const rest = { ...o };
            delete rest[id];
            return rest;
          });
        }, 600),
      );
    }
  };

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { px: ((e.clientX - r.left) / r.width) * W, py: ((e.clientY - r.top) / r.height) * H };
  };

  const curve = (fn: (f: number) => number) =>
    FREQS.map((f, i) => `${i ? "L" : "M"}${x(f).toFixed(1)},${y(fn(f)).toFixed(1)}`).join(" ");

  const total = bypassed
    ? curve(() => 0)
    : curve((f) => shown.reduce((sum, b) => sum + bandResponse(b, f), 0));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={cx("h-auto w-full touch-none select-none", className)}
      role="group"
      aria-label="Parametric EQ frequency response"
    >
      {/* grid */}
      {GRID_F.map((f) => (
        <g key={f}>
          <line x1={x(f)} x2={x(f)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line)" />
          <text x={x(f)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--ink-muted)">
            {f >= 1000 ? `${f / 1000}k` : f}
          </text>
        </g>
      ))}
      {[-12, -6, 0, 6, 12].filter((d) => d > gLo && d < gHi).map((d) => (
        <g key={d}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(d)} y2={y(d)} stroke="var(--line)" strokeWidth={d === 0 ? 1.5 : 1} />
          <text x={PAD.l - 8} y={y(d) + 4} textAnchor="end" fontSize={11} fill="var(--ink-muted)">
            {d > 0 ? `+${d}` : d}
          </text>
        </g>
      ))}

      {/* each band's own contribution, faint */}
      {!bypassed &&
        shown.map((b, i) =>
          b.bypass ? null : (
            <path
              key={b.id}
              d={`${curve((f) => bandResponse(b, f))} L${x(20000)},${y(0)} L${x(20)},${y(0)} Z`}
              fill={bandColour(i)}
              fillOpacity={selected === b.id ? 0.18 : 0.07}
              stroke="none"
            />
          ),
        )}

      {/* the combined response */}
      <path
        d={total}
        fill="none"
        stroke={bypassed ? "var(--ink-muted)" : "var(--accent-2)"}
        strokeWidth={2.5}
        strokeDasharray={bypassed ? "6 6" : undefined}
        strokeLinejoin="round"
      />

      {/* draggable band nodes (selected one drawn last so it sits on top) */}
      {shown
        .map((b, i) => [b, i] as const)
        .sort(([a], [c]) => (a.id === selected ? 1 : 0) - (c.id === selected ? 1 : 0))
        .map(([b, i]) => {
        const cxp = x(clamp(b.frequency, [20, 20000]));
        const cyp = y(b.gain);
        const isSel = selected === b.id;
        return (
          <g
            key={b.id}
            tabIndex={0}
            role="slider"
            aria-label={`Band ${i + 1}`}
            aria-valuetext={`${formatHz(b.frequency)}, ${b.gain.toFixed(1)} dB, ${b.bandwidth.toFixed(2)} octaves`}
            className="cursor-grab outline-none active:cursor-grabbing"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragging.current = b.id;
              onSelect(b.id);
              setReadout(b.id);
            }}
            onPointerMove={(e) => {
              if (dragging.current !== b.id) return;
              const { px, py } = toSvg(e);
              change(b.id, {
                frequency: Math.round(clamp(fx(px), freqRange)),
                gain: Math.round(clamp(gy(py), [Math.max(gainRange[0], gLo), Math.min(gainRange[1], gHi)]) * 10) / 10,
              }, false);
            }}
            onPointerUp={() => {
              dragging.current = null;
              setReadout(null);
              change(b.id, {}, true);
            }}
            onWheel={(e) => {
              onSelect(b.id);
              const factor = e.deltaY > 0 ? 1.08 : 1 / 1.08;
              change(b.id, { bandwidth: Math.round(clamp(b.bandwidth * factor, bwRange) * 100) / 100 });
            }}
            onDoubleClick={() => change(b.id, { gain: 0 })}
            onFocus={() => onSelect(b.id)}
            onKeyDown={(e) => {
              const k = e.key;
              const p: Patch = {};
              if (k === "ArrowLeft") p.frequency = Math.round(clamp(b.frequency / 1.06, freqRange));
              if (k === "ArrowRight") p.frequency = Math.round(clamp(b.frequency * 1.06, freqRange));
              if (k === "ArrowUp") p.gain = clamp(b.gain + 0.5, gainRange);
              if (k === "ArrowDown") p.gain = clamp(b.gain - 0.5, gainRange);
              if (k === "+" || k === "=") p.bandwidth = clamp(b.bandwidth * 1.1, bwRange);
              if (k === "-") p.bandwidth = clamp(b.bandwidth / 1.1, bwRange);
              if (Object.keys(p).length) {
                e.preventDefault();
                change(b.id, p);
              }
            }}
          >
            {isSel && (
              <line
                x1={x(clamp(b.frequency / Math.pow(2, b.bandwidth / 2), [20, 20000]))}
                x2={x(clamp(b.frequency * Math.pow(2, b.bandwidth / 2), [20, 20000]))}
                y1={cyp}
                y2={cyp}
                stroke={bandColour(i)}
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.7}
              />
            )}
            <circle cx={cxp} cy={cyp} r={22} fill="transparent" />
            <circle
              cx={cxp}
              cy={cyp}
              r={isSel ? 11 : 9}
              fill={bandColour(i)}
              fillOpacity={b.bypass ? 0.25 : 1}
              stroke="var(--surface)"
              strokeWidth={3}
            />
            <text x={cxp} y={cyp + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--surface)" pointerEvents="none">
              {i + 1}
            </text>
            {readout === b.id && (
              <g pointerEvents="none" transform={`translate(${Math.min(cxp + 16, W - 130)}, ${Math.max(cyp - 44, PAD.t)})`}>
                <rect width={118} height={36} rx={6} fill="var(--surface-2)" stroke="var(--line)" />
                <text x={10} y={15} fontSize={11} fill="var(--ink)">{formatHz(b.frequency)}</text>
                <text x={10} y={29} fontSize={11} fill="var(--ink-muted)">
                  {b.gain > 0 ? "+" : ""}{b.gain.toFixed(1)} dB · {b.bandwidth.toFixed(2)} oct
                </text>
              </g>
            )}
          </g>
        );
        })}
    </svg>
  );
}
