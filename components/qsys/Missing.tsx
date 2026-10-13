import Link from "next/link";
import { DESIGN, type FeatureKey } from "@/lib/config";
import { Empty, Panel } from "@/components/ui/primitives";

/** Shown when a feature's component isn't on the Core — degrade, don't crash. */
export function Missing({ feature, title, className }: { feature: FeatureKey; title: string; className?: string }) {
  return (
    <Panel title={title} className={className}>
      <Empty>
        Looking for <code className="font-mono text-ink">{DESIGN[feature].names.join(" or ")}</code>. Check the name in{" "}
        <code className="font-mono">lib/config.ts</code> and that its Code Access is External.{" "}
        <Link href="/explore" className="text-accent-2 underline">
          Explore
        </Link>{" "}
        shows what the Core is exposing.
      </Empty>
    </Panel>
  );
}
