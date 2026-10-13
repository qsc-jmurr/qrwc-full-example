"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULTS } from "./config";

export type Theme = "horizon" | "daylight";

export type Settings = {
  coreHost: string;
  apiKey: string;
  pollingInterval: number;
  /** Fetch every scriptable component (for Explore) instead of only the ones the app uses. */
  discoveryMode: boolean;
  theme: Theme;
  weatherCity: string;
};

const KEY = "qrwc-full-example:settings";

type SettingsContextValue = {
  settings: Settings;
  /** False until saved settings have been read (avoids connecting to the wrong Core first). */
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function read(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
    const fromUrl = new URLSearchParams(window.location.search).get("core");
    return { ...DEFAULTS, ...saved, ...(fromUrl ? { coreHost: fromUrl } : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Per-browser settings: connection, theme, weather location.
 * Priority: ?core= in the URL → saved settings → .env.local defaults.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      setSettings(read());
      setLoaded(true);
    };
    load();
  }, []);

  // Apply the theme by swapping CSS variables on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep in memory */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setSettings({ ...DEFAULTS });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, update, reset }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

/** Runs before first paint so the saved theme doesn't flash. */
export const themeBootScript = `try{var s=JSON.parse(localStorage.getItem("${KEY}")||"{}");if(s.theme)document.documentElement.dataset.theme=s.theme}catch(e){}`;
