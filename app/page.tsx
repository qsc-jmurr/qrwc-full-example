import Link from "next/link";
import { PageTransition } from "@/components/shell/PageTransition";
import { WeatherCard } from "@/components/widgets/Weather";
import { Clock } from "@/components/widgets/Clock";
import { RoomStatus } from "@/components/widgets/RoomStatus";
import { Icon, type IconName } from "@/components/ui/Icon";

const CARDS: { href: string; icon: IconName; title: string; body: string }[] = [
  { href: "/audio", icon: "audio", title: "Audio", body: "Draggable EQ curve, live limiter curve, delay." },
  { href: "/video", icon: "video", title: "Video", body: "Drag-and-drop routing from the Decoder's sources." },
  { href: "/cameras", icon: "camera", title: "Cameras", body: "Joystick PTZ and a live still from the bridge." },
  { href: "/explore", icon: "explore", title: "Explore", body: "Everything the Core exposes, discovered live." },
];

export default function Home() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="rise mb-10">
          <p className="font-mono text-sm text-ink-muted">
            <Clock withDate />
          </p>
          <h1 className="mt-2 text-4xl tracking-tight text-ink sm:text-5xl">
            Welcome to the <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">QRWC</span> showcase
          </h1>
          <p className="mt-3 max-w-2xl text-ink-muted">
            One Q-SYS Core, controlled from a web app built the way you&apos;d build it for real: reusable components, one
            connection, settings instead of hard-coded values, and things a UCI can&apos;t do.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="grid gap-4 sm:grid-cols-2">
            {CARDS.map((c, i) => (
              <Link
                key={c.href}
                href={c.href}
                transitionTypes={["nav-forward"]}
                style={{ "--i": i + 1 } as React.CSSProperties}
                className="rise group flex flex-col gap-3 rounded-panel border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-accent-2 transition group-hover:bg-accent group-hover:text-accent-ink">
                  <Icon name={c.icon} />
                </span>
                <h2 className="text-lg text-ink">{c.title}</h2>
                <p className="text-sm text-ink-muted">{c.body}</p>
                <span className="mt-auto text-xs text-accent-2 transition group-hover:translate-x-1">Open →</span>
              </Link>
            ))}
          </div>
          <div className="space-y-6">
            <WeatherCard className="rise [--i:2]" />
            <RoomStatus className="rise [--i:3]" />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
