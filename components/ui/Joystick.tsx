"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./primitives";

type Props = {
  /** Normalised -1..1, y positive = up. Called only when the position changes. */
  onMove: (x: number, y: number) => void;
  size?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * Virtual joystick. Pointer events (mouse, touch, pen), springs back to
 * centre, and works from the keyboard with the arrow keys.
 * Pure UI — it reports a vector; what that vector does is someone else's job.
 */
export function Joystick({ onMove, size = 184, disabled, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const active = useRef(false);
  const keys = useRef(new Set<string>());
  const [dragging, setDragging] = useState(false);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);
  const limit = size / 2 - 32;

  const emit = (px: number, py: number) => {
    setPos({ x: px, y: py });
    onMoveRef.current(px / limit, -py / limit);
  };

  const fromEvent = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > limit) {
      dx = (dx / m) * limit;
      dy = (dy / m) * limit;
    }
    emit(dx, dy);
  };

  const release = () => {
    active.current = false;
    setDragging(false);
    emit(0, 0);
  };

  // Safety: if the component unmounts mid-move, tell the owner to stop.
  useEffect(() => () => onMoveRef.current(0, 0), []);

  const keyVector = () => {
    const k = keys.current;
    const x = (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
    const y = (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
    const m = Math.hypot(x, y) || 1;
    emit((x / m) * limit * 0.7, (y / m) * limit * 0.7);
  };

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Pan and tilt joystick. Use the arrow keys."
      tabIndex={disabled ? -1 : 0}
      className={cx(
        "relative touch-none select-none rounded-full border border-line bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      style={{ width: size, height: size }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        active.current = true;
        setDragging(true);
        fromEvent(e);
      }}
      onPointerMove={(e) => active.current && fromEvent(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onBlur={() => {
        keys.current.clear();
        if (pos.x || pos.y) release();
      }}
      onKeyDown={(e) => {
        if (!e.key.startsWith("Arrow") || e.repeat) return;
        e.preventDefault();
        keys.current.add(e.key);
        keyVector();
      }}
      onKeyUp={(e) => {
        if (!e.key.startsWith("Arrow")) return;
        keys.current.delete(e.key);
        keyVector();
      }}
    >
      {/* crosshair */}
      <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-line" />
      <div className="pointer-events-none absolute inset-y-6 left-1/2 w-px bg-line" />
      <div
        className={cx(
          "pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 rounded-full bg-accent shadow-lg ring-4 ring-accent/20",
          !dragging && "transition-transform duration-150 ease-out",
        )}
        style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
      />
    </div>
  );
}
