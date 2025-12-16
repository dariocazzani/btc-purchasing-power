# BTC Purchasing Power Tracker

A static web app that visualizes Bitcoin's purchasing power against various assets over time.

## Overview

This project tracks how much real-world value 1 BTC can buy, measured against:

| Asset | Source |
|-------|--------|
| USD | Yahoo Finance |
| Gold (per oz) | Yahoo Finance |
| S&P 500 | Yahoo Finance |
| US Median House | FRED |
| Northeast Median House | FRED |
| Midwest Median House | FRED |
| South Median House | FRED |
| West Median House | FRED |

Data is quarterly from 2010 to present.

## Live Demo

Visit: `https://dariocazzani.github.io/btc-purchasing-power/`

## Quick Start

```bash
git clone https://github.com/dariocazzani/btc-purchasing-power.git
cd btc-purchasing-power
uv sync
```

## Usage

### Update Data

```bash
uv run python scripts/update_prices.py
```

This fetches the latest prices from Yahoo Finance and FRED, then writes quarterly JSON files to `data/`.

### Preview Locally

```bash
python -m http.server 8000
```

Open http://localhost:8000 in your browser.

### Deploy

Commit and push. GitHub Pages handles the rest.

```bash
git add .
git commit -m "Update prices"
git push
```

## GitHub Pages Setup

1. Go to **Settings → Pages** in your GitHub repo
2. Under **Source**, select **Deploy from a branch**
3. Choose `main` branch and `/ (root)` folder
4. Click **Save**

Your site will be live at `https://dariocazzani.github.io/btc-purchasing-power/` within a few minutes.

## Project Structure

```
btc-purchasing-power/
├── data/                   # JSON price data (auto-generated)
│   ├── btc_usd.json
│   ├── gold_usd.json
│   ├── sp500.json
│   ├── housing_us_median.json
│   ├── housing_northeast.json
│   ├── housing_midwest.json
│   ├── housing_south.json
│   └── housing_west.json
├── scripts/
│   └── update_prices.py    # Data fetching script
├── index.html              # Main page
├── app.js                  # Chart rendering (Plotly)
├── styles.css              # Styling
├── pyproject.toml          # Python dependencies
└── README.md
```

## Dependencies

**Python** (for data updates):
- yfinance
- pandas

**Frontend** (loaded via CDN):
- Plotly.js

## Data Notes

- All data is resampled to quarterly (end of quarter)
- Housing data from FRED has a 1-2 month lag
- BTC data starts from 2014 (when reliable exchange data became available)
- Gold uses futures prices (GC=F)

## License

MIT