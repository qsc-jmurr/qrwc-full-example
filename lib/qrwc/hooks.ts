"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Component, Control, IControlState, Qrwc } from "@q-sys/qrwc";
import { DESIGN, type ComponentLookup, type FeatureKey } from "@/lib/config";
import { useQrwc } from "./QrwcProvider";

/* No design generic here (names come from config), so components/controls are loosely typed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = Component<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyControl = Control<any, any, any>;
export type ControlStates = Readonly<Record<string, IControlState>>;
export type { IControlState };

export const allComponents = (qrwc: Qrwc | null): AnyComponent[] =>
  qrwc ? Object.values(qrwc.components as Record<string, AnyComponent>) : [];

export const controlsOf = (component: AnyComponent | undefined): AnyControl[] =>
  component ? Object.values(component.controls as Record<string, AnyControl>) : [];

/** One control by name. */
export const ctl = (component: AnyComponent | undefined, name: string): AnyControl | undefined =>
  (component?.controls as Record<string, AnyControl | undefined> | undefined)?.[name];

/** Name of the first control matching a pattern, e.g. findName(states, /threshold/). */
export const findName = (states: ControlStates, ...patterns: RegExp[]): string | undefined => {
  for (const p of patterns) {
    const hit = Object.keys(states).find((k) => p.test(k));
    if (hit) return hit;
  }
  return undefined;
};

/** Resolve a component: first by name, then by Type pattern. */
export function resolveComponent(qrwc: Qrwc | null, lookup: ComponentLookup): AnyComponent | undefined {
  if (!qrwc) return undefined;
  const all = qrwc.components as Record<string, AnyComponent | undefined>;
  for (const n of lookup.names) if (all[n]) return all[n];
  if (lookup.type) return allComponents(qrwc).find((c) => lookup.type!.test(c.state.Type));
  return undefined;
}

/** useFeatureComponent("eq") → the EQ component from config, or undefined. */
export function useFeatureComponent(key: FeatureKey): AnyComponent | undefined {
  const { qrwc } = useQrwc();
  return useMemo(() => resolveComponent(qrwc, DESIGN[key]), [qrwc, key]);
}

/* ── Reading state ───────────────────────────────────────────────────── */

// Latest snapshot per component / control, so React gets a stable value to compare.
const componentSnapshots = new WeakMap<AnyComponent, ControlStates>();
const controlSnapshots = new WeakMap<AnyControl, IControlState>();
const EMPTY: ControlStates = Object.freeze({});

const seedComponent = (c: AnyComponent) => {
  const seed: Record<string, IControlState> = {};
  for (const control of controlsOf(c)) seed[control.name] = control.state;
  componentSnapshots.set(c, seed);
};

/**
 * Live state of EVERY control on a component, from ONE listener.
 *   1. seed from control.state (the "update" event only fires on change)
 *   2. subscribe once at component level
 *   3. removeListener on cleanup
 * Built on useSyncExternalStore: React's own way to read an external store.
 */
export function useComponentStates(component: AnyComponent | undefined): ControlStates {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!component) return () => {};
      seedComponent(component);
      const onUpdate = (control: AnyControl, state: IControlState) => {
        componentSnapshots.set(component, { ...componentSnapshots.get(component), [control.name]: state });
        onChange();
      };
      component.on("update", onUpdate);
      return () => component.removeListener("update", onUpdate);
    },
    [component],
  );
  const read = () => {
    if (!component) return EMPTY;
    if (!componentSnapshots.has(component)) seedComponent(component);
    return componentSnapshots.get(component)!;
  };
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Live state of ONE control. */
export function useControl(control: AnyControl | undefined): IControlState | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!control) return () => {};
      controlSnapshots.set(control, control.state);
      const onUpdate = (s: IControlState) => {
        controlSnapshots.set(control, s);
        onChange();
      };
      control.on("update", onUpdate);
      return () => control.removeListener("update", onUpdate);
    },
    [control],
  );
  const read = () => {
    if (!control) return undefined;
    if (!controlSnapshots.has(control)) controlSnapshots.set(control, control.state);
    return controlSnapshots.get(control);
  };
  return useSyncExternalStore(subscribe, read, () => undefined);
}

/* ── Writing ─────────────────────────────────────────────────────────── */

type UpdateValue = Parameters<AnyControl["update"]>[0];

/**
 * send(controlName, value), throttled per control.
 * A drag fires 60+ events a second; the Core needs ~15. The LAST value always lands.
 */
export function useThrottledUpdate(component: AnyComponent | undefined, intervalMs = 60) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, UpdateValue>());
  const compRef = useRef(component);
  useEffect(() => {
    compRef.current = component;
  }, [component]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  return useCallback(
    (name: string, value: UpdateValue) => {
      const write = (v: UpdateValue) => ctl(compRef.current, name)?.update(v);
      if (timers.current.has(name)) {
        pending.current.set(name, value);
        return;
      }
      write(value);
      const flush = () => {
        if (pending.current.has(name)) {
          const v = pending.current.get(name)!;
          pending.current.delete(name);
          write(v);
          timers.current.set(name, setTimeout(flush, intervalMs));
        } else {
          timers.current.delete(name);
        }
      };
      timers.current.set(name, setTimeout(flush, intervalMs));
    },
    [intervalMs],
  );
}

/* ── Small readers ───────────────────────────────────────────────────── */
export const num = (s: IControlState | undefined, fallback = 0) => (typeof s?.Value === "number" ? s.Value : fallback);
export const bool = (s: IControlState | undefined) => !!s?.Bool;
