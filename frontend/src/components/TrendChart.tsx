"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTrends } from "@/hooks/useTrends";

const COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // purple
];

interface ChartDataPoint {
  timestamp: string;
  [source: string]: string | number;
}

interface TrendChartProps {
  onRefresh?: (refreshFn: () => void) => void;
}

export function TrendChart({ onRefresh }: TrendChartProps) {
  const { trends, loading, error, refresh } = useTrends(30);

  useEffect(() => {
    if (onRefresh && refresh) {
      onRefresh(() => refresh);
    }
  }, [onRefresh, refresh]);

  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  const sources = useMemo(() => {
    if (!trends?.data) return [];
    return Object.keys(trends.data);
  }, [trends]);

  // Initialize selectedSources with all sources when data loads
  useEffect(() => {
    if (sources.length > 0 && selectedSources.size === 0) {
      setSelectedSources(new Set(sources));
    }
  }, [sources, selectedSources.size]);

  const chartData = useMemo(() => {
    if (!trends?.data) return [];

    const timeMap = new Map<string, ChartDataPoint>();

    for (const [source, points] of Object.entries(trends.data)) {
      for (const point of points) {
        // Round to nearest minute to align data points from the same scraping run
        const date = new Date(point.timestamp);
        date.setSeconds(0, 0);
        const timeKey = date.toISOString();

        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { timestamp: timeKey });
        }
        timeMap.get(timeKey)![source] = point.rate;
      }
    }

    return Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [trends]);

  const toggleSource = (source: string) => {
    const newSelected = new Set(selectedSources);
    if (newSelected.has(source)) {
      newSelected.delete(source);
    } else {
      newSelected.add(source);
    }
    setSelectedSources(newSelected);
  };

  if (loading) {
    return (
      <section className="px-4 py-4 border-t border-dark-border">
        <div className="h-48 flex items-center justify-center text-gray-500">
          Loading chart...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="px-4 py-4 border-t border-dark-border">
        <div className="h-48 flex items-center justify-center text-red-400">
          Failed to load trends
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">30-Day Trend</h2>

      {/* Source toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sources.map((source, idx) => (
          <button
            key={source}
            onClick={() => toggleSource(source)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedSources.has(source)
              ? "text-white"
              : "bg-dark-card text-gray-500"
              }`}
            style={{
              backgroundColor: selectedSources.has(source)
                ? COLORS[idx % COLORS.length] + "33"
                : undefined,
              borderColor: COLORS[idx % COLORS.length],
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            {source}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(t) => new Date(t).toLocaleDateString("en-SG", { month: "short", day: "numeric", timeZone: "Asia/Singapore" })}
              stroke="#525252"
              tick={{ fontSize: 10 }}
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke="#525252"
              tick={{ fontSize: 10 }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#141414",
                border: "1px solid #262626",
                borderRadius: 8,
              }}
              labelFormatter={(t) => new Date(t).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(4) : value,
                name
              ]}
            />
            {sources
              .filter((s) => selectedSources.has(s))
              .map((source, idx) => (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
