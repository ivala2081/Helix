# Changelog

All notable changes to the Helix Trading Strategy will be documented in this file.

## [4.0.0] - 2026-02-09

### Added
- Extended SL suppression to 50 bars (monotonic improvement)
- Optimized TP distribution: 5%/30%/65% for TP1/TP2/TP3

### Changed
- Fixed risk management to flat 2% per trade (was broken tiered sizing)
- Disabled tiered sizing (was ineffective - all scores mapped to 1%)

### Results
- **Total Return**: +295.6% (from +173.2%)
- **Sharpe Ratio**: 4.96 (from 4.66)
- **Max Drawdown**: 2.6% (from 4.1%)
- **Win Rate**: 78.6% (from 75.9%)
- **Profit Factor**: 5.05 (from 3.24)
- **Expectancy**: $140.74 (from $74.64)

## [3.0.0] - 2026-02-08

### Added
- Rebalanced TP allocation: tp1_close 40%→20%
- Extended SL suppression from 19 to 30 bars
- TP3 target adjusted from 8x to 6x ATR

### Changed
- Implemented tiered sizing based on signal score (later found to be no-op)

### Results
- **Total Return**: +173.2% (from +95.5%)
- **Sharpe Ratio**: 4.66 (from 3.36)
- **Max Drawdown**: 4.1% (from 5.9%)
- **Win Rate**: 75.9% (from 71.1%)
- **Profit Factor**: 3.24 (from 2.06)

## [2.0.0] - 2026-02-07

### Added
- Stop loss suppression for first 19 bars (prevents shakeouts)
- Breakeven stop with +0.3 ATR buffer after TP1 hit
- Signal quality filter: minimum score 0.60

### Changed
- Improved risk management logic
- Enhanced trade entry filtering

### Results
- **Total Return**: +95.5% (from +49.7%)
- **Sharpe Ratio**: 3.36 (from 1.81)
- **Max Drawdown**: 5.9% (from 10.3%)
- **Win Rate**: 71.1%
- **Profit Factor**: 2.06

## [1.0.0] - 2026-02-06

### Added
- Initial release
- Market Structure + Fair Value Gap indicators on 1H timeframe
- Fixed take-profit levels (2x, 4x, 8x ATR)
- 2x ATR stop loss
- Progressive position closing (40%/30%/30%)
- Trailing stop disabled (key finding)

### Results
- **Total Return**: +49.7%
- **Sharpe Ratio**: 1.81
- **Max Drawdown**: 10.3%
- **Win Rate**: ~65%

---

## Version Numbering

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible changes or significant strategy rewrites
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

## Performance Metrics Legend

- **Total Return**: Cumulative % return over backtest period
- **Sharpe Ratio**: Risk-adjusted return (>2.0 excellent, >1.0 good)
- **Max Drawdown**: Largest peak-to-trough decline
- **Win Rate**: % of profitable trades
- **Profit Factor**: Gross profit / Gross loss
- **Expectancy**: Average $ profit per trade
