"use client";

import { useState } from "react";
import { useParametricEq } from "@/features/eq/useParametricEq";
import { EqCurve } from "@/components/ui/EqCurve";
import { BypassToggle, Button, Panel, cx } from "@/components/ui/primitives";
import { formatHz } from "@/lib/dsp";
import { Missing } from "./Missing";

/** Connected component = headless hook + UI primitive. That's all the glue there is. */
export function EqPanel({ className }: { className?: string }) {
  const eq = useParametricEq();
  const [selected, setSelected] = useState<number | null>(null);
  if (!eq.available) return <Missing feature="eq" title="Parametric EQ" />;

  const sel = eq.bands.find((b) => b.id === selected) ?? null;
  const selIndex = sel ? eq.bands.indexOf(sel) : -1;

  return (
    <Panel
      title="Parametric EQ"
      subtitle={`${eq.bands.length} bands discovered · drag a node, scroll for bandwidth, double-click to flatten`}
      actions={<BypassToggle bypassed={eq.bypassed} onToggle={() => eq.setBypassed(!eq.bypassed)} />}
      className={className}
    >
      {/* On a phone, scroll the curve sideways rather than shrink the nodes */}
      <div className="-mx-2 overflow-x-auto px-2">
      <EqCurve
        className="min-w-[600px]"
        bands={eq.bands}
        bypassed={eq.bypassed}
        freqRange={eq.freqRange}
        gainRange={eq.gainRange}
        bwRange={eq.bwRange}
        selected={selected}
        onSelect={setSelected}
        onBandChange={eq.setBand}
      />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {eq.bands.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setSelected(b.id)}
            className={cx(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition",
              selected === b.id ? "border-accent text-ink" : "border-line text-ink-muted hover:text-ink",
              b.bypass && "opacity-50",
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--band-${(i % 6) + 1})` }} />
            {formatHz(b.frequency)}
            <span className="font-mono tabular-nums">{b.gain > 0 ? "+" : ""}{b.gain.toFixed(1)}</span>
          </button>
        ))}
      </div>
      {sel && (
        <div className="flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface-2 px-4 py-3 text-xs">
          <span className="text-ink">Band {selIndex + 1}</span>
          <span className="font-mono text-ink-muted">
            {formatHz(sel.frequency)} · {sel.gain.toFixed(1)} dB · {sel.bandwidth.toFixed(2)} oct
          </span>
          {sel.typeChoices.length > 0 && (
            <select
              value={sel.typeLabel}
              onChange={(e) => eq.setBandType(sel.id, e.target.value)}
              className="rounded border border-line bg-surface px-2 py-1 text-ink"
            >
              {sel.typeChoices.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={() => eq.setBand(sel.id, { gain: 0 })}>Flatten</Button>
            <Button size="sm" variant="toggle" active={sel.bypass} onClick={() => eq.setBandBypass(sel.id, !sel.bypass)}>
              {sel.bypass ? "Band bypassed" : "Bypass band"}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
