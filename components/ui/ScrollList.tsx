"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cx } from "./primitives";

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  /** Text the search box matches against. */
  getText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  placeholder?: string;
  maxHeight?: number | string;
  empty?: ReactNode;
  className?: string;
};

/**
 * A searchable, momentum-scrolling list. UCIs have no real scrolling list —
 * this one handles 5 items or 500 the same way. Pure UI, generic over T.
 */
export function ScrollList<T>({
  items,
  getKey,
  getText,
  renderItem,
  placeholder = "Search…",
  maxHeight = 360,
  empty = "Nothing matches.",
  className,
}: Props<T>) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((i) => getText(i).toLowerCase().includes(needle)) : items;
  }, [items, q, getText]);

  return (
    <div data-slot="scroll-list" className={cx("flex min-h-0 flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-[calc(var(--radius)*0.6)] border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-accent"
        />
      </div>
      <ul
        className="-mx-1 space-y-1.5 overflow-y-auto overscroll-contain px-1 py-1 [mask-image:linear-gradient(to_bottom,transparent,black_6px,black_calc(100%-6px),transparent)]"
        style={{ maxHeight }}
      >
        {filtered.length === 0 ? (
          <li className="py-6 text-center text-xs text-ink-muted">{empty}</li>
        ) : (
          filtered.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)
        )}
      </ul>
    </div>
  );
}
