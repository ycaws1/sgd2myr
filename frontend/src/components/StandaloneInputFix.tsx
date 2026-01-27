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

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const interactiveEl = target.closest('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

      if (interactiveEl && document.activeElement !== interactiveEl) {
        // iOS requires focus to be synchronous with user action to trigger keyboard
        interactiveEl.focus();
      }
    };

    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return null;
}
