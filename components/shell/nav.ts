import type { IconName } from "@/components/ui/Icon";

export const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/audio", label: "Audio", icon: "audio" },
  { href: "/video", label: "Video", icon: "video" },
  { href: "/cameras", label: "Cameras", icon: "camera" },
  { href: "/explore", label: "Explore", icon: "explore" },
];

const indexOf = (path: string) => {
  const i = NAV.findIndex((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  return i < 0 ? 0 : i;
};

/** Slide left when moving right along the tabs, right when moving back. */
export const directionTo = (from: string, to: string) => (indexOf(to) >= indexOf(from) ? "nav-forward" : "nav-back");
export const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));
