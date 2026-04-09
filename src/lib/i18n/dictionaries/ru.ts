// Russian dictionary
// Mirrors the shape of en.ts exactly.
// Fintech terms (Sharpe, Sortino, ATR, FVG, BOS, CHoCH, etc.) stay in English.

export const ru = {
  nav: {
    home: "Главная",
    backtest: "Backtest",
    about: "О проекте",
    changelog: "История изменений",
    github: "GitHub",
    skipToContent: "Перейти к содержимому",
  },

  footer: {
    tagline:
      "Backtesting price action институционального уровня для криптовалютных рынков. Открытый исходный код, валидация Walk-forward.",
    starOnGithub: "Звезда на GitHub",
    columns: {
      product: "Продукт",
      resources: "Ресурсы",
      legal: "Юридическая информация",
    },
    links: {
      home: "Главная",
      backtest: "Backtest",
      about: "О проекте",
      changelog: "История изменений",
      githubRepo: "Репозиторий GitHub",
      documentation: "Документация",
      mitLicense: "Лицензия MIT",
      disclaimer: "Отказ от ответственности",
      license: "Лицензия",
    },
    status: "Все системы работают",
    build: "сборка",
    copyright:
      "Прошлые результаты не гарантируют будущей доходности · Не является финансовой рекомендацией.",
  },

  landing: {
    hero: {
      badge: "Стратегия V5 · валидация Walk-forward",
      titleTop: "Backtesting price action",
      titleBottom: "институционального уровня",
      subtitle:
        "Тестируйте стратегии Market Structure + Fair Value Gap на любой паре Binance. Алгоритмы с валидацией Walk-forward — Python не требуется.",
      ctaPrimary: "Запустить Backtest",
      ctaSecondary: "Как это работает",
    },
    socialProof: {
      openSource: "Открытый исходный код на GitHub",
      mitLicense: "Лицензия MIT",
      lastCommit: "Последний коммит",
    },
    marqueeLabel: "Протестировано на",
    kpis: {
      sectionLabel: "BTCUSDT 1H · справочные результаты in-sample",
      totalReturn: "Общая доходность",
      totalReturnSublabel: "BTCUSDT 1H · Янв 2023 → Фев 2026",
      sharpeRatio: "Sharpe ratio",
      sharpeSublabel: "Годовая с поправкой на риск",
      winRate: "Доля прибыльных сделок",
      winRateSublabel: "По всем закрытым сделкам",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "Валовая прибыль / валовой убыток",
    },
    reproduce: {
      lead: "Не верьте нам на слово.",
      cta: "Воспроизведите эти результаты самостоятельно",
    },
    globe: {
      titleTop: "Любой рынок.",
      titleBottom: "Любой таймфрейм.",
      body: "Helix получает данные напрямую из публичного API Binance и запускает весь Backtester V5 локально в вашем браузере. Тестируйте BTCUSDT или малоизвестный альткоин — тот же движок, те же метрики, без серверов, без ограничений.",
      stats: {
        symbols: "пар",
        timeframes: "таймфреймов",
        apiKeys: "ключей API",
      },
    },
    howItWorks: {
      title: "Как это работает",
      subtitle:
        "Три шага. Без кредитной карты. Без Python. Полный движок работает в вашем браузере.",
      cards: {
        pick: {
          title: "1. Выберите рынок",
          text: "Выберите любую спот-пару Binance, таймфрейм и диапазон дат. Данные поступают напрямую из публичного API Binance.",
        },
        engine: {
          title: "2. Движок работает в браузере",
          text: "Backtester V5 анализирует каждый бар — Market Structure, зоны FVG, скоринг конфлюэнции, частичные Take Profits.",
        },
        results: {
          title: "3. Изучите результаты",
          text: "Кривая Equity, Drawdown, журнал сделок, разбивка по причинам выхода, месячная доходность, 30+ профессиональных метрик.",
        },
      },
    },
    strategy: {
      title: "Стратегия Helix V5",
      subtitle: "Два конфлюэнтных преимущества, одна дисциплинированная модель риска.",
      cards: {
        ms: {
          title: "Market Structure",
          text: "Определяет свинг-максимумы и минимумы, классифицирует HH/HL/LH/LL, определяет тренд, затем входит на подтверждениях Break of Structure (BOS) и Change of Character (CHoCH). Сила сигнала масштабируется с зрелостью тренда.",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "Отслеживает зоны дисбаланса из 3 Candlestick, где цена оставила разрыв. Генерирует входы на ретесте, когда цена возвращается в незаполненную зону. Сила взвешена по размеру и свежести разрыва.",
        },
      },
      mini: {
        risk: { label: "Риск на сделку", value: "3% от Equity" },
        sl: { label: "Stop Loss", value: "1× ATR (после подавления 50 баров)" },
        tps: { label: "Take Profits", value: "Прогрессивные: 5% / 30% / 65%" },
      },
    },
    disclaimer:
      "Прошлые результаты не гарантируют будущей доходности. Helix — это исследовательский инструмент исключительно для образовательных целей. Ничто на этом сайте не является финансовой рекомендацией. Торговля криптовалютами сопряжена со значительным риском потерь.",
  },

  parityBadge: {
    title: "Паритет движка",
    titleSuffix: "побитовое совпадение с исследовательским кодом на Python",
    subtitle: "Тот же алгоритм, те же комиссии, тот же slippage. Нажмите, чтобы узнать больше.",
    rows: {
      algorithm: {
        label: "Тот же алгоритм",
        body: "Движок на TypeScript, работающий в вашем браузере, является прямым построчным портом backtester.py, indicators.py и stake_manager.py из исследовательского репозитория на Python. Каждая формула — ATR, определение свингов, классификация BOS/CHoCH, отслеживание зон FVG, агрегатор, фиксированно-дробное позиционирование, PnL частичного закрытия — идентична.",
      },
      execution: {
        label: "Та же модель исполнения",
        body: "0,075% комиссия taker, 0,02% неблагоприятный slippage на стопах/конце данных, без slippage на Take Profits (лимитные ордера). Лимит позиции — 80% от Equity. Идентично опубликованным параметрам V5.",
      },
      warmup: {
        label: "Тот же прогрев и подавление",
        body: "50 баров прогрева перед первым сигналом. 50-барное окно подавления SL после входа, с hard stop 15× ATR для катастрофической защиты в этом окне. Перенос в безубыток на +0,30 ATR после срабатывания TP1.",
      },
      open: {
        label: "Никаких скрытых настроек",
        body: "Открытый исходный код, лицензия MIT. Исходный код Python и исходный код TypeScript — оба на GitHub. Воспроизведите любой результат самостоятельно.",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "Запустите движок Helix V5 на любой паре Binance. Полный Backtest выполняется локально в вашем браузере.",
    historyButton: "История",
    form: {
      configHeading: "Конфигурация",
      customBadge: "Пользовательский",
      quickPickLabel: "Быстрый выбор",
      symbolLabel: "Символ",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "Любая спот-пара Binance (напр., ETHUSDT, SOLUSDT, AVAXUSDT)",
      timeframeLabel: "Таймфрейм",
      timeframes: {
        "15m": "15 минут",
        "30m": "30 минут",
        "1h": "1 час",
        "4h": "4 часа",
        "1d": "1 день",
      },
      startDateLabel: "Дата начала",
      endDateLabel: "Дата окончания",
      initialCapitalLabel: "Начальный капитал (USD)",
      advancedToggle: "Расширенные параметры (настройки V5)",
      advancedFields: {
        riskPct: "Риск %",
        maxPositionPct: "Макс. позиция %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "Мин. оценка сигнала",
        minBarsBeforeSl: "Баров подавления SL",
      },
      resetDefaults: "Сбросить на настройки V5",
      runButton: "Запустить Backtest",
      runningButton: "Выполняется…",
    },
    emptyState: {
      title: "Готов, когда вы готовы",
      body: "Настройте параметры слева и нажмите «Запустить Backtest». Попробуйте настройки V5 на BTCUSDT 1H, чтобы воспроизвести эталонный результат +949%.",
      runBacktest: "Запустить Backtest",
    },
    progress: {
      fetchingTitle: "Загрузка рыночных данных",
      runningTitle: "Выполнение Backtest",
      stages: {
        fetch: "Загрузка данных",
        indicators: "Индикаторы",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest завершён",
      failedTitle: "Backtest не выполнен",
      historyLoaded: "Загружено из истории",
      historyHint: "Нажмите «Запустить Backtest» для повторного запуска",
      csvDownloaded: "CSV загружен",
      csvDownloadedBody: "сделок экспортировано",
      linkCopied: "Ссылка скопирована",
      linkCopiedBody: "Любой, у кого есть эта ссылка, может повторить ваш Backtest",
      copyFailed: "Не удалось скопировать",
      copyFailedBody: "Ваш браузер заблокировал доступ к буферу обмена",
      chartExported: "График экспортирован",
      noChart: "Нет графика для экспорта",
    },
    errors: {
      invalidDateRange: "Некорректный диапазон дат",
      symbolRequired: "Необходимо указать символ (напр., BTCUSDT)",
      notEnoughData: "Недостаточно данных: получено",
      notEnoughDataNeed: "свечей, необходимо минимум",
      generic: "Backtest не выполнен",
    },
    results: {
      kpis: {
        totalReturn: "Общая доходность",
        sharpe: "Sharpe",
        maxDrawdown: "Макс. Drawdown",
        winRate: "Доля прибыльных",
        profitFactor: "Profit Factor",
        expectancy: "Ожидаемая прибыль",
        perTrade: "на сделку",
      },
      exports: {
        downloadCsv: "Скачать CSV",
        copyLink: "Копировать ссылку",
        chartPng: "График PNG",
      },
    },
    charts: {
      equityCurveTitle: "Кривая Equity",
      legendStrategy: "Стратегия",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "Цена",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "сделок",
      exitReasonsTitle: "Причины выхода",
      monthlyReturnsTitle: "Месячная доходность",
      noData: "Нет данных",
    },
    table: {
      heading: "Журнал сделок",
      tradesSuffix: "сделок",
      noTrades: "Сделки не сгенерированы.",
      showAll: "Показать все",
      headers: {
        id: "#",
        side: "Сторона",
        entryDate: "Дата входа",
        entryPrice: "Вход $",
        exitDate: "Дата выхода",
        exitPrice: "Выход $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "Бары",
        exit: "Выход",
      },
    },
    metricsPanel: {
      heading: "Полная разбивка метрик",
      sections: {
        returns: "Доходность",
        risk: "Риск",
        tradeSummary: "Обзор сделок",
        tradeQuality: "Качество сделок",
        costs: "Затраты",
      },
      labels: {
        totalReturn: "Общая доходность",
        annualizedReturn: "Годовая доходность",
        netProfit: "Чистая прибыль",
        finalEquity: "Итоговый Equity",
        yearsTested: "Лет протестировано",
        maxDrawdown: "Макс. Drawdown",
        maxDdDuration: "Макс. длительность DD",
        avgDdDuration: "Средняя длительность DD",
        sharpeRatio: "Sharpe ratio",
        sortinoRatio: "Sortino ratio",
        calmarRatio: "Calmar ratio",
        totalTrades: "Всего сделок",
        winRate: "Доля прибыльных",
        winsLosses: "Прибыльные / Убыточные",
        longTrades: "Сделки Long",
        shortTrades: "Сделки Short",
        avgBarsHeld: "Среднее кол-во баров",
        profitFactor: "Profit Factor",
        payoffRatio: "Коэффициент выплат",
        expectancy: "Ожидаемая прибыль",
        avgWin: "Средний выигрыш",
        avgLoss: "Средний убыток",
        largestWin: "Наибольший выигрыш",
        largestLoss: "Наибольший убыток",
        avgRMultiple: "Средний R-multiple",
        bestRMultiple: "Лучший R-multiple",
        worstRMultiple: "Худший R-multiple",
        maxConsecWins: "Макс. серия побед",
        maxConsecLosses: "Макс. серия убытков",
        totalCommission: "Общая комиссия",
        avgCommissionPerTrade: "Средняя комиссия на сделку",
        commissionPctOfGross: "Комиссия в % от валовой",
        bars: "баров",
        wr: "WR",
      },
    },
  },

  about: {
    metaTitle: "О Helix · Методология и эволюция стратегии",
    metaDescription:
      "Как Helix развивался от V1 до V5 — Market Structure, Fair Value Gap, подавление SL, прогрессивные Take Profits и валидация Walk-forward.",
    title: "О Helix",
    subtitle:
      "Исследовательский фреймворк для тестирования институциональных концепций price action на криптовалютных рынках.",
    onThisPage: "На этой странице",
    sections: {
      evolution: "Эволюция стратегии",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "Скоринг конфлюэнции",
      risk: "Управление рисками",
      tps: "Прогрессивные TPs",
      execution: "Модель исполнения",
      walkForward: "Walk-forward",
      disclaimer: "Отказ от ответственности",
    },
    evolutionIntro:
      "Каждая версия — это единственное валидированное улучшение по сравнению с предыдущей базовой линией. Без curve-fitting — каждое изменение было повторно протестировано с валидацией Walk-forward.",
    table: {
      version: "Версия",
      changes: "Ключевые изменения",
      return: "Доходность",
      sharpe: "Sharpe",
      maxDd: "Макс. DD",
      winRate: "Доля прибыльных",
      current: "текущая",
    },
    methodology: {
      ms: "Движок определяет свинг-максимумы и минимумы, используя окно в 5 баров с обеих сторон. Каждый новый свинг классифицируется как Higher High (HH), Higher Low (HL), Lower High (LH) или Lower Low (LL). Рынок находится в восходящем тренде при HH+HL и в нисходящем при LH+LL. Закрытие выше последнего свинг-максимума в восходящем тренде генерирует Long-сигнал Break of Structure (BOS); смена тренда с восходящего на нисходящий генерирует разворотный сигнал Change of Character (CHoCH). Сила сигнала масштабируется с зрелостью тренда (последовательные однонаправленные свинги) и размером пробойной свечи относительно ATR.",
      fvg: "Fair Value Gap — это паттерн из 3 Candlestick, где цена оставляет незаполненный дисбаланс между свечой 1 и свечой 3. Каждый разрыв должен составлять не менее 0,3× ATR, чтобы считаться значимым. Движок отслеживает каждый активный FVG и генерирует сигнал входа при ретесте, когда цена впервые возвращается в зону. Сила сигнала учитывает размер и свежесть разрыва.",
      confluence:
        "Агрегатор объединяет сигналы Market Structure и FVG в единое решение. Каждый включённый индикатор вносит вклад в нормализованную оценку 0–1. Сделка открывается только при агрегированной оценке не менее 0,50 (требуются два подтверждающих источника) И прохождении пост-агрегационного фильтра 0,60.",
      risk: "V5 рискует 3% от Equity на сделку с лимитом позиции 80%. Stop Loss рассчитывается на уровне 1× ATR — но обычный SL подавляется на первые 50 баров сделки. В окне подавления только «hard stop» на 15× ATR обеспечивает катастрофическую защиту. После 50 баров обычный стоп активируется. Это значительно снижает проблему преждевременных выбиваний, наблюдаемую на волатильных крипторынках.",
      tpsLead: "Прибыль фиксируется тремя траншами:",
      tpsBullets: [
        "5% позиции закрывается на 1× ATR (TP1)",
        "30% закрывается на 4× ATR (TP2) — только после TP1",
        "65% закрывается на 6× ATR (TP3) — только после TP2",
      ],
      tpsTail:
        "При срабатывании TP1 Stop Loss переносится на уровень входа + 0,30 × ATR (безубыток плюс небольшой буфер), фиксируя защиту, пока оставшиеся 95% позиции захватывают более крупное движение.",
      execution:
        "Каждый вход исполняется по цене закрытия бара с 0,02% неблагоприятного slippage. Stop Loss и выходы по окончании данных также включают slippage; исполнение Take Profit — без slippage (лимитные ордера). Каждое частичное закрытие облагается комиссией 0,075% от номинала входа и выхода, реалистично отражая taker-комиссии Binance.",
      walkForward:
        "Исследовательский код на Python выполняет 5-fold валидацию Walk-forward с разделением 60/40 обучение/тест на каждом фолде. V5 показывает 5/5 прибыльных тестовых фолдов со средней доходностью вне выборки +48,72%. Веб-приложение отображает только in-sample Backtest — для полной валидации обратитесь к исследовательскому репозиторию.",
    },
    disclaimer: {
      heading: "Отказ от ответственности",
      body: "Helix — это исследовательский и образовательный инструмент. Результаты Backtest не прогнозируют будущую доходность. Прошлые результаты не являются показателем будущих результатов. Торговля криптовалютами сопряжена со значительным риском потерь и подходит не всем. Ничто на этом сайте не является инвестиционной, финансовой, торговой или иной рекомендацией. Вы несёте полную ответственность за любые решения, принятые на основе представленной здесь информации.",
    },
    cta: "Попробуйте сами",
  },

  changelog: {
    metaTitle: "История изменений и план развития",
    metaDescription:
      "Заметки о выпусках Helix от V1 до V5, а также планы на V6 и исследования live-торговли.",
    badge: "Прогресс исследований · открытый исходный код",
    title: "История изменений и план развития",
    subtitle:
      "Каждая версия Helix — это единственное валидированное улучшение по сравнению с предыдущей. Без curve-fitting — каждое изменение прошло валидацию Walk-forward перед включением.",
    releasesHeading: "Релизы",
    roadmapHeading: "План развития",
    roadmapIntro:
      "Над чем мы работаем далее. Ничего из этого не является обязательством — это направления исследований, примерно упорядоченные по вероятности.",
    currentBadge: "Текущая",
    cta: "Попробуйте V5 на любой паре",
    statuses: {
      inProgress: "В работе",
      planned: "Запланировано",
      researching: "Исследуется",
    },
  },

  notFound: {
    metaTitle: "404 · Страница не найдена",
    code: "404",
    title: "Этот маршрут не существует",
    body: "Страница, которую вы ищете, была перемещена, никогда не существовала, или вы ошиблись в URL. Движок Backtest по-прежнему работает нормально.",
    goHome: "На главную",
    runBacktest: "Запустить Backtest",
  },

  commandPalette: {
    placeholder: "Поиск или переход к…",
    empty: "Нет результатов",
    groups: {
      navigate: "Навигация",
      quickRun: "Быстрый запуск",
      external: "Внешние ссылки",
    },
    items: {
      home: "Главная",
      backtest: "Backtest",
      about: "О проекте",
      changelog: "История изменений",
      runBtc: "Запустить BTCUSDT 1H · 2023→сегодня",
      runEth: "Запустить ETHUSDT 1H · 2023→сегодня",
      runSol: "Запустить SOLUSDT 1H · 2023→сегодня",
      githubRepo: "Репозиторий GitHub",
    },
    hints: {
      navigate: "перейти",
      select: "выбрать",
      toggle: "переключить",
    },
  },

  errorPage: {
    title: "Что-то пошло не так",
    body: "Произошла непредвиденная ошибка при отображении этой страницы.",
    digest: "digest",
    tryAgain: "Попробовать снова",
    backtestTitle: "Страница Backtest упала",
    backtestBody: "Что-то пошло не так при отображении страницы Backtest.",
    reloadBacktest: "Перезагрузить Backtest",
  },

  language: {
    label: "Язык",
  },
} as const;
