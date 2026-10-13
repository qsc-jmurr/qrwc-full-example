"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ScrollList } from "./ScrollList";
import { cx } from "./primitives";

export type RouteSource = { id: string; label: string; detail?: string };
export type RouteDestination = { id: string; label: string; sourceId: string | null };

type Props = {
  sources: RouteSource[];
  destinations: RouteDestination[];
  onRoute: (destinationId: string, sourceId: string | null) => void;
  /** Restyle individual parts from the outside without forking the component. */
  classNames?: Partial<Record<"root" | "source" | "destination", string>>;
};

/**
 * Drag a source onto a display. Works with mouse, touch and keyboard
 * (@dnd-kit, unlike react-dnd's HTML5 backend, supports touch panels),
 * and you can also tap a source then tap a display.
 * Pure UI: knows nothing about decoders or select indexes.
 */
export function RoutingBoard({ sources, destinations, onRoute, classNames = {} }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [dragging, setDragging] = useState<RouteSource | null>(null);
  const [armed, setArmed] = useState<string | null>(null);

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (e.over) onRoute(String(e.over.id), String(e.active.id));
  };

  const usedOn = (sourceId: string) =>
    destinations.filter((d) => d.sourceId === sourceId).map((d) => d.label);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDragging(sources.find((s) => s.id === e.active.id) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className={cx("grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]", classNames.root)}>
        <div>
          <h3 className="mb-3 text-xs uppercase tracking-wide text-ink-muted">Sources</h3>
          <ScrollList
            items={sources}
            getKey={(s) => s.id}
            getText={(s) => `${s.label} ${s.detail ?? ""}`}
            placeholder="Search sources…"
            renderItem={(s) => (
              <SourceCard
                source={s}
                armed={armed === s.id}
                onTap={() => setArmed((a) => (a === s.id ? null : s.id))}
                usedOn={usedOn(s.id)}
                className={classNames.source}
              />
            )}
          />
        </div>

        <div>
          <h3 className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
            Displays {armed && <span className="normal-case text-accent-2">· tap a display to route</span>}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {destinations.map((d) => (
              <DisplayTarget
                key={d.id}
                destination={d}
                source={sources.find((s) => s.id === d.sourceId) ?? null}
                armed={!!armed}
                onTap={() => {
                  if (!armed) return;
                  onRoute(d.id, armed);
                  setArmed(null);
                }}
                onClear={() => onRoute(d.id, null)}
                className={classNames.destination}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="rotate-2 rounded-panel border border-accent bg-surface-2 px-4 py-3 shadow-2xl">
            <div className="text-sm text-ink">{dragging.label}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SourceCard({
  source,
  armed,
  usedOn,
  onTap,
  className,
}: {
  source: RouteSource;
  armed: boolean;
  usedOn: string[];
  onTap: () => void;
  className?: string;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: source.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onTap}
      className={cx(
        "flex cursor-grab touch-none items-center justify-between gap-3 rounded-panel border bg-surface-2 px-4 py-3 transition active:cursor-grabbing h-16",
        armed ? "border-accent ring-2 ring-accent/30" : "border-line hover:border-accent/50",
        isDragging && "opacity-40",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm text-ink">{source.label}</div>
      </div>
      <div className="flex shrink-0 gap-1">
        {usedOn.map((l) => (
          <span key={l} className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] text-accent-2">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function DisplayTarget({
  destination,
  source,
  armed,
  onTap,
  onClear,
  className,
}: {
  destination: RouteDestination;
  source: RouteSource | null;
  armed: boolean;
  onTap: () => void;
  onClear: () => void;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: destination.id });
  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      className={cx(
        "relative flex aspect-video flex-col justify-between rounded-panel border-2 bg-bg p-4 transition",
        isOver ? "scale-[1.02] border-accent" : armed ? "border-dashed border-accent/60" : "border-line",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-ink-muted">
          <span className={cx("h-2 w-2 rounded-full", source ? "bg-ok" : "bg-ink-muted/40")} />
          {destination.label}
        </span>
        {source && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="rounded px-2 py-0.5 text-[11px] text-ink-muted hover:bg-danger/15 hover:text-danger"
          >
            Clear
          </button>
        )}
      </div>
      <div className="text-center">
        {source ? (
          <>
            <div className="font-display text-xl text-ink">{source.label}</div>
          </>
        ) : (
          <div className="text-sm italic text-ink-muted">{isOver ? "Release to route" : "Drop a source here"}</div>
        )}
      </div>
      <div />
    </div>
  );
}
