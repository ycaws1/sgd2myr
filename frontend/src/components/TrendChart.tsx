"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTrends } from "@/hooks/useTrends";
import { LineChart as ChartIcon } from "lucide-react";

const COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
];

interface ChartDataPoint {
  timestamp: string;
  [source: string]: string | number;
}

interface TrendChartProps {
  onRefresh?: (refreshFn: () => void) => void;
}

export function TrendChart({ onRefresh }: TrendChartProps) {
  const [period, setPeriod] = useState(1);
  const { trends, loading, error, refresh } = useTrends(period);

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

  // Create a stable mapping of source names to colors
  const sourceColors = useMemo(() => {
    const mapping: Record<string, string> = {};
    sources.forEach((source, idx) => {
      mapping[source] = COLORS[idx % COLORS.length];
    });
    return mapping;
  }, [sources]);

  useEffect(() => {
    if (sources.length > 0 && selectedSources.size === 0) {
      // // Exclude Google from default selection
      // const defaultSelected = sources.filter(s => s !== "Google");
      // if (defaultSelected.length > 0) {
      //   setSelectedSources(new Set(defaultSelected));
      // } else {
      setSelectedSources(new Set(sources));
      // }
    }
  }, [sources, selectedSources.size]);

  const chartData = useMemo(() => {
    if (!trends?.data) return [];
    const timeMap = new Map<string, ChartDataPoint>();
    for (const [source, points] of Object.entries(trends.data)) {
      for (const point of points) {
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

  const setTimePeriod = (days: number) => {
    setPeriod(days);
  };

  if (loading) {
    return (
      <section className="px-6 py-8">
        <div className="h-64 flex items-center justify-center text-gray-500 glass-card">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent animate-spin rounded-full" />
            <span className="text-sm font-medium">Analyzing trends...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-8">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-accent-primary opacity-70" />
            <h2 className="text-lg font-semibold text-white">Price History</h2>
          </div>

          {/* Period Selector - Mobile Optimized */}
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            {[
              { label: '1D', val: 1 },
              { label: '7D', val: 7 },
              { label: '14D', val: 14 }
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setTimePeriod(opt.val)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${period === opt.val
                  ? 'bg-accent-primary text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source toggles - Scrollable on mobile */}
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => {
            const isSelected = selectedSources.has(source);
            const color = sourceColors[source];
            return (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 border ${isSelected
                  ? 'text-white border-transparent'
                  : 'bg-white/5 border-white/10 text-gray-500'
                  }`}
                style={{
                  backgroundColor: isSelected ? color : 'transparent',
                  boxShadow: isSelected ? `0 4px 12px ${color}33` : 'none',
                }}
              >
                {source}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full bg-white/[0.02] border border-white/5 rounded-3xl p-4 backdrop-blur-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(t) => {
                const date = new Date(t);
                if (period === 1) {
                  // For 1 day, show HH:MM
                  return date.toLocaleTimeString("en-SG", { hour: '2-digit', minute: '2-digit', timeZone: "Asia/Singapore" });
                }
                // For longer periods, show date
                return date.toLocaleDateString("en-SG", { month: "short", day: "numeric", timeZone: "Asia/Singapore" });
              }}
              minTickGap={30}
              stroke="rgba(255,255,255,0.2)"
              tick={{ fontSize: 9, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke="rgba(255,255,255,0.2)"
              tick={{ fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(10, 10, 10, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                backdropFilter: "blur(12px)",
                padding: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
              }}
              itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
              labelStyle={{ color: '#888', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              labelFormatter={(t) => new Date(t).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' })}
              formatter={(value, name) => [
                (typeof value === 'number' ? value.toFixed(4) : value),
                name
              ]}
            />
            {sources
              .filter((s) => selectedSources.has(s))
              .map((source) => (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stroke={sourceColors[source]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: sourceColors[source] }}
                  connectNulls
                  animationDuration={1500}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
