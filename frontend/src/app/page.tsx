"use client";

import { useState } from "react";
import { useRates } from "@/hooks/useRates";
import { HeroRate } from "@/components/HeroRate";
import { AlertControls } from "@/components/AlertControls";
import { TrendChart } from "@/components/TrendChart";
import { RateCards } from "@/components/RateCards";
import { Converter } from "@/components/Converter";
import { RateHistoryTable } from "@/components/RateHistoryTable";
import { Wallet, ShieldCheck } from "lucide-react";

export default function Home() {
  const { rates, history, bestRate, loading, lastUpdated, refresh: refreshRates } = useRates();
  const [refreshTrends, setRefreshTrends] = useState<(() => void) | null>(null);

  const handleRefresh = () => {
    refreshRates();
    if (refreshTrends) refreshTrends();
  };

  return (
    <main className="min-h-screen max-w-lg mx-auto pb-20">
      {/* Mini Header */}
      <nav className="flex items-center justify-between px-6 py-4 fixed top-0 left-0 right-0 max-w-lg mx-auto z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="bg-accent-primary p-1 rounded-lg">
            <Wallet className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-sm tracking-tight">SGD2MYR</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full ring-1 ring-white/10">
          <ShieldCheck className="w-3 h-3 text-accent-primary" />
          <span className="text-[10px] font-bold text-gray-400">SECURE</span>
        </div>
      </nav>

      <HeroRate
        bestRate={bestRate}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={handleRefresh}
      />

      <div className="px-3">
        {/* Order: best rate, alert, price trend, compare source, calculator, execution log. */}

        <div className="glass-card mb-4 overflow-hidden">
          <AlertControls currentRate={bestRate?.rate || null} />
        </div>

        <div className="glass-card mb-4 overflow-hidden">
          <TrendChart onRefresh={setRefreshTrends} />
        </div>

        <div className="glass-card mb-4 overflow-hidden">
          <RateCards rates={rates} bestRate={bestRate} />
        </div>

        <div className="glass-card mb-4 overflow-hidden">
          <Converter bestRate={bestRate} rates={rates} />
        </div>

        <div className="glass-card mb-4 overflow-hidden">
          <RateHistoryTable history={history} />
        </div>
      </div>

      {/* Footer / Info */}
      <footer className="mt-12 text-center px-6">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest leading-relaxed">
          Proprietary Aggregation Engine<br />
          Data updated every 60 seconds
        </p>
      </footer>

      {/* iOS Home Indicator Spacer */}
      <div className="h-12" />
    </main>
  );
}
