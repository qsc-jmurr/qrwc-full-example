"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Qrwc, type IEngineStatus } from "@q-sys/qrwc";
import { usedByApp } from "@/lib/config";
import { useSettings } from "@/lib/settings";
import { useToast } from "@/lib/toast";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "offline";

type QrwcContextValue = {
  qrwc: Qrwc | null;
  status: ConnectionStatus;
  engine: IEngineStatus | null;
  /** Bump to force a fresh connection (Settings → Reconnect). */
  reconnect: () => void;
};

const QrwcContext = createContext<QrwcContextValue | null>(null);

/** Browsers only accept wss:// with a CA-signed certificate, so bare IPs get ws://. */
const toHost = (raw: string) => (/^wss?:\/\//i.test(raw.trim()) ? raw.trim() : `ws://${raw.trim()}`);

/**
 * ONE connection for the whole app, shared through React context.
 *
 * Best practices on show:
 *  - managed mode (host:) — QRWC owns the socket and reconnects with backoff
 *  - componentFilter — only fetch (and poll) the components the app uses
 *  - apiKey only when the Core has Access Control on
 *  - StrictMode-safe cleanup, and createQrwc's `undefined` handled
 *  - connection settings come from Settings, not hard-coded
 */
export function QrwcProvider({ children }: { children: ReactNode }) {
  const { settings, loaded } = useSettings();
  const notify = useToast();
  const [qrwc, setQrwc] = useState<Qrwc | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [engine, setEngine] = useState<IEngineStatus | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { coreHost, apiKey, pollingInterval, discoveryMode } = settings;

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    let instance: Qrwc | undefined;

    const connect = async () => {
      if (!coreHost) {
        setStatus("idle"); // nothing configured yet — Settings will prompt
        return;
      }
      setStatus("connecting");
      setQrwc(null);

      const q = await Qrwc.createQrwc({
        host: toHost(coreHost),
        apiKey: apiKey || undefined,
        pollingInterval,
        // Only fetch what we use, unless Explore needs everything.
        componentFilter: discoveryMode ? undefined : usedByApp,
        reconnect: { maxAttempts: 20, delay: 1000, backoffFactor: 1.5, maxDelay: 10000 },
        logger: { error: console.error, warn: console.warn, info: console.info },
      });

      if (cancelled) {
        q?.close();
        return;
      }
      if (!q) {
        setStatus("offline");
        notify("error", "Couldn't reach the Core — check Settings");
        return;
      }

      instance = q;
      q.on("disconnected", (reason) => {
        if (reason === "reconnection failed") {
          setStatus("offline");
          setQrwc(null);
          notify("error", "Connection lost — QRWC gave up retrying");
        } else {
          setStatus("reconnecting");
          notify("warn", "Connection lost — reconnecting…");
        }
      });
      q.on("reconnected", () => {
        setStatus("connected");
        notify("ok", "Reconnected");
      });
      q.on("engineStatus", (s) => setEngine({ ...s }));

      setEngine({ ...q.engineStatus });
      setQrwc(q);
      setStatus("connected");
      if (process.env.NODE_ENV === "development") {
        (window as unknown as { qrwc: Qrwc }).qrwc = q; // try Object.keys(qrwc.components) in DevTools
      }
    };

    connect();
    return () => {
      cancelled = true;
      instance?.close();
    };
  }, [loaded, coreHost, apiKey, pollingInterval, discoveryMode, attempt, notify]);

  return (
    <QrwcContext.Provider value={{ qrwc, status, engine, reconnect: () => setAttempt((n) => n + 1) }}>
      {children}
    </QrwcContext.Provider>
  );
}

export function useQrwc() {
  const ctx = useContext(QrwcContext);
  if (!ctx) throw new Error("useQrwc must be used inside <QrwcProvider>");
  return ctx;
}
