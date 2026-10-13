import { ViewTransition, type ReactNode } from "react";

/**
 * Wrap each page's content: tab navigations slide in the direction of travel.
 * (React's <ViewTransition> + the browser View Transitions API; CSS in globals.css.)
 * Browsers without support simply don't animate.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
