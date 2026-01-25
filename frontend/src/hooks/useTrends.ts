"use client";

import { useState, useEffect } from "react";
import { TrendData } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useTrends(days = 30) {
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await fetch(`${API_BASE}/rates/trends?days=${days}`);
        if (!response.ok) throw new Error("Failed to fetch trends");

        const data: TrendData = await response.json();
        setTrends(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [days]);

  return { trends, loading, error };
}
