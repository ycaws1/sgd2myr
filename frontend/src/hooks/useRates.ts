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

      setRates(data);
      setHistory(historyData);

      if (data.length > 0) {
        // Find the maximum timestamp across all latest rates to determine the "freshest" data point
        const maxTimestamp = Math.max(...data.map(r => new Date(r.timestamp).getTime()));

        // Find the highest rate that is within 5 minutes of the freshest timestamp
        const fiveMinutesInMs = 5 * 60 * 1000;
        const freshBestRate = data.find(rate => {
          const rateTime = new Date(rate.timestamp).getTime();
          return (maxTimestamp - rateTime) <= fiveMinutesInMs;
        });

        setBestRate(freshBestRate || data[0]);
      }

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
