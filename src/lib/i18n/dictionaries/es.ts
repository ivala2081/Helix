// Spanish (Latin American) dictionary
// Mirrors the shape of en.ts exactly.
//
// Translation policy: industry-standard fintech terms (Sharpe, Sortino, ATR,
// FVG, BOS, CHoCH, Stop Loss, Take Profit, Backtest, Drawdown, etc.) stay
// in English everywhere. Only natural-language strings get translated.

export const es = {
  nav: {
    home: "Inicio",
    backtest: "Backtest",
    live: "Forward Test",
    about: "Acerca de",
    changelog: "Historial de cambios",
    github: "GitHub",
    skipToContent: "Ir al contenido",
  },

  footer: {
    tagline:
      "Backtesting de acción del precio de grado institucional para mercados de criptomonedas. Código abierto, validado con walk-forward.",
    starOnGithub: "Destacar en GitHub",
    columns: {
      product: "Producto",
      resources: "Recursos",
      legal: "Legal",
    },
    links: {
      home: "Inicio",
      backtest: "Backtest",
      live: "Forward Test",
      about: "Acerca de",
      changelog: "Historial de cambios",
      githubRepo: "Repositorio en GitHub",
      documentation: "Documentación",
      mitLicense: "Licencia MIT",
      disclaimer: "Aviso legal",
      license: "Licencia",
    },
    status: "Todos los sistemas operativos",
    build: "compilación",
    copyright:
      "El rendimiento pasado no garantiza resultados futuros · No constituye asesoramiento financiero.",
  },

  landing: {
    hero: {
      badge: "Estrategia V5 · validada con walk-forward",
      titleTop: "Backtesting de acción del precio",
      titleBottom: "de grado institucional",
      subtitle:
        "Prueba estrategias de Market Structure + Fair Value Gap en cualquier par listado en Binance. Impulsado por algoritmos validados con walk-forward — sin necesidad de Python.",
      ctaPrimary: "Ejecutar un backtest",
      ctaSecondary: "Cómo funciona",
    },
    socialProof: {
      openSource: "Código abierto en GitHub",
      mitLicense: "Licencia MIT",
      lastCommit: "Último commit",
    },
    marqueeLabel: "Probado en",
    kpis: {
      sectionLabel: "BTCUSDT 1H · resultados de referencia in-sample",
      totalReturn: "Retorno total",
      totalReturnSublabel: "BTCUSDT 1H · Ene 2023 → Feb 2026",
      sharpeRatio: "Ratio de Sharpe",
      sharpeSublabel: "Ajustado por riesgo, anualizado",
      winRate: "Tasa de acierto",
      winRateSublabel: "En todas las operaciones cerradas",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "Ganancia bruta / pérdida bruta",
    },
    reproduce: {
      lead: "No confíes solo en nuestra palabra.",
      cta: "Reproduce estos números tú mismo",
    },
    globe: {
      titleTop: "Cualquier mercado.",
      titleBottom: "Cualquier temporalidad.",
      body: "Helix transmite datos directamente desde la API pública de Binance y ejecuta el Backtester V5 completo localmente en tu navegador. Prueba BTCUSDT o una altcoin poco conocida — mismo motor, mismas métricas, sin servidores, sin límites.",
      stats: {
        symbols: "símbolos",
        timeframes: "temporalidades",
        apiKeys: "API keys",
      },
    },
    howItWorks: {
      title: "Cómo funciona",
      subtitle:
        "Tres pasos. Sin tarjeta de crédito. Sin Python. El motor completo se ejecuta en tu navegador.",
      cards: {
        pick: {
          title: "1. Elige tu mercado",
          text: "Selecciona cualquier par spot de Binance, temporalidad y rango de fechas. Los datos se transmiten directamente desde la API pública de Binance.",
        },
        engine: {
          title: "2. El motor se ejecuta en el navegador",
          text: "El Backtester V5 analiza cada barra — Market Structure, zonas FVG, puntuación de confluencia, take-profits parciales.",
        },
        results: {
          title: "3. Lee los resultados",
          text: "Curva de Equity, Drawdown, registro de operaciones, desglose por motivo de salida, retornos mensuales, más de 30 métricas profesionales.",
        },
      },
    },
    strategy: {
      title: "La estrategia Helix V5",
      subtitle: "Dos ventajas confluentes, un modelo de riesgo disciplinado.",
      cards: {
        ms: {
          title: "Market Structure",
          text: "Detecta máximos y mínimos de oscilación, clasifica HH/HL/LH/LL, infiere la tendencia y luego entra en confirmaciones de Break of Structure (BOS) y Change of Character (CHoCH). La fuerza de la señal escala con la madurez de la tendencia.",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "Rastrea zonas de desequilibrio de 3 velas donde el precio dejó un vacío. Genera entradas de retesteo cuando el precio regresa al vacío no rellenado. La fuerza se pondera por tamaño del vacío y frescura.",
        },
      },
      mini: {
        risk: { label: "Riesgo por operación", value: "3% del Equity" },
        sl: { label: "Stop Loss", value: "1× ATR (tras supresión de 50 barras)" },
        tps: { label: "Take Profits", value: "Progresivos: 5% / 30% / 65%" },
      },
    },
    disclaimer:
      "El rendimiento pasado no garantiza resultados futuros. Helix es una herramienta de investigación con fines exclusivamente educativos. Nada en este sitio constituye asesoramiento financiero. Operar con criptomonedas conlleva un riesgo sustancial de pérdida.",
  },

  parityBadge: {
    title: "Paridad del motor",
    titleSuffix: "coincidencia bit a bit con el código de investigación en Python",
    subtitle: "Mismo algoritmo, mismas comisiones, mismo slippage. Haz clic para saber más.",
    rows: {
      algorithm: {
        label: "Mismo algoritmo",
        body: "El motor en TypeScript que se ejecuta en tu navegador es un port línea por línea de backtester.py, indicators.py y stake_manager.py del repositorio de investigación en Python. Cada fórmula — ATR, detección de oscilaciones, clasificación BOS/CHoCH, seguimiento de zonas FVG, agregador, dimensionamiento fraccional fijo, PnL de cierre parcial — es idéntica.",
      },
      execution: {
        label: "Mismo modelo de ejecución",
        body: "0.075% de comisión taker, 0.02% de slippage adverso en stops/fin de datos, sin slippage en take-profits (órdenes límite). Posición máxima al 80% del Equity. Idéntico a los parámetros publicados de V5.",
      },
      warmup: {
        label: "Mismo calentamiento y supresión",
        body: "50 barras de calentamiento antes de la primera señal. Ventana de supresión de SL de 50 barras tras la entrada, con el hard stop de 15× ATR proporcionando protección catastrófica durante esa ventana. Movimiento a breakeven en +0.30 ATR después de que se alcance TP1.",
      },
      open: {
        label: "Sin ajustes ocultos",
        body: "Código abierto, licencia MIT. El código fuente en Python y el código fuente en TypeScript están ambos en GitHub. Reproduce cualquier resultado tú mismo.",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "Ejecuta el motor Helix V5 en cualquier par de Binance. El Backtest completo se ejecuta localmente en tu navegador.",
    historyButton: "Historial",
    form: {
      configHeading: "Configuración",
      customBadge: "Personalizado",
      quickPickLabel: "Selección rápida",
      symbolLabel: "Símbolo",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "Cualquier par spot de Binance (ej., ETHUSDT, SOLUSDT, AVAXUSDT)",
      timeframeLabel: "Temporalidad",
      timeframes: {
        "15m": "15 minutos",
        "30m": "30 minutos",
        "1h": "1 hora",
        "4h": "4 horas",
        "1d": "1 día",
      },
      startDateLabel: "Fecha de inicio",
      endDateLabel: "Fecha de fin",
      initialCapitalLabel: "Capital inicial (USD)",
      advancedToggle: "Parámetros avanzados (valores predeterminados V5)",
      advancedFields: {
        riskPct: "Riesgo %",
        maxPositionPct: "Posición máxima %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "Puntuación mínima de señal",
        minBarsBeforeSl: "Barras de supresión de SL",
      },
      resetDefaults: "Restablecer valores V5",
      runButton: "Ejecutar Backtest",
      runningButton: "Ejecutando…",
    },
    emptyState: {
      title: "Listo cuando tú lo estés",
      body: "Configura a la izquierda y haz clic en Ejecutar Backtest. Prueba los valores predeterminados V5 en BTCUSDT 1H para reproducir la ejecución de referencia de +949%.",
      runBacktest: "Ejecutar Backtest",
    },
    progress: {
      fetchingTitle: "Obteniendo datos del mercado",
      runningTitle: "Ejecutando backtest",
      stages: {
        fetch: "Obtener datos",
        indicators: "Indicadores",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest completado",
      failedTitle: "Backtest fallido",
      historyLoaded: "Cargado desde el historial",
      historyHint: 'Haz clic en "Ejecutar Backtest" para volver a ejecutar',
      csvDownloaded: "CSV descargado",
      csvDownloadedBody: "operaciones exportadas",
      linkCopied: "Enlace copiado",
      linkCopiedBody: "Cualquier persona con esta URL puede volver a ejecutar tu backtest",
      copyFailed: "Error al copiar",
      copyFailedBody: "Tu navegador bloqueó el acceso al portapapeles",
      chartExported: "Gráfico exportado",
      noChart: "No hay gráfico para exportar",
    },
    errors: {
      invalidDateRange: "Rango de fechas no válido",
      symbolRequired: "El símbolo es obligatorio (ej., BTCUSDT)",
      notEnoughData: "Datos insuficientes: se obtuvieron",
      notEnoughDataNeed: "velas, se necesitan al menos",
      generic: "El backtest falló",
    },
    results: {
      kpis: {
        totalReturn: "Retorno total",
        sharpe: "Sharpe",
        maxDrawdown: "Drawdown máximo",
        winRate: "Tasa de acierto",
        profitFactor: "Profit Factor",
        expectancy: "Esperanza matemática",
        perTrade: "por operación",
      },
      exports: {
        downloadCsv: "Descargar CSV",
        copyLink: "Copiar enlace",
        chartPng: "Gráfico PNG",
      },
    },
    charts: {
      equityCurveTitle: "Curva de Equity",
      legendStrategy: "Estrategia",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "Precio",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "operaciones",
      exitReasonsTitle: "Motivos de salida",
      monthlyReturnsTitle: "Retornos mensuales",
      noData: "Sin datos",
    },
    table: {
      heading: "Registro de operaciones",
      tradesSuffix: "operaciones",
      noTrades: "No se generaron operaciones.",
      showAll: "Mostrar todo",
      headers: {
        id: "#",
        side: "Lado",
        entryDate: "Fecha de entrada",
        entryPrice: "Entrada $",
        exitDate: "Fecha de salida",
        exitPrice: "Salida $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "Barras",
        exit: "Salida",
      },
    },
    metricsPanel: {
      heading: "Desglose completo de métricas",
      sections: {
        returns: "Retornos",
        risk: "Riesgo",
        tradeSummary: "Resumen de operaciones",
        tradeQuality: "Calidad de operaciones",
        costs: "Costos",
      },
      labels: {
        totalReturn: "Retorno total",
        annualizedReturn: "Retorno anualizado",
        netProfit: "Ganancia neta",
        finalEquity: "Equity final",
        yearsTested: "Años evaluados",
        maxDrawdown: "Drawdown máximo",
        maxDdDuration: "Duración máx. del DD",
        avgDdDuration: "Duración prom. del DD",
        sharpeRatio: "Ratio de Sharpe",
        sortinoRatio: "Ratio de Sortino",
        calmarRatio: "Ratio de Calmar",
        totalTrades: "Total de operaciones",
        winRate: "Tasa de acierto",
        winsLosses: "Ganadoras / Perdedoras",
        longTrades: "Operaciones Long",
        shortTrades: "Operaciones Short",
        avgBarsHeld: "Barras promedio mantenidas",
        profitFactor: "Profit Factor",
        payoffRatio: "Ratio de pago",
        expectancy: "Esperanza matemática",
        avgWin: "Ganancia promedio",
        avgLoss: "Pérdida promedio",
        largestWin: "Mayor ganancia",
        largestLoss: "Mayor pérdida",
        avgRMultiple: "R-multiple promedio",
        bestRMultiple: "Mejor R-multiple",
        worstRMultiple: "Peor R-multiple",
        maxConsecWins: "Máx. ganancias consecutivas",
        maxConsecLosses: "Máx. pérdidas consecutivas",
        totalCommission: "Comisión total",
        avgCommissionPerTrade: "Comisión promedio por operación",
        commissionPctOfGross: "Comisión como % del bruto",
        bars: "barras",
        wr: "WR",
      },
    },
  },

  about: {
    metaTitle: "Acerca de Helix · Metodología y evolución de la estrategia",
    metaDescription:
      "Cómo evolucionó Helix de V1 a V5 — Market Structure, Fair Value Gap, supresión de SL, take-profits progresivos y validación walk-forward.",
    title: "Acerca de Helix",
    subtitle:
      "Un marco de investigación para evaluar conceptos institucionales de acción del precio en mercados de criptomonedas.",
    onThisPage: "En esta página",
    sections: {
      evolution: "Evolución de la estrategia",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "Puntuación de confluencia",
      risk: "Gestión de riesgo",
      tps: "TPs progresivos",
      execution: "Modelo de ejecución",
      walkForward: "Walk-forward",
      disclaimer: "Aviso legal",
    },
    evolutionIntro:
      "Cada versión es una mejora única y validada sobre la línea base anterior. Sin ajuste excesivo — cada cambio fue re-evaluado con validación walk-forward.",
    table: {
      version: "Versión",
      changes: "Cambios clave",
      return: "Retorno",
      sharpe: "Sharpe",
      maxDd: "Máx. DD",
      winRate: "Tasa de acierto",
      current: "actual",
    },
    methodology: {
      ms: "El motor identifica máximos y mínimos de oscilación usando una ventana de 5 barras en ambos lados. Cada nueva oscilación se clasifica como Higher High (HH), Higher Low (HL), Lower High (LH) o Lower Low (LL). El mercado está en tendencia alcista cuando observamos HH+HL y en tendencia bajista cuando observamos LH+LL. Un cierre que rompe por encima del último máximo de oscilación en una tendencia alcista produce una señal Long de Break of Structure (BOS); un cambio de tendencia alcista a bajista produce una señal de reversión Change of Character (CHoCH). La fuerza de la señal escala con la madurez de la tendencia (oscilaciones consecutivas en la misma dirección) y el tamaño de la vela de ruptura relativo al ATR.",
      fvg: "Un Fair Value Gap es un patrón de 3 velas donde el precio deja un desequilibrio no rellenado entre la vela 1 y la vela 3. Cada vacío debe ser de al menos 0.3× ATR para considerarse significativo. El motor rastrea cada FVG activo y emite una señal de entrada por retesteo la primera vez que el precio regresa a la zona. La fuerza de la señal premia los vacíos más grandes y más recientes.",
      confluence:
        "El agregador combina las señales de Market Structure y FVG en una sola decisión. Cada indicador habilitado contribuye a una puntuación normalizada de 0 a 1. Una operación solo se ejecuta cuando la puntuación agregada es al menos 0.50 (se requieren dos fuentes de confirmación) Y supera el filtro posterior a la agregación de 0.60.",
      risk: "V5 arriesga el 3% del Equity por operación con un límite de posición del 80%. El Stop Loss se calcula en 1× ATR — pero el SL regular se suprime durante las primeras 50 barras de la operación. Durante la ventana de supresión, solo un \"hard stop\" de 15× ATR proporciona protección catastrófica. Después de 50 barras, el stop regular se activa. Esto reduce drásticamente el problema de sacudidas tempranas observado en los mercados volátiles de criptomonedas.",
      tpsLead: "Las ganancias se toman en tres tramos:",
      tpsBullets: [
        "5% de la posición cerrada en 1× ATR (TP1)",
        "30% cerrada en 4× ATR (TP2) — solo después de TP1",
        "65% cerrada en 6× ATR (TP3) — solo después de TP2",
      ],
      tpsTail:
        "Cuando se alcanza TP1, el Stop Loss se mueve a entrada + 0.30 × ATR (breakeven más un pequeño margen), asegurando protección mientras se deja el 95% restante del tamaño para capturar el movimiento mayor.",
      execution:
        "Cada entrada se ejecuta al cierre de la barra con 0.02% de slippage adverso. Las salidas por Stop Loss y fin de datos también pagan slippage; las ejecuciones de Take Profit no (son órdenes límite). Cada cierre parcial se carga con 0.075% de comisión tanto en el nocional de entrada como de salida, reflejando de manera realista las comisiones taker de Binance.",
      walkForward:
        "El código de investigación en Python ejecuta validación walk-forward de 5 pliegues con una división 60/40 de entrenamiento/prueba por pliegue. V5 produce 5/5 pliegues de prueba rentables con un retorno promedio fuera de muestra de +48.72%. La aplicación web muestra solo el backtest in-sample — para la validación completa, consulta el repositorio de investigación.",
    },
    disclaimer: {
      heading: "Aviso legal",
      body: "Helix es una herramienta de investigación y educación. Los resultados de backtesting no predicen el rendimiento futuro. El rendimiento pasado no es indicativo de resultados futuros. Operar con criptomonedas conlleva un riesgo sustancial de pérdida y no es adecuado para todos. Nada en este sitio constituye asesoramiento de inversión, financiero, de trading ni de ningún otro tipo. Usted es el único responsable de cualquier decisión que tome basándose en la información presentada aquí.",
    },
    cta: "Pruébalo tú mismo",
  },

  changelog: {
    metaTitle: "Historial de cambios y hoja de ruta",
    metaDescription:
      "Notas de versión de Helix desde V1 hasta V5, además de lo que viene en V6 y la investigación de trading en vivo.",
    badge: "Progreso de investigación · código abierto",
    title: "Historial de cambios y hoja de ruta",
    subtitle:
      "Cada versión de Helix es una mejora única y validada sobre la anterior. Sin ajuste excesivo — cada cambio pasó por validación walk-forward antes de ser confirmado.",
    releasesHeading: "Versiones",
    roadmapHeading: "Hoja de ruta",
    roadmapIntro:
      "En lo que estamos trabajando a continuación. Nada de esto está comprometido — son direcciones de investigación, ordenadas aproximadamente por probabilidad.",
    currentBadge: "Actual",
    cta: "Prueba V5 en cualquier par",
    statuses: {
      inProgress: "En progreso",
      planned: "Planificado",
      researching: "En investigación",
    },
  },

  notFound: {
    metaTitle: "404 · Página no encontrada",
    code: "404",
    title: "Esa ruta no existe",
    body: "La página que buscas se movió, nunca existió o escribiste mal la URL. El motor de backtest sigue funcionando correctamente.",
    goHome: "Ir al inicio",
    runBacktest: "Ejecutar un backtest",
  },

  commandPalette: {
    placeholder: "Buscar o ir a…",
    empty: "Sin resultados",
    groups: {
      navigate: "Navegar",
      quickRun: "Ejecución rápida",
      external: "Externo",
    },
    items: {
      home: "Inicio",
      backtest: "Backtest",
      about: "Acerca de",
      changelog: "Historial de cambios",
      runBtc: "Ejecutar BTCUSDT 1H · 2023→hoy",
      runEth: "Ejecutar ETHUSDT 1H · 2023→hoy",
      runSol: "Ejecutar SOLUSDT 1H · 2023→hoy",
      githubRepo: "Repositorio en GitHub",
    },
    hints: {
      navigate: "navegar",
      select: "seleccionar",
      toggle: "alternar",
    },
  },

  errorPage: {
    title: "Algo salió mal",
    body: "Ocurrió un error inesperado al renderizar esta página.",
    digest: "resumen",
    tryAgain: "Intentar de nuevo",
    backtestTitle: "La página de Backtest falló",
    backtestBody: "Algo salió mal al renderizar la página de backtest.",
    reloadBacktest: "Recargar backtest",
  },

  live: {
    badge: "Forward test desde",
    title: "Forward Test en Vivo",
    subtitle: "Helix V5 ejecutándose en 5 monedas con $10.000 de capital virtual cada una. Velas reales de Binance 1h, sin anticipación, sin reinicios.",
    disclaimer: "Helix V5 fue optimizado con datos BTC 1h de Ene 2023 – Feb 2026. Este panel en vivo es la única prueba fuera de muestra real. Los resultados pueden diferir significativamente del backtest.",
    chartTitle: "Curva de Capital (todas las monedas)",
    openPositionsTitle: "Posiciones Abiertas",
    lastTick: "Último tick",
    loading: "Cargando datos en vivo...",
    errorPrefix: "Error al cargar datos:",
    kpis: {
      totalEquity: "Capital Total",
      totalReturn: "Retorno Total",
      bestPerformer: "Mejor Rendimiento",
      totalTrades: "Total de Trades",
    },
    trades: {
      title: "Trades Recientes",
      coin: "Moneda",
      dir: "Dir",
      entry: "Entrada",
      exit: "Salida",
      pnl: "G/P",
      reason: "Razón",
      time: "Hora",
    },
    updated: "Actualizado",
  },

  language: {
    label: "Idioma",
  },
} as const;
