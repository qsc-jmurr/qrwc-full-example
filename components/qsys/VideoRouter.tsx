"use client";

import { useVideoRouting } from "@/features/video/useVideoRouting";
import { RoutingBoard } from "@/components/ui/RoutingBoard";
import { Panel } from "@/components/ui/primitives";
import { Missing } from "./Missing";

/** Drag-and-drop routing for the Decoder block. */
export function VideoRouter({ classNames }: { classNames?: Parameters<typeof RoutingBoard>[0]["classNames"] }) {
  const v = useVideoRouting();
  if (!v.available) return <Missing feature="decoder" title="Video routing" />;
  return (
    <Panel
      title="Video routing"
      subtitle={`${v.displays.length} output${v.displays.length === 1 ? "" : "s"} · ${v.sources.length} sources (names from ${v.origin}) · drag, or tap then tap`}
    >
      <RoutingBoard sources={v.sources} destinations={v.displays} onRoute={v.route} classNames={classNames} />
    </Panel>
  );
}
