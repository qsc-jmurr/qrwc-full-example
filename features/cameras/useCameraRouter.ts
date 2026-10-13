"use client";

import { useMemo } from "react";
import { CAMERAS } from "@/lib/config";
import { ctl, num, useComponentStates, useFeatureComponent, type AnyComponent } from "@/lib/qrwc/hooks";
import { useQrwc } from "@/lib/qrwc/QrwcProvider";

/** Headless camera selection. Discovers the inputs and uses their names from the design. */
export function useCameraRouter() {
  const component = useFeatureComponent("cameraRouter");
  const s = useComponentStates(component);

  const cameras = useMemo(
    () =>
      Object.keys(s)
        .map((k) => /^output\.1\.input\.(\d+)\.select$/.exec(k)?.[1])
        .filter((n): n is string => !!n)
        .map(Number)
        .sort((a, b) => a - b)
        .map((n) => ({ id: n, label: s[`input.${n}.source.name`]?.String || `Camera ${n}` })),
    [s],
  );

  const active = s["select.1"] ? num(s["select.1"]) : (cameras.find((c) => s[`output.1.input.${c.id}.select`]?.Bool)?.id ?? null);

  return {
    available: !!component && cameras.length > 0,
    cameras,
    active,
    select: (n: number) =>
      s["select.1"] ? ctl(component, "select.1")?.update(n) : ctl(component, `output.1.input.${n}.select`)?.update(true),
  };
}

/** The Cam-N component for the router's active input. */
export function useSelectedCamera() {
  const { qrwc } = useQrwc();
  const { active } = useCameraRouter();
  const name = CAMERAS[(active ?? 1) - 1] ?? CAMERAS[0];
  const component = useMemo(
    () => (qrwc?.components as Record<string, AnyComponent | undefined> | undefined)?.[name],
    [qrwc, name],
  );
  return { name, component };
}
