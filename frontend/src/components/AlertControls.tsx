"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Activity } from "lucide-react";

interface AlertControlsProps {
  currentRate: number | null;
}

export function AlertControls({ currentRate }: AlertControlsProps) {
  const [threshold, setThreshold] = useState<string>("");
  const [thresholdType, setThresholdType] = useState<"above" | "below">("above");
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [volatilityEnabled, setVolatilityEnabled] = useState(false);

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

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("alertSettings", JSON.stringify({
      threshold,
      thresholdType,
      thresholdEnabled,
      volatilityEnabled,
    }));
  }, [threshold, thresholdType, thresholdEnabled, volatilityEnabled]);

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Alerts</h2>

      {/* Threshold Alert */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setThresholdEnabled(!thresholdEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            thresholdEnabled ? "bg-accent-green/20 text-accent-green" : "bg-dark-card text-gray-500"
          }`}
        >
          {thresholdEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-gray-400">Notify when</span>
          <select
            value={thresholdType}
            onChange={(e) => setThresholdType(e.target.value as "above" | "below")}
            className="bg-dark-card text-white text-sm px-2 py-1 rounded border border-dark-border"
          >
            <option value="above">≥</option>
            <option value="below">≤</option>
          </select>
          <input
            type="number"
            step="0.0001"
            placeholder={currentRate?.toFixed(4) || "3.4500"}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-24 bg-dark-card text-white text-sm px-3 py-1 rounded border border-dark-border focus:border-accent-green focus:outline-none"
          />
        </div>
      </div>

      {/* Volatility Alert */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setVolatilityEnabled(!volatilityEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            volatilityEnabled ? "bg-accent-green/20 text-accent-green" : "bg-dark-card text-gray-500"
          }`}
        >
          <Activity className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-400">Volatility alerts (sudden changes)</span>
      </div>
    </section>
  );
}
