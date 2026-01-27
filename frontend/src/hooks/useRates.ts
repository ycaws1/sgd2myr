"use client";

import { useState, useEffect, useCallback } from "react";
import { Rate, SourceHistory } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useRates(pollInterval = 60000) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [history, setHistory] = useState<SourceHistory[]>([]);
  const [bestRate, setBestRate] = useState<Rate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/rates/latest?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`${API_BASE}/rates/history?_t=${Date.now()}`, { cache: "no-store" })
      ]);

      if (!latestRes.ok || !historyRes.ok) throw new Error("Failed to fetch rates");

      const data: Rate[] = await latestRes.json();
      const historyData: SourceHistory[] = await historyRes.json();

      if (data.length > 0) {
        // Find the maximum timestamp across all latest rates to determine the "freshest" data point
        const maxTimestamp = Math.max(...data.map(r => new Date(r.timestamp).getTime()));
        const fiveMinutesInMs = 5 * 60 * 1000;

        // Filter sources that are older than 5 minutes from the freshest update
        const filteredRates = data.filter(rate => {
          const rateTime = new Date(rate.timestamp).getTime();
          return (maxTimestamp - rateTime) <= fiveMinutesInMs;
        });

        setRates(filteredRates);
        setBestRate(filteredRates.length > 0 ? filteredRates[0] : data[0]);
      } else {
        setRates([]);
        setBestRate(null);
      }

      setHistory(historyData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, pollInterval);
    return () => clearInterval(interval);
  }, [fetchRates, pollInterval]);

  return { rates, history, bestRate, loading, error, lastUpdated, refresh: fetchRates };
}
