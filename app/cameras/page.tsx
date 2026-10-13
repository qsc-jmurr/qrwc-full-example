import { PageTransition } from "@/components/shell/PageTransition";
import { PageHeader } from "@/components/shell/PageHeader";
import { CameraFeed, CameraPtz, CameraSelect } from "@/components/qsys/Cameras";

export default function CamerasPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader title="Cameras" uci="Eight arrow buttons and no picture.">
          Pick a camera, steer it with the joystick, and watch the ~1 fps still from the video bridge.
        </PageHeader>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <CameraFeed className="rise [--i:1]" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <CameraSelect className="rise [--i:2]" />
            <CameraPtz className="rise [--i:3]" />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
