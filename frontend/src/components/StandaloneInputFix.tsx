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
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isStandalone) return;

    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Force focus and ensure it's selected if it's an input
        target.focus();

        // For text inputs on iOS, sometimes we need to scroll it into view
        if (target instanceof HTMLInputElement &&
          (target.type === 'text' || target.type === 'number')) {
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    };

    // Use touchstart for faster response on iOS
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Don't prevent default as it might block the actual focus
        // but we can try to focus it immediately
        target.focus();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("click", handleFocus, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("click", handleFocus);
    };
  }, []);

  return null;
}
