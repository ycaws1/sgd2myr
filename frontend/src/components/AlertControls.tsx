"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Activity, Send, CheckCircle2, AlertCircle } from "lucide-react";

interface AlertControlsProps {
  currentRate: number | null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
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

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        registration.pushManager.getSubscription().then(async (sub) => {
          if (sub) {
            setIsSubscribed(true);
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

  const subscribeToPush = async (): Promise<PushSubscription | null> => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return null;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      setIsSubscribed(true);
      return subscription;
    } catch (error) {
      console.error("Failed to subscribe", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    let subscription = null;
    const registration = await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.getSubscription();

    if (!subscription && (thresholdEnabled || volatilityEnabled)) {
      subscription = await subscribeToPush();
    }

    if (!subscription) return;

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
      console.error("Failed to save preferences", e);
    }
  };

  const sendTestNotification = async () => {
    setTestLoading(true);
    setTestResult(null);

    if (Notification.permission !== "granted") {
      setTestResult({ ok: false, message: "Notifications not granted" });
      setTestLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await subscribeToPush();
      }
      if (!subscription) throw new Error("Could not get subscription");

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
        const err = await res.json().catch(() => ({ detail: "Failed to send" }));
        setTestResult({ ok: false, message: err.detail || "Failed to send" });
      }
    } catch (error: any) {
      setTestResult({ ok: false, message: error.message || "Error" });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("alertSettings", JSON.stringify({
      threshold, thresholdType, thresholdEnabled, volatilityEnabled,
    }));
    const timeout = setTimeout(() => {
      savePreferences();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [threshold, thresholdType, thresholdEnabled, volatilityEnabled, isSubscribed]);

  return (
    <section className="px-6 py-6 border-y border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-accent-primary" />
        <h2 className="font-semibold text-white">Smart Alerts</h2>
      </div>

      <div className="space-y-4">
        {/* Threshold Row */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${thresholdEnabled ? 'bg-accent-primary/5 border-accent-primary/20' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">Rate Threshold</span>
            <button
              onClick={() => setThresholdEnabled(!thresholdEnabled)}
              className={`relative w-11 h-6 transition-colors rounded-full focus:outline-none ${thresholdEnabled ? 'bg-accent-primary' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 transition-transform bg-white rounded-full ${thresholdEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className={`flex items-center gap-2 transition-opacity duration-300 ${thresholdEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <span className="text-xs text-gray-500 whitespace-nowrap">Notify when rate is</span>
            <select
              value={thresholdType}
              onChange={(e) => setThresholdType(e.target.value as "above" | "below")}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="above">Above or Equal</option>
              <option value="below">Below or Equal</option>
            </select>
            <input
              id="alertThreshold"
              name="alertThreshold"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              value={threshold}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setThreshold(val);
              }}
              placeholder={currentRate?.toFixed(4) || "3.4500"}
              className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-accent-primary font-mono text-center"
            />
          </div>
        </div>

        {/* Volatility Row */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${volatilityEnabled ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${volatilityEnabled ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-gray-500'}`}>
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-300">Volatility Detection</div>
                <div className="text-[10px] text-gray-500">Alert me of sudden market jumps</div>
              </div>
            </div>
            <button
              onClick={() => setVolatilityEnabled(!volatilityEnabled)}
              className={`relative w-11 h-6 transition-colors rounded-full focus:outline-none ${volatilityEnabled ? 'bg-amber-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 transition-transform bg-white rounded-full ${volatilityEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Test Block */}
        <div className="pt-2">
          <button
            onClick={sendTestNotification}
            disabled={testLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {testLoading ? (
              <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent animate-spin rounded-full" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Test Notifications</span>
              </>
            )}
          </button>
          {testResult && (
            <div className={`flex items-center justify-center gap-2 mt-3 text-xs ${testResult.ok ? "text-accent-primary" : "text-red-400"}`}>
              {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
