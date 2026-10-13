"use client";

import { useState } from "react";
import { useSettings, type Settings, type Theme } from "@/lib/settings";
import { useQrwc } from "@/lib/qrwc/QrwcProvider";
import { Modal } from "@/components/ui/Modal";
import { Button, cx } from "@/components/ui/primitives";

const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "horizon", label: "Horizon", swatch: "linear-gradient(135deg,#0b0b0c 50%,#0166ff 50%)" },
  { id: "daylight", label: "Daylight", swatch: "linear-gradient(135deg,#f4f2f2 50%,#0166ff 50%)" },
  { id: "control-room", label: "Control Room", swatch: "linear-gradient(135deg,#000 50%,#ffd400 50%)" },
];

/** Settings: connection, appearance, weather. Saved per browser. */
export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Remount the form each time it opens, so it starts from the saved settings.
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenCount((n) => n + 1);
  }
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <SettingsForm key={openCount} onDone={onClose} />
    </Modal>
  );
}

function SettingsForm({ onDone }: { onDone: () => void }) {
  const { settings, update, reset } = useSettings();
  const { engine, status, reconnect } = useQrwc();
  const [draft, setDraft] = useState<Settings>(settings);
  const set = (patch: Partial<Settings>) => setDraft((d) => ({ ...d, ...patch }));

  const connectionChanged =
    draft.coreHost !== settings.coreHost ||
    draft.apiKey !== settings.apiKey ||
    draft.pollingInterval !== settings.pollingInterval ||
    draft.discoveryMode !== settings.discoveryMode;

  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        update(draft); // connection changes reconnect automatically
        onDone();
      }}
    >
      <Section title="Connection" hint="Saved in this browser. Defaults come from .env.local.">
        <Field label="Core address" hint="IP or hostname. ws:// is added for you.">
          <input
            value={draft.coreHost}
            onChange={(e) => set({ coreHost: e.target.value })}
            placeholder="192.168.0.115"
            className="input font-mono"
            autoComplete="off"
          />
        </Field>
        <Field label="Access token" hint="Only if Access Control is on (Core Manager → Access Tokens).">
          <input
            value={draft.apiKey}
            onChange={(e) => set({ apiKey: e.target.value })}
            placeholder="none"
            type="password"
            className="input font-mono"
            autoComplete="off"
          />
        </Field>
        <Field label={`Polling interval · ${draft.pollingInterval} ms`} hint="How often QRWC asks for changes. 34 ms minimum; 100–350 ms is plenty.">
          <input
            type="range"
            min={34}
            max={500}
            step={1}
            value={draft.pollingInterval}
            onChange={(e) => set({ pollingInterval: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.discoveryMode}
            onChange={(e) => set({ discoveryMode: e.target.checked })}
            className="mt-1 accent-[var(--accent)]"
          />
          <span>
            <span className="text-ink">Discovery mode</span>
            <span className="block text-xs text-ink-muted">Fetch every component with Code Access set (for Explore). Off = only what the app uses.</span>
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3 rounded-[calc(var(--radius)*0.6)] bg-surface-2 px-3 py-2 text-xs text-ink-muted">
          <span className="text-ink">{status}</span>
          {engine?.DesignName && (
            <span>
              {engine.DesignName} · {engine.Platform}
            </span>
          )}
          <button type="button" onClick={reconnect} className="ml-auto text-accent-2 hover:underline">
            Reconnect now
          </button>
        </div>
      </Section>

      <Section title="Appearance">
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              type="button"
              key={t.id}
              role="radio"
              aria-checked={draft.theme === t.id}
              onClick={() => {
                set({ theme: t.id });
                update({ theme: t.id }); // preview instantly
              }}
              className={cx(
                "flex flex-col items-center gap-2 rounded-[calc(var(--radius)*0.6)] border p-3 text-xs transition",
                draft.theme === t.id ? "border-accent text-ink" : "border-line text-ink-muted hover:text-ink",
              )}
            >
              <span className="h-8 w-8 rounded-full border border-line" style={{ background: t.swatch }} />
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Weather">
        <Field label="Location">
          <input value={draft.weatherCity} onChange={(e) => set({ weatherCity: e.target.value })} className="input" />
        </Field>
      </Section>

      <div className="sticky -bottom-5 -mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-line bg-surface px-6 py-4">
        <button
          type="button"
          onClick={() => {
            reset();
            onDone();
          }}
          className="text-xs text-ink-muted hover:text-danger"
        >
          Reset to defaults
        </button>
        <div className="ml-auto flex gap-2">
          <Button type="button" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {connectionChanged ? "Save & reconnect" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3">
        <span className="font-display text-sm text-ink">{title}</span>
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-muted">{hint}</span>}
    </label>
  );
}
