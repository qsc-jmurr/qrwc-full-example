"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ctl } from "@/lib/qrwc/hooks";
import { useSelectedCamera } from "./useCameraRouter";

const DIRECTIONS = ["pan.left", "pan.right", "tilt.up", "tilt.down"] as const;
const DIAGONALS = ["pan.left.tilt.up", "pan.left.tilt.down", "pan.right.tilt.up", "pan.right.tilt.down"] as const;
const SPEED = { pan: ["pan.speed", "panSpeed", "setup.pan.speed"], tilt: ["tilt.speed", "tiltSpeed", "setup.tilt.speed"] };
const ZOOM = { in: ["zoom.in", "zoomIn"], out: ["zoom.out", "zoomOut"] };
const HOME = ["preset.home.load", "home", "ptz.home", "preset.home", "go.home"];
const DEADZONE = 0.15;

/**
 * Headless PTZ for the selected camera. Joystick vector → button presses, EDGE-TRIGGERED
 * (a control is only written when its state changes, not 60×/s). Everything is
 * released on unmount, on camera change and when the window loses focus, so a camera never runs away.
 */
export function usePtz() {
  const { name: cameraName, component } = useSelectedCamera();
  const pressed = useRef(new Set<string>());
  const lastSpeed = useRef({ pan: -1, tilt: -1 });

  const first = useCallback((names: readonly string[]) => names.map((n) => ctl(component, n)).find(Boolean), [component]);

  const apply = useCallback(
    (desired: Set<string>) => {
      const all = [...DIRECTIONS, ...DIAGONALS];
      // Release before press: some cameras halt on any release, which would cancel the new direction.
      for (const name of all) {
        if (!desired.has(name) && pressed.current.has(name)) {
          ctl(component, name)?.update(false);
          pressed.current.delete(name);
        }
      }
      for (const name of all) {
        if (desired.has(name) && !pressed.current.has(name)) {
          ctl(component, name)?.update(true);
          pressed.current.add(name);
        }
      }
    },
    [component],
  );

  // Release every direction, not just the ones we think are held, so a desync can't leave one stuck.
  const stop = useCallback(() => {
    for (const name of [...DIRECTIONS, ...DIAGONALS]) ctl(component, name)?.update(false);
    pressed.current.clear();
  }, [component]);

  const move = useCallback(
    (x: number, y: number) => {
      if (Math.hypot(x, y) <= DEADZONE) return stop();
      const desired = new Set<string>();
      const sector = (Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8; // 8 × 45°
      const h = [1, 1, 0, -1, -1, -1, 0, 1][sector];
      const v = [0, 1, 1, 1, 0, -1, -1, -1][sector];
      const diag = h && v ? `pan.${h > 0 ? "right" : "left"}.tilt.${v > 0 ? "up" : "down"}` : null;
      if (diag && ctl(component, diag)) desired.add(diag);
      else {
        if (h) desired.add(h > 0 ? "pan.right" : "pan.left");
        if (v) desired.add(v > 0 ? "tilt.up" : "tilt.down");
      }
      // Speed via Position (0–1) works whatever the control's range is.
      const pan = Math.round(Math.abs(x) * 20) / 20;
      const tilt = Math.round(Math.abs(y) * 20) / 20;
      if (pan !== lastSpeed.current.pan) first(SPEED.pan)?.update({ Position: pan });
      if (tilt !== lastSpeed.current.tilt) first(SPEED.tilt)?.update({ Position: tilt });
      lastSpeed.current = { pan, tilt };
      apply(desired);
    },
    [apply, stop, component, first],
  );

  const zoom = useCallback((dir: "in" | "out", on: boolean) => first(ZOOM[dir])?.update(on), [first]);

  const homeControl = useMemo(() => {
    const exact = first(HOME);
    if (exact) return exact;
    const name = Object.keys(component?.controls ?? {}).find((n) => /home/i.test(n) && !/save|store|set/i.test(n));
    return name ? ctl(component, name) : undefined;
  }, [component, first]);

  const home = useCallback(() => {
    if (!homeControl) return;
    stop();
    if (homeControl.state.Type === "Trigger") homeControl.update(1);
    else {
      // Momentary Boolean: press, then release.
      homeControl.update(true);
      setTimeout(() => homeControl.update(false), 200);
    }
  }, [homeControl, stop]);

  useEffect(() => {
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("blur", stop);
      stop();
    };
  }, [stop]);

  return {
    available: !!component && DIRECTIONS.some((n) => ctl(component, n)),
    found: !!component,
    cameraName,
    hasZoom: !!first(ZOOM.in),
    hasHome: !!homeControl,
    move,
    zoom,
    home,
  };
}
