"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowDownUp, Info } from "lucide-react";
import { Rate } from "@/types";

interface ConverterProps {
  bestRate: Rate | null;
  rates: Rate[];
}

export function Converter({ bestRate, rates }: ConverterProps) {
  const [sgdAmount, setSgdAmount] = useState<string>("100");
  const [selectedSource, setSelectedSource] = useState<string>("");

  useEffect(() => {
    if (bestRate && !selectedSource) {
      setSelectedSource(bestRate.source_name);
    }
  }, [bestRate, selectedSource]);

  const currentRate = useMemo(() => {
    if (selectedSource) {
      return rates.find(r => r.source_name === selectedSource) || bestRate;
    }
    return bestRate;
  }, [rates, bestRate, selectedSource]);

  const myrAmount = useMemo(() => {
    if (!currentRate || !sgdAmount) return null;
    const amount = parseFloat(sgdAmount);
    if (isNaN(amount)) return null;
    return (amount * currentRate.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [currentRate, sgdAmount]);

  return (
    <section className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Currency Converter</h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-accent-primary transition-colors cursor-pointer"
            disabled={!rates.length}
          >
            {rates.map(r => (
              <option key={r.source_name} value={r.source_name} className="bg-[#121212]">
                {r.source_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {/* SGD Input */}
        <div className="relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold pointer-events-none transition-colors group-focus-within:text-accent-primary">
            SGD
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={sgdAmount}
            onChange={(e) => setSgdAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-2xl font-bold text-white focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all tabular-nums"
            placeholder="0.00"
          />
        </div>

        {/* Swap Icon Divider */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-accent-primary p-2 rounded-full shadow-lg shadow-accent-primary/20">
            <ArrowDownUp className="w-5 h-5 text-black" />
          </div>
        </div>

        {/* MYR Output (Visual only, styled like input) */}
        <div className="relative">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
            MYR
          </div>
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-2xl font-bold text-accent-primary tabular-nums overflow-hidden">
            {myrAmount || "0.00"}
          </div>
        </div>
      </div>

      {currentRate && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Calculated using <span className="text-white font-medium">{currentRate.source_name}</span> live rate of <span className="text-white font-medium font-mono">{currentRate.rate.toFixed(4)}</span>. Rates are indicative and may vary at point of transaction.
          </p>
        </div>
      )}
    </section>
  );
}
