// Korean dictionary
// Mirrors the shape of en.ts exactly.
// Fintech terms (Sharpe, Sortino, ATR, FVG, BOS, CHoCH, etc.) stay in English.

export const ko = {
  nav: {
    home: "홈",
    backtest: "Backtest",
    about: "소개",
    changelog: "변경 이력",
    github: "GitHub",
    skipToContent: "콘텐츠로 건너뛰기",
  },

  footer: {
    tagline:
      "암호화폐 시장을 위한 기관급 price action Backtesting. 오픈소스, Walk-forward 검증 완료.",
    starOnGithub: "GitHub에서 스타 누르기",
    columns: {
      product: "제품",
      resources: "리소스",
      legal: "법적 정보",
    },
    links: {
      home: "홈",
      backtest: "Backtest",
      about: "소개",
      changelog: "변경 이력",
      githubRepo: "GitHub 저장소",
      documentation: "문서",
      mitLicense: "MIT 라이선스",
      disclaimer: "면책 조항",
      license: "라이선스",
    },
    status: "모든 시스템 정상 운영 중",
    build: "빌드",
    copyright:
      "과거 성과가 미래 결과를 보장하지 않습니다 · 금융 자문이 아닙니다.",
  },

  landing: {
    hero: {
      badge: "V5 전략 · Walk-forward 검증 완료",
      titleTop: "기관급",
      titleBottom: "price action Backtesting",
      subtitle:
        "Binance에 상장된 모든 페어에서 Market Structure + Fair Value Gap 전략을 테스트하세요. Walk-forward 검증된 알고리즘 기반——Python 불필요.",
      ctaPrimary: "Backtest 실행",
      ctaSecondary: "작동 방식",
    },
    socialProof: {
      openSource: "GitHub 오픈소스",
      mitLicense: "MIT 라이선스",
      lastCommit: "최근 커밋",
    },
    marqueeLabel: "테스트 완료",
    kpis: {
      sectionLabel: "BTCUSDT 1H · 인샘플 참조 결과",
      totalReturn: "총 수익률",
      totalReturnSublabel: "BTCUSDT 1H · 2023년 1월 → 2026년 2월",
      sharpeRatio: "Sharpe ratio",
      sharpeSublabel: "연간 위험조정 수익률",
      winRate: "승률",
      winRateSublabel: "전체 청산된 거래 기준",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "총 이익 / 총 손실",
    },
    reproduce: {
      lead: "우리 말만 믿지 마세요.",
      cta: "직접 이 수치를 재현해 보세요",
    },
    globe: {
      titleTop: "모든 시장.",
      titleBottom: "모든 타임프레임.",
      body: "Helix는 Binance 공개 API에서 직접 데이터를 스트리밍하고 V5 Backtester 전체를 브라우저에서 로컬 실행합니다. BTCUSDT든 마이너 알트코인이든——같은 엔진, 같은 지표, 서버 없음, 제한 없음.",
      stats: {
        symbols: "거래쌍",
        timeframes: "타임프레임",
        apiKeys: "API 키",
      },
    },
    howItWorks: {
      title: "작동 방식",
      subtitle:
        "세 단계. 신용카드 불필요. Python 불필요. 전체 엔진이 브라우저에서 실행됩니다.",
      cards: {
        pick: {
          title: "1. 시장 선택",
          text: "Binance 현물 페어, 타임프레임, 날짜 범위를 선택하세요. 데이터는 Binance 공개 API에서 직접 스트리밍됩니다.",
        },
        engine: {
          title: "2. 엔진이 브라우저에서 실행",
          text: "V5 Backtester가 모든 바를 분석합니다——Market Structure, FVG 존, 컨플루언스 스코어링, 부분 Take Profits.",
        },
        results: {
          title: "3. 결과 확인",
          text: "Equity 커브, Drawdown, 거래 로그, 청산 사유 분석, 월별 수익률, 30개 이상의 전문 지표.",
        },
      },
    },
    strategy: {
      title: "Helix V5 전략",
      subtitle: "두 가지 컨플루언트 엣지와 하나의 규율 있는 리스크 모델.",
      cards: {
        ms: {
          title: "Market Structure",
          text: "스윙 고점과 저점을 감지하고 HH/HL/LH/LL로 분류하며 추세를 추론한 후 Break of Structure (BOS) 및 Change of Character (CHoCH) 확인 시 진입합니다. 신호 강도는 추세 성숙도에 따라 변화합니다.",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "가격이 갭을 남긴 3개의 Candlestick 불균형 존을 추적합니다. 가격이 미충전 갭으로 돌아올 때 리테스트 진입 신호를 생성합니다. 강도는 갭 크기와 신선도로 가중됩니다.",
        },
      },
      mini: {
        risk: { label: "거래당 리스크", value: "Equity의 3%" },
        sl: { label: "Stop Loss", value: "1× ATR (50바 억제 후)" },
        tps: { label: "Take Profits", value: "단계적: 5% / 30% / 65%" },
      },
    },
    disclaimer:
      "과거 성과가 미래 결과를 보장하지 않습니다. Helix는 교육 목적의 연구 도구입니다. 이 사이트의 어떤 내용도 금융 자문에 해당하지 않습니다. 암호화폐 거래에는 상당한 손실 위험이 수반됩니다.",
  },

  parityBadge: {
    title: "엔진 동등성",
    titleSuffix: "Python 연구 코드와 비트 단위 일치",
    subtitle: "같은 알고리즘, 같은 수수료, 같은 슬리피지. 자세히 알아보려면 클릭.",
    rows: {
      algorithm: {
        label: "같은 알고리즘",
        body: "브라우저에서 실행되는 TypeScript 엔진은 Python 연구 저장소의 backtester.py, indicators.py, stake_manager.py를 한 줄씩 직접 포팅한 것입니다. 모든 수식——ATR, 스윙 감지, BOS/CHoCH 분류, FVG 존 추적, 어그리게이터, 고정비율 사이징, 부분 청산 PnL——이 동일합니다.",
      },
      execution: {
        label: "같은 체결 모델",
        body: "0.075% 테이커 수수료, 스톱/데이터 종료 시 0.02% 불리한 슬리피지, Take Profits에는 슬리피지 없음(지정가 주문). 포지션 한도는 Equity의 80%. 공개된 V5 파라미터와 동일.",
      },
      warmup: {
        label: "같은 워밍업 및 억제",
        body: "첫 신호 전 50바 워밍업. 진입 후 50바의 SL 억제 윈도우, 해당 기간 동안 15× ATR 하드 스톱이 치명적 손실로부터 보호. TP1 도달 후 Stop Loss를 진입가 + 0.30 × ATR(손익분기 + 소폭 버퍼)로 이동.",
      },
      open: {
        label: "숨겨진 조정 없음",
        body: "오픈소스, MIT 라이선스. Python 소스와 TypeScript 소스 모두 GitHub에 공개되어 있습니다. 어떤 결과든 직접 재현하세요.",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "Binance의 모든 페어에서 Helix V5 엔진을 실행하세요. 전체 Backtest가 브라우저에서 로컬 실행됩니다.",
    historyButton: "이력",
    form: {
      configHeading: "설정",
      customBadge: "사용자 지정",
      quickPickLabel: "빠른 선택",
      symbolLabel: "심볼",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "Binance 현물 페어 (예: ETHUSDT, SOLUSDT, AVAXUSDT)",
      timeframeLabel: "타임프레임",
      timeframes: {
        "15m": "15분",
        "30m": "30분",
        "1h": "1시간",
        "4h": "4시간",
        "1d": "1일",
      },
      startDateLabel: "시작일",
      endDateLabel: "종료일",
      initialCapitalLabel: "초기 자본금 (USD)",
      advancedToggle: "고급 파라미터 (V5 기본값)",
      advancedFields: {
        riskPct: "리스크 %",
        maxPositionPct: "최대 포지션 %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "최소 신호 점수",
        minBarsBeforeSl: "SL 억제 바 수",
      },
      resetDefaults: "V5 기본값으로 초기화",
      runButton: "Backtest 실행",
      runningButton: "실행 중…",
    },
    emptyState: {
      title: "준비 완료",
      body: "왼쪽에서 설정하고 Backtest 실행을 클릭하세요. V5 기본값으로 BTCUSDT 1H에서 +949% 참조 결과를 재현해 보세요.",
      runBacktest: "Backtest 실행",
    },
    progress: {
      fetchingTitle: "시장 데이터 가져오는 중",
      runningTitle: "Backtest 실행 중",
      stages: {
        fetch: "데이터 가져오기",
        indicators: "지표 계산",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest 완료",
      failedTitle: "Backtest 실패",
      historyLoaded: "이력에서 로드됨",
      historyHint: '"Backtest 실행"을 클릭하여 다시 실행',
      csvDownloaded: "CSV 다운로드됨",
      csvDownloadedBody: "건의 거래 내보내기 완료",
      linkCopied: "링크 복사됨",
      linkCopiedBody: "이 URL을 가진 누구나 귀하의 Backtest를 다시 실행할 수 있습니다",
      copyFailed: "복사 실패",
      copyFailedBody: "브라우저가 클립보드 접근을 차단했습니다",
      chartExported: "차트 내보내기 완료",
      noChart: "내보낼 차트가 없습니다",
    },
    errors: {
      invalidDateRange: "유효하지 않은 날짜 범위",
      symbolRequired: "심볼은 필수입니다 (예: BTCUSDT)",
      notEnoughData: "데이터 부족: 수신됨",
      notEnoughDataNeed: "개 캔들, 최소 필요",
      generic: "Backtest 실패",
    },
    results: {
      kpis: {
        totalReturn: "총 수익률",
        sharpe: "Sharpe",
        maxDrawdown: "최대 Drawdown",
        winRate: "승률",
        profitFactor: "Profit Factor",
        expectancy: "기대값",
        perTrade: "거래당",
      },
      exports: {
        downloadCsv: "CSV 다운로드",
        copyLink: "링크 복사",
        chartPng: "차트 PNG",
      },
    },
    charts: {
      equityCurveTitle: "Equity 커브",
      legendStrategy: "전략",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "가격",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "거래",
      exitReasonsTitle: "청산 사유",
      monthlyReturnsTitle: "월별 수익률",
      noData: "데이터 없음",
    },
    table: {
      heading: "거래 로그",
      tradesSuffix: "거래",
      noTrades: "생성된 거래가 없습니다.",
      showAll: "모두 보기",
      headers: {
        id: "#",
        side: "방향",
        entryDate: "진입일",
        entryPrice: "진입가 $",
        exitDate: "청산일",
        exitPrice: "청산가 $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "바",
        exit: "청산",
      },
    },
    metricsPanel: {
      heading: "전체 지표 상세 분석",
      sections: {
        returns: "수익률",
        risk: "리스크",
        tradeSummary: "거래 요약",
        tradeQuality: "거래 품질",
        costs: "비용",
      },
      labels: {
        totalReturn: "총 수익률",
        annualizedReturn: "연간 수익률",
        netProfit: "순이익",
        finalEquity: "최종 Equity",
        yearsTested: "테스트 기간 (년)",
        maxDrawdown: "최대 Drawdown",
        maxDdDuration: "최대 DD 기간",
        avgDdDuration: "평균 DD 기간",
        sharpeRatio: "Sharpe ratio",
        sortinoRatio: "Sortino ratio",
        calmarRatio: "Calmar ratio",
        totalTrades: "총 거래 수",
        winRate: "승률",
        winsLosses: "승리 / 패배",
        longTrades: "Long 거래",
        shortTrades: "Short 거래",
        avgBarsHeld: "평균 보유 바 수",
        profitFactor: "Profit Factor",
        payoffRatio: "페이오프 비율",
        expectancy: "기대값",
        avgWin: "평균 수익",
        avgLoss: "평균 손실",
        largestWin: "최대 수익",
        largestLoss: "최대 손실",
        avgRMultiple: "평균 R-multiple",
        bestRMultiple: "최고 R-multiple",
        worstRMultiple: "최저 R-multiple",
        maxConsecWins: "최대 연승 횟수",
        maxConsecLosses: "최대 연패 횟수",
        totalCommission: "총 수수료",
        avgCommissionPerTrade: "거래당 평균 수수료",
        commissionPctOfGross: "수수료의 총이익 대비 비율",
        bars: "바",
        wr: "WR",
      },
    },
  },

  about: {
    metaTitle: "Helix 소개 · 방법론 및 전략 진화",
    metaDescription:
      "Helix가 V1에서 V5로 어떻게 진화했는지——Market Structure, Fair Value Gap, SL 억제, 단계적 Take Profits, Walk-forward 검증.",
    title: "Helix 소개",
    subtitle:
      "암호화폐 시장에서 기관급 price action 개념을 테스트하기 위한 연구 프레임워크.",
    onThisPage: "이 페이지 목차",
    sections: {
      evolution: "전략 진화",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "컨플루언스 스코어링",
      risk: "리스크 관리",
      tps: "단계적 TPs",
      execution: "체결 모델",
      walkForward: "Walk-forward",
      disclaimer: "면책 조항",
    },
    evolutionIntro:
      "각 버전은 이전 기준선에 대한 단일 검증된 개선입니다. 커브 피팅 없음——모든 변경은 Walk-forward 검증으로 재테스트되었습니다.",
    table: {
      version: "버전",
      changes: "주요 변경",
      return: "수익률",
      sharpe: "Sharpe",
      maxDd: "최대 DD",
      winRate: "승률",
      current: "현재",
    },
    methodology: {
      ms: "엔진은 양쪽 5바 룩백 윈도우를 사용하여 스윙 고점과 저점을 식별합니다. 각 새로운 스윙은 Higher High (HH), Higher Low (HL), Lower High (LH) 또는 Lower Low (LL)로 분류됩니다. HH+HL이 확인되면 상승 추세, LH+LL이면 하락 추세입니다. 상승 추세에서 마지막 스윙 고점을 상향 돌파하는 종가는 Break of Structure (BOS) Long 신호를 생성하고, 상승에서 하락으로의 전환은 Change of Character (CHoCH) 반전 신호를 생성합니다. 신호 강도는 추세 성숙도(동일 방향 연속 스윙)와 브레이크아웃 캔들의 ATR 대비 크기에 따라 변합니다.",
      fvg: "Fair Value Gap은 가격이 Candlestick 1과 Candlestick 3 사이에 미충전 불균형을 남긴 3개의 Candlestick 패턴입니다. 각 갭은 유의미하려면 최소 0.3× ATR 이상이어야 합니다. 엔진은 모든 활성 FVG를 추적하고, 가격이 처음으로 존에 복귀할 때 리테스트 진입 신호를 발생시킵니다. 신호 강도는 더 크고 신선한 갭일수록 높아집니다.",
      confluence:
        "어그리게이터는 Market Structure와 FVG 신호를 단일 결정으로 통합합니다. 각 활성 지표는 0-1 정규화 점수에 기여합니다. 집계 점수가 최소 0.50(두 개의 확인 소스 필요)이고 후집계 필터 0.60을 통과할 때만 거래가 실행됩니다.",
      risk: "V5는 거래당 Equity의 3%를 리스크로 설정하며 포지션 한도는 80%입니다. Stop Loss는 1× ATR로 계산되지만, 일반 SL은 거래 시작 후 첫 50바 동안 억제됩니다. 억제 윈도우 동안 15× ATR 하드 스톱만이 치명적 손실로부터 보호합니다. 50바 이후 일반 스톱이 활성화됩니다. 이를 통해 변동성 높은 암호화폐 시장에서 관찰되는 조기 청산 문제가 크게 줄어듭니다.",
      tpsLead: "이익은 세 단계로 실현됩니다:",
      tpsBullets: [
        "포지션의 5%를 1× ATR에서 청산 (TP1)",
        "30%를 4× ATR에서 청산 (TP2)——TP1 이후에만",
        "65%를 6× ATR에서 청산 (TP3)——TP2 이후에만",
      ],
      tpsTail:
        "TP1 도달 시, Stop Loss를 진입가 + 0.30 × ATR(손익분기 + 소폭 버퍼)로 이동하여 보호를 확보하면서 나머지 95% 포지션이 큰 움직임을 포착하도록 합니다.",
      execution:
        "모든 진입은 바 종가에서 0.02% 불리한 슬리피지로 체결됩니다. Stop Loss 및 데이터 종료 시 청산도 슬리피지를 지불합니다. Take Profit 체결에는 슬리피지가 없습니다(지정가 주문). 각 부분 청산은 진입 및 청산 명목 금액에 0.075% 수수료가 부과되어 Binance 테이커 수수료를 현실적으로 반영합니다.",
      walkForward:
        "Python 연구 코드는 각 폴드에서 60/40 훈련/테스트 분할로 5폴드 Walk-forward 검증을 실행합니다. V5는 5/5 수익성 있는 테스트 폴드를 생성하며, 평균 아웃오브샘플 수익률은 +48.72%입니다. 웹 앱은 인샘플 Backtest만 표시합니다——전체 검증은 연구 저장소를 참조하세요.",
    },
    disclaimer: {
      heading: "면책 조항",
      body: "Helix는 연구 및 교육 도구입니다. Backtest 결과는 미래 성과를 예측하지 않습니다. 과거 성과는 미래 결과를 나타내지 않습니다. 암호화폐 거래에는 상당한 손실 위험이 수반되며 모든 사람에게 적합하지 않습니다. 이 사이트의 어떤 내용도 투자, 금융, 거래 또는 기타 형태의 조언에 해당하지 않습니다. 여기에 제시된 정보에 기반하여 내리는 모든 결정에 대해 귀하가 전적으로 책임집니다.",
    },
    cta: "직접 사용해 보세요",
  },

  changelog: {
    metaTitle: "변경 이력 및 로드맵",
    metaDescription:
      "Helix V1에서 V5까지의 릴리스 노트와 V6 및 실거래 연구의 향후 계획.",
    badge: "연구 진행 상황 · 오픈소스",
    title: "변경 이력 및 로드맵",
    subtitle:
      "Helix의 각 버전은 이전 버전에 대한 단일 검증된 개선입니다. 커브 피팅 없음——모든 변경은 커밋 전 Walk-forward 검증을 통과했습니다.",
    releasesHeading: "릴리스",
    roadmapHeading: "로드맵",
    roadmapIntro:
      "다음에 작업 중인 내용입니다. 확정된 것은 없습니다——가능성 순으로 대략 정렬된 연구 방향입니다.",
    currentBadge: "현재",
    cta: "모든 페어에서 V5 사용해 보기",
    statuses: {
      inProgress: "진행 중",
      planned: "계획됨",
      researching: "연구 중",
    },
  },

  notFound: {
    metaTitle: "404 · 페이지를 찾을 수 없습니다",
    code: "404",
    title: "해당 경로가 존재하지 않습니다",
    body: "찾으시는 페이지가 이동되었거나, 존재한 적이 없거나, URL을 잘못 입력하셨을 수 있습니다. Backtest 엔진은 정상적으로 작동하고 있습니다.",
    goHome: "홈으로",
    runBacktest: "Backtest 실행",
  },

  commandPalette: {
    placeholder: "검색 또는 이동…",
    empty: "결과 없음",
    groups: {
      navigate: "탐색",
      quickRun: "빠른 실행",
      external: "외부 링크",
    },
    items: {
      home: "홈",
      backtest: "Backtest",
      about: "소개",
      changelog: "변경 이력",
      runBtc: "BTCUSDT 1H 실행 · 2023→오늘",
      runEth: "ETHUSDT 1H 실행 · 2023→오늘",
      runSol: "SOLUSDT 1H 실행 · 2023→오늘",
      githubRepo: "GitHub 저장소",
    },
    hints: {
      navigate: "이동",
      select: "선택",
      toggle: "전환",
    },
  },

  errorPage: {
    title: "문제가 발생했습니다",
    body: "이 페이지를 렌더링하는 중 예기치 않은 오류가 발생했습니다.",
    digest: "digest",
    tryAgain: "다시 시도",
    backtestTitle: "Backtest 페이지에 오류가 발생했습니다",
    backtestBody: "Backtest 페이지를 렌더링하는 중 문제가 발생했습니다.",
    reloadBacktest: "Backtest 새로고침",
  },

  language: {
    label: "언어",
  },
} as const;
