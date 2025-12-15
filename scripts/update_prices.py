"""Fetch and update historical price data for BTC purchasing power tracker."""

import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import yfinance as yf

# FRED series codes for housing data (direct CSV download, no API key needed)
FRED_SERIES = {
    "housing_us_median": "MSPUS",
    "housing_northeast": "MSPNE",
    "housing_midwest": "MSPMW",
    "housing_south": "MSPS",
    "housing_west": "MSPW",
}

# yfinance tickers
YFINANCE_TICKERS = {
    "btc_usd": "BTC-USD",
    "gold_usd": "GC=F",  # Gold futures
    "sp500": "^GSPC",
}

DATA_DIR = Path(__file__).parent.parent / "data"
START_DATE = "2010-01-01"


def fetch_yfinance_data(ticker: str, name: str) -> pd.DataFrame:
    """Fetch historical data from yfinance and resample to quarterly."""
    print(f"Fetching {name} ({ticker})...")

    df = yf.download(ticker, start=START_DATE, progress=False, auto_adjust=True)

    if df.empty:
        print(f"  Warning: No data returned for {ticker}")
        return pd.DataFrame()

    # Handle multi-level columns from yfinance
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # Resample to quarterly, taking the last value of each quarter
    quarterly = df["Close"].resample("QE").last()
    quarterly = quarterly.dropna()

    print(f"  Got {len(quarterly)} quarterly data points")
    return quarterly.to_frame(name="price")


def fetch_fred_data(series_id: str, name: str) -> pd.DataFrame:
    """Fetch historical data from FRED via direct CSV download (no API key)."""
    print(f"Fetching {name} ({series_id})...")

    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"

    try:
        df = pd.read_csv(url)

        # Find the date column (could be 'DATE', 'date', or 'observation_date')
        date_col = None
        for col in df.columns:
            if col.upper() in ("DATE", "OBSERVATION_DATE"):
                date_col = col
                break

        if date_col is None:
            # Assume first column is date
            date_col = df.columns[0]

        # Find the value column (should be the series ID or second column)
        value_col = series_id if series_id in df.columns else df.columns[1]

        df[date_col] = pd.to_datetime(df[date_col])
        df = df.set_index(date_col)
        df = df[[value_col]].rename(columns={value_col: "price"})

        # Convert to numeric, coercing errors (handles '.' placeholder values)
        df["price"] = pd.to_numeric(df["price"], errors="coerce")

    except Exception as e:
        print(f"  Warning: Failed to fetch {series_id}: {e}")
        return pd.DataFrame()

    # Filter to start date
    df = df[df.index >= START_DATE]

    # FRED housing data is already quarterly, but ensure consistent format
    quarterly = df["price"].resample("QE").last()
    quarterly = quarterly.dropna()

    print(f"  Got {len(quarterly)} quarterly data points")
    return quarterly.to_frame(name="price")


def compute_btc_ratio(btc_df: pd.DataFrame, asset_df: pd.DataFrame) -> pd.DataFrame:
    """Compute how much of an asset is needed to buy 1 BTC."""
    # Align indices
    combined = pd.concat([btc_df["price"], asset_df["price"]], axis=1, keys=["btc", "asset"])
    combined = combined.dropna()

    # Asset per BTC (trends toward 0 as BTC appreciates)
    combined["asset_per_btc"] = combined["asset"] / combined["btc"]

    return combined


def save_to_json(df: pd.DataFrame, filepath: Path, asset_name: str) -> None:
    """Save dataframe to JSON format for web consumption."""
    records = []

    for timestamp, row in df.iterrows():
        records.append({
            "date": timestamp.strftime("%Y-%m-%d"),
            "btc_price": round(row["btc"], 2) if "btc" in row else None,
            "asset_price": round(row["asset"], 2) if "asset" in row else None,
            "asset_per_btc": round(row["asset_per_btc"], 10) if "asset_per_btc" in row else None,
        })

    output = {
        "asset": asset_name,
        "updated_at": datetime.now().isoformat(),
        "data": records,
    }

    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(output, f, indent=2)

    print(f"  Saved {len(records)} records to {filepath.name}")


def save_btc_usd(btc_df: pd.DataFrame) -> None:
    """Save USD value in BTC terms (trends toward 0 as BTC appreciates)."""
    records = []

    for timestamp, row in btc_df.iterrows():
        # 1 / price = how much BTC you get for $1 (trends toward 0)
        records.append({
            "date": timestamp.strftime("%Y-%m-%d"),
            "btc_price_usd": row["price"],
            "btc_per_usd": 1.0 / row["price"],
        })

    output = {
        "asset": "USD in BTC",
        "updated_at": datetime.now().isoformat(),
        "data": records,
    }

    filepath = DATA_DIR / "btc_usd.json"
    with open(filepath, "w") as f:
        json.dump(output, f, indent=2)

    print(f"  Saved {len(records)} records to {filepath.name}")


def main() -> None:
    """Main entry point for updating all price data."""
    print("=" * 50)
    print("BTC Purchasing Power - Data Update")
    print("=" * 50)

    # Fetch BTC data first (needed for all ratios)
    print("\n[1/3] Fetching yfinance data...")
    btc_df = fetch_yfinance_data(YFINANCE_TICKERS["btc_usd"], "Bitcoin")

    if btc_df.empty:
        print("Error: Could not fetch BTC data. Aborting.")
        return

    save_btc_usd(btc_df)

    # Fetch and process other yfinance assets
    for name, ticker in YFINANCE_TICKERS.items():
        if name == "btc_usd":
            continue

        asset_df = fetch_yfinance_data(ticker, name)
        if not asset_df.empty:
            combined = compute_btc_ratio(btc_df, asset_df)
            save_to_json(combined, DATA_DIR / f"{name}.json", name)

    # Fetch and process FRED housing data
    print("\n[2/3] Fetching FRED housing data...")
    for name, series_id in FRED_SERIES.items():
        asset_df = fetch_fred_data(series_id, name)
        if not asset_df.empty:
            combined = compute_btc_ratio(btc_df, asset_df)
            save_to_json(combined, DATA_DIR / f"{name}.json", name)

    print("\n[3/3] Done!")
    print("=" * 50)


if __name__ == "__main__":
    main()