# SGD to MYR Rate Tracker - Frontend PWA Design

## Overview

Mobile-first PWA for quick-glance rate checking with alert management. Dark mode optimized.

## User Priorities

1. **Primary**: See best rate instantly, manage alerts
2. **Secondary**: Compare rates across sources, convert amounts

## Layout Structure

Single scrollable page with 4 stacked sections:

```
┌─────────────────────────┐
│  BEST RATE HERO         │  Big number, source, last updated
└─────────────────────────┘
┌─────────────────────────┐
│  ALERT CONTROLS         │  Threshold input + toggles
└─────────────────────────┘
┌─────────────────────────┐
│  TREND CHART            │  Interactive 30-day chart
└─────────────────────────┘
┌─────────────────────────┐
│  ALL RATES + CONVERTER  │  Rate cards + calculator
└─────────────────────────┘
```

## Components

### HeroRate
- Large rate number (48px+), white on dark
- Source name in muted text
- Green accent border for "best" indicator
- Relative timestamp ("2 min ago")

### AlertControls
- Input: "Notify when rate ≥ [value]"
- Toggle: above/below threshold
- Toggle: volatility alerts
- Icon-driven, minimal text

### TrendChart
- Recharts with dark theme
- Touch to see values
- Source filter toggles
- 30-day default range

### RateCards
- Horizontal cards: source, rate, delta indicator
- Best rate highlighted

### Converter
- SGD input field
- Auto-updating MYR output
- Uses best current rate

## Technical Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark mode default)
- next-pwa for service worker
- Recharts for charts
- Lucide React for icons

## File Structure

```
/frontend
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── manifest.json
├── components/
│   ├── HeroRate.tsx
│   ├── AlertControls.tsx
│   ├── TrendChart.tsx
│   ├── RateCards.tsx
│   └── Converter.tsx
├── hooks/
│   ├── useRates.ts
│   └── usePushSubscription.ts
└── public/
    └── icons/
```

## Data Flow

- `useRates` hook polls `/rates/latest` every 60s
- Trends fetched on chart mount
- Alerts stored in localStorage + backend subscription

## API Integration

Backend endpoints (FastAPI on port 8000):
- `GET /rates/latest` - All current rates
- `GET /rates/best` - Best rate only
- `GET /rates/trends` - 30-day history
- `POST /convert` - Currency conversion
- `POST /alerts/subscribe` - Push subscription
