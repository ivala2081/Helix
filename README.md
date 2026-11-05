# Helix Trading Strategy - BTC Price Action Backtest System

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional-grade cryptocurrency trading strategy backtesting framework with comprehensive performance analytics, walk-forward validation, and an interactive HTML dashboard.

## 🎯 Strategy Overview

**Helix** is an event-driven backtesting system for BTC price action trading using Market Structure and Fair Value Gap (FVG) analysis on 1-hour timeframes.

### Results: run it yourself

This README does not quote headline backtest numbers on purpose. Clone the repo, run the backtest and the walk-forward on your own data and cost assumptions, and judge the output yourself. Read **Assumptions & limitations** (near the end) first: they change the numbers a lot.

## ✨ Features

### Core Backtesting Engine
- **Event-driven architecture** with realistic order execution
- **Multiple indicator systems**: Market Structure, Fair Value Gaps, Smart Money Concepts, Classic Price Action
- **Advanced risk management**: Tiered position sizing, breakeven stops, progressive take-profits
- **Comprehensive metrics**: 30+ performance indicators including Sharpe, Sortino, Calmar ratios
- **Commission & slippage modeling**: 0.075% commission per side; the strategy config adds 0.02% slippage plus 5% of ATR per fill

### Validation & Analysis
- ✅ **Walk-forward validation** with rolling windows
- ✅ **Monte Carlo simulation** (10,000 iterations)
- ✅ **Multi-asset testing** (BTC, ETH, SOL)
- ✅ **Parameter sensitivity analysis**
- ✅ **Out-of-sample testing**

### Interactive Dashboard
- 📊 Real-time equity curves with drawdown visualization
- 📈 Interactive candlestick charts with trade markers (Lightweight Charts)
- 🎨 Monthly returns heatmap
- 📉 Trade distribution & exit reason analysis
- 💰 Treasury simulation with leverage scenarios (1x to 20x)
- 📅 Year-by-year performance breakdown
- 🔍 R-multiple distribution & profit concentration

## 🚀 Quick Start

### Prerequisites

```bash
# Python 3.8 or higher
python3 --version

# Install required packages
pip install pandas numpy requests
```

### Installation

```bash
git clone https://github.com/ivala2081/helix.git
cd Helix
```

### Run Backtest

```bash
# Run strategy with default parameters
python3 strategy.py

# Run with walk-forward validation
python3 strategy.py --validate

# Generate complete dashboard
python3 generate_dashboard.py
```

The dashboard will be generated at `reports/dashboard.html` - open it in your browser to view comprehensive results.

## 📊 Dashboard Preview

The dashboard provides:
- **KPI Cards**: Quick overview of key metrics
- **Price Chart**: Interactive OHLCV with trade signals
- **Equity Analysis**: Strategy vs Buy & Hold comparison
- **Risk Analytics**: Monte Carlo simulations, drawdown analysis
- **Trade Breakdown**: PnL distribution, exit reasons, duration analysis
- **Treasury Projections**: Capital growth scenarios at different leverage levels

## 🔧 Configuration

Edit `strategy.py` to customize strategy parameters:

```python
STRATEGY_PARAMS = {
    # Capital & Risk
    "initial_capital": 10_000,
    "risk_pct": 0.03,              # V5: 3% risk per trade
    "max_position_pct": 0.80,      # V5: 80% position cap

    # Indicators
    "use_market_structure": True,
    "use_fvg": True,
    "min_confluence": 0.50,        # Require both MS + FVG

    # Stop Loss & Take Profits
    "sl_atr_mult": 1.0,            # V5: 1x ATR stop loss (tight)
    "tp1_atr_mult": 1.0,           # V5: TP1 at 1x ATR (5% close)
    "tp2_atr_mult": 4.0,           # TP2 at 4x ATR (30% close)
    "tp3_atr_mult": 6.0,           # TP3 at 6x ATR (65% close)

    # Risk Management
    "be_after_tp1": True,          # Move to breakeven after TP1
    "min_bars_before_sl": 50,      # Suppress SL for first 50 bars
    "min_signal_score": 0.60,      # Filter weak signals
    "use_hard_stop": True,         # Catastrophic protection
    "hard_stop_atr_mult": 15.0,    # 15x ATR black-swan floor
}
```

## 📁 Project Structure

```
Helix/
├── backtester.py           # Core backtesting engine
├── strategy.py             # Main strategy implementation
├── indicators.py           # Technical indicators (MS, FVG, SMC, PA)
├── stake_manager.py        # Position sizing & risk management
├── adaptation.py           # Adaptive strategy methods
├── generate_dashboard.py   # HTML dashboard generator
├── validate_strategy.py    # Multi-asset & sensitivity testing
├── data_fetcher.py         # Binance data download
├── run_tests.py            # Comprehensive test suite
├── data/                   # Historical price data (CSV)
└── reports/                # Generated reports & dashboards
    └── dashboard.html      # Interactive dashboard
```

## 🧪 Testing & Validation

### Run Comprehensive Tests

```bash
# Test all indicator combinations across timeframes
python3 run_tests.py
```

This will test:
- 3 timeframes (15m, 30m, 1h)
- 8 indicator configurations
- 4 adaptation methods
- = 96 total strategy variants

### Validation Suite

```bash
# Multi-asset validation
python3 -c "from validate_strategy import test_multi_asset; test_multi_asset()"

# Parameter sensitivity
python3 -c "from validate_strategy import test_sensitivity; test_sensitivity()"

# Out-of-sample testing
python3 -c "from validate_strategy import test_out_of_sample; test_out_of_sample()"
```

## 📈 Strategy Evolution

Each version changed the rules below and was re-tuned on the same BTC history. Per-version results are not listed here; see [CHANGELOG.md](CHANGELOG.md) for the full history.

### V1: Base Strategy
- Market Structure + FVG on 1H
- Fixed take-profits and stop-loss

### V2: Risk Management
- Suppress SL for first 19 bars (prevent shakeouts)
- Move to breakeven after TP1
- Signal quality filter (min score 0.60)

### V3: Position Sizing
- Rebalanced TP percentages (40% → 20% at TP1)
- Extended SL suppression to 30 bars

### V4: Risk Stabilization
- Fixed risk at 2% per trade (tiered sizing was a no-op)
- Extended SL suppression to 50 bars
- TP distribution 5% / 30% / 65%

### V5: Current
- Tighter stops: SL 2× → 1× ATR
- Earlier profit lock: TP1 2× → 1× ATR
- Risk per trade 2% → 3%, position cap 50% → 80% of equity

### V6: Shelved
- A redesign that failed its own acceptance gate against V5. See [docs/v6-gate3-verdict.md](docs/v6-gate3-verdict.md).

## 📊 Key Metrics Explained

- **Sharpe Ratio**: Risk-adjusted return (> 2.0 is excellent)
- **Sortino Ratio**: Like Sharpe but only considers downside volatility
- **Calmar Ratio**: Annual return / Max drawdown
- **Profit Factor**: Gross profit / Gross loss (> 2.0 is strong)
- **Expectancy**: Average $ per trade
- **R-Multiple**: Profit/loss relative to initial risk

## 🔍 Data Sources

Historical data is fetched from Binance API:
- Symbol: BTCUSDT
- Interval: 1H
- Period: Jan 2023 - Feb 2026
- Source: Binance REST API

```bash
# Fetch fresh data
python3 -c "from data_fetcher import fetch_klines; fetch_klines('BTCUSDT', '1h', '2023-01-01')"
```

## ⚠️ Assumptions & limitations

Read this before trusting any number the backtester prints.

- **Tuned on the data it is tested on.** V1 → V5 were optimized on BTCUSDT 1H history from 2023 onward, and the backtest reports on that same history. Results only ever improved from one version to the next, which is a classic sign of overfitting.
- **Costs are simplified.** `strategy.py` uses 0.02% slippage plus 5% of ATR per fill and 0.075% commission per side (Binance taker); the bare `Backtester` class defaults slippage to 0. Funding, spread widening in fast markets and market impact are not modelled.
- **The stop-loss is switched off for the first 50 bars.** With `min_bars_before_sl: 50`, the only protection during that window is a hard stop at 15× ATR. In a live account a trade can lose far more than the 1× ATR stop suggests, and drawdowns can be much deeper than in the backtest.
- **Win rate is shaped by the exit design.** TP1 sits at 1× ATR and the stop moves to breakeven after it, so many trades are counted as winners after a small partial close.
- **Positions are large.** 3% risk per trade with up to 80% of equity in one position.
- **1H bars hide the intra-bar path.** When a stop and a target both fall inside the same candle, the outcome depends on the engine's fill-order assumption, not on what actually happened.
- **One venue, one asset class.** Binance spot data; mostly BTC, with ETH and SOL as secondary checks.
- **Stricter re-tests came out much weaker.** On a constrained 3-symbol, 2024–2026 test with fair costs, results were a fraction of the headline backtest. Details: [docs/v6-gate3-verdict.md](docs/v6-gate3-verdict.md).
- **No proven live track record.** Forward testing and Testnet execution are work in progress.

To get a more honest picture: raise slippage, lower `min_bars_before_sl`, run the walk-forward, and test on a period the parameters never saw.

## ⚠️ Disclaimer

**This is for educational and research purposes only.**

- Past performance does not guarantee future results
- Cryptocurrency trading involves substantial risk of loss
- This software is provided "as is" without warranty
- Not financial advice - do your own research
- Use at your own risk

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Indicator implementations based on Smart Money Concepts and Price Action principles
- Dashboard powered by [Chart.js](https://www.chartjs.org/) and [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
- Data provided by [Binance API](https://binance-docs.github.io/apidocs/)

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---
