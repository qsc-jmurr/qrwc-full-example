"use client";

import { useMemo } from "react";
import { useComponentStates, type ControlStates, type IControlState } from "@/lib/qrwc/hooks";
import { useSelectedCamera } from "./useCameraRouter";

const JPEG_B64 = "/9j/"; // every base64-encoded JPEG starts like this
const toDataUrl = (b64: string) => (b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`);

/** Pull an image out of a JSON payload, e.g. {"IconData": "/9j/..."}. */
function fromJson(text: string): string | null {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const data = [j.IconData, j.Image, j.Data, j.jpeg, j.image].find((v) => typeof v === "string") as string | undefined;
    return data ? toDataUrl(data) : null;
  } catch {
    return null;
  }
}

/**
 * Turn the camera control's String into an <img> src.
 *
 * The browser can show base64 JPEG directly via a data: URL, so a plain
 * base64 JPEG needs no decoding. If the Core wraps it (base64 of JSON, or
 * base64 of base64), we DECODE with atob() and look again.
 */
export function toImageSrc(state: IControlState | undefined): string | null {
  const s = state?.String?.trim();
  if (!s) return null;

  if (s.startsWith("data:image")) return s; // already a data URL
  if (s.startsWith(JPEG_B64)) return toDataUrl(s); // plain base64 JPEG
  if (s.startsWith("{")) return fromJson(s); // JSON carrying base64

  // ── Base64-wrapped payloads: decode, then check what's inside ──
  try {
    const decoded = atob(s);
    if (decoded.charCodeAt(0) === 0xff && decoded.charCodeAt(1) === 0xd8) return toDataUrl(s); // raw JPEG bytes
    const inner = decoded.trim();
    if (inner.startsWith(JPEG_B64)) return toDataUrl(inner); // base64 of base64
    if (inner.startsWith("{")) return fromJson(inner); // base64 of JSON
  } catch {
    /* not base64 */
  }
  return null;
}

// Most specific first: camera components expose several jpeg-ish controls.
const CANDIDATES = [/jpeg.data/i, /jpeg/i, /preview/i, /snapshot|image/i];

const candidateNames = (s: ControlStates) => {
  const names = Object.keys(s);
  return [...new Set(CANDIDATES.flatMap((p) => names.filter((n) => p.test(n))))];
};
const logged = new Set<string>();

/**
 * The JPEG still from the camera currently selected on the router. QRWC polls it
 * like any other control, so the picture updates when the Core publishes a new frame.
 */
export function useCameraFeed() {
  const { name: cameraName, component } = useSelectedCamera();
  const s = useComponentStates(component);
  const { name, src } = useMemo(() => {
    const names = candidateNames(s);
    for (const n of names) {
      const img = toImageSrc(s[n]);
      if (img) return { name: n, src: img };
    }
    if (process.env.NODE_ENV === "development" && names.length && !logged.has(cameraName)) {
      logged.add(cameraName);
      console.warn(
        `Camera still (${cameraName}): no candidate control holds an image yet.\n` +
          names.map((n) => `${n} [${s[n]?.Type}] len=${s[n]?.String?.length ?? 0}: ${JSON.stringify(s[n]?.String?.slice(0, 60) ?? "")}`).join("\n"),
      );
    }
    return { name: names[0], src: null };
  }, [s, cameraName]);
  return { available: !!component, cameraName, controlName: name, src };
}
