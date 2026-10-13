"use client";

import { useRef, useState } from "react";
import { limiterOut } from "@/lib/dsp";
import { cx } from "./primitives";

type Props = {
  threshold: number;
  bypassed?: boolean;
  /** Live input level in dB — drawn as a dot riding the curve. */
  inputLevel?: number | null;
  /** Live gain reduction in dB (≤ 0) — drawn as a meter. */
  reduction?: number | null;
  onThresholdChange?: (db: number) => void;
  range?: [number, number];
  className?: string;
};

const S = 240;
const PAD = 26;

/**
 * Peak limiter transfer curve: unity below the threshold, a ceiling above it.
 * Drag the threshold point; the live dot shows where the signal is right now.
 * Pure UI — no Q-SYS in here.
 */
export function LimiterCurve({ threshold, bypassed, inputLevel, reduction, onThresholdChange, range = [-60, 0], className }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [lo, hi] = range;
  const T = Math.max(lo, Math.min(hi, drag ?? threshold));
  const x = (db: number) => PAD + ((db - lo) / (hi - lo)) * (S - 2 * PAD);
  const y = (db: number) => S - PAD - ((db - lo) / (hi - lo)) * (S - 2 * PAD);
  const out = (v: number) => (bypassed ? v : limiterOut(v, T, 2));

  const pts = Array.from({ length: 121 }, (_, i) => lo + ((hi - lo) * i) / 120);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(v).toFixed(1)},${y(out(v)).toFixed(1)}`).join(" ");

  const fromEvent = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * S;
    return Math.round(Math.max(lo, Math.min(hi, lo + ((px - PAD) / (S - 2 * PAD)) * (hi - lo))) * 2) / 2;
  };

  const live = inputLevel !== null && inputLevel !== undefined && inputLevel > lo ? Math.min(hi, inputLevel) : null;
  const gr = reduction ? Math.max(-24, Math.min(0, reduction)) : 0;

  return (
    <div className={cx("flex items-stretch gap-3", className)}>
      <svg ref={ref} viewBox={`0 0 ${S} ${S}`} className="h-auto w-full touch-none" aria-label="Limiter transfer curve">
        {[-48, -36, -24, -12].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={PAD} y2={S - PAD} stroke="var(--line)" />
            <line x1={PAD} x2={S - PAD} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          </g>
        ))}
        <rect x={PAD} y={PAD} width={S - 2 * PAD} height={S - 2 * PAD} fill="none" stroke="var(--line)" />
        {/* ceiling zone */}
        {!bypassed && <rect x={x(T)} y={PAD} width={S - PAD - x(T)} height={y(T) - PAD} fill="var(--danger)" opacity={0.08} />}
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} stroke="var(--ink-muted)" strokeDasharray="4 5" opacity={0.5} />
        <path d={d} fill="none" stroke={bypassed ? "var(--ink-muted)" : "var(--accent-2)"} strokeWidth={2.5} strokeDasharray={bypassed ? "5 5" : undefined} />
        {live !== null && <circle cx={x(live)} cy={y(out(live))} r={5} fill="var(--ok)" stroke="var(--surface)" strokeWidth={2} />}
        <text x={S / 2} y={S - 7} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">input dB</text>
        <text x={9} y={S / 2} textAnchor="middle" fontSize={10} fill="var(--ink-muted)" transform={`rotate(-90 9 ${S / 2})`}>output dB</text>
        {!bypassed && onThresholdChange && (
          <g
            className="cursor-ew-resize"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag(threshold);
            }}
            onPointerMove={(e) => {
              if (drag === null) return;
              const v = fromEvent(e);
              setDrag(v);
              onThresholdChange(v);
            }}
            onPointerUp={() => setTimeout(() => setDrag(null), 400)}
          >
            <circle cx={x(T)} cy={y(T)} r={18} fill="transparent" />
            <circle cx={x(T)} cy={y(T)} r={7} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2.5} />
            <text x={x(T) - 10} y={y(T) - 12} textAnchor="end" fontSize={11} fill="var(--ink)">
              {T.toFixed(1)} dB
            </text>
          </g>
        )}
      </svg>
      {reduction !== null && reduction !== undefined && (
        <div className="flex w-3 flex-col items-center gap-1" title="Gain reduction">
          <div className="relative w-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="absolute inset-x-0 top-0 rounded-full bg-warn transition-[height] duration-100" style={{ height: `${(-gr / 24) * 100}%` }} />
          </div>
          <span className="text-[9px] text-ink-muted">GR</span>
        </div>
      )}
    </div>
  );
}
