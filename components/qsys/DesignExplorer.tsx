"use client";

import { useMemo, useState } from "react";
import { useQrwc } from "@/lib/qrwc/QrwcProvider";
import { DESIGN, type FeatureKey } from "@/lib/config";
import { useSettings } from "@/lib/settings";
import {
  allComponents,
  controlsOf,
  resolveComponent,
  useControl,
  useThrottledUpdate,
  type AnyComponent,
  type AnyControl,
  type IControlState,
} from "@/lib/qrwc/hooks";
import { ScrollList } from "@/components/ui/ScrollList";
import { Fader } from "@/components/ui/Fader";
import { Button, Empty, Panel, cx } from "@/components/ui/primitives";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * DESIGN CHECK: does the Core have what each page needs?
 * Same data as the explorer, framed as a pre-flight checklist.
 */
export function DesignCheck() {
  const { qrwc } = useQrwc();
  const rows = (Object.keys(DESIGN) as FeatureKey[]).map((key) => {
    const found = resolveComponent(qrwc, DESIGN[key]);
    return { key, label: DESIGN[key].label, wanted: DESIGN[key].names, found };
  });
  return (
    <Panel title="Design check" subtitle="What this app expects vs. what the Core exposes (lib/config.ts)">
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 py-2.5 text-sm">
            <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", r.found ? "bg-ok" : "bg-danger")} />
            <span className="w-40 shrink-0 text-ink">{r.label}</span>
            <span className="truncate font-mono text-xs text-ink-muted">
              {r.found ? `${r.found.name} · ${plural(controlsOf(r.found).length, "control")}` : `missing: ${r.wanted.join(" | ")}${DESIGN[r.key].type ? ` (or Type ~ ${DESIGN[r.key].type})` : ""}`}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * AUTO-DISCOVERY: every component with Code Access = External, every control,
 * with a widget chosen from the control's own Type / Direction / range / Choices.
 * No names are hard-coded here.
 */
export function DesignExplorer() {
  const { qrwc } = useQrwc();
  const { settings, update } = useSettings();
  const components = useMemo(
    () => allComponents(qrwc).sort((a, b) => a.name.localeCompare(b.name)),
    [qrwc],
  );
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showTypes, setShowTypes] = useState(false);
  const selected = components.find((c) => c.name === selectedName) ?? components[0];

  if (!qrwc) return <Empty>Connect to a Core to explore its design.</Empty>;

  return (
    <div className="space-y-4">
    {!settings.discoveryMode && (
      <div className="flex flex-wrap items-center gap-3 rounded-panel border border-dashed border-line px-4 py-3 text-sm text-ink-muted">
        <span className="flex-1">
          Showing only the components this app uses — QRWC&apos;s <code className="font-mono text-ink">componentFilter</code> keeps
          polling light. Turn on discovery to fetch everything with Code Access set.
        </span>
        <Button size="sm" variant="primary" onClick={() => update({ discoveryMode: true })}>
          Discover everything
        </Button>
      </div>
    )}
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Panel
        title="Components"
        subtitle={`${components.length} scriptable · ${components.reduce((n, c) => n + controlsOf(c).length, 0)} controls`}
        actions={
          <Button size="sm" variant="toggle" active={showTypes} onClick={() => setShowTypes((s) => !s)}>
            Types
          </Button>
        }
      >
        <ScrollList
          items={components}
          getKey={(c) => c.name}
          getText={(c) => `${c.name} ${c.state.Type}`}
          placeholder="Filter components…"
          maxHeight="60vh"
          renderItem={(c) => (
            <button
              onClick={() => setSelectedName(c.name)}
              className={cx(
                "w-full rounded-[calc(var(--radius)*0.6)] border px-3 py-2 text-left transition",
                selected?.name === c.name ? "border-accent bg-accent/10" : "border-transparent hover:bg-surface-2",
              )}
            >
              <div className="truncate font-mono text-xs text-ink">{c.name}</div>
              <div className="text-[10px] text-ink-muted">
                {c.state.Type} · {plural(controlsOf(c).length, "control")}
              </div>
            </button>
          )}
        />
      </Panel>

      <div className="min-w-0 space-y-6">
        {showTypes && <TypeGenerator components={components} />}
        {selected && <ComponentDetail key={selected.name} component={selected} />}
      </div>
    </div>
    </div>
  );
}

function ComponentDetail({ component }: { component: AnyComponent }) {
  const controls = useMemo(() => controlsOf(component).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), [component]);
  const send = useThrottledUpdate(component);
  return (
    <Panel title={<span className="font-mono">{component.name}</span>} subtitle={`${component.state.Type} · ${plural(controls.length, "control")}`}>
      <ScrollList
        items={controls}
        getKey={(c) => c.name}
        getText={(c) => c.name}
        placeholder="Filter controls…"
        maxHeight="60vh"
        renderItem={(c) => <ControlRow control={c} send={send} />}
      />
    </Panel>
  );
}

function ControlRow({ control, send }: { control: AnyControl; send: ReturnType<typeof useThrottledUpdate> }) {
  const s = useControl(control);
  if (!s) return null;
  const readOnly = s.Direction === "Read Only";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_6rem] items-center gap-4 rounded-[calc(var(--radius)*0.5)] px-2 py-2 hover:bg-surface-2">
      <div className="min-w-0">
        <div className="truncate font-mono text-xs text-ink">{control.name}</div>
        <div className="text-[10px] text-ink-muted">
          {s.Type}
          {readOnly && " · read only"}
        </div>
      </div>
      <div className="min-w-0">{readOnly ? <Meter s={s} /> : <Widget control={control} s={s} send={send} />}</div>
      <div className="truncate text-right font-mono text-[11px] tabular-nums text-ink-muted">{s.String}</div>
    </div>
  );
}

function Widget({ control, s, send }: { control: AnyControl; s: IControlState; send: ReturnType<typeof useThrottledUpdate> }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (s.Type === "Boolean")
    return (
      <Button size="sm" variant="toggle" active={s.Bool} onClick={() => control.update(!s.Bool)}>
        {s.Bool ? "On" : "Off"}
      </Button>
    );
  if (s.Type === "Trigger")
    return (
      <Button size="sm" onClick={() => control.update(1)}>
        Trigger
      </Button>
    );
  if (s.Choices?.length)
    return (
      <select
        value={s.String}
        onChange={(e) => control.update({ String: e.target.value })}
        className="w-full rounded border border-line bg-surface-2 px-2 py-1 text-xs text-ink"
      >
        {s.Choices.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    );
  if (s.Type === "Text")
    return (
      <input
        value={draft ?? s.String ?? ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft !== null) {
            control.update({ String: draft });
            setDraft(null);
          }
        }}
        onBlur={() => setDraft(null)}
        placeholder="Type, then Enter"
        className="w-full rounded border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-ink outline-none focus:border-accent"
      />
    );
  return (
    <Fader
      orientation="horizontal"
      value={s.Position ?? 0}
      min={0}
      max={1}
      onChange={(p) => send(control.name, { Position: p })}
    />
  );
}

function Meter({ s }: { s: IControlState }) {
  if (s.Type === "Boolean") return <span className={cx("inline-block h-3 w-3 rounded-full", s.Bool ? "bg-ok" : "bg-surface-2")} />;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-ok" style={{ width: `${Math.max(0, Math.min(1, s.Position ?? 0)) * 100}%` }} />
    </div>
  );
}

function TypeGenerator({ components }: { components: AnyComponent[] }) {
  const [copied, setCopied] = useState(false);
  const ident = (n: string) => (/^[A-Za-z_$][\w$]*$/.test(n) ? n : JSON.stringify(n));
  const code =
    "type MyDesign = {\n" +
    components.map((c) => `  ${ident(c.name)}: ${controlsOf(c).map((x) => JSON.stringify(x.name)).join(" | ") || "never"};`).join("\n") +
    "\n};\n\nconst qrwc = await Qrwc.createQrwc<MyDesign>({ host });";
  return (
    <Panel
      title="Generated types"
      subtitle="Paste into your app for autocomplete and compile-time checks"
      actions={
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      }
    >
      <pre className="max-h-72 overflow-auto rounded-[calc(var(--radius)*0.6)] bg-bg p-4 font-mono text-xs leading-relaxed text-ink-muted">
        {code}
      </pre>
    </Panel>
  );
}
