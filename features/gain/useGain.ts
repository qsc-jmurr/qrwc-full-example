"use client";

import { bool, ctl, num, useComponentStates, useFeatureComponent, useThrottledUpdate } from "@/lib/qrwc/hooks";

/** Headless: MainGain gain + mute. No JSX, no styling — reuse it under any UI. */
export function useGain() {
  const component = useFeatureComponent("gain");
  const s = useComponentStates(component);
  const send = useThrottledUpdate(component);

  return {
    available: !!s.gain,
    value: num(s.gain),
    min: s.gain?.ValueMin ?? -100,
    max: s.gain?.ValueMax ?? 20,
    label: s.gain?.String ?? "—",
    muted: bool(s.mute),
    setGain: (db: number) => send("gain", db),
    setMuted: (m: boolean) => ctl(component, "mute")?.update(m),
  };
}
