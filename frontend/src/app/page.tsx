"use client";

import { useState } from "react";
import { useRates } from "@/hooks/useRates";
import { HeroRate } from "@/components/HeroRate";
import { AlertControls } from "@/components/AlertControls";
import { TrendChart } from "@/components/TrendChart";
import { RateCards } from "@/components/RateCards";
import { Converter } from "@/components/Converter";
import { RateHistoryTable } from "@/components/RateHistoryTable";

export default function Home() {
  const { rates, history, bestRate, loading, lastUpdated, refresh: refreshRates } = useRates();
  const [refreshTrends, setRefreshTrends] = useState<(() => void) | null>(null);

  const handleRefresh = () => {
    refreshRates();
    if (refreshTrends) refreshTrends();
  };

  return (
    <main className="min-h-screen max-w-lg mx-auto">
      <HeroRate
        bestRate={bestRate}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={handleRefresh}
      />

      <AlertControls currentRate={bestRate?.rate || null} />

      <TrendChart onRefresh={setRefreshTrends} />

      <RateHistoryTable history={history} />

      <RateCards rates={rates} bestRate={bestRate} />

      <Converter bestRate={bestRate} rates={rates} />


      {/* Bottom padding for mobile */}
      <div className="h-8" />
    </main>
  );
}
