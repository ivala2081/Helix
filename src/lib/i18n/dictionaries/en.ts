// English dictionary — source of truth.
// All other locale files must mirror this shape exactly.
//
// Translation policy: industry-standard fintech terms (Sharpe, Sortino, ATR,
// FVG, BOS, CHoCH, Stop Loss, Take Profit, Backtest, Drawdown, etc.) stay
// in English everywhere. Only natural-language strings get translated.

export const en = {
  nav: {
    home: "Home",
    backtest: "Backtest",
    about: "About",
    changelog: "Changelog",
    github: "GitHub",
    skipToContent: "Skip to content",
  },

  footer: {
    tagline:
      "Institutional-grade price action backtesting for cryptocurrency markets. Open source, walk-forward validated.",
    starOnGithub: "Star on GitHub",
    columns: {
      product: "Product",
      resources: "Resources",
      legal: "Legal",
    },
    links: {
      home: "Home",
      backtest: "Backtest",
      about: "About",
      changelog: "Changelog",
      githubRepo: "GitHub repo",
      documentation: "Documentation",
      mitLicense: "MIT License",
      disclaimer: "Disclaimer",
      license: "License",
    },
    status: "All systems operational",
    build: "build",
    copyright:
      "Past performance does not guarantee future results · Not financial advice.",
  },

  landing: {
    hero: {
      badge: "V5 strategy · walk-forward validated",
      titleTop: "Institutional-grade",
      titleBottom: "price action backtesting",
      subtitle:
        "Test Market Structure + Fair Value Gap strategies on any Binance-listed pair. Powered by walk-forward validated algorithms — no Python required.",
      ctaPrimary: "Run a backtest",
      ctaSecondary: "How it works",
    },
    socialProof: {
      openSource: "Open source on GitHub",
      mitLicense: "MIT license",
      lastCommit: "Last commit",
    },
    marqueeLabel: "Tested on",
    kpis: {
      sectionLabel: "BTCUSDT 1H · in-sample reference results",
      totalReturn: "Total return",
      totalReturnSublabel: "BTCUSDT 1H · Jan 2023 → Feb 2026",
      sharpeRatio: "Sharpe ratio",
      sharpeSublabel: "Annualized risk-adjusted",
      winRate: "Win rate",
      winRateSublabel: "Across all closed trades",
      profitFactor: "Profit factor",
      profitFactorSublabel: "Gross profit / gross loss",
    },
    reproduce: {
      lead: "Don't take our word for it.",
      cta: "Reproduce these numbers yourself",
    },
    globe: {
      titleTop: "Any market.",
      titleBottom: "Any timeframe.",
      body: "Helix streams data directly from the public Binance API and runs the entire V5 backtester locally in your browser. Test BTCUSDT or an obscure altcoin — same engine, same metrics, no servers, no limits.",
      stats: {
        symbols: "symbols",
        timeframes: "timeframes",
        apiKeys: "API keys",
      },
    },
    howItWorks: {
      title: "How it works",
      subtitle:
        "Three steps. No credit card. No Python. The full engine runs in your browser.",
      cards: {
        pick: {
          title: "1. Pick your market",
          text: "Select any Binance spot pair, timeframe, and date range. Data streams directly from the public Binance API.",
        },
        engine: {
          title: "2. Engine runs in browser",
          text: "The V5 backtester analyses every bar — Market Structure, FVG zones, confluence scoring, partial take-profits.",
        },
        results: {
          title: "3. Read the results",
          text: "Equity curve, drawdown, trade log, exit-reason breakdown, monthly returns, 30+ professional metrics.",
        },
      },
    },
    strategy: {
      title: "The Helix V5 strategy",
      subtitle: "Two confluent edges, one disciplined risk model.",
      cards: {
        ms: {
          title: "Market Structure",
          text: "Detects swing highs and lows, classifies HH/HL/LH/LL, infers trend, then enters on Break of Structure (BOS) and Change of Character (CHoCH) confirmations. Signal strength scales with trend maturity.",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "Tracks 3-candle imbalance zones where price left a gap. Generates retest entries when price returns to the unfilled gap. Strength weighted by gap size and freshness.",
        },
      },
      mini: {
        risk: { label: "Risk per trade", value: "3% of equity" },
        sl: { label: "Stop loss", value: "1× ATR (after 50-bar suppression)" },
        tps: { label: "Take profits", value: "Progressive: 5% / 30% / 65%" },
      },
    },
    disclaimer:
      "Past performance does not guarantee future results. Helix is a research tool for educational purposes only. Nothing on this site constitutes financial advice. Trading cryptocurrency involves substantial risk of loss.",
  },

  parityBadge: {
    title: "Engine parity",
    titleSuffix: "bit-for-bit match against the Python research code",
    subtitle: "Same algorithm, same fees, same slippage. Click to learn more.",
    rows: {
      algorithm: {
        label: "Same algorithm",
        body: "The TypeScript engine that runs in your browser is a direct line-by-line port of backtester.py, indicators.py, and stake_manager.py from the Python research repo. Every formula — ATR, swing detection, BOS/CHoCH classification, FVG zone tracking, aggregator, fixed-fractional sizing, partial-close PnL — is the same.",
      },
      execution: {
        label: "Same execution model",
        body: "0.075% taker commission, 0.02% adverse slippage on stops/end-of-data, no slippage on take-profits (limit orders). Position cap at 80% of equity. Identical to the published V5 parameters.",
      },
      warmup: {
        label: "Same warmup & suppression",
        body: "50-bar warmup before the first signal. 50-bar SL suppression window after entry, with the 15× ATR hard stop providing catastrophic protection during that window. Breakeven move at +0.30 ATR after TP1 hits.",
      },
      open: {
        label: "No hidden tweaks",
        body: "Open source, MIT licensed. The Python source and the TypeScript source are both on GitHub. Reproduce any result yourself.",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "Run the Helix V5 engine on any Binance pair. The full backtest runs locally in your browser.",
    historyButton: "History",
    form: {
      configHeading: "Configuration",
      customBadge: "Custom",
      quickPickLabel: "Quick pick",
      symbolLabel: "Symbol",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "Any Binance spot pair (e.g., ETHUSDT, SOLUSDT, AVAXUSDT)",
      timeframeLabel: "Timeframe",
      timeframes: {
        "15m": "15 minutes",
        "30m": "30 minutes",
        "1h": "1 hour",
        "4h": "4 hours",
        "1d": "1 day",
      },
      startDateLabel: "Start Date",
      endDateLabel: "End Date",
      initialCapitalLabel: "Initial Capital (USD)",
      advancedToggle: "Advanced parameters (V5 defaults)",
      advancedFields: {
        riskPct: "Risk %",
        maxPositionPct: "Max position %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "Min signal score",
        minBarsBeforeSl: "SL suppress bars",
      },
      resetDefaults: "Reset to V5 defaults",
      runButton: "Run Backtest",
      runningButton: "Running…",
    },
    emptyState: {
      title: "Ready when you are",
      body: "Configure on the left and click Run Backtest. Try V5 defaults on BTCUSDT 1H to reproduce the +949% reference run.",
      runBacktest: "Run Backtest",
    },
    progress: {
      fetchingTitle: "Fetching market data",
      runningTitle: "Running backtest",
      stages: {
        fetch: "Fetch data",
        indicators: "Indicators",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest complete",
      failedTitle: "Backtest failed",
      historyLoaded: "Loaded from history",
      historyHint: 'Click "Run Backtest" to re-run',
      csvDownloaded: "CSV downloaded",
      csvDownloadedBody: "trades exported",
      linkCopied: "Link copied",
      linkCopiedBody: "Anyone with this URL can re-run your backtest",
      copyFailed: "Copy failed",
      copyFailedBody: "Your browser blocked clipboard access",
      chartExported: "Chart exported",
      noChart: "No chart to export",
    },
    errors: {
      invalidDateRange: "Invalid date range",
      symbolRequired: "Symbol is required (e.g., BTCUSDT)",
      notEnoughData: "Not enough data: got",
      notEnoughDataNeed: "candles, need at least",
      generic: "Backtest failed",
    },
    results: {
      kpis: {
        totalReturn: "Total return",
        sharpe: "Sharpe",
        maxDrawdown: "Max drawdown",
        winRate: "Win rate",
        profitFactor: "Profit factor",
        expectancy: "Expectancy",
        perTrade: "per trade",
      },
      exports: {
        downloadCsv: "Download CSV",
        copyLink: "Copy link",
        chartPng: "Chart PNG",
      },
    },
    charts: {
      equityCurveTitle: "Equity Curve",
      legendStrategy: "Strategy",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "Price",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "trades",
      exitReasonsTitle: "Exit Reasons",
      monthlyReturnsTitle: "Monthly Returns",
      noData: "No data",
    },
    table: {
      heading: "Trade Log",
      tradesSuffix: "trades",
      noTrades: "No trades generated.",
      showAll: "Show all",
      headers: {
        id: "#",
        side: "Side",
        entryDate: "Entry Date",
        entryPrice: "Entry $",
        exitDate: "Exit Date",
        exitPrice: "Exit $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "Bars",
        exit: "Exit",
      },
    },
    metricsPanel: {
      heading: "Full metrics breakdown",
      sections: {
        returns: "Returns",
        risk: "Risk",
        tradeSummary: "Trade summary",
        tradeQuality: "Trade quality",
        costs: "Costs",
      },
      labels: {
        totalReturn: "Total return",
        annualizedReturn: "Annualized return",
        netProfit: "Net profit",
        finalEquity: "Final equity",
        yearsTested: "Years tested",
        maxDrawdown: "Max drawdown",
        maxDdDuration: "Max DD duration",
        avgDdDuration: "Avg DD duration",
        sharpeRatio: "Sharpe ratio",
        sortinoRatio: "Sortino ratio",
        calmarRatio: "Calmar ratio",
        totalTrades: "Total trades",
        winRate: "Win rate",
        winsLosses: "Wins / Losses",
        longTrades: "Long trades",
        shortTrades: "Short trades",
        avgBarsHeld: "Avg bars held",
        profitFactor: "Profit factor",
        payoffRatio: "Payoff ratio",
        expectancy: "Expectancy",
        avgWin: "Avg win",
        avgLoss: "Avg loss",
        largestWin: "Largest win",
        largestLoss: "Largest loss",
        avgRMultiple: "Avg R-multiple",
        bestRMultiple: "Best R-multiple",
        worstRMultiple: "Worst R-multiple",
        maxConsecWins: "Max consecutive wins",
        maxConsecLosses: "Max consecutive losses",
        totalCommission: "Total commission",
        avgCommissionPerTrade: "Avg commission per trade",
        commissionPctOfGross: "Commission as % of gross",
        bars: "bars",
        wr: "WR",
      },
    },
  },

  about: {
    metaTitle: "About Helix · Methodology & Strategy Evolution",
    metaDescription:
      "How Helix evolved from V1 to V5 — Market Structure, Fair Value Gap, SL suppression, progressive take-profits, and walk-forward validation.",
    title: "About Helix",
    subtitle:
      "A research framework for testing institutional price-action concepts on cryptocurrency markets.",
    onThisPage: "On this page",
    sections: {
      evolution: "Strategy evolution",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "Confluence scoring",
      risk: "Risk management",
      tps: "Progressive TPs",
      execution: "Execution model",
      walkForward: "Walk-forward",
      disclaimer: "Disclaimer",
    },
    evolutionIntro:
      "Each version is a single, validated improvement over the previous baseline. No curve-fitting — every change was retested with walk-forward validation.",
    table: {
      version: "Version",
      changes: "Key changes",
      return: "Return",
      sharpe: "Sharpe",
      maxDd: "Max DD",
      winRate: "Win rate",
      current: "current",
    },
    methodology: {
      ms: "The engine identifies swing highs and lows using a 5-bar lookback window on both sides. Each new swing is classified as a Higher High (HH), Higher Low (HL), Lower High (LH), or Lower Low (LL). The market is in an uptrend when we see HH+HL and a downtrend when we see LH+LL. A close that breaks above the last swing high in an uptrend produces a Break of Structure (BOS) long signal; a flip from uptrend to downtrend produces a Change of Character (CHoCH) reversal signal. Signal strength scales with trend maturity (consecutive same-direction swings) and the size of the breakout candle relative to ATR.",
      fvg: "A Fair Value Gap is a 3-candle pattern where price leaves an unfilled imbalance between candle 1 and candle 3. Each gap must be at least 0.3× ATR to count as significant. The engine tracks every active FVG and emits a retest entry signal the first time price returns to the zone. Signal strength rewards larger and fresher gaps.",
      confluence:
        "The aggregator combines Market Structure and FVG signals into a single decision. Each enabled indicator contributes to a normalized 0–1 score. A trade only fires when the aggregated score is at least 0.50 (two confirming sources required) AND passes the post-aggregation filter of 0.60.",
      risk: "V5 risks 3% of equity per trade with an 80% position cap. Stop loss is calculated at 1× ATR — but the regular SL is suppressed for the first 50 bars of the trade. During the suppression window only a 15× ATR \"hard stop\" provides catastrophic protection. After 50 bars the regular stop is active. This dramatically reduces the early-shakeout problem observed in volatile crypto markets.",
      tpsLead: "Profits are taken in three tranches:",
      tpsBullets: [
        "5% of position closed at 1× ATR (TP1)",
        "30% closed at 4× ATR (TP2) — only after TP1",
        "65% closed at 6× ATR (TP3) — only after TP2",
      ],
      tpsTail:
        "When TP1 is hit, the stop loss is moved to entry + 0.30 × ATR (breakeven plus a small buffer), locking in protection while leaving the remaining 95% of size to capture the larger move.",
      execution:
        "Every entry is filled at the bar close with 0.02% adverse slippage. Stop loss and end-of-data exits also pay slippage; take-profit fills do not (they are limit orders). Each partial close is charged 0.075% commission on both the entry and exit notional, mirroring Binance taker fees realistically.",
      walkForward:
        "The Python research code runs 5-fold walk-forward validation with a 60/40 train/test split per fold. V5 produces 5/5 profitable test folds with an average out-of-sample return of +48.72%. The web app shows the in-sample backtest only — for full validation, see the research repository.",
    },
    disclaimer: {
      heading: "Disclaimer",
      body: "Helix is a research and educational tool. Backtested results do not predict future performance. Past performance is not indicative of future results. Trading cryptocurrency carries substantial risk of loss and is not suitable for everyone. Nothing on this site constitutes investment, financial, trading, or any other form of advice. You are solely responsible for any decisions you make based on the information presented here.",
    },
    cta: "Try it yourself",
  },

  changelog: {
    metaTitle: "Changelog & Roadmap",
    metaDescription:
      "Helix release notes from V1 to V5, plus what's coming in V6 and the live trading research.",
    badge: "Research progress · open source",
    title: "Changelog & Roadmap",
    subtitle:
      "Every version of Helix is a single, validated improvement over the previous one. No curve-fitting — every change ran through walk-forward validation before being committed.",
    releasesHeading: "Releases",
    roadmapHeading: "Roadmap",
    roadmapIntro:
      "What we're working on next. None of this is committed — these are research directions, ranked roughly by likelihood.",
    currentBadge: "Current",
    cta: "Try V5 on any pair",
    statuses: {
      inProgress: "In progress",
      planned: "Planned",
      researching: "Researching",
    },
  },

  notFound: {
    metaTitle: "404 · Page not found",
    code: "404",
    title: "That route doesn't exist",
    body: "The page you're looking for has either moved, never existed, or you mistyped the URL. The backtest engine is still running fine.",
    goHome: "Go home",
    runBacktest: "Run a backtest",
  },

  commandPalette: {
    placeholder: "Search or jump to…",
    empty: "No results",
    groups: {
      navigate: "Navigate",
      quickRun: "Quick run",
      external: "External",
    },
    items: {
      home: "Home",
      backtest: "Backtest",
      about: "About",
      changelog: "Changelog",
      runBtc: "Run BTCUSDT 1H · 2023→today",
      runEth: "Run ETHUSDT 1H · 2023→today",
      runSol: "Run SOLUSDT 1H · 2023→today",
      githubRepo: "GitHub repository",
    },
    hints: {
      navigate: "navigate",
      select: "select",
      toggle: "toggle",
    },
  },

  errorPage: {
    title: "Something went wrong",
    body: "An unexpected error occurred while rendering this page.",
    digest: "digest",
    tryAgain: "Try again",
    backtestTitle: "Backtest page crashed",
    backtestBody: "Something went wrong while rendering the backtest page.",
    reloadBacktest: "Reload backtest",
  },

  language: {
    label: "Language",
  },
} as const;

export type Dictionary = typeof en;
