# Changelog

All notable changes to the Helix Trading Strategy will be documented in this file.

## [5.0.0] - 2026-04-07

### Added
- Hard stop catastrophic protection during SL suppression (15× ATR floor)
- Position cap raised to 80% of equity (was bottlenecked at 50%)

### Changed
- **Tighter stop loss**: SL multiplier 2.0× → 1.0× ATR
  (less $ lost per losing trade)
- **Earlier profit lock**: TP1 multiplier 2.0× → 1.0× ATR
  (lifts win rate 78.6% → 84.3%)
- **Risk per trade**: 2% → 3% (previous setting was cap-bound at effective 2%)
- Slippage assumption tightened to 0.02% (realistic BTC 1H taker fill)

### Results
- **Total Return**: +949.7% (from +295.6%)
- **Sharpe Ratio**: 5.40 (from 4.96)
- **Max Drawdown**: 8.55% (from 2.6%)
- **Win Rate**: 84.3% (from 78.6%)
- **Profit Factor**: 12.46 (from 5.05)
- **Expectancy**: $426 per trade (from $140.74)
- **Walk-forward**: 5/5 folds profitable, avg OOS +48.72%

### Caveats
The monotonic V1→V5 improvement is a known overfit signal. V5 still
requires (a) a true holdout OOS test on data excluded from
optimization, (b) a parameter sensitivity matrix to confirm V5 sits
on a plateau rather than a lone peak, and (c) paper trading on
Binance Testnet before any live capital exposure.

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
