import asyncio
import os
import asyncpg
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")

DATABASE_CONNSTR = os.getenv("DATABASE_CONNSTR")
API_URL = "http://localhost:8000"

async def test_alerts():
    print("--- Alert Verification Script ---")
    
    # 1. Check Subscriptions
    print(f"\n1. Checking subscriptions in {DATABASE_CONNSTR[:30]}...")
    conn = await asyncpg.connect(DATABASE_CONNSTR)
    subs = await conn.fetch("SELECT * FROM subscriptions")
    print(f"Found {len(subs)} subscriptions.")
    for sub in subs:
        print(f" - Endpoint: {sub['endpoint'][:30]}... | Threshold: {sub['threshold']} | Volatility: {sub['volatility_alert']}")
    
    if len(subs) == 0:
        print("\n⚠️ NO SUBSCRIPTIONS FOUND! Please enable alerts in the UI first.")
        await conn.close()
        return

    # 2. Insert Fake Rates (Baseline + High)
    print("\n2. Inserting fake rates to trigger VOLATILITY alerts...")
    source = "Test-Source"
    
    # 2a. Baseline rate (3.10)
    await conn.execute("""
        INSERT INTO rates (timestamp, source_name, rate)
        VALUES ($1, $2, $3)
    """, datetime.now(timezone.utc), source, 3.10)

    # 2b. High rate (5.00) - triggers volatility
    fake_rate = 5.00
    await conn.execute("""
        INSERT INTO rates (timestamp, source_name, rate)
        VALUES ($1, $2, $3)
    """, datetime.now(timezone.utc), source, fake_rate)
    print(f"Fake rates inserted: 3.10 -> {fake_rate}")

    # 3. Trigger Backend Check
    print("\n3. Triggering backend alert checks...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{API_URL}/debug/trigger-checks", timeout=10)
            print(f"Trigger response: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Failed to trigger checks: {e}")

    # 4. Cleanup
    print("\n4. Cleaning up fake data...")
    await conn.execute("DELETE FROM rates WHERE source_name = $1", source)
    print("Cleanup complete.")
    
    await conn.close()
    print("\n✅ Test sequence complete. Please check your device for notifications.")

if __name__ == "__main__":
    asyncio.run(test_alerts())
