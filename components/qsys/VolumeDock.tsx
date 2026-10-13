"use client";

import { useGain } from "@/features/gain/useGain";
import { Fader } from "@/components/ui/Fader";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/components/ui/primitives";

/** MainGain, docked on every page (rendered once in the layout, so it never remounts). */
export function VolumeDock({ className }: { className?: string }) {
  const g = useGain();
  if (!g.available) return null;
  return (
    <div
      style={{ viewTransitionName: "volume-dock" }}
      className={cx(
        "flex items-center gap-4 rounded-panel border border-line bg-surface/90 px-4 py-3 shadow-[0_8px_30px_-10px_rgb(0_0_0/0.6)] backdrop-blur sm:gap-6 sm:px-6",
        className,
      )}
    >
      <button
        onClick={() => g.setMuted(!g.muted)}
        aria-pressed={g.muted}
        aria-label={g.muted ? "Unmute" : "Mute"}
        className={cx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
          g.muted ? "bg-danger text-white" : "bg-surface-2 text-ink hover:bg-accent hover:text-accent-ink",
        )}
      >
        <Icon name={g.muted ? "muted" : "volume"} />
      </button>
      <Fader
        orientation="horizontal"
        label="Main volume"
        value={g.value}
        min={g.min}
        max={g.max}
        onChange={g.setGain}
        color={g.muted ? "var(--ink-muted)" : "linear-gradient(90deg, var(--accent), var(--accent-2))"}
        className="flex-1"
      />
      <div className="w-20 shrink-0 text-right">
        <div className="text-[10px] uppercase tracking-wide text-ink-muted">Main</div>
        <div className="font-mono text-sm tabular-nums text-ink">{g.muted ? "Muted" : g.label}</div>
      </div>
    </div>
  );
}
