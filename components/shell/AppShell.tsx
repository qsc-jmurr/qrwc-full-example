"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQrwc, type ConnectionStatus } from "@/lib/qrwc/QrwcProvider";
import { useSettings } from "@/lib/settings";
import { VolumeDock } from "@/components/qsys/VolumeDock";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/components/ui/primitives";
import { Clock } from "@/components/widgets/Clock";
import { WeatherChip } from "@/components/widgets/Weather";
import { SettingsModal } from "./SettingsModal";
import { NAV, directionTo, isActive } from "./nav";

const STATUS: Record<ConnectionStatus, { dot: string; label: string }> = {
  idle: { dot: "bg-ink-muted", label: "Not configured" },
  connecting: { dot: "bg-warn animate-pulse", label: "Connecting" },
  connected: { dot: "bg-ok", label: "Connected" },
  reconnecting: { dot: "bg-warn animate-pulse", label: "Reconnecting" },
  offline: { dot: "bg-danger", label: "Offline" },
};

/**
 * The frame around every page: header (nav, clock, weather, status, settings),
 * a bottom tab bar on phones, and the volume dock. Rendered once in the layout,
 * so the dock and connection never remount when you change page.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status, engine } = useQrwc();
  const { settings, loaded } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const s = STATUS[status];
  const needsSetup = loaded && !settings.coreHost;

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        style={{ viewTransitionName: "site-header" }}
        className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Home" className="shrink-0">
            <Image src="/logo-horizon.png" alt="Q-SYS" width={140} height={35} className="logo h-7 w-auto" priority />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                transitionTypes={[directionTo(pathname, n.href)]}
                aria-current={isActive(pathname, n.href) ? "page" : undefined}
                className={cx(
                  "relative rounded-[calc(var(--radius)*0.5)] px-3 py-2 text-[12px] font-semibold uppercase tracking-wide transition",
                  isActive(pathname, n.href) ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {n.label}
                {isActive(pathname, n.href) && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-2" />
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <WeatherChip className="hidden sm:flex" />
            <Clock className="hidden font-mono text-sm text-ink sm:inline" />
            <span className="flex items-center gap-2 text-xs text-ink-muted" title={engine?.DesignName ?? s.label} aria-live="polite">
              <span className={cx("h-2.5 w-2.5 rounded-full", s.dot)} />
              <span className="hidden lg:inline">{s.label}</span>
            </span>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className={cx(
                "relative rounded-full p-2 text-ink-muted transition hover:rotate-45 hover:bg-surface-2 hover:text-ink",
                needsSetup && "text-warn",
              )}
            >
              <Icon name="settings" />
              {needsSetup && <span className="absolute right-1 top-1 h-2 w-2 animate-ping rounded-full bg-warn" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-44 md:pb-32">
        {needsSetup && (
          <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full rounded-panel border border-dashed border-warn/60 px-4 py-3 text-left text-sm text-ink"
            >
              No Core configured yet. <span className="text-accent-2 underline">Open Settings</span> to connect.
            </button>
          </div>
        )}
        {children}
      </main>

      {/* Volume dock: fixed above the phone tab bar, bottom of the screen on larger displays */}
      <div className="fixed inset-x-0 bottom-16 z-30 px-3 pb-3 md:bottom-0 md:px-6 md:pb-5">
        <VolumeDock className="mx-auto max-w-3xl" />
      </div>

      {/* Phone tab bar */}
      <nav
        style={{ viewTransitionName: "tab-bar" }}
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-line bg-bg/90 backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            transitionTypes={[directionTo(pathname, n.href)]}
            aria-current={isActive(pathname, n.href) ? "page" : undefined}
            className={cx(
              "flex flex-col items-center justify-center gap-1 text-[10px] font-medium",
              isActive(pathname, n.href) ? "text-accent-2" : "text-ink-muted",
            )}
          >
            <Icon name={n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
