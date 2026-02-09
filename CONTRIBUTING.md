# Contributing to Helix Trading Strategy

First off, thank you for considering contributing to Helix! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

This project adheres to a simple principle: **Be respectful and constructive**.

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report:
1. Check the [issue tracker](https://github.com/yourusername/helix-trading-strategy/issues)
2. Ensure you're using the latest version
3. Collect relevant information (error messages, logs, data)

**Bug Report Template:**
```markdown
**Description**: Clear description of the bug

**Steps to Reproduce**:
1. Step one
2. Step two
3. ...

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- Python version: 
- OS: 
- Data period: 

**Logs/Screenshots**: [if applicable]
```

### 💡 Suggesting Enhancements

Enhancement suggestions are welcome! Consider:

- **New Indicators**: Additional technical indicators or price action patterns
- **Risk Management**: Alternative position sizing or stop-loss methods
- **Performance**: Optimization opportunities
- **Features**: New analysis tools or dashboard components

### 🔧 Pull Requests

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature (`git checkout -b feature/AmazingFeature`)
4. **Make your changes** with clear, logical commits
5. **Test thoroughly** (see Testing Guidelines)
6. **Push** to your branch (`git push origin feature/AmazingFeature`)
7. **Open a Pull Request** with a clear description

## Development Setup

### Prerequisites

```bash
# Python 3.8+
python3 --version

# Virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/helix-trading-strategy.git
cd helix-trading-strategy

# Install dependencies
pip install -r requirements.txt

# Verify installation
python3 strategy.py
```

## Pull Request Process

1. **Update Documentation**: Ensure README.md reflects any changes
2. **Add Tests**: Include tests for new functionality
3. **Update CHANGELOG.md**: Document your changes
4. **Verify Performance**: Run backtest to ensure no regression
5. **Clean Commits**: Squash commits if necessary

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated and passing
- [ ] No performance regression
- [ ] CHANGELOG.md updated

## Coding Standards

### Python Style

Follow [PEP 8](https://pep8.org/) with these specifics:

```python
# Good: Clear naming, type hints, docstrings
def calculate_position_size(
    capital: float,
    risk_pct: float,
    entry_price: float,
    stop_loss: float
) -> dict:
    """
    Calculate position size based on risk parameters.
    
    Args:
        capital: Available capital in $
        risk_pct: Risk per trade as decimal (0.02 = 2%)
        entry_price: Entry price for the trade
        stop_loss: Stop loss price
        
    Returns:
        dict with 'size' and 'risk_amount' keys
    """
    risk_amount = capital * risk_pct
    price_risk = abs(entry_price - stop_loss)
    size = risk_amount / price_risk if price_risk > 0 else 0
    
    return {
        "size": size,
        "risk_amount": risk_amount
    }
```

### Code Organization

```python
# Import order
import os  # Standard library
import sys

import numpy as np  # Third-party
import pandas as pd

from backtester import Backtester  # Local imports
from indicators import add_atr
```

### Commenting

```python
# ═══════════════════════════════════════════════════════
# MAJOR SECTION HEADERS (use sparingly)
# ═══════════════════════════════════════════════════════

# ── Subsection headers ──

# Regular comments for complex logic
# Explain WHY, not WHAT (code should be self-documenting)
```

## Testing Guidelines

### Before Submitting

```bash
# 1. Run basic backtest
python3 strategy.py

# 2. Run validation
python3 strategy.py --validate

# 3. Generate dashboard (verify it loads)
python3 generate_dashboard.py

# 4. Run comprehensive tests
python3 run_tests.py
```

### Performance Benchmarks

Changes should not significantly degrade:
- **Sharpe Ratio**: Should remain > 2.0
- **Max Drawdown**: Should remain < 10%
- **Win Rate**: Should remain > 60%
- **Execution Speed**: Backtest should complete in < 5 minutes

### Test New Indicators

When adding new indicators:

```python
# 1. Add to indicators.py with clear docstring
# 2. Add unit tests (if applicable)
# 3. Add to INDICATOR_CONFIGS in run_tests.py
# 4. Verify performance across timeframes
# 5. Document in README.md
```

## Areas for Contribution

### High Priority

- [ ] Additional indicator systems (e.g., Volume Profile, Order Blocks)
- [ ] Live trading integration (paper trading)
- [ ] Performance optimizations (vectorization, Cython)
- [ ] Extended multi-asset support

### Medium Priority

- [ ] Alternative data sources (FTX, Kraken, etc.)
- [ ] Machine learning signal filters
- [ ] Portfolio backtesting (multiple assets simultaneously)
- [ ] Risk parity position sizing

### Nice to Have

- [ ] Real-time dashboard updates
- [ ] Telegram/Discord notifications
- [ ] Strategy comparison tool
- [ ] Parameter optimization with genetic algorithms

## Questions?

- Open an [issue](https://github.com/yourusername/helix-trading-strategy/issues)
- Discussion in pull requests
- Check existing documentation

## Recognition

Contributors will be acknowledged in:
- README.md Contributors section
- CHANGELOG.md for significant contributions

---

**Thank you for contributing to Helix!** 🚀
