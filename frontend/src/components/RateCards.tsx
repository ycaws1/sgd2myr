"use client";

import { Rate } from "@/types";

interface RateCardsProps {
  rates: Rate[];
  bestRate: Rate | null;
}

export function RateCards({ rates, bestRate }: RateCardsProps) {
  if (rates.length === 0) {
    return (
      <section className="px-4 py-4 border-t border-dark-border">
        <div className="text-gray-500 text-center py-4">No rates available</div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">All Rates</h2>

      <div className="space-y-2">
        {rates.map((rate) => {
          const isBest = bestRate && rate.source_name === bestRate.source_name;

          return (
            <div
              key={rate.source_name}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isBest
                  ? "bg-accent-green/10 border border-accent-green/30"
                  : "bg-dark-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isBest ? "bg-accent-green" : "bg-gray-600"
                  }`}
                />
                <span className="font-medium">{rate.source_name}</span>
                {isBest && (
                  <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded">
                    BEST
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`font-mono ${isBest ? "text-accent-green" : ""}`}>
                  {rate.rate.toFixed(4)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
