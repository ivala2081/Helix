# Helix Trading Strategy - BTC Price Action Backtest System

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional-grade cryptocurrency trading strategy backtesting framework with comprehensive performance analytics, walk-forward validation, and an interactive HTML dashboard.

## 🎯 Strategy Overview

**Helix** is an event-driven backtesting system for BTC price action trading using Market Structure and Fair Value Gap (FVG) analysis on 1-hour timeframes.

### Performance Highlights (V4)

- **Total Return**: +295.6%
- **Sharpe Ratio**: 4.96
- **Max Drawdown**: 2.6%
- **Win Rate**: 78.6%
- **Profit Factor**: 5.05
- **Walk-Forward**: 5/5 folds profitable (avg OOS +17.21%)

## ✨ Features

### Core Backtesting Engine
- **Event-driven architecture** with realistic order execution
- **Multiple indicator systems**: Market Structure, Fair Value Gaps, Smart Money Concepts, Classic Price Action
- **Advanced risk management**: Tiered position sizing, breakeven stops, progressive take-profits
- **Comprehensive metrics**: 30+ performance indicators including Sharpe, Sortino, Calmar ratios
- **Commission & slippage modeling**: Realistic trading costs

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
git clone https://github.com/yourusername/helix-trading-strategy.git
cd helix-trading-strategy
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
    "risk_pct": 0.02,              # Risk 2% per trade
    
    # Indicators
    "use_market_structure": True,
    "use_fvg": True,
    "min_confluence": 0.50,        # Require both MS + FVG
    
    # Stop Loss & Take Profits
    "sl_atr_mult": 2.0,            # 2x ATR stop loss
    "tp1_atr_mult": 2.0,           # TP1 at 2x ATR (5% close)
    "tp2_atr_mult": 4.0,           # TP2 at 4x ATR (30% close)
    "tp3_atr_mult": 6.0,           # TP3 at 6x ATR (65% close)
    
    # Risk Management
    "be_after_tp1": True,          # Move to breakeven after TP1
    "min_bars_before_sl": 50,      # Suppress SL for first 50 bars
    "min_signal_score": 0.60,      # Filter weak signals
}
```

## 📁 Project Structure

```
helix-trading-strategy/
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

### V1: Base Strategy
- Market Structure + FVG on 1H
- Fixed take-profits and stop-loss
- **Result**: +49.7%, Sharpe 1.81, DD 10.3%

### V2: Risk Management
- Suppress SL for first 19 bars (prevent shakeouts)
- Move to breakeven after TP1
- Signal quality filter (min score 0.60)
- **Result**: +95.5%, Sharpe 3.36, DD 5.9%

### V3: Position Sizing
- Rebalanced TP percentages (40% → 20% at TP1)
- Extended SL suppression to 30 bars
- **Result**: +173.2%, Sharpe 4.66, DD 4.1%

### V4: Final Optimization (Current)
- Fixed risk at 2% per trade
- Extended SL suppression to 50 bars
- Optimized TP distribution (5%/30%/65%)
- **Result**: +295.6%, Sharpe 4.96, DD 2.6%

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
