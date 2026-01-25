"use client";

import { useState, useEffect, useCallback } from "react";
import { Rate } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useRates(pollInterval = 60000) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [bestRate, setBestRate] = useState<Rate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/rates/latest`);
      if (!response.ok) throw new Error("Failed to fetch rates");

      const data: Rate[] = await response.json();
      setRates(data);

      if (data.length > 0) {
        setBestRate(data[0]); // Already sorted by rate DESC from API
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

  return { rates, bestRate, loading, error, lastUpdated, refresh: fetchRates };
}
