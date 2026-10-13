import { PageTransition } from "@/components/shell/PageTransition";
import { PageHeader } from "@/components/shell/PageHeader";
import { DesignCheck, DesignExplorer } from "@/components/qsys/DesignExplorer";

export default function ExplorePage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader title="Explore" uci="You build every screen by hand and hope the names match.">
          Everything the Core exposes to QRWC, discovered at runtime, with working controls and generated TypeScript types.
        </PageHeader>
        <DesignCheck />
        <DesignExplorer />
      </div>
    </PageTransition>
  );
}
