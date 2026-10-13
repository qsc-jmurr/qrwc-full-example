"use client";

import { bool, ctl, findName, num, useComponentStates, useFeatureComponent, useThrottledUpdate } from "@/lib/qrwc/hooks";

/**
 * Headless peak limiter. Control names differ slightly between Q-SYS blocks,
 * so they're FOUND by pattern rather than hard-coded.
 */
export function useLimiter() {
  const component = useFeatureComponent("limiter");
  const s = useComponentStates(component);
  const send = useThrottledUpdate(component);

  const names = {
    threshold: findName(s, /^threshold(\.level)?$/, /threshold/),
    attack: findName(s, /^attack/),
    release: findName(s, /^release/),
    bypass: findName(s, /^bypass$/),
    inputLevel: findName(s, /detector\.level/, /input\.level/, /^level/),
    reduction: findName(s, /applied\.gain/, /reduction/),
  };
  const param = (name: string | undefined, fallback: number, lo: number, hi: number) => ({
    name,
    value: name ? num(s[name], fallback) : fallback,
    min: (name ? s[name]?.ValueMin : undefined) ?? lo,
    max: (name ? s[name]?.ValueMax : undefined) ?? hi,
  });

  return {
    available: !!component && !!names.threshold,
    threshold: param(names.threshold, -10, -60, 20),
    attack: param(names.attack, 0.001, 0.0001, 0.5),
    release: param(names.release, 0.1, 0.001, 5),
    /** Live input level (dB), if the block exposes a meter. */
    inputLevel: names.inputLevel ? num(s[names.inputLevel], -100) : null,
    /** Live gain reduction (dB, ≤ 0), if exposed. */
    reduction: names.reduction ? num(s[names.reduction]) : null,
    bypassed: names.bypass ? bool(s[names.bypass]) : false,
    set: (name: string | undefined, v: number) => name && send(name, v),
    setBypassed: (b: boolean) => names.bypass && ctl(component, names.bypass)?.update(b),
  };
}
