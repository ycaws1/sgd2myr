"use client";

import { useEffect } from "react";

/**
 * iOS PWA standalone mode bug: single taps on input/select/textarea
 * don't trigger focus. This component adds a global touchend listener
 * that explicitly calls .focus() when an input element is tapped.
 */
export function StandaloneInputFix() {
  useEffect(() => {
    // Only apply in standalone (Add to Home Screen) mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isStandalone) return;

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      // If the tapped element is an input, select, or textarea, force focus
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Small delay to let the touch event finish processing
        setTimeout(() => {
          target.focus();
        }, 0);
      }
    };

    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return null;
}
