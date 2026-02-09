"""
Binance Data Fetcher — Historical kline/candlestick data.
Uses public Binance API (no API key needed for market data).
Designed for backtesting now, live trading later.
"""

import time
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests


# Binance public klines endpoint
BASE_URL = "https://api.binance.com/api/v3/klines"

# Max candles per request (Binance limit)
MAX_LIMIT = 1000

# Valid timeframes
VALID_INTERVALS = {
    "1m", "3m", "5m", "15m", "30m",
    "1h", "2h", "4h", "6h", "8h", "12h",
    "1d", "3d", "1w", "1M",
}

# Default data directory
DATA_DIR = Path(__file__).parent / "data"


def fetch_klines(
    symbol: str = "BTCUSDT",
    interval: str = "4h",
    start_date: str = "2023-01-01",
    end_date: str | None = None,
    save_csv: bool = True,
    data_dir: Path | str = DATA_DIR,
) -> pd.DataFrame:
    """
    Fetch historical klines from Binance.

    Args:
        symbol: Trading pair (e.g., "BTCUSDT", "ETHUSDT")
        interval: Candle interval (e.g., "1h", "4h", "1d")
        start_date: Start date as "YYYY-MM-DD"
        end_date: End date as "YYYY-MM-DD" (None = now)
        save_csv: Save fetched data to CSV
        data_dir: Directory for CSV files

    Returns:
        DataFrame with columns: timestamp, open, high, low, close, volume
    """
    if interval not in VALID_INTERVALS:
        raise ValueError(f"Invalid interval '{interval}'. Valid: {VALID_INTERVALS}")

    # Convert dates to millisecond timestamps
    start_ms = _date_to_ms(start_date)
    end_ms = _date_to_ms(end_date) if end_date else int(time.time() * 1000)

    print(f"Fetching {symbol} {interval} from {start_date} to {end_date or 'now'}...")

    all_klines = []
    current_start = start_ms
    request_count = 0

    while current_start < end_ms:
        params = {
            "symbol": symbol.upper(),
            "interval": interval,
            "startTime": current_start,
            "endTime": end_ms,
            "limit": MAX_LIMIT,
        }

        response = requests.get(BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        klines = response.json()

        if not klines:
            break

        all_klines.extend(klines)
        request_count += 1

        # Move start to after last candle's open time
        last_open_time = klines[-1][0]
        current_start = last_open_time + 1

        # Rate limit: Binance allows 1200 requests/min, be conservative
        if request_count % 5 == 0:
            time.sleep(0.5)

        if request_count % 10 == 0:
            count = len(all_klines)
            last_date = datetime.fromtimestamp(last_open_time / 1000, tz=timezone.utc)
            print(f"  ...{count} candles fetched (up to {last_date.strftime('%Y-%m-%d %H:%M')})")

    if not all_klines:
        print("No data returned from Binance.")
        return pd.DataFrame()

    # Build DataFrame
    df = _klines_to_dataframe(all_klines)

    # Filter to exact date range
    df = df[(df["timestamp"] >= start_ms) & (df["timestamp"] <= end_ms)]

    print(f"Total: {len(df)} candles from {df['date'].iloc[0]} to {df['date'].iloc[-1]}")

    if save_csv:
        data_dir = Path(data_dir)
        data_dir.mkdir(parents=True, exist_ok=True)
        end_str = end_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        filename = f"{symbol}_{interval}_{start_date}_to_{end_str}.csv"
        filepath = data_dir / filename
        df.to_csv(filepath, index=False)
        print(f"Saved to {filepath}")

    return df


def load_csv(filepath: str | Path) -> pd.DataFrame:
    """Load previously saved kline data from CSV."""
    df = pd.read_csv(filepath)
    df["date"] = pd.to_datetime(df["date"])
    return df


def _date_to_ms(date_str: str) -> int:
    """Convert 'YYYY-MM-DD' string to millisecond timestamp (UTC)."""
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def _klines_to_dataframe(klines: list) -> pd.DataFrame:
    """
    Convert raw Binance kline data to clean DataFrame.

    Binance kline format:
    [0] Open time (ms), [1] Open, [2] High, [3] Low, [4] Close,
    [5] Volume, [6] Close time, [7] Quote asset volume,
    [8] Number of trades, [9] Taker buy base volume,
    [10] Taker buy quote volume, [11] Ignore
    """
    df = pd.DataFrame(klines, columns=[
        "timestamp", "open", "high", "low", "close", "volume",
        "close_time", "quote_volume", "trades", "taker_buy_base",
        "taker_buy_quote", "_ignore",
    ])

    # Keep only what we need, cast types
    df = df[["timestamp", "open", "high", "low", "close", "volume", "quote_volume", "trades"]].copy()
    df["timestamp"] = df["timestamp"].astype(int)
    df["open"] = df["open"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["close"] = df["close"].astype(float)
    df["volume"] = df["volume"].astype(float)
    df["quote_volume"] = df["quote_volume"].astype(float)
    df["trades"] = df["trades"].astype(int)

    # Add human-readable date
    df["date"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)

    # Drop duplicates (overlap between paginated requests)
    df = df.drop_duplicates(subset="timestamp").sort_values("timestamp").reset_index(drop=True)

    return df


# ── CLI usage ───────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch Binance kline data")
    parser.add_argument("--symbol", default="BTCUSDT", help="Trading pair")
    parser.add_argument("--interval", default="4h", help="Candle interval")
    parser.add_argument("--start", default="2023-01-01", help="Start date YYYY-MM-DD")
    parser.add_argument("--end", default=None, help="End date YYYY-MM-DD (default: now)")
    args = parser.parse_args()

    df = fetch_klines(
        symbol=args.symbol,
        interval=args.interval,
        start_date=args.start,
        end_date=args.end,
    )
    print(f"\nShape: {df.shape}")
    print(df.head())
    print("...")
    print(df.tail())
