"use client";

import { useState, useMemo } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Rate } from "@/types";

interface ConverterProps {
  bestRate: Rate | null;
}

export function Converter({ bestRate }: ConverterProps) {
  const [sgdAmount, setSgdAmount] = useState<string>("100");

  const myrAmount = useMemo(() => {
    if (!bestRate || !sgdAmount) return null;
    const amount = parseFloat(sgdAmount);
    if (isNaN(amount)) return null;
    return (amount * bestRate.rate).toFixed(2);
  }, [bestRate, sgdAmount]);

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Converter</h2>

      <div className="flex items-center gap-3">
        {/* SGD Input */}
        <div className="flex-1">
          <div className="flex items-center bg-dark-card rounded-lg border border-dark-border focus-within:border-accent-green">
            <span className="px-3 text-gray-500">SGD</span>
            <input
              type="number"
              value={sgdAmount}
              onChange={(e) => setSgdAmount(e.target.value)}
              className="flex-1 bg-transparent py-3 pr-3 text-white text-right font-mono focus:outline-none"
              placeholder="0"
            />
          </div>
        </div>

        {/* Arrow */}
        <ArrowRightLeft className="w-5 h-5 text-gray-500 flex-shrink-0" />

        {/* MYR Output */}
        <div className="flex-1">
          <div className="flex items-center bg-dark-card rounded-lg border border-dark-border">
            <span className="px-3 text-gray-500">MYR</span>
            <div className="flex-1 py-3 pr-3 text-right font-mono text-accent-green">
              {myrAmount || "—"}
            </div>
          </div>
        </div>
      </div>

      {bestRate && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Using {bestRate.source_name} rate: {bestRate.rate.toFixed(4)}
        </p>
      )}
    </section>
  );
}
