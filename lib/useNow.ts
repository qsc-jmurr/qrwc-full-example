"use client";

import { useSyncExternalStore } from "react";

let now = typeof window === "undefined" ? 0 : Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current time, ticking every second. Null during server render (avoids hydration mismatches). */
export function useNow(): Date | null {
  const t = useSyncExternalStore(subscribe, () => now, () => 0);
  return t ? new Date(t) : null;
}
