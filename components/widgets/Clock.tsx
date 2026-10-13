"use client";

import { useNow } from "@/lib/useNow";
import { cx } from "@/components/ui/primitives";

/** Live clock. Renders nothing on the server, so there's no hydration mismatch. */
export function Clock({ className, withDate }: { className?: string; withDate?: boolean }) {
  const now = useNow();
  if (!now) return <span className={className} />;
  return (
    <span className={cx("tabular-nums", className)}>
      {withDate && <span className="mr-2 text-ink-muted">{now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>}
      {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
