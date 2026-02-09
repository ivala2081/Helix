#!/bin/bash

# Helix Trading Strategy - Quick Start Script
# This script sets up and runs the backtest system

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        HELIX Trading Strategy - Quick Start                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Python version
echo "🔍 Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.8"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Error: Python 3.8+ required (found $PYTHON_VERSION)"
    exit 1
fi
echo "✅ Python $PYTHON_VERSION detected"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt
echo "✅ Dependencies installed"
echo ""

# Check for data files
echo "📊 Checking for data files..."
DATA_COUNT=$(ls -1 data/*.csv 2>/dev/null | wc -l)

if [ "$DATA_COUNT" -eq 0 ]; then
    echo "⚠️  No data files found. Fetching data from Binance..."
    python3 -c "from data_fetcher import fetch_klines; fetch_klines('BTCUSDT', '1h', '2023-01-01')"
    echo "✅ Data downloaded"
else
    echo "✅ Found $DATA_COUNT data file(s)"
fi
echo ""

# Menu
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  What would you like to do?                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  1) Run backtest with default parameters"
echo "  2) Run backtest with walk-forward validation"
echo "  3) Generate comprehensive dashboard"
echo "  4) Run full test suite (all configurations)"
echo "  5) Exit"
echo ""
read -p "Enter your choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running backtest..."
        python3 strategy.py
        ;;
    2)
        echo ""
        echo "🚀 Running backtest with validation..."
        python3 strategy.py --validate
        ;;
    3)
        echo ""
        echo "🚀 Generating dashboard..."
        python3 generate_dashboard.py
        echo ""
        echo "✅ Dashboard generated!"
        echo "📊 Open: reports/dashboard.html"
        
        # Try to open in browser
        if command -v xdg-open > /dev/null; then
            xdg-open reports/dashboard.html
        elif command -v open > /dev/null; then
            open reports/dashboard.html
        else
            echo "🌐 Open reports/dashboard.html in your browser"
        fi
        ;;
    4)
        echo ""
        echo "🚀 Running comprehensive test suite..."
        echo "⚠️  This may take 10-30 minutes..."
        python3 run_tests.py
        ;;
    5)
        echo ""
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Complete!                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Next steps:"
echo "  • View results above"
echo "  • Check reports/dashboard.html for interactive analysis"
echo "  • Modify strategy.py to customize parameters"
echo "  • Read README.md for more information"
echo ""
