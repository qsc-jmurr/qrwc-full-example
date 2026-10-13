"use client";

import { useState } from "react";
import { cx } from "./primitives";

type FaderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  orientation?: "vertical" | "horizontal";
  scale?: "linear" | "log";
  /** Any CSS colour, e.g. "var(--band-2)". Defaults to the theme accent. */
  color?: string;
  formatValue?: (v: number) => string;
  className?: string;
};

const toT = (v: number, min: number, max: number, log: boolean) =>
  log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min);
const fromT = (t: number, min: number, max: number, log: boolean) =>
  log ? Math.exp(Math.log(min) + (Math.log(max) - Math.log(min)) * t) : min + (max - min) * t;

/**
 * A themeable fader. While the user drags it shows THEIR value, not the
 * polled one, so it never fights the finger. Keyboard works (it's a real
 * <input type=range> underneath).
 */
export function Fader({
  value,
  min,
  max,
  step,
  onChange,
  label,
  orientation = "vertical",
  scale = "linear",
  color = "var(--accent)",
  formatValue,
  className,
}: FaderProps) {
  const [dragT, setDragT] = useState<number | null>(null);
  const log = scale === "log";
  const t = dragT ?? Math.max(0, Math.min(1, toT(value, min, max, log)));
  const shown = dragT !== null ? fromT(dragT, min, max, log) : value;

  const handle = (raw: number) => {
    setDragT(raw);
    let v = fromT(raw, min, max, log);
    if (step) v = Number((Math.round(v / step) * step).toFixed(6));
    onChange(v);
  };
  const end = () => setDragT(null);
  const vertical = orientation === "vertical";

  return (
    <div className={cx("flex", vertical ? "flex-col items-center" : "w-full flex-col", className)}>
      {label && <span className="mb-2 text-[10px] uppercase tracking-wide text-ink-muted">{label}</span>}
      <div className={cx("relative flex", vertical ? "h-40 w-7 items-end" : "h-7 w-full items-center")}>
        <div className="absolute inset-0 rounded-full bg-surface-2" />
        <div
          className="absolute rounded-full"
          style={
            vertical
              ? { left: 0, right: 0, bottom: 0, height: `${t * 100}%`, background: color }
              : { left: 0, top: 0, bottom: 0, width: `${t * 100}%`, background: color }
          }
        />
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(t * 1000)}
          onChange={(e) => handle(Number(e.target.value) / 1000)}
          onPointerUp={end}
          onBlur={end}
          onKeyUp={end}
          aria-label={label}
          aria-valuetext={formatValue?.(shown)}
          className="absolute inset-0 cursor-pointer opacity-0"
          style={vertical ? { writingMode: "vertical-lr", direction: "rtl" } : undefined}
        />
      </div>
      {formatValue && (
        <span className="mt-2 font-mono text-[10px] tabular-nums text-ink">{formatValue(shown)}</span>
      )}
    </div>
  );
}

export default Fader;
