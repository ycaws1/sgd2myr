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

      // Check if it's an input-like element
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA';

      if (isInput) {
        // Only focus if not already focused to avoid keyboard flickering
        if (document.activeElement !== target) {
          (target as HTMLElement).focus();
        }
      }
    };

    // Use touchstart as it's more reliable for focus in iOS Standalone
    // but we use a small check to avoid interfering with natural behavior
    document.addEventListener("touchstart", handleFocus, { passive: true });
    // Keep click for fallback
    document.addEventListener("click", handleFocus, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleFocus);
      document.removeEventListener("click", handleFocus);
    };
  }, []);

  return null;
}
