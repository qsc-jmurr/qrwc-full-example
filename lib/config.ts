/**
 * THE ONE PLACE THAT KNOWS YOUR Q-SYS DESIGN.
 *
 * Each feature lists the component it needs. `names` are tried in order;
 * if none match, `type` (a regex on the component's Type) is used as a
 * fallback, so the app still finds e.g. "USB Bridge 1" in a new design.
 *
 * In Designer, every component listed here needs Code Access = External (or All).
 */
export type ComponentLookup = {
  label: string;
  names: readonly string[];
  type?: RegExp;
};

export const DESIGN = {
  gain: { label: "Main volume", names: ["MainGain"], type: /^gain$/i },
  delay: { label: "Delay", names: ["Main Delay", "MainDelay"], type: /delay/i },
  eq: { label: "Parametric EQ", names: ["MainEQ"], type: /equalizer_parametric|parametric/i },
  limiter: { label: "Limiter", names: ["MainLimiter"], type: /limiter/i },
  decoder: { label: "Video decoder", names: ["Decoder", "decoder"], type: /hdmi_switcher|decoder/i },
  cameraRouter: { label: "Camera router", names: ["Camera Router", "CameraRouter", "camRouter", "CamRouter"], type: /video_router/i },
  bridge: { label: "USB video bridge", names: ["USB Bridge", "USBBridge", "usbBridge", "VideoBridge"], type: /usb.*bridge|bridge/i },
} as const satisfies Record<string, ComponentLookup>;

export type FeatureKey = keyof typeof DESIGN;

// Router input n shows CAMERAS[n - 1]; stills are read from these components' jpeg controls.
export const CAMERAS = ["Cam-1", "Cam-2", "Cam-3"] as const;

/** Every component name the app might use — passed to QRWC's componentFilter. */
export const ALL_NAMES: ReadonlySet<string> = new Set<string>([...Object.values(DESIGN).flatMap((d) => d.names), ...CAMERAS]);

/**
 * Video decoder: which select index means "nothing" and, if the decoder
 * doesn't publish source names, the names to fall back to.
 */
export const VIDEO = {
  clearValue: 1,
  fallbackSources: [
    { value: 4, label: "Laptop Front" },
    { value: 5, label: "Laptop Rear" },
    { value: 6, label: "Room PC" },
    { value: 7, label: "Document Camera" },
    { value: 8, label: "External HDMI" },
    { value: 9, label: "Wireless Display" },
    { value: 10, label: "HDMI Splitter" },
  ],
};

/**
 * Connection defaults. Settings (the cog icon) override these per browser.
 * NEXT_PUBLIC_* values are baked into the browser bundle — fine for a demo,
 * but in production keep secrets (the API key) on a server.
 */
export const DEFAULTS = {
  coreHost: process.env.NEXT_PUBLIC_QSYS_HOST ?? "",
  apiKey: process.env.NEXT_PUBLIC_QSYS_API_KEY ?? "",
  pollingInterval: 100,
  discoveryMode: false,
  theme: "horizon" as const,
  weatherCity: "Brighton",
};

/** True if a component on the Core is one this app might use (for QRWC's componentFilter). */
export const usedByApp = (c: { Name: string; Type: string }) =>
  ALL_NAMES.has(c.Name) || Object.values(DESIGN).some((d) => d.type?.test(c.Type));
