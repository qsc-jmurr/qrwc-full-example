"use client";

import { useMemo } from "react";
import { bool, ctl, num, useComponentStates, useFeatureComponent, useThrottledUpdate } from "@/lib/qrwc/hooks";
import { toBandType, type EqBand } from "@/lib/dsp";

export type EqBandState = EqBand & { id: number; typeLabel?: string; typeChoices: string[] };

/**
 * Headless parametric EQ. DISCOVERS the bands (frequency.1 … frequency.N)
 * and reads each control's range from the Core instead of assuming.
 */
export function useParametricEq() {
  const component = useFeatureComponent("eq");
  const s = useComponentStates(component);
  const send = useThrottledUpdate(component, 60);

  const bandNumbers = useMemo(
    () =>
      Object.keys(s)
        .map((k) => /^frequency\.(\d+)$/.exec(k)?.[1])
        .filter((n): n is string => !!n)
        .map(Number)
        .sort((a, b) => a - b),
    [s],
  );

  const bands: EqBandState[] = bandNumbers.map((n) => ({
    id: n,
    frequency: num(s[`frequency.${n}`], 1000),
    gain: num(s[`gain.${n}`]),
    bandwidth: num(s[`bandwidth.${n}`], 1),
    type: toBandType(s[`type.${n}`]?.String),
    typeLabel: s[`type.${n}`]?.String,
    typeChoices: s[`type.${n}`]?.Choices ?? [],
    bypass: bool(s[`bypass.${n}`]),
  }));

  const first = bandNumbers[0];
  const range = (name: string, lo: number, hi: number): [number, number] => [
    s[`${name}.${first}`]?.ValueMin ?? lo,
    s[`${name}.${first}`]?.ValueMax ?? hi,
  ];

  return {
    available: !!component && bands.length > 0,
    bands,
    bypassed: bool(s.bypass),
    freqRange: range("frequency", 20, 20000),
    gainRange: range("gain", -18, 18),
    bwRange: range("bandwidth", 0.03, 4),
    setBand: (n: number, patch: Partial<Pick<EqBand, "frequency" | "gain" | "bandwidth">>) => {
      for (const [k, v] of Object.entries(patch)) send(`${k}.${n}`, v as number);
    },
    setBandType: (n: number, label: string) => ctl(component, `type.${n}`)?.update({ String: label }),
    setBandBypass: (n: number, b: boolean) => ctl(component, `bypass.${n}`)?.update(b),
    setBypassed: (b: boolean) => ctl(component, "bypass")?.update(b),
  };
}
