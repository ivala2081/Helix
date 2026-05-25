"""Fetch BNBUSDT and XRPUSDT 1H data from Binance public endpoint."""
import time
from pathlib import Path

import pandas as pd
import requests


def fetch_one(symbol, start_ms, end_ms):
    out = []
    cur = start_ms
    while cur < end_ms:
        params = {
            "symbol": symbol,
            "interval": "1h",
            "startTime": cur,
            "endTime": end_ms,
            "limit": 1000,
        }
        r = requests.get(
            "https://data-api.binance.vision/api/v3/klines",
            params=params,
            timeout=30,
        )
        r.raise_for_status()
        kl = r.json()
        if not kl:
            break
        out.extend(kl)
        cur = kl[-1][0] + 1
        if len(kl) < 1000:
            break
        time.sleep(0.2)
    return out


def main():
    start_ms = int(pd.Timestamp("2023-01-01", tz="UTC").timestamp() * 1000)
    end_ms = int(pd.Timestamp("2026-04-13", tz="UTC").timestamp() * 1000)
    for sym in ["BNBUSDT", "XRPUSDT"]:
        print(f"Fetching {sym}...")
        kl = fetch_one(sym, start_ms, end_ms)
        df = pd.DataFrame(kl, columns=[
            "timestamp", "open", "high", "low", "close", "volume",
            "close_time", "quote_volume", "trades", "taker_buy_base",
            "taker_buy_quote", "_ignore",
        ])
        df = df[["timestamp","open","high","low","close","volume","quote_volume","trades"]]
        for c in ["open","high","low","close","volume","quote_volume"]:
            df[c] = df[c].astype(float)
        df["timestamp"] = df["timestamp"].astype(int)
        df["trades"] = df["trades"].astype(int)
        df["date"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
        out_path = Path("data") / f"{sym}_1h_2023-01-01_to_2026-04-13.csv"
        df.to_csv(out_path, index=False)
        print(f"  Saved {len(df)} bars to {out_path}")


if __name__ == "__main__":
    main()
