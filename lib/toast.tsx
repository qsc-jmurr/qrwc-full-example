"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type Toast = { id: number; tone: "info" | "ok" | "warn" | "error"; text: string };

const ToastContext = createContext<(tone: Toast["tone"], text: string) => void>(() => {});

/** Tiny toast system: notify("warn", "Connection lost"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dot = { info: "bg-accent-2", ok: "bg-ok", warn: "bg-warn", error: "bg-danger" };

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-surface-2/95 px-4 py-2 text-sm text-ink shadow-lg backdrop-blur"
          >
            <span className={`h-2 w-2 rounded-full ${dot[t.tone]}`} />
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
