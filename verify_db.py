import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")

DATABASE_CONNSTR = os.getenv("DATABASE_CONNSTR")

async def check_db():
    print(f"Connecting to {DATABASE_CONNSTR[:20]}...")
    try:
        conn = await asyncpg.connect(DATABASE_CONNSTR)
        
        # Test INSERT
        print("Attempting test insertion...")
        try:
            await conn.execute("""
                INSERT INTO subscriptions (endpoint, keys_json, threshold, threshold_type, volatility_alert)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (endpoint) DO NOTHING
            """, "test_script_endpoint", "{}", 1.0, "above", True)
            print("Test insertion successful.")
            
            # Cleanup test insert
            await conn.execute("DELETE FROM subscriptions WHERE endpoint = $1", "test_script_endpoint")
            print("Test cleanup successful.")
            
        except Exception as e:
            print(f"Test insertion failed: {e}")

        rows = await conn.fetch("SELECT * FROM subscriptions")
        print(f"Found {len(rows)} subscriptions:")
        for row in rows:
            print(dict(row))
        
        print("\nChecking rates table sample:")
        rates = await conn.fetch("SELECT * FROM rates ORDER BY timestamp DESC LIMIT 5")
        for rate in rates:
            print(dict(rate))
            
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
