"use client";

import { useState, useEffect } from "react";
import { Rate } from "@/types";
import { TrendingUp, RefreshCw } from "lucide-react";

interface HeroRateProps {
  bestRate: Rate | null;
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

function formatTimeAgo(date: Date, now: number): string {
  const seconds = Math.floor((now - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function HeroRate({ bestRate, lastUpdated, loading, onRefresh }: HeroRateProps) {
  const [now, setNow] = useState(Date.now());

  // Update the relative time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000); // Check every 10s for better responsiveness
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent-green" />
          <span className="text-sm text-gray-400 uppercase tracking-wide">Best Rate</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-full hover:bg-dark-card transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {bestRate ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight">
              {bestRate.rate.toFixed(4)}
            </span>
            <span className="text-2xl text-gray-400">MYR</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <span>1 SGD via {bestRate.source_name}</span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span>{formatTimeAgo(lastUpdated, now)}</span>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="text-3xl text-gray-500">Loading...</div>
      )}
    </section>
  );
}
