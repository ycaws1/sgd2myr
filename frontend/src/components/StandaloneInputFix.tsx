"use client";

import { useEffect } from "react";

/**
 * iOS PWA standalone mode bug: single taps on input/select/textarea
 * don't trigger focus reliably. This component adds listeners
 * that explicitly call .focus() when an input element is tapped.
 */
export function StandaloneInputFix() {
  useEffect(() => {
    // Only apply in standalone (Add to Home Screen) mode
    const isStandalone =
      (window.navigator as any).standalone ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Temporarily disabled programmatic focus to test if native behavior is better with updated CSS
    // as programmatic focus can sometimes focus the element (showing cursor) but fail to trigger the keyboard.
    return;
  }, []);

  return null;
}
