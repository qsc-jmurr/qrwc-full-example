"use client";

import { useMemo } from "react";
import { bool, ctl, findName, num, useComponentStates, useFeatureComponent, useThrottledUpdate } from "@/lib/qrwc/hooks";

/** Headless delay: discovers every tap (delay.1 … delay.N) plus the bypass. */
export function useDelay() {
  const component = useFeatureComponent("delay");
  const s = useComponentStates(component);
  const send = useThrottledUpdate(component);

  const taps = useMemo(
    () =>
      Object.keys(s)
        .filter((k) => /^delay(\.\d+)?$/.test(k))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((k) => ({ name: k, seconds: num(s[k]), max: s[k]?.ValueMax ?? 1, label: s[k]?.String })),
    [s],
  );
  const bypassName = findName(s, /^bypass$/, /^bypass\.1$/);

  return {
    available: !!component && taps.length > 0,
    taps,
    bypassed: bypassName ? bool(s[bypassName]) : false,
    hasBypass: !!bypassName,
    setTap: (name: string, seconds: number) => send(name, seconds),
    setBypassed: (b: boolean) => bypassName && ctl(component, bypassName)?.update(b),
  };
}
