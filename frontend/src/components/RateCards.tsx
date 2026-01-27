"use client";

import { Rate } from "@/types";
import { Award, Layers } from "lucide-react";

interface RateCardsProps {
  rates: Rate[];
  bestRate: Rate | null;
}

export function RateCards({ rates, bestRate }: RateCardsProps) {
  if (rates.length === 0) {
    return (
      <section className="px-6 py-6 border-t border-white/5">
        <div className="text-gray-500 text-center py-8 glass-card">No rates available</div>
      </section>
    );
  }

  return (
    <section className="px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Layers className="w-5 h-5 text-accent-primary opacity-70" />
        <h2 className="text-lg font-semibold text-white">Compare Sources</h2>
      </div>

      <div className="grid gap-3">
        {rates.map((rate) => {
          const isBest = bestRate && rate.source_name === bestRate.source_name;

          return (
            <div
              key={rate.source_name}
              className={`group flex items-center justify-between p-4 transition-all duration-300 ${isBest
                  ? "bg-accent-primary/10 border border-accent-primary/30 ring-1 ring-accent-primary/20 scale-[1.02] shadow-xl shadow-accent-primary/5 rounded-2xl"
                  : "bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] rounded-2xl"
                }`}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${isBest ? 'bg-accent-primary text-black' : 'bg-white/5 text-gray-500'
                    }`}>
                    {rate.source_name.substring(0, 2).toUpperCase()}
                  </div>
                  {isBest && (
                    <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black p-0.5 rounded-full ring-2 ring-black">
                      <Award className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-semibold text-white group-hover:text-accent-primary transition-colors">
                    {rate.source_name}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                    Verified Source
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-xl font-bold font-mono tracking-tight ${isBest ? 'text-accent-primary' : 'text-gray-300'}`}>
                  {rate.rate.toFixed(4)}
                </div>
                <div className="text-[10px] text-gray-500">MYR</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
