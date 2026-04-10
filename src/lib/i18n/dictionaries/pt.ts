// Brazilian Portuguese dictionary
// Mirrors the shape of en.ts exactly.
// Fintech terms (Sharpe, Sortino, ATR, FVG, BOS, CHoCH, etc.) stay in English.

export const pt = {
  nav: {
    home: "Inicio",
    backtest: "Backtest",
    live: "Forward Test",
    about: "Sobre",
    changelog: "Historico",
    github: "GitHub",
    skipToContent: "Pular para o conteudo",
  },

  footer: {
    tagline:
      "Backtesting de price action de nivel institucional para mercados de criptomoedas. Codigo aberto, validado por Walk-forward.",
    starOnGithub: "Estrela no GitHub",
    columns: {
      product: "Produto",
      resources: "Recursos",
      legal: "Juridico",
    },
    links: {
      home: "Inicio",
      backtest: "Backtest",
      live: "Forward Test",
      about: "Sobre",
      changelog: "Historico",
      githubRepo: "Repositorio GitHub",
      documentation: "Documentacao",
      mitLicense: "Licenca MIT",
      disclaimer: "Aviso legal",
      license: "Licenca",
    },
    status: "Todos os sistemas operacionais",
    build: "build",
    copyright:
      "Desempenho passado nao garante resultados futuros · Nao constitui aconselhamento financeiro.",
  },

  landing: {
    hero: {
      badge: "Estrategia V5 · validada por Walk-forward",
      titleTop: "Backtesting de price action",
      titleBottom: "de nivel institucional",
      subtitle:
        "Teste estrategias de Market Structure + Fair Value Gap em qualquer par listado na Binance. Alimentado por algoritmos validados por Walk-forward — sem necessidade de Python.",
      ctaPrimary: "Executar um Backtest",
      ctaSecondary: "Como funciona",
    },
    socialProof: {
      openSource: "Codigo aberto no GitHub",
      mitLicense: "Licenca MIT",
      lastCommit: "Ultimo commit",
    },
    marqueeLabel: "Testado em",
    kpis: {
      sectionLabel: "BTCUSDT 1H · resultados de referencia in-sample",
      totalReturn: "Retorno total",
      totalReturnSublabel: "BTCUSDT 1H · Jan 2023 → Fev 2026",
      sharpeRatio: "Sharpe ratio",
      sharpeSublabel: "Ajustado ao risco anualizado",
      winRate: "Taxa de acerto",
      winRateSublabel: "Em todas as operacoes encerradas",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "Lucro bruto / perda bruta",
    },
    reproduce: {
      lead: "Nao acredite apenas na nossa palavra.",
      cta: "Reproduza esses numeros voce mesmo",
    },
    globe: {
      titleTop: "Qualquer mercado.",
      titleBottom: "Qualquer timeframe.",
      body: "O Helix transmite dados diretamente da API publica da Binance e executa todo o Backtester V5 localmente no seu navegador. Teste BTCUSDT ou uma altcoin obscura — mesmo motor, mesmas metricas, sem servidores, sem limites.",
      stats: {
        symbols: "pares",
        timeframes: "timeframes",
        apiKeys: "chaves de API",
      },
    },
    howItWorks: {
      title: "Como funciona",
      subtitle:
        "Tres passos. Sem cartao de credito. Sem Python. O motor completo roda no seu navegador.",
      cards: {
        pick: {
          title: "1. Escolha seu mercado",
          text: "Selecione qualquer par spot da Binance, timeframe e intervalo de datas. Os dados sao transmitidos diretamente da API publica da Binance.",
        },
        engine: {
          title: "2. O motor roda no navegador",
          text: "O Backtester V5 analisa cada barra — Market Structure, zonas FVG, pontuacao de confluencia, Take Profits parciais.",
        },
        results: {
          title: "3. Leia os resultados",
          text: "Curva de Equity, Drawdown, registro de operacoes, detalhamento por motivo de saida, retornos mensais, mais de 30 metricas profissionais.",
        },
      },
    },
    strategy: {
      title: "A estrategia Helix V5",
      subtitle: "Duas vantagens confluentes, um modelo de risco disciplinado.",
      cards: {
        ms: {
          title: "Market Structure",
          text: "Detecta topos e fundos de swing, classifica HH/HL/LH/LL, infere tendencia e entra em confirmacoes de Break of Structure (BOS) e Change of Character (CHoCH). A forca do sinal escala com a maturidade da tendencia.",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "Rastreia zonas de desequilibrio de 3 Candlestick onde o preco deixou uma lacuna. Gera entradas de reteste quando o preco retorna a lacuna nao preenchida. A forca e ponderada pelo tamanho da lacuna e sua recenticidade.",
        },
      },
      mini: {
        risk: { label: "Risco por operacao", value: "3% do Equity" },
        sl: { label: "Stop Loss", value: "1x ATR (apos supressao de 50 barras)" },
        tps: { label: "Take Profits", value: "Progressivo: 5% / 30% / 65%" },
      },
    },
    disclaimer:
      "Desempenho passado nao garante resultados futuros. O Helix e uma ferramenta de pesquisa apenas para fins educacionais. Nada neste site constitui aconselhamento financeiro. Negociar criptomoedas envolve risco substancial de perda.",
  },

  parityBadge: {
    title: "Paridade do motor",
    titleSuffix: "correspondencia bit a bit com o codigo de pesquisa em Python",
    subtitle: "Mesmo algoritmo, mesmas taxas, mesmo slippage. Clique para saber mais.",
    rows: {
      algorithm: {
        label: "Mesmo algoritmo",
        body: "O motor TypeScript que roda no seu navegador e uma portagem direta linha a linha do backtester.py, indicators.py e stake_manager.py do repositorio de pesquisa em Python. Cada formula — ATR, deteccao de swing, classificacao BOS/CHoCH, rastreamento de zonas FVG, agregador, dimensionamento fracional fixo, PnL de fechamento parcial — e a mesma.",
      },
      execution: {
        label: "Mesmo modelo de execucao",
        body: "0,075% comissao taker, 0,02% slippage adverso em stops/fim de dados, sem slippage em Take Profits (ordens limitadas). Limite de posicao em 80% do Equity. Identico aos parametros publicados da V5.",
      },
      warmup: {
        label: "Mesmo aquecimento e supressao",
        body: "50 barras de aquecimento antes do primeiro sinal. Janela de supressao de SL de 50 barras apos a entrada, com o hard stop de 15x ATR fornecendo protecao catastrofica durante essa janela. Movimento para breakeven a +0,30 ATR apos TP1 ser atingido.",
      },
      open: {
        label: "Sem ajustes ocultos",
        body: "Codigo aberto, licenca MIT. O codigo-fonte Python e o codigo-fonte TypeScript estao ambos no GitHub. Reproduza qualquer resultado voce mesmo.",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "Execute o motor Helix V5 em qualquer par da Binance. O Backtest completo roda localmente no seu navegador.",
    historyButton: "Historico",
    form: {
      configHeading: "Configuracao",
      customBadge: "Personalizado",
      quickPickLabel: "Selecao rapida",
      symbolLabel: "Par",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "Qualquer par spot da Binance (ex.: ETHUSDT, SOLUSDT, AVAXUSDT)",
      timeframeLabel: "Timeframe",
      timeframes: {
        "15m": "15 minutos",
        "30m": "30 minutos",
        "1h": "1 hora",
        "4h": "4 horas",
        "1d": "1 dia",
      },
      startDateLabel: "Data de inicio",
      endDateLabel: "Data de fim",
      initialCapitalLabel: "Capital inicial (USD)",
      advancedToggle: "Parametros avancados (padroes V5)",
      advancedFields: {
        riskPct: "Risco %",
        maxPositionPct: "Posicao maxima %",
        slAtrMult: "SL x ATR",
        tp1AtrMult: "TP1 x ATR",
        tp2AtrMult: "TP2 x ATR",
        tp3AtrMult: "TP3 x ATR",
        minSignalScore: "Pontuacao minima de sinal",
        minBarsBeforeSl: "Barras de supressao de SL",
      },
      resetDefaults: "Restaurar padroes V5",
      runButton: "Executar Backtest",
      runningButton: "Executando…",
    },
    emptyState: {
      title: "Pronto quando voce estiver",
      body: "Configure a esquerda e clique em Executar Backtest. Experimente os padroes V5 no BTCUSDT 1H para reproduzir a execucao de referencia de +949%.",
      runBacktest: "Executar Backtest",
    },
    progress: {
      fetchingTitle: "Buscando dados de mercado",
      runningTitle: "Executando Backtest",
      stages: {
        fetch: "Buscar dados",
        indicators: "Indicadores",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest concluido",
      failedTitle: "Backtest falhou",
      historyLoaded: "Carregado do historico",
      historyHint: 'Clique em "Executar Backtest" para re-executar',
      csvDownloaded: "CSV baixado",
      csvDownloadedBody: "operacoes exportadas",
      linkCopied: "Link copiado",
      linkCopiedBody: "Qualquer pessoa com esta URL pode re-executar seu Backtest",
      copyFailed: "Falha ao copiar",
      copyFailedBody: "Seu navegador bloqueou o acesso a area de transferencia",
      chartExported: "Grafico exportado",
      noChart: "Nenhum grafico para exportar",
    },
    errors: {
      invalidDateRange: "Intervalo de datas invalido",
      symbolRequired: "O par e obrigatorio (ex.: BTCUSDT)",
      notEnoughData: "Dados insuficientes: obtidos",
      notEnoughDataNeed: "candles, necessario pelo menos",
      generic: "Backtest falhou",
    },
    results: {
      kpis: {
        totalReturn: "Retorno total",
        sharpe: "Sharpe",
        maxDrawdown: "Drawdown maximo",
        winRate: "Taxa de acerto",
        profitFactor: "Profit Factor",
        expectancy: "Expectativa",
        perTrade: "por operacao",
      },
      exports: {
        downloadCsv: "Baixar CSV",
        copyLink: "Copiar link",
        chartPng: "Grafico PNG",
      },
    },
    charts: {
      equityCurveTitle: "Curva de Equity",
      legendStrategy: "Estrategia",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "Preco",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "operacoes",
      exitReasonsTitle: "Motivos de saida",
      monthlyReturnsTitle: "Retornos mensais",
      noData: "Sem dados",
    },
    table: {
      heading: "Registro de operacoes",
      tradesSuffix: "operacoes",
      noTrades: "Nenhuma operacao gerada.",
      showAll: "Mostrar todos",
      headers: {
        id: "#",
        side: "Lado",
        entryDate: "Data de entrada",
        entryPrice: "Entrada $",
        exitDate: "Data de saida",
        exitPrice: "Saida $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "Barras",
        exit: "Saida",
      },
    },
    metricsPanel: {
      heading: "Detalhamento completo de metricas",
      sections: {
        returns: "Retornos",
        risk: "Risco",
        tradeSummary: "Resumo de operacoes",
        tradeQuality: "Qualidade das operacoes",
        costs: "Custos",
      },
      labels: {
        totalReturn: "Retorno total",
        annualizedReturn: "Retorno anualizado",
        netProfit: "Lucro liquido",
        finalEquity: "Equity final",
        yearsTested: "Anos testados",
        maxDrawdown: "Drawdown maximo",
        maxDdDuration: "Duracao maxima do DD",
        avgDdDuration: "Duracao media do DD",
        sharpeRatio: "Sharpe ratio",
        sortinoRatio: "Sortino ratio",
        calmarRatio: "Calmar ratio",
        totalTrades: "Total de operacoes",
        winRate: "Taxa de acerto",
        winsLosses: "Ganhos / Perdas",
        longTrades: "Operacoes Long",
        shortTrades: "Operacoes Short",
        avgBarsHeld: "Media de barras mantidas",
        profitFactor: "Profit Factor",
        payoffRatio: "Razao de pagamento",
        expectancy: "Expectativa",
        avgWin: "Media de ganho",
        avgLoss: "Media de perda",
        largestWin: "Maior ganho",
        largestLoss: "Maior perda",
        avgRMultiple: "R-multiple medio",
        bestRMultiple: "Melhor R-multiple",
        worstRMultiple: "Pior R-multiple",
        maxConsecWins: "Maximo de ganhos consecutivos",
        maxConsecLosses: "Maximo de perdas consecutivas",
        totalCommission: "Comissao total",
        avgCommissionPerTrade: "Comissao media por operacao",
        commissionPctOfGross: "Comissao como % do bruto",
        bars: "barras",
        wr: "WR",
      },
    },
  },

  about: {
    metaTitle: "Sobre o Helix · Metodologia e Evolucao da Estrategia",
    metaDescription:
      "Como o Helix evoluiu da V1 para a V5 — Market Structure, Fair Value Gap, supressao de SL, Take Profits progressivos e validacao Walk-forward.",
    title: "Sobre o Helix",
    subtitle:
      "Um framework de pesquisa para testar conceitos institucionais de price action em mercados de criptomoedas.",
    onThisPage: "Nesta pagina",
    sections: {
      evolution: "Evolucao da estrategia",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "Pontuacao de confluencia",
      risk: "Gestao de risco",
      tps: "TPs progressivos",
      execution: "Modelo de execucao",
      walkForward: "Walk-forward",
      disclaimer: "Aviso legal",
    },
    evolutionIntro:
      "Cada versao e uma unica melhoria validada sobre a linha de base anterior. Sem curve-fitting — cada mudanca foi retestada com validacao Walk-forward.",
    table: {
      version: "Versao",
      changes: "Mudancas principais",
      return: "Retorno",
      sharpe: "Sharpe",
      maxDd: "DD maximo",
      winRate: "Taxa de acerto",
      current: "atual",
    },
    methodology: {
      ms: "O motor identifica topos e fundos de swing usando uma janela de lookback de 5 barras em ambos os lados. Cada novo swing e classificado como Higher High (HH), Higher Low (HL), Lower High (LH) ou Lower Low (LL). O mercado esta em tendencia de alta quando vemos HH+HL e em tendencia de baixa quando vemos LH+LL. Um fechamento que rompe acima do ultimo topo de swing em tendencia de alta produz um sinal Long de Break of Structure (BOS); uma inversao de tendencia de alta para baixa produz um sinal de reversao Change of Character (CHoCH). A forca do sinal escala com a maturidade da tendencia (swings consecutivos na mesma direcao) e o tamanho da vela de rompimento relativo ao ATR.",
      fvg: "Um Fair Value Gap e um padrao de 3 Candlestick onde o preco deixa um desequilibrio nao preenchido entre o Candlestick 1 e o Candlestick 3. Cada lacuna deve ter pelo menos 0,3x ATR para ser considerada significativa. O motor rastreia cada FVG ativo e emite um sinal de entrada de reteste na primeira vez que o preco retorna a zona. A forca do sinal recompensa lacunas maiores e mais recentes.",
      confluence:
        "O agregador combina sinais de Market Structure e FVG em uma unica decisao. Cada indicador habilitado contribui para uma pontuacao normalizada de 0-1. Uma operacao so e executada quando a pontuacao agregada e de pelo menos 0,50 (duas fontes de confirmacao necessarias) E passa o filtro pos-agregacao de 0,60.",
      risk: "A V5 arrisca 3% do Equity por operacao com um limite de posicao de 80%. O Stop Loss e calculado em 1x ATR — mas o SL regular e suprimido pelas primeiras 50 barras da operacao. Durante a janela de supressao, apenas um \"hard stop\" de 15x ATR fornece protecao catastrofica. Apos 50 barras, o stop regular e ativado. Isso reduz dramaticamente o problema de sacudidas precoces observado em mercados cripto volateis.",
      tpsLead: "Os lucros sao realizados em tres parcelas:",
      tpsBullets: [
        "5% da posicao fechada a 1x ATR (TP1)",
        "30% fechada a 4x ATR (TP2) — somente apos TP1",
        "65% fechada a 6x ATR (TP3) — somente apos TP2",
      ],
      tpsTail:
        "Quando o TP1 e atingido, o Stop Loss e movido para entrada + 0,30 x ATR (breakeven mais um pequeno buffer), garantindo protecao enquanto os 95% restantes da posicao capturam o movimento maior.",
      execution:
        "Cada entrada e executada no fechamento da barra com 0,02% de slippage adverso. Stop Loss e saidas de fim de dados tambem pagam slippage; preenchimentos de Take Profit nao (sao ordens limitadas). Cada fechamento parcial e cobrado 0,075% de comissao sobre o valor nocional de entrada e saida, espelhando as taxas taker da Binance de forma realista.",
      walkForward:
        "O codigo de pesquisa em Python executa validacao Walk-forward de 5 folds com divisao de 60/40 treino/teste por fold. A V5 produz 5/5 folds de teste lucrativos com retorno medio fora da amostra de +48,72%. O aplicativo web mostra apenas o Backtest in-sample — para a validacao completa, consulte o repositorio de pesquisa.",
    },
    disclaimer: {
      heading: "Aviso legal",
      body: "O Helix e uma ferramenta de pesquisa e educacao. Resultados de Backtest nao preveem desempenho futuro. Desempenho passado nao e indicativo de resultados futuros. Negociar criptomoedas envolve risco substancial de perda e nao e adequado para todos. Nada neste site constitui aconselhamento de investimento, financeiro, de negociacao ou qualquer outra forma de orientacao. Voce e o unico responsavel por quaisquer decisoes que tomar com base nas informacoes apresentadas aqui.",
    },
    cta: "Experimente voce mesmo",
  },

  changelog: {
    metaTitle: "Historico de alteracoes e Roadmap",
    metaDescription:
      "Notas de versao do Helix da V1 a V5, alem do que esta por vir na V6 e na pesquisa de negociacao ao vivo.",
    badge: "Progresso da pesquisa · codigo aberto",
    title: "Historico de alteracoes e Roadmap",
    subtitle:
      "Cada versao do Helix e uma unica melhoria validada sobre a anterior. Sem curve-fitting — cada mudanca passou por validacao Walk-forward antes de ser incorporada.",
    releasesHeading: "Versoes",
    roadmapHeading: "Roadmap",
    roadmapIntro:
      "No que estamos trabalhando em seguida. Nada disso esta confirmado — sao direcoes de pesquisa, classificadas aproximadamente por probabilidade.",
    currentBadge: "Atual",
    cta: "Experimente a V5 em qualquer par",
    statuses: {
      inProgress: "Em andamento",
      planned: "Planejado",
      researching: "Pesquisando",
    },
  },

  notFound: {
    metaTitle: "404 · Pagina nao encontrada",
    code: "404",
    title: "Essa rota nao existe",
    body: "A pagina que voce procura foi movida, nunca existiu ou voce digitou a URL incorretamente. O motor de Backtest continua funcionando normalmente.",
    goHome: "Ir para o inicio",
    runBacktest: "Executar um Backtest",
  },

  commandPalette: {
    placeholder: "Buscar ou ir para…",
    empty: "Sem resultados",
    groups: {
      navigate: "Navegar",
      quickRun: "Execucao rapida",
      external: "Externo",
    },
    items: {
      home: "Inicio",
      backtest: "Backtest",
      about: "Sobre",
      changelog: "Historico",
      runBtc: "Executar BTCUSDT 1H · 2023→hoje",
      runEth: "Executar ETHUSDT 1H · 2023→hoje",
      runSol: "Executar SOLUSDT 1H · 2023→hoje",
      githubRepo: "Repositorio GitHub",
    },
    hints: {
      navigate: "navegar",
      select: "selecionar",
      toggle: "alternar",
    },
  },

  errorPage: {
    title: "Algo deu errado",
    body: "Ocorreu um erro inesperado ao renderizar esta pagina.",
    digest: "digest",
    tryAgain: "Tentar novamente",
    backtestTitle: "A pagina de Backtest travou",
    backtestBody: "Algo deu errado ao renderizar a pagina de Backtest.",
    reloadBacktest: "Recarregar Backtest",
  },

  live: {
    badge: "Forward test desde",
    title: "Forward Test ao Vivo",
    subtitle: "Helix V5 rodando em 5 moedas com $10.000 de capital virtual cada. Candles reais da Binance 1h, sem antecipação, sem resets.",
    disclaimer: "Helix V5 foi otimizado com dados BTC 1h de Jan 2023 – Fev 2026. Este painel ao vivo é o único teste fora da amostra real. Os resultados podem diferir significativamente do backtest.",
    chartTitle: "Curva de Capital (todas as moedas)",
    openPositionsTitle: "Posições Abertas",
    lastTick: "Último tick",
    loading: "Carregando dados ao vivo...",
    errorPrefix: "Falha ao carregar dados:",
    kpis: {
      totalEquity: "Capital Total",
      totalReturn: "Retorno Total",
      bestPerformer: "Melhor Desempenho",
      totalTrades: "Total de Trades",
    },
    trades: {
      title: "Trades Recentes",
      coin: "Moeda",
      dir: "Dir",
      entry: "Entrada",
      exit: "Saída",
      pnl: "L/P",
      reason: "Motivo",
      time: "Hora",
    },
    updated: "Atualizado",
  },

  language: {
    label: "Idioma",
  },
} as const;
