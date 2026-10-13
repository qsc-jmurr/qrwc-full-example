"use client";

/**
 * UI PRIMITIVES — know nothing about Q-SYS or QRWC.
 * They only use theme tokens (bg-surface, text-ink, accent…) and accept
 * `className` so a page can restyle them after the fact.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-slot="panel"
      className={cx("flex flex-col gap-4 rounded-panel border border-line bg-surface p-5", className)}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm tracking-wide text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "toggle";
  active?: boolean;
  size?: "sm" | "md";
};

export function Button({ variant = "ghost", active, size = "md", className, ...rest }: ButtonProps) {
  const base =
    "inline-flex select-none items-center justify-center gap-2 rounded-[calc(var(--radius)*0.6)] border font-medium transition active:translate-y-px disabled:pointer-events-none disabled:opacity-40";
  const sizes = { sm: "px-2.5 py-1 text-[11px]", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "border-transparent bg-accent text-accent-ink hover:brightness-110",
    ghost: "border-line bg-surface-2 text-ink hover:border-accent/60",
    danger: "border-transparent bg-danger text-white hover:brightness-110",
    toggle: active
      ? "border-transparent bg-accent text-accent-ink"
      : "border-line bg-surface-2 text-ink-muted hover:text-ink",
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...rest} />;
}

/** Bypass/Active style switch used by DSP blocks. */
export function BypassToggle({ bypassed, onToggle }: { bypassed: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={!bypassed}
      onClick={onToggle}
      className={cx(
        "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition",
        bypassed ? "border-danger/50 bg-danger/15 text-danger" : "border-accent/50 bg-accent/15 text-accent-2",
      )}
    >
      {bypassed ? "Bypassed" : "Active"}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-dashed border-line p-4 text-xs text-ink-muted">{children}</p>;
}

/** Press-and-hold button (zoom, nudge). Uses pointer events so mouse, touch and pen all work. */
export function HoldButton({
  onPress,
  onRelease,
  children,
  className,
}: {
  onPress: () => void;
  onRelease: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onPress();
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && onPress()}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && onRelease()}
      className={cx(
        "touch-none select-none rounded-[calc(var(--radius)*0.6)] border border-line bg-surface-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink active:bg-accent active:text-accent-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
