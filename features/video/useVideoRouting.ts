"use client";

import { useMemo } from "react";
import { VIDEO } from "@/lib/config";
import { ctl, num, useComponentStates, useFeatureComponent, type ControlStates } from "@/lib/qrwc/hooks";

export type VideoSource = { id: string; label: string; detail?: string };
export type SourceNameOrigin = "decoder choices" | "decoder controls" | "config";

const OUTPUT = /^hdmi\.out\.(\d+)\.select\.index$/;

/**
 * Source names, best source first:
 *  1. the select control's own Choices (what the decoder calls its inputs)
 *  2. per-input name controls on the decoder (input.N.name / source.N.name …)
 *  3. the fallback list in lib/config.ts
 */
function discoverSources(s: ControlStates, selectName?: string): { sources: VideoSource[]; origin: SourceNameOrigin } {
  const select = selectName ? s[selectName] : undefined;
  const min = select?.ValueMin ?? 1;

  if (select?.Choices?.length) {
    return {
      origin: "decoder choices",
      sources: select.Choices.map((label, i) => ({ id: String(min + i), label }))
        .filter((src) => Number(src.id) !== VIDEO.clearValue),
    };
  }

  const named = Object.entries(s)
    .map(([k, v]) => ({ m: /^(?:hdmi\.)?(?:in|input|source)\.(\d+)\.(?:name|label|source\.name)$/.exec(k), v }))
    .filter((x) => x.m && x.v.String)
    .map((x) => ({ n: Number(x.m![1]), label: x.v.String! }));
  if (named.length) {
    const offset = VIDEO.fallbackSources[0].value - 1; // index of input 1 on the select
    return {
      origin: "decoder controls",
      sources: named.sort((a, b) => a.n - b.n).map((x) => ({ id: String(x.n + offset), label: x.label, detail: `Input ${x.n}` })),
    };
  }

  return {
    origin: "config",
    sources: VIDEO.fallbackSources.map((f) => ({ id: String(f.value), label: f.label, detail: `Index ${f.value}` })),
  };
}

/** Headless video routing for the Decoder block. Outputs and (where possible) source names are discovered. */
export function useVideoRouting() {
  const component = useFeatureComponent("decoder");
  const s = useComponentStates(component);

  const outputs = useMemo(
    () =>
      Object.keys(s)
        .map((k) => OUTPUT.exec(k)?.[1])
        .filter((n): n is string => !!n)
        .map(Number)
        .sort((a, b) => a - b),
    [s],
  );

  const { sources, origin } = useMemo(
    () => discoverSources(s, outputs.length ? `hdmi.out.${outputs[0]}.select.index` : undefined),
    [s, outputs],
  );

  const displays = outputs.map((n) => {
    const v = num(s[`hdmi.out.${n}.select.index`], VIDEO.clearValue);
    return { id: String(n), label: `Display ${n}`, sourceId: sources.some((src) => src.id === String(v)) ? String(v) : null };
  });

  return {
    available: !!component && outputs.length > 0,
    sources,
    origin,
    displays,
    route: (displayId: string, sourceId: string | null) =>
      ctl(component, `hdmi.out.${displayId}.select.index`)?.update(sourceId === null ? VIDEO.clearValue : Number(sourceId)),
  };
}
