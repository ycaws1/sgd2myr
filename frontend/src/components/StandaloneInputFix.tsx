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

    if (!isStandalone) return;

    console.log("iOS Standalone mode detected: Applying input fix");

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      // Look for input, select, textarea or their parent wrappers
      const interactiveEl = target.closest('input, select, textarea, button, [role="button"]') as HTMLElement;

      if (interactiveEl) {
        // If it's an input/textarea, focus it
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(interactiveEl.tagName)) {
          if (document.activeElement !== interactiveEl) {
            // Delay slightly to allow native behavior but ensure focus
            setTimeout(() => {
              interactiveEl.focus();
            }, 10);
          }
        }
      }
    };

    // Use passive: false to ensure we can capture but we're not blocking
    document.addEventListener("touchstart", handleTouchStart as any, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart as any);
    };
  }, []);

  return null;
}
