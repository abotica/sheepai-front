"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to `window.matchMedia(query)`. SSR-safe: `false` until mounted.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Timeline / “touch UI” breakpoint aligned with Tailwind `md`. */
export function useIsMobileLayout(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * True when we should prefer tap over hover (coarse pointer or no hover).
 */
export function usePrefersTouchUi(): boolean {
  return useMediaQuery("(hover: none), (pointer: coarse)");
}
