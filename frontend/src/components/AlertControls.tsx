"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Activity } from "lucide-react";

interface AlertControlsProps {
  currentRate: number | null;
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AlertControls({ currentRate }: AlertControlsProps) {
  const [threshold, setThreshold] = useState<string>("");
  const [thresholdType, setThresholdType] = useState<"above" | "below">("above");
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [volatilityEnabled, setVolatilityEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("alertSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      setThreshold(settings.threshold || "");
      setThresholdType(settings.thresholdType || "above");
      setThresholdEnabled(settings.thresholdEnabled || false);
      setVolatilityEnabled(settings.volatilityEnabled || false);
    }
  }, []);

  // Check subscription status and sync with backend
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          registration.pushManager.getSubscription().then(async (sub) => {
            if (sub) {
              setIsSubscribed(true);
              // Sync Status from Backend
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/status?endpoint=${encodeURIComponent(sub.endpoint)}`);
                if (res.ok) {
                  const data = await res.json();
                  setThresholdEnabled(data.threshold_enabled);
                  setVolatilityEnabled(data.volatility_alert);
                  if (data.threshold) {
                    setThreshold(data.threshold.toString());
                    setThresholdType(data.threshold_type);
                  }
                }
              } catch (e) {
                console.error("Failed to sync alert status");
              }
            }
          });
        });
    }
  }, []);

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      // const response = await fetch('/api/vapid-key'); // REMOVED: using env var directly
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.error("No VAPID public key found");
        alert("Push notifications not configured (Missing VAPID Key)");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setIsSubscribed(true);
      return subscription;
    } catch (error) {
      console.error("Failed to subscribe", error);
      alert("Failed to enable push notifications");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    let subscription = null;
    if (!isSubscribed && (thresholdEnabled || volatilityEnabled)) {
      subscription = await subscribeToPush();
      if (!subscription) return; // specific error handling handled in subscribeToPush
    } else if (isSubscribed) {
      const registration = await navigator.serviceWorker.ready;
      subscription = await registration.pushManager.getSubscription();
    }

    if (!subscription) return;

    // Send to backend
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
          threshold: thresholdEnabled ? parseFloat(threshold) : null,
          threshold_type: thresholdType,
          volatility_alert: volatilityEnabled
        })
      });
    } catch (e) {
      console.error("Failed to save preferences to backend", e);
    }
  };

  const sendTestNotification = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      // Ensure service worker is registered and we have a push subscription
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Subscribe first
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setTestResult({ ok: false, message: "VAPID public key not configured" });
          return;
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        setIsSubscribed(true);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
        }),
      });

      if (res.ok) {
        setTestResult({ ok: true, message: "Test notification sent!" });
      } else {
        const data = await res.json().catch(() => ({}));
        setTestResult({ ok: false, message: data.detail || "Failed to send" });
      }
    } catch (error) {
      console.error("Test notification error:", error);
      setTestResult({ ok: false, message: String(error) });
    } finally {
      setTestLoading(false);
    }
  };

  // Save to localStorage AND Backend on change
  useEffect(() => {
    localStorage.setItem("alertSettings", JSON.stringify({
      threshold,
      thresholdType,
      thresholdEnabled,
      volatilityEnabled,
    }));

    // Debounce backend save
    const timeout = setTimeout(() => {
      if (thresholdEnabled || volatilityEnabled) {
        savePreferences();
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [threshold, thresholdType, thresholdEnabled, volatilityEnabled, isSubscribed]);

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Alerts</h2>

      {/* Threshold Alert */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setThresholdEnabled(!thresholdEnabled)}
          className={`p-2 rounded-lg transition-colors ${thresholdEnabled ? "bg-accent-green/20 text-accent-green" : "bg-dark-card text-gray-500"
            }`}
        >
          {thresholdEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-gray-400">Notify when</span>
          <select
            value={thresholdType}
            onChange={(e) => setThresholdType(e.target.value as "above" | "below")}
            onClick={(e) => (e.currentTarget as HTMLSelectElement).focus()}
            className="bg-dark-card text-white text-sm px-2 py-1 rounded border border-dark-border"
          >
            <option value="above">≥</option>
            <option value="below">≤</option>
          </select>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            placeholder={currentRate?.toFixed(4) || "3.4500"}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            onClick={(e) => (e.currentTarget as HTMLInputElement).focus()}
            onTouchStart={(e) => (e.currentTarget as HTMLInputElement).focus()}
            className="w-24 bg-dark-card text-white text-sm px-3 py-1 rounded border border-dark-border focus:border-accent-green focus:outline-none"
          />
        </div>
      </div>

      {/* Volatility Alert */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setVolatilityEnabled(!volatilityEnabled)}
          className={`p-2 rounded-lg transition-colors ${volatilityEnabled ? "bg-accent-green/20 text-accent-green" : "bg-dark-card text-gray-500"
            }`}
        >
          <Activity className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-400">Volatility alerts (sudden changes)</span>
      </div>

      {/* Test Notification */}
      <div className="mt-4">
        <button
          onClick={sendTestNotification}
          disabled={testLoading}
          className="w-full text-sm py-2 px-4 rounded-lg border border-dark-border bg-dark-card text-gray-400 hover:text-white hover:border-accent-green transition-colors disabled:opacity-50"
        >
          {testLoading ? "Sending..." : "Send Test Notification"}
        </button>
        {testResult && (
          <p className={`text-xs mt-1 text-center ${testResult.ok ? "text-accent-green" : "text-accent-red"}`}>
            {testResult.message}
          </p>
        )}
      </div>
    </section>
  );
}
