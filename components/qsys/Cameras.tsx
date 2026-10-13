"use client";

import { useCameraRouter } from "@/features/cameras/useCameraRouter";
import { usePtz } from "@/features/cameras/usePtz";
import { useCameraFeed } from "@/features/cameras/useCameraFeed";
import { Joystick } from "@/components/ui/Joystick";
import { ScrollList } from "@/components/ui/ScrollList";
import { HoldButton, Panel, cx } from "@/components/ui/primitives";
import { Missing } from "./Missing";

/** Camera selection: a searchable list of the router's inputs. */
export function CameraSelect({ className }: { className?: string }) {
  const r = useCameraRouter();
  if (!r.available) return <Missing feature="cameraRouter" title="Cameras" className={className} />;
  return (
    <Panel title="Cameras" subtitle={`${r.cameras.length} inputs discovered`} className={className}>
      <ScrollList
        items={r.cameras}
        getKey={(c) => String(c.id)}
        getText={(c) => c.label}
        placeholder="Find a camera…"
        maxHeight={320}
        renderItem={(c) => (
          <button
            onClick={() => r.select(c.id)}
            className={cx(
              "flex w-full items-center justify-between rounded-panel border px-4 py-3 text-left text-sm transition h-16",
              r.active === c.id ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-ink hover:border-accent/50",
            )}
          >
            {c.label}
            {r.active === c.id && <span className="text-[10px] font-semibold uppercase tracking-wide">Live</span>}
          </button>
        )}
      />
    </Panel>
  );
}

export function CameraPtz({ className }: { className?: string }) {
  const ptz = usePtz();
  if (!ptz.available) return <Missing feature="bridge" title="Pan / tilt" className={className} />;
  return (
    <Panel title="Pan / tilt" subtitle="Drag, or focus and use the arrow keys" className={className}>
      <div className="flex flex-col items-center gap-5 py-2">
        <Joystick onMove={ptz.move} />
        {ptz.hasZoom && (
          <div className="flex gap-2">
            <HoldButton onPress={() => ptz.zoom("out", true)} onRelease={() => ptz.zoom("out", false)}>Zoom −</HoldButton>
            <HoldButton onPress={() => ptz.zoom("in", true)} onRelease={() => ptz.zoom("in", false)}>Zoom +</HoldButton>
          </div>
        )}
      </div>
    </Panel>
  );
}

/** The ~1 fps JPEG still from the video bridge. */
export function CameraFeed({ className }: { className?: string }) {
  const feed = useCameraFeed();
  const r = useCameraRouter();
  const live = r.cameras.find((c) => c.id === r.active);
  return (
    <Panel
      title={live ? live.label : "Camera feed"}
      subtitle={feed.controlName ? `Still from ${feed.controlName} · about 1 frame a second` : undefined}
      className={className}
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[calc(var(--radius)*0.7)] border border-line bg-bg">
        {feed.src ? (
          <img src={feed.src} alt="Camera still" className="h-full w-full object-cover" />
        ) : (
          <span className="px-6 text-center text-xs text-ink-muted">
            {!feed.available
              ? `Camera component “${feed.cameraName}” not found (check Code Access = External)`
              : feed.controlName
                ? `Waiting for a frame on “${feed.controlName}”…`
                : `No JPEG control found on “${feed.cameraName}”`}
          </span>
        )}
        {feed.src && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" /> Live
          </span>
        )}
      </div>
    </Panel>
  );
}
