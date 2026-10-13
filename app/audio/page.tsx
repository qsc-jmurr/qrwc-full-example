import { PageTransition } from "@/components/shell/PageTransition";
import { PageHeader } from "@/components/shell/PageHeader";
import { EqPanel } from "@/components/qsys/EqPanel";
import { LimiterPanel } from "@/components/qsys/LimiterPanel";
import { DelayPanel } from "@/components/qsys/DelayPanel";

/** Pages only compose: Q-SYS logic lives in features/, looks in components/ui/. */
export default function AudioPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader title="Audio" uci="A grid of knobs with no picture of what they do.">
          Grab the EQ curve, drag the limiter&apos;s threshold, set the delay. Curves are drawn from the components&apos; live values.
        </PageHeader>
        <EqPanel className="rise [--i:1]" />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <LimiterPanel className="rise [--i:2]" />
          <DelayPanel className="rise [--i:3]" />
        </div>
      </div>
    </PageTransition>
  );
}
