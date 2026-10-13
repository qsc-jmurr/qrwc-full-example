import type { ReactNode } from "react";

/** Page title + one line of context + what a UCI would give you instead. */
export function PageHeader({ title, children, uci }: { title: string; children: ReactNode; uci?: string }) {
  return (
    <header className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">{children}</p>
      </div>
      {uci && (
        <p className="max-w-xs rounded-panel border border-dashed border-line px-4 py-2 text-[11px] text-ink-muted">
          <span className="font-semibold text-ink">In a UCI: </span>
          {uci}
        </p>
      )}
    </header>
  );
}
