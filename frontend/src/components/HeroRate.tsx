"use client";

import { TrendingUp, RefreshCw } from "lucide-react";
import { Rate } from "@/types";

interface HeroRateProps {
  bestRate: Rate | null;
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

export function HeroRate({ bestRate, lastUpdated, loading, onRefresh }: HeroRateProps) {
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : "--:--:--";

  return (
    <section className="relative pt-16 pb-12 px-6 text-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-accent-primary/20 blur-[120px] -z-10 rounded-full" />

      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-accent-primary/10 border border-accent-primary/20 rounded-full text-accent-primary text-[10px] font-bold uppercase tracking-[0.2em]">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Real-time Market Rate</span>
        </div>
        <h1 className="text-sm font-medium text-gray-400 tracking-[0.3em] uppercase">
          SGD TO MYR
        </h1>
      </div>

      <div className={`relative inline-block transition-all duration-700 ${loading ? 'opacity-50 scale-95 blur-sm' : 'opacity-100 scale-100'}`}>
        <div className="text-8xl font-bold mb-3 tracking-tighter tabular-nums text-white">
          {bestRate ? bestRate.rate.toFixed(4) : "0.0000"}
        </div>
        {bestRate && (
          <div className="flex items-center justify-center gap-2">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-gray-600" />
            <div className="text-sm text-gray-400 font-medium whitespace-nowrap">
              via <span className="text-accent-primary font-semibold">{bestRate.source_name}</span>
            </div>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-gray-600" />
          </div>
        )}
      </div>

      <div className="mt-12 flex items-center justify-center gap-4">
        <div className="text-xs text-gray-500 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-xl">
          <span className="opacity-60">Updated:</span> <span className="text-gray-200 ml-1 font-mono">{formattedTime}</span>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-3.5 glass-card hover:bg-white/10 active:scale-90 transition-all group disabled:opacity-50"
          aria-label="Refresh rates"
        >
          <RefreshCw className={`w-5 h-5 text-accent-primary ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
        </button>
      </div>
    </section>
  );
}
