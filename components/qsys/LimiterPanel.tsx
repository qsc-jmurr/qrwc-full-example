"use client";

import { useLimiter } from "@/features/limiter/useLimiter";
import { LimiterCurve } from "@/components/ui/LimiterCurve";
import { Fader } from "@/components/ui/Fader";
import { BypassToggle, Panel } from "@/components/ui/primitives";
import { Missing } from "./Missing";

/** "MainLimiter": live transfer curve with a draggable threshold, attack/release, bypass. */
export function LimiterPanel({ className }: { className?: string }) {
  const l = useLimiter();
  if (!l.available) return <Missing feature="limiter" title="Limiter" className={className} />;
  return (
    <Panel
      title="Limiter"
      subtitle="Drag the threshold point · green dot = live input"
      actions={<BypassToggle bypassed={l.bypassed} onToggle={() => l.setBypassed(!l.bypassed)} />}
      className={className}
    >
      <LimiterCurve
        threshold={l.threshold.value}
        bypassed={l.bypassed}
        inputLevel={l.inputLevel}
        reduction={l.reduction}
        onThresholdChange={(v) => l.set(l.threshold.name, v)}
        range={[Math.max(-60, l.threshold.min), Math.min(0, l.threshold.max) || 0]}
        className="mx-auto w-full max-w-72"
      />
      <div className="grid grid-cols-2 gap-x-5 gap-y-6">
        {l.attack.name && (
          <Fader orientation="horizontal" label="Attack" value={l.attack.value} min={l.attack.min} max={l.attack.max} scale="log"
            onChange={(v) => l.set(l.attack.name, v)} formatValue={(v) => `${(v * 1000).toFixed(1)} ms`} />
        )}
        {l.release.name && (
          <Fader orientation="horizontal" label="Release" value={l.release.value} min={l.release.min} max={l.release.max} scale="log"
            onChange={(v) => l.set(l.release.name, v)} formatValue={(v) => `${(v * 1000).toFixed(0)} ms`} />
        )}
      </div>
    </Panel>
  );
}
