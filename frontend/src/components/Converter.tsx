"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Rate } from "@/types";

interface ConverterProps {
  bestRate: Rate | null;
}

export function Converter({ bestRate, rates }: { bestRate: Rate | null, rates: Rate[] }) {
  const [sgdAmount, setSgdAmount] = useState<string>("100");
  const [selectedSource, setSelectedSource] = useState<string>("");

  // Update selected source when bestRate loads initially
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
    return (amount * currentRate.rate).toFixed(2);
  }, [currentRate, sgdAmount]);

  // Force focus for iOS Standalone Mode
  const handleInputInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.currentTarget as HTMLInputElement;
    target.focus();
  };

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Converter</h2>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-400">Source:</label>
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          onClick={(e) => (e.currentTarget as HTMLSelectElement).focus()}
          className="bg-dark-card text-white text-sm px-3 py-1 rounded border border-dark-border focus:border-accent-green outline-none"
          disabled={!rates.length}
        >
          {rates.map(r => (
            <option key={r.source_name} value={r.source_name}>
              {r.source_name} ({r.rate.toFixed(4)})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* SGD Input */}
        <div className="flex-1">
          <div className="flex items-center bg-dark-card rounded-lg border border-dark-border focus-within:border-accent-green">
            <span className="px-3 text-gray-500">SGD</span>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={sgdAmount}
              onChange={(e) => setSgdAmount(e.target.value)}
              onClick={handleInputInteraction}
              onTouchStart={handleInputInteraction}
              className="flex-1 bg-transparent py-3 pr-3 text-white text-right font-mono focus:outline-none w-full"
              placeholder="0"
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center md:block">
          <ArrowRightLeft className="w-5 h-5 text-gray-500 flex-shrink-0 rotate-90 md:rotate-0" />
        </div>

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

      {currentRate && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Using {currentRate.source_name} rate: {currentRate.rate.toFixed(4)}
        </p>
      )}
    </section>
  );
}
