import os
import re
import json
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from fastapi.responses import FileResponse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# Define Timezones
UTC = timezone.utc
GMT_PLUS_8 = timezone(timedelta(hours=8))


def to_utc(dt: datetime) -> datetime:
    """Convert a datetime to timezone-aware UTC.
    
    If naive, we assume it's in GMT+8 (for backward compatibility with old local data)
    before converting to UTC.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Backward compatibility: old data was stored as naive local (GMT+8)
        return dt.replace(tzinfo=GMT_PLUS_8).astimezone(UTC)
    return dt.astimezone(UTC)
from contextlib import asynccontextmanager
from typing import Optional

import duckdb
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pywebpush import webpush, WebPushException

# from playwright.async_api import async_playwright

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
SCRAPE_INTERVAL = int(os.getenv("SCRAPE_INTERVAL", 5))
DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", 30))
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/rates.duckdb")
VOLATILITY_THRESHOLD = float(os.getenv("VOLATILITY_THRESHOLD", 2.0))
VOLATILITY_PERIOD_MINUTES = int(os.getenv("VOLATILITY_PERIOD_MINUTES", 60))

# VAPID Keys
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL")

if not VAPID_PRIVATE_KEY:
    logger.warning("VAPID_PRIVATE_KEY not set. Push notifications will not work.")


async def send_push_notification(subscription_info: dict, message: str):
    """Send a push notification to a specific subscription."""
    if not VAPID_PRIVATE_KEY:
        logger.error("Cannot send push: VAPID_PRIVATE_KEY not configured")
        return

    try:
        webpush(
            subscription_info,
            data=message,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL or "mailto:admin@example.com"}
        )
        logger.info(f"Push notification sent successfully")
    except WebPushException as ex:
        logger.error(f"WebPush error: {ex}")
        # If 410 Gone, we should probably remove the subscription
        if ex.response and ex.response.status_code == 410:
             logger.info("Subscription expired/gone. TODO: Remove from DB")
    except Exception as ex:
        logger.error(f"Failed to send push notification: {ex}")


async def check_threshold_alerts(rates: list):
    """Check if any rates hit user thresholds."""
    if not rates:
        return

    try:
        subscriptions = db_conn.execute("""
            SELECT endpoint, keys_json, threshold, threshold_type
            FROM subscriptions
            WHERE threshold IS NOT NULL
        """).fetchall()

        best_rate = max(rate for _, rate in rates)

        for endpoint, keys_json, threshold, threshold_type in subscriptions:
            should_notify = False
            if threshold_type == "above" and best_rate >= threshold:
                should_notify = True
            elif threshold_type == "below" and best_rate <= threshold:
                should_notify = True

            if should_notify:
                logger.info(f"Threshold alert triggered for {endpoint}: rate {best_rate} {threshold_type} {threshold}")
                
                try:
                    keys = json.loads(keys_json)
                    subscription_info = {
                        "endpoint": endpoint,
                        "keys": keys
                    }
                    message = json.dumps({
                        "title": "Rate Alert!",
                        "body": f"Exchange rate is now {best_rate:.4f} (Threshold: {threshold:.4f})",
                        "icon": "/icons/icon-192x192.png"
                    })
                    await send_push_notification(subscription_info, message)
                    
                    # One-time alert: Disable threshold after sending
                    db_conn.execute(
                        "UPDATE subscriptions SET threshold = NULL WHERE endpoint = ?", 
                        [endpoint]
                    )
                    logger.info(f"Disabled threshold for {endpoint} after alert.")
                except Exception as e:
                    logger.error(f"Error processing subscription for {endpoint}: {e}")

    except Exception as e:
        logger.error(f"Failed to check threshold alerts: {e}")


async def send_volatility_notifications(source: str, volatility: float, min_rate: float, max_rate: float):
    """Send volatility alert notifications."""
    try:
        subscriptions = db_conn.execute("""
            SELECT endpoint, keys_json
            FROM subscriptions
            WHERE volatility_alert = TRUE
        """).fetchall()

        for endpoint, keys_json in subscriptions:
            logger.info(f"Sending volatility notification to {endpoint}")
            try:
                keys = json.loads(keys_json)
                subscription_info = {
                    "endpoint": endpoint,
                    "keys": keys
                }
                message = json.dumps({
                    "title": "High Volatility Alert",
                    "body": f"{source} rate changed by {volatility:.2f}% ({min_rate:.4f} - {max_rate:.4f})",
                     "icon": "/icons/icon-192x192.png"
                })
                await send_push_notification(subscription_info, message)
            except Exception as e:
                 logger.error(f"Error processing volatility sub for {endpoint}: {e}")
    except Exception as e:
        logger.error(f"Failed to send volatility notifications: {e}")

# Ensure data directory exists
os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

# Global database connection
db_conn: Optional[duckdb.DuckDBPyConnection] = None
scheduler = AsyncIOScheduler()

# Pydantic Models
class RateResponse(BaseModel):
    source_name: str
    rate: float
    timestamp: datetime


class TrendDataPoint(BaseModel):
    timestamp: datetime
    source_name: str
    rate: float


class AlertSubscription(BaseModel):
    endpoint: str
    keys: dict
    threshold: Optional[float] = None
    threshold_type: Optional[str] = "above"  # "above" or "below"
    volatility_alert: bool = False


class ConversionRequest(BaseModel):
    amount: float
    source: Optional[str] = None


class RateHistoryItem(BaseModel):
    rate: float
    timestamp: datetime


class SourceHistory(BaseModel):
    source_name: str
    recent_rates: list[RateHistoryItem]


# ... (existing code) ...


def init_database():
    """Initialize DuckDB tables."""
    global db_conn
    db_conn = duckdb.connect(DATABASE_PATH)

    # Create rates table with timezone support
    db_conn.execute("""
        CREATE TABLE IF NOT EXISTS rates (
            id INTEGER PRIMARY KEY,
            timestamp TIMESTAMPTZ NOT NULL,
            source_name VARCHAR NOT NULL,
            rate DOUBLE NOT NULL
        )
    """)

    # Create sequence for auto-increment if not exists
    try:
        db_conn.execute("CREATE SEQUENCE IF NOT EXISTS rates_id_seq START 1")
    except Exception:
        pass

    # Create subscriptions table with timezone support
    db_conn.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY,
            endpoint VARCHAR UNIQUE NOT NULL,
            keys_json VARCHAR NOT NULL,
            threshold DOUBLE,
            threshold_type VARCHAR DEFAULT 'above',
            volatility_alert BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)

    try:
        db_conn.execute("CREATE SEQUENCE IF NOT EXISTS subscriptions_id_seq START 1")
    except Exception:
        pass

    # Create index for faster queries
    db_conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_rates_timestamp
        ON rates(timestamp)
    """)
    db_conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_rates_source
        ON rates(source_name)
    """)

    logger.info("Database initialized successfully")


def save_rate(source_name: str, rate: float, timestamp: Optional[datetime] = None):
    """Save a rate to the database."""
    try:
        # Use UTC timezone for storage
        if timestamp is None:
            timestamp = datetime.now(UTC)
        elif timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)
        else:
            timestamp = timestamp.astimezone(UTC)

        db_conn.execute(
            """
            INSERT INTO rates (id, timestamp, source_name, rate)
            VALUES (nextval('rates_id_seq'), ?, ?, ?)
            """,
            [timestamp, source_name, rate]
        )
        logger.info(f"Saved rate for {source_name}: {rate}")
    except Exception as e:
        logger.error(f"Failed to save rate for {source_name}: {e}")


async def check_volatility_alerts():
    """Check if rate volatility exceeds threshold."""
    try:
        cutoff = datetime.now(UTC) - timedelta(minutes=VOLATILITY_PERIOD_MINUTES)
        result = db_conn.execute("""
            SELECT source_name, MIN(rate) as min_rate, MAX(rate) as max_rate
            FROM rates
            WHERE timestamp > ?
            GROUP BY source_name
        """, [cutoff]).fetchall()

        for source_name, min_rate, max_rate in result:
            if min_rate > 0:
                volatility = ((max_rate - min_rate) / min_rate) * 100
                if volatility >= VOLATILITY_THRESHOLD:
                    logger.warning(
                        f"Volatility alert for {source_name}: {volatility:.2f}% "
                        f"(min: {min_rate}, max: {max_rate})"
                    )
                    await send_volatility_notifications(source_name, volatility, min_rate, max_rate)
    except Exception as e:
        logger.error(f"Failed to check volatility: {e}")


def cleanup_old_data():
    """Delete records older than retention period."""
    try:
        cutoff = datetime.now(UTC) - timedelta(days=DATA_RETENTION_DAYS)
        result = db_conn.execute(
            "DELETE FROM rates WHERE timestamp < ?",
            [cutoff]
        )
        logger.info(f"Cleaned up old rate records (older than {DATA_RETENTION_DAYS} days)")
    except Exception as e:
        logger.error(f"Failed to cleanup old data: {e}")


# # Scraper Functions
async def scrape_google_n_revolut_rate():
    stealth = Stealth()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
            )
        await stealth.apply_stealth_async(context)
        page_1 = await context.new_page()
        page_2 = await context.new_page()

        url = "https://www.google.com/finance/quote/SGD-MYR"
        print(f"Navigating to {url}...")
        try:
            await page_1.goto(url, wait_until="networkidle")
            await page_1.wait_for_selector('div[data-last-price]', timeout=5000)
            rate = await page_1.locator('div[data-last-price]').get_attribute('data-last-price')
            page_1_rate = float(rate)
        except Exception as e:
            logger.error(f"Failed to scrape Google rate: {e}")
            page_1_rate = None
        
        url = "https://www.revolut.com/currency-converter/convert-sgd-to-myr-exchange-rate/"
        print(f"Navigating to {url}...")
        try:
            await page_2.goto(url, wait_until="networkidle")
            if await page_2.locator('span', has_text="Reject non-essential cookies").first.count() > 0:
                await page_2.locator('span', has_text="Reject non-essential cookies").first.click()
            # await page_2.locator('button[role="tab"]', has_text="1d").click()
            await page_2.locator('foreignObject span', has_text="RM").wait_for(state="visible", timeout=5000)
            text = await page_2.locator('foreignObject span', has_text="RM").text_content()
            text = text.replace('\xa0', ' ')
            match = re.search(r'RM\s*([\d.]+)', text)
            if match:
                page_2_rate = float(match.group(1))
        except Exception as e:
            await page_2.screenshot(path="revolut_error.png", timeout=5000)
            inner_html = await page_2.evaluate("document.documentElement.innerHTML")
            with open("revolut_error.html", "w", encoding="utf-8") as f:
                f.write(inner_html)
            logger.error(f"Failed to scrape Revolut rate: {e}")
            page_2_rate = None
        
        await browser.close()
        return [page_1_rate, page_2_rate]


async def scrape_google_rate() -> Optional[float]:
    async with Stealth().use_async(async_playwright()) as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        url = "https://www.google.com/finance/quote/SGD-MYR"
        print(f"Navigating to {url}...")
        try:
            await page.goto(url, wait_until="networkidle")
            await page.wait_for_selector('div[data-last-price]', timeout=10000)
            rate = await page.locator('div[data-last-price]').get_attribute('data-last-price')
            return float(rate)
        except Exception as e:
            logger.error(f"Failed to scrape Google rate: {e}")
            return None
        finally:
            await browser.close()


async def scrape_xe_rate() -> Optional[float]:
    """Scrape SGD to MYR rate from XE.com."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.xe.com/currencyconverter/convert/?Amount=1&From=SGD&To=MYR",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout=10.0
            )
            text = response.text

            # Pattern 1: "X.XXXX Malaysian Ringgits"
            match = re.search(r'(\d+\.\d{2,})\s*Malaysian\s*Ringgit', text, re.IGNORECASE)
            if match:
                rate = float(match.group(1))
                if 3.0 < rate < 4.0:
                    return rate

            # Pattern 2: Look for rate in fxrate class or data attributes
            match = re.search(r'class="[^"]*fxrate[^"]*"[^>]*>(\d+\.\d+)', text, re.IGNORECASE)
            if match:
                rate = float(match.group(1))
                if 3.0 < rate < 4.0:
                    return rate

            # Pattern 3: "1 SGD = X.XX MYR"
            match = re.search(r'1\s*SGD\s*=\s*(\d+\.?\d*)\s*MYR', text, re.IGNORECASE)
            if match:
                rate = float(match.group(1))
                if 3.0 < rate < 4.0:
                    return rate

    except Exception as e:
        logger.error(f"Failed to scrape XE rate: {e}")
    return None


async def scrape_wise_rate() -> Optional[float]:
    """Scrape SGD to MYR rate from Wise."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://wise.com/gb/currency-converter/sgd-to-myr-rate?amount=1",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout=10.0
            )
            text = response.text

            # Pattern 1: "S$1 SGD = X.XXX MYR" or "1 SGD = X.XXXX MYR"
            match = re.search(r'1\s*SGD\s*=\s*(\d+\.?\d*)\s*MYR', text, re.IGNORECASE)
            if match:
                rate = float(match.group(1))
                return rate

            # Pattern 2: Look for rate in table cells "X.XX MYR" after "1 SGD"
            match = re.search(r'>\s*1\s*SGD\s*<.*?>\s*(\d+\.?\d*)\s*MYR\s*<', text, re.IGNORECASE | re.DOTALL)
            if match:
                rate = float(match.group(1))
                return rate
    except Exception as e:
        logger.error(f"Failed to scrape Wise rate: {e}")
    return None


async def scrape_cimb_rate() -> Optional[float]:
    """Scrape SGD to MYR rate from CIMB."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.cimbclicks.com.sg/sgd-to-myr",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout=10.0,
                follow_redirects=True
            )
            text = response.text

            # Pattern 1: Rate stored in hidden input as JSON array like value="[3.1107]"
            match = re.search(r'rateList"\s*value="\[(\d+\.?\d*)\]"', text)
            if match:
                rate = float(match.group(1))
                return rate

            # Pattern 2: "SGD 1.00 = MYR X.XXXX"
            match = re.search(r'SGD\s*1\.00\s*=\s*MYR\s*(\d+\.?\d*)', text, re.IGNORECASE)
            if match:
                rate = float(match.group(1))
                return rate

            # Pattern 3: Any rate value between 3.0 and 4.0 (SGD/MYR typical range)
            matches = re.findall(r'(\d+\.\d{4})', text)
            for match_str in matches:
                rate = float(match_str)
                return rate

    except Exception as e:
        logger.error(f"Failed to scrape CIMB rate: {e}")
    return None


async def scrape_instarem_rate() -> Optional[float]:
    """Scrape SGD to MYR rate from Instarem using their JSON API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.instarem.com/wp-json/instarem/v2/convert-rate/sgd/",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") and "data" in data:
                    rate = data["data"].get("MYR")
                    return float(rate)
    except Exception as e:
        logger.error(f"Failed to scrape Instarem rate: {e}")
    return None


async def scrape_revolut_rate() -> Optional[float]:
    async with Stealth().use_async(async_playwright()) as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        url = "https://www.revolut.com/currency-converter/convert-sgd-to-myr-exchange-rate/"
        print(f"Navigating to {url}...")
        try:
            await page.goto(url, wait_until="networkidle")
            await page.locator("h2", has_text=re.compile(r"1 SGD =")).wait_for(state="visible", timeout=10000)
            text = await page.locator("h2", has_text=re.compile(r"1 SGD =")).text_content()
            match = re.search(r"1 SGD = ([0-9.]+) MYR", text)
            if match:
                rate = match.group(1)
                return float(rate)
        except Exception as e:
            logger.error(f"Failed to scrape Revolut rate: {e}")
            return None
        finally:
            await browser.close()


async def scrape_exchangerate_api() -> Optional[float]:
    """Fallback: Use free exchange rate API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.exchangerate-api.com/v4/latest/SGD",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("rates", {}).get("MYR")
    except Exception as e:
        logger.error(f"Failed to get ExchangeRate API rate: {e}")
    return None


async def scrape_all_rates():
    """Scrape rates from all sources and save to database."""
    logger.info("Starting rate scraping...")

    # Define scrapers with their source names
    # Scrapers ordered by reliability (most reliable first)
    scrapers = [
        ("Instarem", scrape_instarem_rate),   # JSON API - most reliable
        ("Wise", scrape_wise_rate),           # Works well with regex
        ("CIMB", scrape_cimb_rate),           # Rate in hidden input
        # ("XE", scrape_xe_rate),               # Reliable alternative
        # ("Google", scrape_google_rate),       # Playwright-based, reliable but slower
        # ("Revolut", scrape_revolut_rate),     # Often returns 403
    ]

    # Run all scrapers concurrently
    tasks = [scraper() for _, scraper in scrapers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    rates_collected = []
    # Use a single timestamp for all rates collected in this run
    now_utc = datetime.now(UTC)

    for (source_name, _), result in zip(scrapers, results):
        if isinstance(result, Exception):
            logger.error(f"Scraper {source_name} raised exception: {result}")
            continue
        if result is not None:
            save_rate(source_name, result, timestamp=now_utc)
            rates_collected.append((source_name, result))
        else:
            logger.warning(f"No rate obtained from {source_name}")

    # Run combined Playwright scraper
    try:
        playwright_rates = await scrape_google_n_revolut_rate()
        # First result is Google
        if playwright_rates[0] is not None:
            save_rate("Google", playwright_rates[0], timestamp=now_utc)
            rates_collected.append(("Google", playwright_rates[0]))
        else:
            logger.warning("No rate obtained from Google")
        # Second result is Revolut
        if playwright_rates[1] is not None:
            save_rate("Revolut", playwright_rates[1], timestamp=now_utc)
            rates_collected.append(("Revolut", playwright_rates[1]))
        else:
            logger.warning("No rate obtained from Revolut")    
    except Exception as e:
        logger.error(f"Combined Playwright scraper raised exception: {e}")

    # If no rates collected, use fallback
    if not rates_collected:
        logger.warning("No rates collected from primary sources, using fallback API")
        fallback_rate = await scrape_exchangerate_api()
        if fallback_rate:
            save_rate("ExchangeRate-API", fallback_rate, timestamp=now_utc)
            rates_collected.append(("ExchangeRate-API", fallback_rate))

    # Check for volatility alerts
    await check_volatility_alerts()

    # Check threshold alerts
    await check_threshold_alerts(rates_collected)

    logger.info(f"Scraping complete. Collected {len(rates_collected)} rates.")





# FastAPI App Setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    init_database()

    # Schedule scraping job
    scheduler.add_job(
        scrape_all_rates,
        "interval",
        minutes=SCRAPE_INTERVAL,
        id="scrape_rates",
        replace_existing=True
    )

    # Schedule cleanup job (daily at midnight)
    scheduler.add_job(
        cleanup_old_data,
        "cron",
        hour=0,
        minute=0,
        id="cleanup_old_data",
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"Scheduler started. Scraping every {SCRAPE_INTERVAL} minutes.")

    # Run initial scrape
    asyncio.create_task(scrape_all_rates())

    yield

    # Shutdown
    scheduler.shutdown()
    if db_conn:
        db_conn.close()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="SGD to MYR Rate Tracker",
    description="API for tracking SGD to MYR exchange rates from multiple sources",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Endpoints
@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "SGD to MYR Rate Tracker API",
        "version": "1.0.0",
        "endpoints": {
            "latest_rates": "/rates/latest",
            "trends": "/rates/trends",
            "subscribe": "/alerts/subscribe"
        }
    }


@app.get("/rates/latest", response_model=list[RateResponse])
async def get_latest_rates():
    """Get the most recent rate for all sources."""
    try:
        result = db_conn.execute("""
            WITH latest AS (
                SELECT source_name, MAX(timestamp) as max_ts
                FROM rates
                GROUP BY source_name
            )
            SELECT r.source_name, r.rate, r.timestamp
            FROM rates r
            INNER JOIN latest l ON r.source_name = l.source_name AND r.timestamp = l.max_ts
            ORDER BY r.rate DESC
        """).fetchall()

        return [
            RateResponse(source_name=row[0], rate=row[1], timestamp=to_utc(row[2]))
            for row in result
        ]
    except Exception as e:
        logger.error(f"Failed to get latest rates: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve rates")


@app.get("/rates/trends")
async def get_rate_trends(source: Optional[str] = None, days: int = 30):
    """Get historical rate data for charting."""
    try:
        cutoff = datetime.now(UTC) - timedelta(days=days)

        if source:
            result = db_conn.execute("""
                SELECT date_trunc('minute', timestamp) as timestamp, source_name, rate
                FROM rates
                WHERE timestamp > ? AND source_name = ?
                ORDER BY timestamp ASC
            """, [cutoff, source]).fetchall()
        else:
            result = db_conn.execute("""
                SELECT date_trunc('minute', timestamp) as timestamp, source_name, rate
                FROM rates
                WHERE timestamp > ?
                ORDER BY timestamp ASC
            """, [cutoff]).fetchall()

        # Group by source for easier charting
        trends = {}
        for timestamp, source_name, rate in result:
            if source_name not in trends:
                trends[source_name] = []
            trends[source_name].append({
                "timestamp": to_utc(timestamp).isoformat(),
                "rate": rate
            })

        return {
            "period_days": days,
            "data": trends
        }
    except Exception as e:
        logger.error(f"Failed to get trends: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trends")


@app.get("/alerts/status")
async def get_alert_status(endpoint: str):
    """Get current subscription status."""
    try:
        result = db_conn.execute("""
            SELECT threshold, threshold_type, volatility_alert
            FROM subscriptions
            WHERE endpoint = ?
        """, [endpoint]).fetchone()

        if result:
            return {
                "threshold": result[0],
                "threshold_type": result[1],
                "volatility_alert": bool(result[2]),
                "threshold_enabled": result[0] is not None
            }
        return {
            "threshold": None,
            "threshold_type": "above",
            "volatility_alert": False,
            "threshold_enabled": False
        }
    except Exception as e:
        logger.error(f"Failed to get subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve status")


@app.post("/alerts/subscribe")
async def subscribe_alerts(subscription: AlertSubscription):
    """Subscribe to push notifications."""
    try:
        keys_json = json.dumps(subscription.keys)

        # Upsert subscription
        db_conn.execute("""
            INSERT INTO subscriptions (id, endpoint, keys_json, threshold, threshold_type, volatility_alert)
            VALUES (nextval('subscriptions_id_seq'), ?, ?, ?, ?, ?)
            ON CONFLICT (endpoint) DO UPDATE SET
                keys_json = EXCLUDED.keys_json,
                threshold = EXCLUDED.threshold,
                threshold_type = EXCLUDED.threshold_type,
                volatility_alert = EXCLUDED.volatility_alert
        """, [
            subscription.endpoint,
            keys_json,
            subscription.threshold,
            subscription.threshold_type,
            subscription.volatility_alert
        ])

        return {"status": "subscribed", "endpoint": subscription.endpoint}
    except Exception as e:
        logger.error(f"Failed to subscribe: {e}")
        raise HTTPException(status_code=500, detail="Failed to subscribe")


@app.delete("/alerts/unsubscribe")
async def unsubscribe_alerts(endpoint: str):
    """Unsubscribe from push notifications."""
    try:
        db_conn.execute("DELETE FROM subscriptions WHERE endpoint = ?", [endpoint])
        return {"status": "unsubscribed", "endpoint": endpoint}
    except Exception as e:
        logger.error(f"Failed to unsubscribe: {e}")
        raise HTTPException(status_code=500, detail="Failed to unsubscribe")


@app.get("/rates/best")
async def get_best_rate():
    """Get the current best rate among all sources."""
    try:
        result = db_conn.execute("""
            WITH latest AS (
                SELECT source_name, MAX(timestamp) as max_ts
                FROM rates
                GROUP BY source_name
            )
            SELECT r.source_name, r.rate, r.timestamp
            FROM rates r
            INNER JOIN latest l ON r.source_name = l.source_name AND r.timestamp = l.max_ts
            ORDER BY r.rate DESC
            LIMIT 1
        """).fetchone()

        if result:
            return RateResponse(source_name=result[0], rate=result[1], timestamp=to_utc(result[2]))
        else:
            raise HTTPException(status_code=404, detail="No rates available")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get best rate: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve best rate")


@app.post("/convert")
async def convert_currency(request: ConversionRequest):
    """Convert SGD to MYR using the best current rate or a specific source."""
    try:
        if request.source:
            # Get latest rate for specific source
            result = db_conn.execute("""
                SELECT source_name, rate, timestamp
                FROM rates
                WHERE source_name = ?
                ORDER BY timestamp DESC
                LIMIT 1
            """, [request.source]).fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail=f"No rate found for source: {request.source}")
            
            best = RateResponse(source_name=result[0], rate=result[1], timestamp=to_utc(result[2]))
        else:
            best = await get_best_rate()

        converted = request.amount * best.rate
        return {
            "sgd_amount": request.amount,
            "myr_amount": round(converted, 2),
            "rate": best.rate,
            "source": best.source_name,
            "timestamp": best.timestamp
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to convert: {e}")
        raise HTTPException(status_code=500, detail="Failed to convert currency")


@app.get("/rates/history", response_model=list[SourceHistory])
async def get_rates_history():
    """Get the last 5 records for each source."""
    try:
        # DuckDB supports window functions effectively
        result = db_conn.execute("""
            WITH RankedRates AS (
                SELECT 
                    source_name, 
                    rate, 
                    timestamp,
                    ROW_NUMBER() OVER (PARTITION BY source_name ORDER BY timestamp DESC) as rn
                FROM rates
            )
            SELECT source_name, rate, timestamp
            FROM RankedRates
            WHERE rn <= 5
            ORDER BY source_name ASC, timestamp DESC
        """).fetchall()

        history_map = {}
        for source, rate, timestamp in result:
            if source not in history_map:
                history_map[source] = []
            history_map[source].append(RateHistoryItem(rate=rate, timestamp=to_utc(timestamp)))

        return [
            SourceHistory(source_name=source, recent_rates=rates)
            for source, rates in history_map.items()
        ]
    except Exception as e:
        logger.error(f"Failed to get history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve history")


@app.post("/rates/scrape")
async def trigger_scrape(background_tasks: BackgroundTasks):
    """Manually trigger a rate scrape."""
    background_tasks.add_task(scrape_all_rates)
    return {"status": "scraping", "message": "Rate scraping started in background"}


class TestPushRequest(BaseModel):
    endpoint: str
    keys: dict


@app.post("/alerts/test")
async def test_push_notification(request: TestPushRequest):
    """Send a test push notification to verify push notifications are working."""
    try:
        if not VAPID_PRIVATE_KEY:
            raise HTTPException(status_code=500, detail="VAPID_PRIVATE_KEY not configured on server")
        
        subscription_info = {
            "endpoint": request.endpoint,
            "keys": request.keys
        }
        
        message = json.dumps({
            "title": "🔔 Test Notification",
            "body": f"Push notifications are working! Sent at {datetime.now(GMT_PLUS_8).strftime('%Y-%m-%d %H:%M:%S')} (GMT+8)",
            "icon": "/icons/icon-192x192.png"
        })
        
        await send_push_notification(subscription_info, message)
        return {"status": "sent", "message": "Test notification sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send test notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send test notification: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database connection
        db_conn.execute("SELECT 1").fetchone()
        return {
            "status": "healthy",
            "database": "connected",
            "scheduler": "running" if scheduler.running else "stopped"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unhealthy: {e}")
    
@app.get("/debug/{file_type}")
async def get_debug_file(file_type: str):
    """
    Access debug files. 
    Usage: /debug/image or /debug/html
    """
    if file_type == "image":
        file_path = "revolut_error.png"
        media = "image/png"
    elif file_type == "html":
        file_path = "revolut_error.html"
        media = "text/html"
    else:
        raise HTTPException(status_code=400, detail="Invalid file type. Use 'image' or 'html'.")

    if os.path.exists(file_path):
        return FileResponse(file_path, media_type=media)
    else:
        raise HTTPException(status_code=404, detail="File not found. No errors recorded yet.")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
