// Simplified Chinese dictionary
// Mirrors the shape of en.ts exactly.
// Fintech terms (Sharpe, Sortino, ATR, FVG, BOS, CHoCH, etc.) stay in English.

export const zh = {
  nav: {
    home: "首页",
    backtest: "Backtest",
    about: "关于",
    changelog: "更新日志",
    github: "GitHub",
    skipToContent: "跳转到内容",
  },

  footer: {
    tagline:
      "面向加密货币市场的机构级 price action Backtesting。开源代码，Walk-forward 验证。",
    starOnGithub: "在 GitHub 上加星",
    columns: {
      product: "产品",
      resources: "资源",
      legal: "法律信息",
    },
    links: {
      home: "首页",
      backtest: "Backtest",
      about: "关于",
      changelog: "更新日志",
      githubRepo: "GitHub 仓库",
      documentation: "文档",
      mitLicense: "MIT 许可证",
      disclaimer: "免责声明",
      license: "许可证",
    },
    status: "所有系统运行正常",
    build: "构建",
    copyright:
      "过去的表现不保证未来的结果 · 不构成财务建议。",
  },

  landing: {
    hero: {
      badge: "V5 策略 · Walk-forward 验证",
      titleTop: "机构级",
      titleBottom: "price action Backtesting",
      subtitle:
        "在任何 Binance 上市交易对上测试 Market Structure + Fair Value Gap 策略。由 Walk-forward 验证算法驱动——无需 Python。",
      ctaPrimary: "运行 Backtest",
      ctaSecondary: "工作原理",
    },
    socialProof: {
      openSource: "GitHub 开源",
      mitLicense: "MIT 许可证",
      lastCommit: "最近提交",
    },
    marqueeLabel: "已测试",
    kpis: {
      sectionLabel: "BTCUSDT 1H · 样本内参考结果",
      totalReturn: "总收益率",
      totalReturnSublabel: "BTCUSDT 1H · 2023年1月 → 2026年2月",
      sharpeRatio: "Sharpe ratio",
      sharpeSublabel: "年化风险调整后",
      winRate: "胜率",
      winRateSublabel: "所有已平仓交易",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "总利润 / 总亏损",
    },
    reproduce: {
      lead: "不要只听我们的话。",
      cta: "自己复现这些数据",
    },
    globe: {
      titleTop: "任何市场。",
      titleBottom: "任何时间周期。",
      body: "Helix 直接从 Binance 公共 API 获取数据，并在您的浏览器中本地运行整个 V5 Backtester。测试 BTCUSDT 或冷门山寨币——同一引擎、同一指标、无服务器、无限制。",
      stats: {
        symbols: "交易对",
        timeframes: "时间周期",
        apiKeys: "API 密钥",
      },
    },
    howItWorks: {
      title: "工作原理",
      subtitle:
        "三个步骤。无需信用卡。无需 Python。完整引擎在您的浏览器中运行。",
      cards: {
        pick: {
          title: "1. 选择您的市场",
          text: "选择任何 Binance 现货交易对、时间周期和日期范围。数据直接从 Binance 公共 API 传输。",
        },
        engine: {
          title: "2. 引擎在浏览器中运行",
          text: "V5 Backtester 分析每根 K 线——Market Structure、FVG 区域、汇合评分、部分 Take Profits。",
        },
        results: {
          title: "3. 查看结果",
          text: "Equity 曲线、Drawdown、交易日志、退出原因分析、月度收益、30+ 专业指标。",
        },
      },
    },
    strategy: {
      title: "Helix V5 策略",
      subtitle: "两个汇合优势，一套严谨的风险模型。",
      cards: {
        ms: {
          title: "Market Structure",
          text: "检测摆动高点和低点，分类 HH/HL/LH/LL，推断趋势，然后在 Break of Structure (BOS) 和 Change of Character (CHoCH) 确认时入场。信号强度随趋势成熟度递增。",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "追踪价格留下缺口的 3 根 Candlestick 失衡区域。当价格回到未填补缺口时生成回测入场信号。强度按缺口大小和新鲜度加权。",
        },
      },
      mini: {
        risk: { label: "每笔交易风险", value: "Equity 的 3%" },
        sl: { label: "Stop Loss", value: "1× ATR（50 根 K 线抑制后）" },
        tps: { label: "Take Profits", value: "渐进式：5% / 30% / 65%" },
      },
    },
    disclaimer:
      "过去的表现不保证未来的结果。Helix 是一款仅用于教育目的的研究工具。本网站上的任何内容均不构成财务建议。加密货币交易涉及重大亏损风险。",
  },

  parityBadge: {
    title: "引擎一致性",
    titleSuffix: "与 Python 研究代码逐位匹配",
    subtitle: "相同算法、相同费用、相同滑点。点击了解更多。",
    rows: {
      algorithm: {
        label: "相同算法",
        body: "在您浏览器中运行的 TypeScript 引擎是 Python 研究仓库中 backtester.py、indicators.py 和 stake_manager.py 的逐行移植。每个公式——ATR、摆动检测、BOS/CHoCH 分类、FVG 区域追踪、聚合器、固定分数仓位管理、部分平仓 PnL——完全一致。",
      },
      execution: {
        label: "相同执行模型",
        body: "0.075% taker 手续费，止损/数据结束时 0.02% 不利滑点，Take Profits 无滑点（限价单）。仓位上限为 Equity 的 80%。与已发布的 V5 参数一致。",
      },
      warmup: {
        label: "相同预热与抑制",
        body: "首个信号前 50 根 K 线预热。入场后 50 根 K 线的 SL 抑制窗口，期间 15× ATR hard stop 提供灾难性保护。TP1 触发后移至入场价 + 0.30 × ATR（盈亏平衡加小幅缓冲）。",
      },
      open: {
        label: "无隐藏调整",
        body: "开源代码，MIT 许可证。Python 源码和 TypeScript 源码均在 GitHub 上。自行复现任何结果。",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "在任何 Binance 交易对上运行 Helix V5 引擎。完整 Backtest 在您的浏览器中本地运行。",
    historyButton: "历史记录",
    form: {
      configHeading: "配置",
      customBadge: "自定义",
      quickPickLabel: "快速选择",
      symbolLabel: "交易对",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "任何 Binance 现货交易对（如 ETHUSDT、SOLUSDT、AVAXUSDT）",
      timeframeLabel: "时间周期",
      timeframes: {
        "15m": "15 分钟",
        "30m": "30 分钟",
        "1h": "1 小时",
        "4h": "4 小时",
        "1d": "1 天",
      },
      startDateLabel: "开始日期",
      endDateLabel: "结束日期",
      initialCapitalLabel: "初始资金 (USD)",
      advancedToggle: "高级参数（V5 默认值）",
      advancedFields: {
        riskPct: "风险 %",
        maxPositionPct: "最大仓位 %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "最低信号评分",
        minBarsBeforeSl: "SL 抑制 K 线数",
      },
      resetDefaults: "恢复 V5 默认值",
      runButton: "运行 Backtest",
      runningButton: "运行中…",
    },
    emptyState: {
      title: "准备就绪",
      body: "在左侧配置参数并点击运行 Backtest。使用 V5 默认值在 BTCUSDT 1H 上复现 +949% 的参考结果。",
      runBacktest: "运行 Backtest",
    },
    progress: {
      fetchingTitle: "正在获取市场数据",
      runningTitle: "正在运行 Backtest",
      stages: {
        fetch: "获取数据",
        indicators: "指标计算",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest 完成",
      failedTitle: "Backtest 失败",
      historyLoaded: "已从历史记录加载",
      historyHint: '点击"运行 Backtest"重新运行',
      csvDownloaded: "CSV 已下载",
      csvDownloadedBody: "笔交易已导出",
      linkCopied: "链接已复制",
      linkCopiedBody: "拥有此链接的任何人都可以重新运行您的 Backtest",
      copyFailed: "复制失败",
      copyFailedBody: "您的浏览器阻止了剪贴板访问",
      chartExported: "图表已导出",
      noChart: "没有可导出的图表",
    },
    errors: {
      invalidDateRange: "日期范围无效",
      symbolRequired: "必须填写交易对（如 BTCUSDT）",
      notEnoughData: "数据不足：获得",
      notEnoughDataNeed: "根 K 线，至少需要",
      generic: "Backtest 失败",
    },
    results: {
      kpis: {
        totalReturn: "总收益率",
        sharpe: "Sharpe",
        maxDrawdown: "最大 Drawdown",
        winRate: "胜率",
        profitFactor: "Profit Factor",
        expectancy: "期望值",
        perTrade: "每笔交易",
      },
      exports: {
        downloadCsv: "下载 CSV",
        copyLink: "复制链接",
        chartPng: "图表 PNG",
      },
    },
    charts: {
      equityCurveTitle: "Equity 曲线",
      legendStrategy: "策略",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "价格",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "笔交易",
      exitReasonsTitle: "退出原因",
      monthlyReturnsTitle: "月度收益",
      noData: "无数据",
    },
    table: {
      heading: "交易日志",
      tradesSuffix: "笔交易",
      noTrades: "未生成交易。",
      showAll: "显示全部",
      headers: {
        id: "#",
        side: "方向",
        entryDate: "入场日期",
        entryPrice: "入场价 $",
        exitDate: "退出日期",
        exitPrice: "退出价 $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "K 线数",
        exit: "退出",
      },
    },
    metricsPanel: {
      heading: "完整指标详情",
      sections: {
        returns: "收益",
        risk: "风险",
        tradeSummary: "交易概要",
        tradeQuality: "交易质量",
        costs: "成本",
      },
      labels: {
        totalReturn: "总收益率",
        annualizedReturn: "年化收益率",
        netProfit: "净利润",
        finalEquity: "最终 Equity",
        yearsTested: "测试年数",
        maxDrawdown: "最大 Drawdown",
        maxDdDuration: "最长 DD 持续时间",
        avgDdDuration: "平均 DD 持续时间",
        sharpeRatio: "Sharpe ratio",
        sortinoRatio: "Sortino ratio",
        calmarRatio: "Calmar ratio",
        totalTrades: "总交易数",
        winRate: "胜率",
        winsLosses: "盈利 / 亏损",
        longTrades: "Long 交易",
        shortTrades: "Short 交易",
        avgBarsHeld: "平均持有 K 线数",
        profitFactor: "Profit Factor",
        payoffRatio: "盈亏比",
        expectancy: "期望值",
        avgWin: "平均盈利",
        avgLoss: "平均亏损",
        largestWin: "最大盈利",
        largestLoss: "最大亏损",
        avgRMultiple: "平均 R-multiple",
        bestRMultiple: "最佳 R-multiple",
        worstRMultiple: "最差 R-multiple",
        maxConsecWins: "最大连胜次数",
        maxConsecLosses: "最大连亏次数",
        totalCommission: "总手续费",
        avgCommissionPerTrade: "每笔交易平均手续费",
        commissionPctOfGross: "手续费占总利润百分比",
        bars: "K 线",
        wr: "WR",
      },
    },
  },

  about: {
    metaTitle: "关于 Helix · 方法论与策略演进",
    metaDescription:
      "Helix 如何从 V1 演进到 V5——Market Structure、Fair Value Gap、SL 抑制、渐进式 Take Profits 和 Walk-forward 验证。",
    title: "关于 Helix",
    subtitle:
      "用于在加密货币市场上测试机构级 price action 概念的研究框架。",
    onThisPage: "本页目录",
    sections: {
      evolution: "策略演进",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "汇合评分",
      risk: "风险管理",
      tps: "渐进式 TPs",
      execution: "执行模型",
      walkForward: "Walk-forward",
      disclaimer: "免责声明",
    },
    evolutionIntro:
      "每个版本都是对上一基线的单一验证改进。无 curve-fitting——每项更改均经过 Walk-forward 验证重新测试。",
    table: {
      version: "版本",
      changes: "关键变更",
      return: "收益率",
      sharpe: "Sharpe",
      maxDd: "最大 DD",
      winRate: "胜率",
      current: "当前",
    },
    methodology: {
      ms: "引擎使用两侧各 5 根 K 线的回溯窗口识别摆动高点和低点。每个新摆动被分类为 Higher High (HH)、Higher Low (HL)、Lower High (LH) 或 Lower Low (LL)。当出现 HH+HL 时市场处于上升趋势，出现 LH+LL 时处于下降趋势。在上升趋势中收盘价突破最近摆动高点产生 Break of Structure (BOS) Long 信号；从上升趋势翻转为下降趋势产生 Change of Character (CHoCH) 反转信号。信号强度随趋势成熟度（连续同向摆动）和突破 K 线相对 ATR 的大小递增。",
      fvg: "Fair Value Gap 是一个 3 根 Candlestick 形态，价格在第 1 根和第 3 根 Candlestick 之间留下未填补的失衡。每个缺口至少需达到 0.3× ATR 才视为有意义。引擎追踪每个活跃 FVG，并在价格首次返回该区域时发出回测入场信号。信号强度奖励较大和较新的缺口。",
      confluence:
        "聚合器将 Market Structure 和 FVG 信号合并为单一决策。每个启用的指标贡献一个归一化的 0-1 分数。仅当聚合分数至少为 0.50（需要两个确认来源）且通过 0.60 的后聚合过滤器时才开仓。",
      risk: "V5 每笔交易风险为 Equity 的 3%，仓位上限 80%。Stop Loss 按 1× ATR 计算——但常规 SL 在交易的前 50 根 K 线内被抑制。抑制窗口期间仅有 15× ATR 的 hard stop 提供灾难性保护。50 根 K 线后常规止损激活。这大幅减少了加密市场波动中观察到的过早止损问题。",
      tpsLead: "利润分三个批次获取：",
      tpsBullets: [
        "5% 仓位在 1× ATR 平仓 (TP1)",
        "30% 在 4× ATR 平仓 (TP2)——仅在 TP1 之后",
        "65% 在 6× ATR 平仓 (TP3)——仅在 TP2 之后",
      ],
      tpsTail:
        "当 TP1 触发时，Stop Loss 移至入场价 + 0.30 × ATR（盈亏平衡加小幅缓冲），锁定保护，同时让剩余 95% 仓位捕获更大行情。",
      execution:
        "每笔入场在 K 线收盘价执行，附加 0.02% 不利滑点。Stop Loss 和数据结束退出也支付滑点；Take Profit 成交不支付滑点（限价单）。每次部分平仓按入场和退出名义价值收取 0.075% 手续费，真实模拟 Binance taker 费率。",
      walkForward:
        "Python 研究代码执行 5 折 Walk-forward 验证，每折 60/40 训练/测试拆分。V5 实现 5/5 盈利测试折，平均样本外收益率 +48.72%。Web 应用仅展示样本内 Backtest——完整验证请参阅研究仓库。",
    },
    disclaimer: {
      heading: "免责声明",
      body: "Helix 是一款研究和教育工具。Backtest 结果不预测未来表现。过去的表现不代表未来的结果。加密货币交易涉及重大亏损风险，并非适合所有人。本网站上的任何内容均不构成投资、财务、交易或任何其他形式的建议。您对基于此处提供的信息所做的任何决定承担全部责任。",
    },
    cta: "亲自试试",
  },

  changelog: {
    metaTitle: "更新日志与路线图",
    metaDescription:
      "Helix 从 V1 到 V5 的版本说明，以及 V6 和实盘交易研究的未来计划。",
    badge: "研究进展 · 开源",
    title: "更新日志与路线图",
    subtitle:
      "Helix 的每个版本都是对上一版本的单一验证改进。无 curve-fitting——每项更改在提交前均经过 Walk-forward 验证。",
    releasesHeading: "版本发布",
    roadmapHeading: "路线图",
    roadmapIntro:
      "我们接下来的工作方向。以下内容均非承诺——这些是研究方向，按可能性大致排序。",
    currentBadge: "当前",
    cta: "在任何交易对上试用 V5",
    statuses: {
      inProgress: "进行中",
      planned: "已规划",
      researching: "研究中",
    },
  },

  notFound: {
    metaTitle: "404 · 页面未找到",
    code: "404",
    title: "该路由不存在",
    body: "您查找的页面已移动、从未存在或您输入了错误的 URL。Backtest 引擎仍在正常运行。",
    goHome: "返回首页",
    runBacktest: "运行 Backtest",
  },

  commandPalette: {
    placeholder: "搜索或跳转到…",
    empty: "无结果",
    groups: {
      navigate: "导航",
      quickRun: "快速运行",
      external: "外部链接",
    },
    items: {
      home: "首页",
      backtest: "Backtest",
      about: "关于",
      changelog: "更新日志",
      runBtc: "运行 BTCUSDT 1H · 2023→今天",
      runEth: "运行 ETHUSDT 1H · 2023→今天",
      runSol: "运行 SOLUSDT 1H · 2023→今天",
      githubRepo: "GitHub 仓库",
    },
    hints: {
      navigate: "导航",
      select: "选择",
      toggle: "切换",
    },
  },

  errorPage: {
    title: "出了点问题",
    body: "渲染此页面时发生意外错误。",
    digest: "digest",
    tryAgain: "重试",
    backtestTitle: "Backtest 页面崩溃",
    backtestBody: "渲染 Backtest 页面时出了点问题。",
    reloadBacktest: "重新加载 Backtest",
  },

  language: {
    label: "语言",
  },
} as const;
