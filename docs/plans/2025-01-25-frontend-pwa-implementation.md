# SGD to MYR Frontend PWA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first dark mode PWA for quick-glance SGD/MYR rate checking with alert management.

**Architecture:** Single-page Next.js app with 4 stacked sections (Hero, Alerts, Chart, Rates+Converter). Data fetched from FastAPI backend on port 8000. Push notifications via Web Push API.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, next-pwa, Recharts, Lucide React

---

### Task 1: Initialize Next.js Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/next.config.ts`

**Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

Select defaults when prompted.

**Step 2: Verify project structure**

```bash
ls frontend/src/app
```

Expected: `layout.tsx`, `page.tsx`, `globals.css`, etc.

**Step 3: Install additional dependencies**

```bash
cd frontend && npm install recharts lucide-react next-pwa
```

**Step 4: Run dev server to verify**

```bash
npm run dev
```

Expected: Server starts on localhost:3000

**Step 5: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: initialize Next.js frontend with Tailwind"
```

---

### Task 2: Configure Dark Mode and Global Styles

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/tailwind.config.ts`

**Step 1: Update Tailwind config for dark mode**

Replace `frontend/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0a0a0a",
          card: "#141414",
          border: "#262626",
        },
        accent: {
          green: "#22c55e",
          red: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 2: Update globals.css**

Replace `frontend/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #fafafa;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}

/* Hide scrollbar but allow scrolling */
::-webkit-scrollbar {
  display: none;
}

body {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

**Step 3: Update layout.tsx for dark mode**

Replace `frontend/src/app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGD to MYR Tracker",
  description: "Track SGD to MYR exchange rates from multiple sources",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Verify dark mode works**

```bash
cd frontend && npm run dev
```

Open localhost:3000 - should see dark background.

**Step 5: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: configure dark mode theme and global styles"
```

---

### Task 3: Create useRates Hook

**Files:**
- Create: `frontend/src/hooks/useRates.ts`
- Create: `frontend/src/types/index.ts`

**Step 1: Create types file**

Create `frontend/src/types/index.ts`:

```typescript
export interface Rate {
  source_name: string;
  rate: number;
  timestamp: string;
}

export interface TrendData {
  period_days: number;
  data: {
    [source: string]: Array<{
      timestamp: string;
      rate: number;
    }>;
  };
}

export interface ConversionResult {
  sgd_amount: number;
  myr_amount: number;
  rate: number;
  source: string;
  timestamp: string;
}
```

**Step 2: Create useRates hook**

Create `frontend/src/hooks/useRates.ts`:

```typescript
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
```

**Step 3: Verify TypeScript compiles**

```bash
cd frontend && npm run build
```

Expected: Build succeeds (may have unused variable warnings, that's ok)

**Step 4: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: add useRates hook for API polling"
```

---

### Task 4: Create HeroRate Component

**Files:**
- Create: `frontend/src/components/HeroRate.tsx`

**Step 1: Create HeroRate component**

Create `frontend/src/components/HeroRate.tsx`:

```typescript
"use client";

import { Rate } from "@/types";
import { TrendingUp, RefreshCw } from "lucide-react";

interface HeroRateProps {
  bestRate: Rate | null;
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function HeroRate({ bestRate, lastUpdated, loading, onRefresh }: HeroRateProps) {
  return (
    <section className="px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent-green" />
          <span className="text-sm text-gray-400 uppercase tracking-wide">Best Rate</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-full hover:bg-dark-card transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {bestRate ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight">
              {bestRate.rate.toFixed(4)}
            </span>
            <span className="text-2xl text-gray-400">MYR</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <span>1 SGD via {bestRate.source_name}</span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span>{formatTimeAgo(lastUpdated)}</span>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="text-3xl text-gray-500">Loading...</div>
      )}
    </section>
  );
}
```

**Step 2: Verify component compiles**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: add HeroRate component"
```

---

### Task 5: Create AlertControls Component

**Files:**
- Create: `frontend/src/components/AlertControls.tsx`

**Step 1: Create AlertControls component**

Create `frontend/src/components/AlertControls.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Activity } from "lucide-react";

interface AlertControlsProps {
  currentRate: number | null;
}

export function AlertControls({ currentRate }: AlertControlsProps) {
  const [threshold, setThreshold] = useState<string>("");
  const [thresholdType, setThresholdType] = useState<"above" | "below">("above");
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [volatilityEnabled, setVolatilityEnabled] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("alertSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      setThreshold(settings.threshold || "");
      setThresholdType(settings.thresholdType || "above");
      setThresholdEnabled(settings.thresholdEnabled || false);
      setVolatilityEnabled(settings.volatilityEnabled || false);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("alertSettings", JSON.stringify({
      threshold,
      thresholdType,
      thresholdEnabled,
      volatilityEnabled,
    }));
  }, [threshold, thresholdType, thresholdEnabled, volatilityEnabled]);

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Alerts</h2>

      {/* Threshold Alert */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setThresholdEnabled(!thresholdEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            thresholdEnabled ? "bg-accent-green/20 text-accent-green" : "bg-dark-card text-gray-500"
          }`}
        >
          {thresholdEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-gray-400">Notify when</span>
          <select
            value={thresholdType}
            onChange={(e) => setThresholdType(e.target.value as "above" | "below")}
            className="bg-dark-card text-white text-sm px-2 py-1 rounded border border-dark-border"
          >
            <option value="above">≥</option>
            <option value="below">≤</option>
          </select>
          <input
            type="number"
            step="0.0001"
            placeholder={currentRate?.toFixed(4) || "3.4500"}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-24 bg-dark-card text-white text-sm px-3 py-1 rounded border border-dark-border focus:border-accent-green focus:outline-none"
          />
        </div>
      </div>

      {/* Volatility Alert */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setVolatilityEnabled(!volatilityEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            volatilityEnabled ? "bg-accent-green/20 text-accent-green" : "bg-dark-card text-gray-500"
          }`}
        >
          <Activity className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-400">Volatility alerts (sudden changes)</span>
      </div>
    </section>
  );
}
```

**Step 2: Verify component compiles**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: add AlertControls component"
```

---

### Task 6: Create TrendChart Component

**Files:**
- Create: `frontend/src/components/TrendChart.tsx`
- Create: `frontend/src/hooks/useTrends.ts`

**Step 1: Create useTrends hook**

Create `frontend/src/hooks/useTrends.ts`:

```typescript
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
```

**Step 2: Create TrendChart component**

Create `frontend/src/components/TrendChart.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
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

export function TrendChart() {
  const { trends, loading, error } = useTrends(30);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  const sources = useMemo(() => {
    if (!trends?.data) return [];
    return Object.keys(trends.data);
  }, [trends]);

  // Initialize selectedSources with all sources
  useMemo(() => {
    if (sources.length > 0 && selectedSources.size === 0) {
      setSelectedSources(new Set(sources));
    }
  }, [sources, selectedSources.size]);

  const chartData = useMemo(() => {
    if (!trends?.data) return [];

    const timeMap = new Map<string, ChartDataPoint>();

    for (const [source, points] of Object.entries(trends.data)) {
      for (const point of points) {
        const timeKey = new Date(point.timestamp).toISOString();
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
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedSources.has(source)
                ? "text-white"
                : "bg-dark-card text-gray-500"
            }`}
            style={{
              backgroundColor: selectedSources.has(source)
                ? COLORS[idx % COLORS.length] + "33"
                : undefined,
              borderColor: COLORS[idx % COLORS.length],
              borderWidth: 1,
            }}
          >
            {source}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(t) => new Date(t).toLocaleDateString("en", { month: "short", day: "numeric" })}
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
              labelFormatter={(t) => new Date(t).toLocaleString()}
              formatter={(value: number) => [value.toFixed(4), "Rate"]}
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
```

**Step 3: Verify component compiles**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: add TrendChart component with interactive filtering"
```

---

### Task 7: Create RateCards Component

**Files:**
- Create: `frontend/src/components/RateCards.tsx`

**Step 1: Create RateCards component**

Create `frontend/src/components/RateCards.tsx`:

```typescript
"use client";

import { Rate } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RateCardsProps {
  rates: Rate[];
  bestRate: Rate | null;
}

export function RateCards({ rates, bestRate }: RateCardsProps) {
  if (rates.length === 0) {
    return (
      <section className="px-4 py-4 border-t border-dark-border">
        <div className="text-gray-500 text-center py-4">No rates available</div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4 border-t border-dark-border">
      <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">All Rates</h2>

      <div className="space-y-2">
        {rates.map((rate) => {
          const isBest = bestRate && rate.source_name === bestRate.source_name;

          return (
            <div
              key={rate.source_name}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isBest
                  ? "bg-accent-green/10 border border-accent-green/30"
                  : "bg-dark-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isBest ? "bg-accent-green" : "bg-gray-600"
                  }`}
                />
                <span className="font-medium">{rate.source_name}</span>
                {isBest && (
                  <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded">
                    BEST
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`font-mono ${isBest ? "text-accent-green" : ""}`}>
                  {rate.rate.toFixed(4)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

**Step 2: Verify component compiles**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: add RateCards component"
```

---

### Task 8: Create Converter Component

**Files:**
- Create: `frontend/src/components/Converter.tsx`

**Step 1: Create Converter component**

Create `frontend/src/components/Converter.tsx`:

```typescript
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
```

**Step 2: Verify component compiles**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: add Converter component"
```

---

### Task 9: Assemble Main Page

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Step 1: Replace page.tsx with assembled components**

Replace `frontend/src/app/page.tsx`:

```typescript
"use client";

import { useRates } from "@/hooks/useRates";
import { HeroRate } from "@/components/HeroRate";
import { AlertControls } from "@/components/AlertControls";
import { TrendChart } from "@/components/TrendChart";
import { RateCards } from "@/components/RateCards";
import { Converter } from "@/components/Converter";

export default function Home() {
  const { rates, bestRate, loading, lastUpdated, refresh } = useRates();

  return (
    <main className="min-h-screen max-w-lg mx-auto">
      <HeroRate
        bestRate={bestRate}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
      />

      <AlertControls currentRate={bestRate?.rate || null} />

      <TrendChart />

      <RateCards rates={rates} bestRate={bestRate} />

      <Converter bestRate={bestRate} />

      {/* Bottom padding for mobile */}
      <div className="h-8" />
    </main>
  );
}
```

**Step 2: Test the full page**

```bash
cd frontend && npm run dev
```

Open localhost:3000 - should see all components (may show loading/error states if backend not running)

**Step 3: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: assemble main page with all components"
```

---

### Task 10: Configure PWA

**Files:**
- Create: `frontend/public/manifest.json`
- Create: `frontend/public/icons/icon-192.png` (placeholder)
- Create: `frontend/public/icons/icon-512.png` (placeholder)
- Modify: `frontend/next.config.ts`

**Step 1: Create manifest.json**

Create `frontend/public/manifest.json`:

```json
{
  "name": "SGD to MYR Tracker",
  "short_name": "SGD2MYR",
  "description": "Track SGD to MYR exchange rates",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Create placeholder icons directory**

```bash
mkdir -p frontend/public/icons
```

Create simple placeholder icons (we'll use SVG converted to PNG or generate proper icons later):

```bash
# Create a simple SVG that can serve as icon placeholder
cat > frontend/public/icons/icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <text x="256" y="300" font-size="200" fill="#22c55e" text-anchor="middle" font-family="system-ui">$</text>
</svg>
EOF
```

**Step 3: Update next.config.ts for PWA**

Replace `frontend/next.config.ts`:

```typescript
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
```

**Step 4: Verify build works**

```bash
cd frontend && npm run build
```

Expected: Build succeeds (PWA files generated in production)

**Step 5: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/
git commit -m "feat: configure PWA with manifest and service worker"
```

---

### Task 11: Create Start Script and Environment Config

**Files:**
- Modify: `start_frontend.sh`
- Create: `frontend/.env.local`

**Step 1: Create .env.local**

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 2: Update start_frontend.sh**

Replace `/Users/yeecherngoh/Downloads/study/projects/sgd2myr/start_frontend.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")/frontend"
npm run dev
```

**Step 3: Make script executable**

```bash
chmod +x start_frontend.sh
```

**Step 4: Test full stack**

Terminal 1:
```bash
./start_backend.sh
```

Terminal 2:
```bash
./start_frontend.sh
```

Open localhost:3000 - should see live data from backend

**Step 5: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add start_frontend.sh frontend/.env.local
git commit -m "feat: add frontend start script and environment config"
```

---

### Task 12: Add .gitignore for Frontend

**Files:**
- Create: `frontend/.gitignore`

**Step 1: Create .gitignore**

Create `frontend/.gitignore`:

```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*

# local env files
.env*.local

# PWA generated files
public/sw.js
public/sw.js.map
public/workbox-*.js
public/workbox-*.js.map
```

**Step 2: Commit**

```bash
cd /Users/yeecherngoh/Downloads/study/projects/sgd2myr
git add frontend/.gitignore
git commit -m "chore: add frontend .gitignore"
```

---

## Summary

After completing all tasks, the frontend will have:

1. **Dark mode mobile-first UI** with Tailwind CSS
2. **HeroRate** - Large best rate display with refresh
3. **AlertControls** - Threshold and volatility toggles (localStorage)
4. **TrendChart** - Interactive 30-day Recharts graph with source filtering
5. **RateCards** - All sources with best rate highlighted
6. **Converter** - SGD to MYR calculator
7. **PWA config** - Installable with manifest and service worker

Total: 12 tasks, ~45 steps
