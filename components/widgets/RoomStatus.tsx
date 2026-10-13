"use client";

import { useQrwc } from "@/lib/qrwc/QrwcProvider";
import { allComponents } from "@/lib/qrwc/hooks";
import { Panel } from "@/components/ui/primitives";

/** What the app is connected to, straight from QRWC's engineStatus. */
export function RoomStatus({ className }: { className?: string }) {
  const { qrwc, status, engine } = useQrwc();
  const rows: [string, string | undefined][] = [
    ["Connection", status],
    ["Design", engine?.DesignName],
    ["Core", engine?.Platform],
    ["Engine", engine?.State],
    ["Redundant", engine ? (engine.IsRedundant ? "Yes" : "No") : undefined],
    ["Components", qrwc ? String(allComponents(qrwc).length) : undefined],
  ];
  return (
    <Panel title="System" className={className}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="truncate text-right font-mono text-ink">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
