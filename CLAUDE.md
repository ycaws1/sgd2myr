
# Product Requirements Document: SGD to MYR Rate Tracker (PWA)

## 1. Executive Summary

A high-frequency exchange rate monitoring tool that aggregates SGD to MYR rates from multiple sources (Google, Wise, CIMB, Instarem, Revolut). The app provides real-time insights, historical trends, and automated push notifications to help users capitalize on the best conversion rates.

---

## 2. Tech Stack Overview

| Component | Technology |
| --- | --- |
| **Backend** | Python (FastAPI) |
| **Database** | DuckDB (Local File) |
| **Scraping** | Requests, BeautifulSoup4, Playwright |
| **Frontend** | Next.js (App Router), Tailwind CSS, Lucide React |
| **PWA Features** | `next-pwa` (Service Workers, Web Push API) |
| **Charts** | Recharts or Chart.js |

---

## 3. Functional Requirements

### 3.1 Backend: Scraper & API Engine

The backend serves as the "brain," handling data ingestion and storage.

* **Multi-Source Scraper:** * Must scrape: Google, Wise, CIMB Clicks SG, Instarem, and Revolut.
* **Frequency ():** Configurable via environment variable (e.g., `SCRAPE_INTERVAL=5` (minutes)).


* **Data Persistence:**
* Save `timestamp`, `source_name`, and `rate` to DuckDB.
* **Retention Policy:** A background task must delete records where `timestamp < now() - 30 days`.


* **Endpoints:**
* `GET /rates/latest`: Returns the most recent rate for all sources.
* `GET /rates/trends`: Returns 30-day historical data points for charting.
* `POST /alerts/subscribe`: Store user push subscription tokens and thresholds.



### 3.2 Frontend: Next.js PWA

A mobile-first interface designed for quick "check-and-go" interactions.

* **Dashboard:**
* **Rate Cards:** Display all 5 sources. The source with the highest numerical value must be visually highlighted (e.g., a "Best Rate" badge or green border).
* **Trend Chart:** A line graph showing the fluctuations over the last 30 days.


* **Currency Converter:** * A simple input field where users enter SGD to see the MYR equivalent based on the best current rate.
* **Alert Management:**
* Toggle for "Price Hits Threshold" Push Notifications. (User defined)
* Toggle for "Price Severe Flucatuation" Push Notifications. (Server pre-defined)


### 3.3 Notification Logic

The system must monitor rates and trigger Web Push notifications via the Service Worker.

1. **User Threshold:** If `current_rate >= user_threshold` or `current_rate < user_threshold`.
2. **Volatility Alert:** If the rate moves more than certain percentage within period .



---

## 4. Technical Architecture

### Directory Structure Skeleton

```text
/project-root
  /backend
    ├── main.py          # FastAPI entry point, web scraping & data saving job.
    ├── requirements.txt
    └── .env             #
  /frontend
    ├── /app             # Next.js pages
    ├── /components      # UI components
    ├── /public          # PWA icons and manifest
    ├── worker.js        # Service worker for Push
    └── package.json

```

---

## 5. Non-Functional Requirements

* **PWA Compliance:** Must achieve a high Lighthouse score for PWA (Installable, Service Worker active, Manifest configured).
* **Performance:** The trend chart should load in under 200ms (DuckDB's primary strength).
* **Resilience:** If one source (e.g., CIMB) fails to scrape, the others should still update, and the error should be logged.

---

## 6. Future Enhancements

* Integration with Telegram Bot API for alternative alerts.
* "Average Rate" line overlay on the trend chart.
* Support for other currency pairs (e.g., SGD to JYP).


## USING GEMINI CLI

* In order to optimize the token usage, analyzing codebase should be done with gemini cli instead on claude code.