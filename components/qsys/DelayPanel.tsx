"use client";

import { useDelay } from "@/features/delay/useDelay";
import { Fader } from "@/components/ui/Fader";
import { BypassToggle, Panel } from "@/components/ui/primitives";
import { Missing } from "./Missing";

/** "Main Delay": a fader per tap (discovered) and a bypass. */
export function DelayPanel({ className }: { className?: string }) {
  const d = useDelay();
  if (!d.available) return <Missing feature="delay" title="Delay" className={className} />;
  return (
    <Panel
      title="Delay"
      subtitle={`${d.taps.length} tap${d.taps.length === 1 ? "" : "s"} discovered`}
      actions={d.hasBypass && <BypassToggle bypassed={d.bypassed} onToggle={() => d.setBypassed(!d.bypassed)} />}
      className={className}
    >
      <div className={d.bypassed ? "opacity-50 transition" : "transition"}>
        {d.taps.map((t) => (
          <Fader
            key={t.name}
            orientation="horizontal"
            label={d.taps.length > 1 ? t.name : "Time"}
            value={t.seconds}
            min={0}
            max={t.max}
            step={0.001}
            onChange={(v) => d.setTap(t.name, v)}
            formatValue={(v) => `${(v * 1000).toFixed(0)} ms`}
          />
        ))}
      </div>
    </Panel>
  );
}
