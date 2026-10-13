import { PageTransition } from "@/components/shell/PageTransition";
import { PageHeader } from "@/components/shell/PageHeader";
import { VideoRouter } from "@/components/qsys/VideoRouter";

export default function VideoPage() {
  return (
    <PageTransition>
      <div className="rise mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader title="Video" uci="A button per source, per display.">
          Drag a source onto a display, or tap a source then a display. Displays and source names come from the Decoder.
        </PageHeader>
        <VideoRouter />
      </div>
    </PageTransition>
  );
}
