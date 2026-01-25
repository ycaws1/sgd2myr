"use client";

import { useRates } from "@/hooks/useRates";
import { HeroRate } from "@/components/HeroRate";
import { AlertControls } from "@/components/AlertControls";
import { TrendChart } from "@/components/TrendChart";
import { RateCards } from "@/components/RateCards";
import { Converter } from "@/components/Converter";

export default function Home() {
  const { rates, bestRate, loading, lastUpdated, refresh } = useRates();

  return (
    <main className="min-h-screen max-w-lg mx-auto">
      <HeroRate
        bestRate={bestRate}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
      />

      <AlertControls currentRate={bestRate?.rate || null} />

      <TrendChart />

      <RateCards rates={rates} bestRate={bestRate} />

      <Converter bestRate={bestRate} />

      {/* Bottom padding for mobile */}
      <div className="h-8" />
    </main>
  );
}
