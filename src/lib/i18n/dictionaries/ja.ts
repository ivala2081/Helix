// Japanese dictionary
// Mirrors the shape of en.ts exactly.
// Fintech terms (Sharpe, Sortino, ATR, FVG, BOS, CHoCH, etc.) stay in English.

export const ja = {
  nav: {
    home: "ホーム",
    backtest: "Backtest",
    about: "概要",
    changelog: "変更履歴",
    github: "GitHub",
    skipToContent: "コンテンツへスキップ",
  },

  footer: {
    tagline:
      "暗号通貨市場向け機関投資家レベルの price action Backtesting。オープンソース、Walk-forward 検証済み。",
    starOnGithub: "GitHub でスターを付ける",
    columns: {
      product: "プロダクト",
      resources: "リソース",
      legal: "法的情報",
    },
    links: {
      home: "ホーム",
      backtest: "Backtest",
      about: "概要",
      changelog: "変更履歴",
      githubRepo: "GitHub リポジトリ",
      documentation: "ドキュメント",
      mitLicense: "MIT ライセンス",
      disclaimer: "免責事項",
      license: "ライセンス",
    },
    status: "全システム正常稼働中",
    build: "ビルド",
    copyright:
      "過去のパフォーマンスは将来の結果を保証するものではありません · 金融アドバイスではありません。",
  },

  landing: {
    hero: {
      badge: "V5 戦略 · Walk-forward 検証済み",
      titleTop: "機関投資家レベルの",
      titleBottom: "price action Backtesting",
      subtitle:
        "Binance に上場されている任意のペアで Market Structure + Fair Value Gap 戦略をテスト。Walk-forward 検証済みアルゴリズムで駆動——Python 不要。",
      ctaPrimary: "Backtest を実行",
      ctaSecondary: "仕組み",
    },
    socialProof: {
      openSource: "GitHub でオープンソース",
      mitLicense: "MIT ライセンス",
      lastCommit: "最新コミット",
    },
    marqueeLabel: "テスト済み",
    kpis: {
      sectionLabel: "BTCUSDT 1H · イン・サンプル参考結果",
      totalReturn: "トータルリターン",
      totalReturnSublabel: "BTCUSDT 1H · 2023年1月 → 2026年2月",
      sharpeRatio: "Sharpe ratio",
      sharpeSublabel: "年率リスク調整後",
      winRate: "勝率",
      winRateSublabel: "全クローズ済みトレード",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "総利益 / 総損失",
    },
    reproduce: {
      lead: "私たちの言葉を鵜呑みにしないでください。",
      cta: "ご自身でこの数値を再現してください",
    },
    globe: {
      titleTop: "あらゆる市場。",
      titleBottom: "あらゆる時間足。",
      body: "Helix は Binance の公開 API からデータを直接ストリーミングし、V5 Backtester 全体をブラウザ内でローカル実行します。BTCUSDT でもマイナーなアルトコインでも——同じエンジン、同じ指標、サーバー不要、制限なし。",
      stats: {
        symbols: "通貨ペア",
        timeframes: "時間足",
        apiKeys: "API キー",
      },
    },
    howItWorks: {
      title: "仕組み",
      subtitle:
        "3つのステップ。クレジットカード不要。Python 不要。フルエンジンがブラウザで動作。",
      cards: {
        pick: {
          title: "1. マーケットを選択",
          text: "任意の Binance 現物ペア、時間足、日付範囲を選択。データは Binance 公開 API から直接ストリーミングされます。",
        },
        engine: {
          title: "2. エンジンがブラウザで実行",
          text: "V5 Backtester がすべてのバーを分析——Market Structure、FVG ゾーン、コンフルエンス・スコアリング、部分 Take Profits。",
        },
        results: {
          title: "3. 結果を確認",
          text: "Equity カーブ、Drawdown、トレードログ、エグジット理由の内訳、月次リターン、30以上のプロフェッショナル指標。",
        },
      },
    },
    strategy: {
      title: "Helix V5 戦略",
      subtitle: "2つのコンフルエントな優位性と1つの規律あるリスクモデル。",
      cards: {
        ms: {
          title: "Market Structure",
          text: "スイングの高値・安値を検出し、HH/HL/LH/LL に分類、トレンドを推定。Break of Structure (BOS) および Change of Character (CHoCH) の確認でエントリー。シグナル強度はトレンドの成熟度に応じて変化。",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "価格がギャップを残した 3 本の Candlestick のインバランスゾーンを追跡。価格が未充填ゾーンに戻った際にリテストエントリーシグナルを生成。強度はギャップのサイズと新鮮さで重み付け。",
        },
      },
      mini: {
        risk: { label: "トレードあたりリスク", value: "Equity の 3%" },
        sl: { label: "Stop Loss", value: "1× ATR（50バー抑制後）" },
        tps: { label: "Take Profits", value: "段階式：5% / 30% / 65%" },
      },
    },
    disclaimer:
      "過去のパフォーマンスは将来の結果を保証するものではありません。Helix は教育目的のみの研究ツールです。本サイトのいかなる内容も金融アドバイスを構成するものではありません。暗号通貨の取引には重大な損失リスクが伴います。",
  },

  parityBadge: {
    title: "エンジン同等性",
    titleSuffix: "Python 研究コードとビット単位で一致",
    subtitle: "同じアルゴリズム、同じ手数料、同じスリッページ。詳細はクリック。",
    rows: {
      algorithm: {
        label: "同じアルゴリズム",
        body: "ブラウザで実行される TypeScript エンジンは、Python 研究リポジトリの backtester.py、indicators.py、stake_manager.py の一行一行の直接移植です。すべての数式——ATR、スイング検出、BOS/CHoCH 分類、FVG ゾーン追跡、アグリゲーター、固定分数サイジング、部分クローズ PnL——が同一です。",
      },
      execution: {
        label: "同じ約定モデル",
        body: "0.075% テイカー手数料、ストップ/データ終了時 0.02% 不利スリッページ、Take Profits はスリッページなし（指値注文）。ポジション上限は Equity の 80%。公開された V5 パラメータと同一。",
      },
      warmup: {
        label: "同じウォームアップと抑制",
        body: "最初のシグナル前に 50 バーのウォームアップ。エントリー後 50 バーの SL 抑制ウィンドウ、その間 15× ATR のハードストップが壊滅的な損失から保護。TP1 到達後、Stop Loss をエントリー + 0.30 × ATR（ブレイクイーブン＋小バッファ）に移動。",
      },
      open: {
        label: "隠れた調整なし",
        body: "オープンソース、MIT ライセンス。Python ソースと TypeScript ソースの両方が GitHub にあります。任意の結果をご自身で再現してください。",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "任意の Binance ペアで Helix V5 エンジンを実行。フル Backtest がブラウザ内でローカルに実行されます。",
    historyButton: "履歴",
    form: {
      configHeading: "設定",
      customBadge: "カスタム",
      quickPickLabel: "クイック選択",
      symbolLabel: "シンボル",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "任意の Binance 現物ペア（例：ETHUSDT、SOLUSDT、AVAXUSDT）",
      timeframeLabel: "時間足",
      timeframes: {
        "15m": "15分",
        "30m": "30分",
        "1h": "1時間",
        "4h": "4時間",
        "1d": "1日",
      },
      startDateLabel: "開始日",
      endDateLabel: "終了日",
      initialCapitalLabel: "初期資金 (USD)",
      advancedToggle: "詳細パラメータ（V5 デフォルト）",
      advancedFields: {
        riskPct: "リスク %",
        maxPositionPct: "最大ポジション %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "最低シグナルスコア",
        minBarsBeforeSl: "SL 抑制バー数",
      },
      resetDefaults: "V5 デフォルトに戻す",
      runButton: "Backtest を実行",
      runningButton: "実行中…",
    },
    emptyState: {
      title: "準備完了",
      body: "左側で設定して「Backtest を実行」をクリック。V5 デフォルトで BTCUSDT 1H の +949% 参考結果を再現してみましょう。",
      runBacktest: "Backtest を実行",
    },
    progress: {
      fetchingTitle: "市場データを取得中",
      runningTitle: "Backtest 実行中",
      stages: {
        fetch: "データ取得",
        indicators: "インジケーター",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest 完了",
      failedTitle: "Backtest 失敗",
      historyLoaded: "履歴から読み込み済み",
      historyHint: "「Backtest を実行」をクリックして再実行",
      csvDownloaded: "CSV ダウンロード済み",
      csvDownloadedBody: "件のトレードをエクスポート",
      linkCopied: "リンクをコピー済み",
      linkCopiedBody: "この URL を持つ誰でもあなたの Backtest を再実行できます",
      copyFailed: "コピー失敗",
      copyFailedBody: "ブラウザがクリップボードへのアクセスをブロックしました",
      chartExported: "チャートをエクスポート済み",
      noChart: "エクスポートするチャートがありません",
    },
    errors: {
      invalidDateRange: "無効な日付範囲",
      symbolRequired: "シンボルは必須です（例：BTCUSDT）",
      notEnoughData: "データ不足：取得済み",
      notEnoughDataNeed: "本のキャンドル、最低必要数",
      generic: "Backtest 失敗",
    },
    results: {
      kpis: {
        totalReturn: "トータルリターン",
        sharpe: "Sharpe",
        maxDrawdown: "最大 Drawdown",
        winRate: "勝率",
        profitFactor: "Profit Factor",
        expectancy: "期待値",
        perTrade: "トレードあたり",
      },
      exports: {
        downloadCsv: "CSV ダウンロード",
        copyLink: "リンクをコピー",
        chartPng: "チャート PNG",
      },
    },
    charts: {
      equityCurveTitle: "Equity カーブ",
      legendStrategy: "戦略",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "価格",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "トレード",
      exitReasonsTitle: "エグジット理由",
      monthlyReturnsTitle: "月次リターン",
      noData: "データなし",
    },
    table: {
      heading: "トレードログ",
      tradesSuffix: "トレード",
      noTrades: "トレードが生成されませんでした。",
      showAll: "すべて表示",
      headers: {
        id: "#",
        side: "方向",
        entryDate: "エントリー日",
        entryPrice: "エントリー $",
        exitDate: "エグジット日",
        exitPrice: "エグジット $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "バー",
        exit: "エグジット",
      },
    },
    metricsPanel: {
      heading: "全指標の詳細内訳",
      sections: {
        returns: "リターン",
        risk: "リスク",
        tradeSummary: "トレード概要",
        tradeQuality: "トレード品質",
        costs: "コスト",
      },
      labels: {
        totalReturn: "トータルリターン",
        annualizedReturn: "年率リターン",
        netProfit: "純利益",
        finalEquity: "最終 Equity",
        yearsTested: "テスト期間（年）",
        maxDrawdown: "最大 Drawdown",
        maxDdDuration: "最大 DD 期間",
        avgDdDuration: "平均 DD 期間",
        sharpeRatio: "Sharpe ratio",
        sortinoRatio: "Sortino ratio",
        calmarRatio: "Calmar ratio",
        totalTrades: "総トレード数",
        winRate: "勝率",
        winsLosses: "勝ち / 負け",
        longTrades: "Long トレード",
        shortTrades: "Short トレード",
        avgBarsHeld: "平均保有バー数",
        profitFactor: "Profit Factor",
        payoffRatio: "ペイオフレシオ",
        expectancy: "期待値",
        avgWin: "平均利益",
        avgLoss: "平均損失",
        largestWin: "最大利益",
        largestLoss: "最大損失",
        avgRMultiple: "平均 R-multiple",
        bestRMultiple: "最良 R-multiple",
        worstRMultiple: "最悪 R-multiple",
        maxConsecWins: "最大連勝数",
        maxConsecLosses: "最大連敗数",
        totalCommission: "総手数料",
        avgCommissionPerTrade: "トレードあたり平均手数料",
        commissionPctOfGross: "手数料の対総利益比率",
        bars: "バー",
        wr: "WR",
      },
    },
  },

  about: {
    metaTitle: "Helix について · 方法論と戦略の進化",
    metaDescription:
      "Helix が V1 から V5 にどう進化したか——Market Structure、Fair Value Gap、SL 抑制、段階式 Take Profits、Walk-forward 検証。",
    title: "Helix について",
    subtitle:
      "暗号通貨市場で機関投資家レベルの price action コンセプトをテストするための研究フレームワーク。",
    onThisPage: "このページの内容",
    sections: {
      evolution: "戦略の進化",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "コンフルエンス・スコアリング",
      risk: "リスク管理",
      tps: "段階式 TPs",
      execution: "約定モデル",
      walkForward: "Walk-forward",
      disclaimer: "免責事項",
    },
    evolutionIntro:
      "各バージョンは、前のベースラインに対する単一の検証済み改善です。カーブフィッティングなし——すべての変更は Walk-forward 検証で再テストされています。",
    table: {
      version: "バージョン",
      changes: "主な変更",
      return: "リターン",
      sharpe: "Sharpe",
      maxDd: "最大 DD",
      winRate: "勝率",
      current: "現行",
    },
    methodology: {
      ms: "エンジンは両側 5 バーのルックバックウィンドウを使用してスイングの高値・安値を特定します。各新規スイングは Higher High (HH)、Higher Low (HL)、Lower High (LH)、または Lower Low (LL) に分類されます。HH+HL が確認されると上昇トレンド、LH+LL で下降トレンドです。上昇トレンドで直近のスイング高値を上抜けたクローズは Break of Structure (BOS) の Long シグナルを生成し、上昇から下降への転換は Change of Character (CHoCH) のリバーサルシグナルを生成します。シグナル強度はトレンドの成熟度（同方向の連続スイング数）とブレイクアウトキャンドルの ATR に対する大きさに応じて変化します。",
      fvg: "Fair Value Gap は、価格が Candlestick 1 と Candlestick 3 の間に未充填のインバランスを残した 3 本の Candlestick パターンです。各ギャップは有意と見なされるために少なくとも 0.3× ATR 必要です。エンジンはすべてのアクティブな FVG を追跡し、価格が初めてゾーンに戻った際にリテストエントリーシグナルを発します。シグナル強度はギャップが大きく新鮮なほど高くなります。",
      confluence:
        "アグリゲーターは Market Structure と FVG のシグナルを単一の判断に統合します。各有効インジケーターは 0～1 の正規化スコアに寄与します。集約スコアが少なくとも 0.50（2 つの確認ソースが必要）かつ後集約フィルター 0.60 を通過した場合のみトレードが発動します。",
      risk: "V5 はトレードあたり Equity の 3% をリスクにさらし、ポジション上限は 80% です。Stop Loss は 1× ATR で計算されますが、通常の SL はトレード開始後最初の 50 バー間抑制されます。抑制ウィンドウ中は 15× ATR の「ハードストップ」のみが壊滅的損失から保護します。50 バー後に通常のストップが有効化。これにより、ボラタイルな暗号通貨市場で観察される早期振り落とし問題が大幅に軽減されます。",
      tpsLead: "利益は 3 段階で確定されます：",
      tpsBullets: [
        "ポジションの 5% を 1× ATR で決済 (TP1)",
        "30% を 4× ATR で決済 (TP2)——TP1 後のみ",
        "65% を 6× ATR で決済 (TP3)——TP2 後のみ",
      ],
      tpsTail:
        "TP1 到達時、Stop Loss をエントリー + 0.30 × ATR（ブレイクイーブン＋小バッファ）に移動し、保護を確保しつつ残り 95% のポジションで大きな動きを捉えます。",
      execution:
        "すべてのエントリーはバーの終値で 0.02% の不利スリッページを伴って約定されます。Stop Loss およびデータ終了時のエグジットもスリッページを支払います。Take Profit の約定はスリッページなし（指値注文）。各部分決済はエントリーとエグジットの想定元本に 0.075% の手数料が課され、Binance のテイカー手数料を現実的に反映しています。",
      walkForward:
        "Python 研究コードは各フォルド 60/40 のトレイン/テスト分割で 5 フォールド Walk-forward 検証を実行します。V5 は 5/5 の利益が出るテストフォルドを生成し、平均アウト・オブ・サンプルリターンは +48.72% です。Web アプリはイン・サンプル Backtest のみを表示します——完全な検証については研究リポジトリを参照してください。",
    },
    disclaimer: {
      heading: "免責事項",
      body: "Helix は研究・教育ツールです。Backtest の結果は将来のパフォーマンスを予測するものではありません。過去のパフォーマンスは将来の結果を示すものではありません。暗号通貨の取引には重大な損失リスクが伴い、すべての人に適しているわけではありません。本サイトのいかなる内容も、投資、金融、取引、その他いかなる形式のアドバイスを構成するものではありません。ここに提示された情報に基づいて行う決定については、お客様ご自身が全責任を負います。",
    },
    cta: "ご自身でお試しください",
  },

  changelog: {
    metaTitle: "変更履歴とロードマップ",
    metaDescription:
      "Helix の V1 から V5 までのリリースノート、および V6 とライブ取引研究の今後の計画。",
    badge: "研究の進捗 · オープンソース",
    title: "変更履歴とロードマップ",
    subtitle:
      "Helix の各バージョンは、前バージョンに対する単一の検証済み改善です。カーブフィッティングなし——すべての変更はコミット前に Walk-forward 検証を通過しています。",
    releasesHeading: "リリース",
    roadmapHeading: "ロードマップ",
    roadmapIntro:
      "次に取り組んでいる内容。いずれも確約ではありません——研究の方向性を可能性の高い順に並べたものです。",
    currentBadge: "現行",
    cta: "任意のペアで V5 を試す",
    statuses: {
      inProgress: "進行中",
      planned: "計画済み",
      researching: "調査中",
    },
  },

  notFound: {
    metaTitle: "404 · ページが見つかりません",
    code: "404",
    title: "このルートは存在しません",
    body: "お探しのページは移動されたか、存在しなかったか、URL を誤入力した可能性があります。Backtest エンジンは正常に稼働しています。",
    goHome: "ホームへ",
    runBacktest: "Backtest を実行",
  },

  commandPalette: {
    placeholder: "検索またはジャンプ…",
    empty: "結果なし",
    groups: {
      navigate: "ナビゲーション",
      quickRun: "クイック実行",
      external: "外部リンク",
    },
    items: {
      home: "ホーム",
      backtest: "Backtest",
      about: "概要",
      changelog: "変更履歴",
      runBtc: "BTCUSDT 1H を実行 · 2023→今日",
      runEth: "ETHUSDT 1H を実行 · 2023→今日",
      runSol: "SOLUSDT 1H を実行 · 2023→今日",
      githubRepo: "GitHub リポジトリ",
    },
    hints: {
      navigate: "移動",
      select: "選択",
      toggle: "切替",
    },
  },

  errorPage: {
    title: "問題が発生しました",
    body: "このページのレンダリング中に予期しないエラーが発生しました。",
    digest: "digest",
    tryAgain: "再試行",
    backtestTitle: "Backtest ページがクラッシュしました",
    backtestBody: "Backtest ページのレンダリング中に問題が発生しました。",
    reloadBacktest: "Backtest を再読み込み",
  },

  language: {
    label: "言語",
  },
} as const;
