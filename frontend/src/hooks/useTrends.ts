"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendData } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useTrends(days = 30, pollInterval = 60000) {
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/rates/trends?days=${days}&_t=${Date.now()}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Failed to fetch trends");

      const data: TrendData = await response.json();
      setTrends(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, pollInterval);
    return () => clearInterval(interval);
  }, [fetchTrends, pollInterval]);

  return { trends, loading, error, refresh: fetchTrends };
}
