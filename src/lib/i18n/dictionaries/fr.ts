// French dictionary — must mirror the shape of en.ts exactly.
//
// Translation policy: industry-standard fintech terms (Sharpe, Sortino, ATR,
// FVG, BOS, CHoCH, Stop Loss, Take Profit, Backtest, Drawdown, etc.) stay
// in English everywhere. Only natural-language strings get translated.

export const fr = {
  nav: {
    home: "Accueil",
    backtest: "Backtest",
    live: "Forward Test",
    about: "À propos",
    changelog: "Historique des versions",
    github: "GitHub",
    skipToContent: "Passer au contenu",
  },

  footer: {
    tagline:
      "Backtesting institutionnel de l'action des prix pour les marchés de cryptomonnaies. Open source, validé par walk-forward.",
    starOnGithub: "Étoile sur GitHub",
    columns: {
      product: "Produit",
      resources: "Ressources",
      legal: "Mentions légales",
    },
    links: {
      home: "Accueil",
      backtest: "Backtest",
      live: "Forward Test",
      about: "À propos",
      changelog: "Historique des versions",
      githubRepo: "Dépôt GitHub",
      documentation: "Documentation",
      mitLicense: "Licence MIT",
      disclaimer: "Avertissement",
      license: "Licence",
    },
    status: "Tous les systèmes sont opérationnels",
    build: "build",
    copyright:
      "Les performances passées ne garantissent pas les résultats futurs · Ceci ne constitue pas un conseil financier.",
  },

  landing: {
    hero: {
      badge: "Stratégie V5 · validée par walk-forward",
      titleTop: "Backtesting institutionnel",
      titleBottom: "de l'action des prix",
      subtitle:
        "Testez des stratégies Market Structure + Fair Value Gap sur toute paire cotée sur Binance. Propulsé par des algorithmes validés par walk-forward — aucun Python requis.",
      ctaPrimary: "Lancer un backtest",
      ctaSecondary: "Comment ça fonctionne",
    },
    socialProof: {
      openSource: "Open source sur GitHub",
      mitLicense: "Licence MIT",
      lastCommit: "Dernier commit",
    },
    marqueeLabel: "Testé sur",
    kpis: {
      sectionLabel: "BTCUSDT 1H · résultats de référence in-sample",
      totalReturn: "Rendement total",
      totalReturnSublabel: "BTCUSDT 1H · Jan 2023 → Fév 2026",
      sharpeRatio: "Ratio de Sharpe",
      sharpeSublabel: "Ajusté au risque, annualisé",
      winRate: "Taux de réussite",
      winRateSublabel: "Sur l'ensemble des trades clôturés",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "Profit brut / perte brute",
    },
    reproduce: {
      lead: "Ne nous croyez pas sur parole.",
      cta: "Reproduisez ces résultats vous-même",
    },
    globe: {
      titleTop: "Tout marché.",
      titleBottom: "Tout intervalle de temps.",
      body: "Helix récupère les données directement depuis l'API publique de Binance et exécute l'intégralité du Backtester V5 localement dans votre navigateur. Testez BTCUSDT ou un altcoin obscur — même moteur, mêmes métriques, aucun serveur, aucune limite.",
      stats: {
        symbols: "symboles",
        timeframes: "intervalles",
        apiKeys: "clés API",
      },
    },
    howItWorks: {
      title: "Comment ça fonctionne",
      subtitle:
        "Trois étapes. Pas de carte bancaire. Pas de Python. Le moteur complet s'exécute dans votre navigateur.",
      cards: {
        pick: {
          title: "1. Choisissez votre marché",
          text: "Sélectionnez n'importe quelle paire spot Binance, intervalle de temps et plage de dates. Les données sont récupérées directement depuis l'API publique de Binance.",
        },
        engine: {
          title: "2. Le moteur s'exécute dans le navigateur",
          text: "Le Backtester V5 analyse chaque barre — Market Structure, zones FVG, scoring de confluence, Take Profits progressifs.",
        },
        results: {
          title: "3. Consultez les résultats",
          text: "Courbe d'Equity, Drawdown, journal des trades, répartition des raisons de sortie, rendements mensuels, plus de 30 métriques professionnelles.",
        },
      },
    },
    strategy: {
      title: "La stratégie Helix V5",
      subtitle: "Deux avantages confluents, un modèle de risque discipliné.",
      cards: {
        ms: {
          title: "Market Structure",
          text: "Détecte les points hauts et bas de swing, classifie HH/HL/LH/LL, déduit la tendance, puis entre sur des confirmations de Break of Structure (BOS) et Change of Character (CHoCH). La force du signal évolue avec la maturité de la tendance.",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "Suit les zones de déséquilibre à 3 bougies où le prix a laissé un écart. Génère des entrées de retest lorsque le prix revient dans l'écart non comblé. La force est pondérée par la taille de l'écart et sa fraîcheur.",
        },
      },
      mini: {
        risk: { label: "Risque par trade", value: "3% de l'Equity" },
        sl: { label: "Stop Loss", value: "1× ATR (après suppression de 50 barres)" },
        tps: { label: "Take Profits", value: "Progressifs : 5% / 30% / 65%" },
      },
    },
    disclaimer:
      "Les performances passées ne garantissent pas les résultats futurs. Helix est un outil de recherche à des fins éducatives uniquement. Rien sur ce site ne constitue un conseil financier. Le trading de cryptomonnaies comporte un risque substantiel de perte.",
  },

  parityBadge: {
    title: "Parité du moteur",
    titleSuffix: "correspondance bit-à-bit avec le code de recherche Python",
    subtitle: "Même algorithme, mêmes frais, même slippage. Cliquez pour en savoir plus.",
    rows: {
      algorithm: {
        label: "Même algorithme",
        body: "Le moteur TypeScript qui s'exécute dans votre navigateur est un portage ligne par ligne de backtester.py, indicators.py et stake_manager.py du dépôt de recherche Python. Chaque formule — ATR, détection de swing, classification BOS/CHoCH, suivi des zones FVG, agrégateur, dimensionnement fractionnel fixe, PnL de clôture partielle — est identique.",
      },
      execution: {
        label: "Même modèle d'exécution",
        body: "Commission taker de 0,075%, slippage adverse de 0,02% sur les stops/fin de données, aucun slippage sur les Take Profits (ordres limites). Plafond de position à 80% de l'Equity. Identique aux paramètres V5 publiés.",
      },
      warmup: {
        label: "Même warmup et suppression",
        body: "Warmup de 50 barres avant le premier signal. Fenêtre de suppression du SL de 50 barres après l'entrée, avec un hard stop à 15× ATR fournissant une protection catastrophique pendant cette fenêtre. Passage au breakeven à +0,30 ATR après le déclenchement du TP1.",
      },
      open: {
        label: "Aucun ajustement caché",
        body: "Open source, sous licence MIT. Le code source Python et le code source TypeScript sont tous deux sur GitHub. Reproduisez n'importe quel résultat vous-même.",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "Exécutez le moteur Helix V5 sur n'importe quelle paire Binance. Le Backtest complet s'exécute localement dans votre navigateur.",
    historyButton: "Historique",
    form: {
      configHeading: "Configuration",
      customBadge: "Personnalisé",
      quickPickLabel: "Sélection rapide",
      symbolLabel: "Symbole",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "Toute paire spot Binance (ex. ETHUSDT, SOLUSDT, AVAXUSDT)",
      timeframeLabel: "Intervalle de temps",
      timeframes: {
        "15m": "15 minutes",
        "30m": "30 minutes",
        "1h": "1 heure",
        "4h": "4 heures",
        "1d": "1 jour",
      },
      startDateLabel: "Date de début",
      endDateLabel: "Date de fin",
      initialCapitalLabel: "Capital initial (USD)",
      advancedToggle: "Paramètres avancés (valeurs V5 par défaut)",
      advancedFields: {
        riskPct: "Risque %",
        maxPositionPct: "Position max %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "Score signal min",
        minBarsBeforeSl: "Barres suppression SL",
      },
      resetDefaults: "Réinitialiser aux valeurs V5",
      runButton: "Lancer le Backtest",
      runningButton: "Exécution en cours…",
    },
    emptyState: {
      title: "Prêt quand vous l'êtes",
      body: "Configurez à gauche et cliquez sur Lancer le Backtest. Essayez les valeurs V5 par défaut sur BTCUSDT 1H pour reproduire le rendement de référence de +949%.",
      runBacktest: "Lancer le Backtest",
    },
    progress: {
      fetchingTitle: "Récupération des données de marché",
      runningTitle: "Exécution du Backtest",
      stages: {
        fetch: "Récupération des données",
        indicators: "Indicateurs",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest terminé",
      failedTitle: "Échec du Backtest",
      historyLoaded: "Chargé depuis l'historique",
      historyHint: "Cliquez sur « Lancer le Backtest » pour relancer",
      csvDownloaded: "CSV téléchargé",
      csvDownloadedBody: "trades exportés",
      linkCopied: "Lien copié",
      linkCopiedBody: "Toute personne disposant de cette URL peut relancer votre Backtest",
      copyFailed: "Échec de la copie",
      copyFailedBody: "Votre navigateur a bloqué l'accès au presse-papiers",
      chartExported: "Graphique exporté",
      noChart: "Aucun graphique à exporter",
    },
    errors: {
      invalidDateRange: "Plage de dates invalide",
      symbolRequired: "Le symbole est requis (ex. BTCUSDT)",
      notEnoughData: "Données insuffisantes : obtenu",
      notEnoughDataNeed: "bougies, minimum requis",
      generic: "Échec du Backtest",
    },
    results: {
      kpis: {
        totalReturn: "Rendement total",
        sharpe: "Sharpe",
        maxDrawdown: "Drawdown max",
        winRate: "Taux de réussite",
        profitFactor: "Profit Factor",
        expectancy: "Espérance",
        perTrade: "par trade",
      },
      exports: {
        downloadCsv: "Télécharger CSV",
        copyLink: "Copier le lien",
        chartPng: "Graphique PNG",
      },
    },
    charts: {
      equityCurveTitle: "Courbe d'Equity",
      legendStrategy: "Stratégie",
      legendBuyHold: "Buy & Hold",
      legendDrawdown: "Drawdown",
      candlestickTitle: "Prix",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "trades",
      exitReasonsTitle: "Raisons de sortie",
      monthlyReturnsTitle: "Rendements mensuels",
      noData: "Aucune donnée",
    },
    table: {
      heading: "Journal des trades",
      tradesSuffix: "trades",
      noTrades: "Aucun trade généré.",
      showAll: "Tout afficher",
      headers: {
        id: "#",
        side: "Direction",
        entryDate: "Date d'entrée",
        entryPrice: "Prix d'entrée",
        exitDate: "Date de sortie",
        exitPrice: "Prix de sortie",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "Barres",
        exit: "Sortie",
      },
    },
    metricsPanel: {
      heading: "Détail complet des métriques",
      sections: {
        returns: "Rendements",
        risk: "Risque",
        tradeSummary: "Résumé des trades",
        tradeQuality: "Qualité des trades",
        costs: "Coûts",
      },
      labels: {
        totalReturn: "Rendement total",
        annualizedReturn: "Rendement annualisé",
        netProfit: "Profit net",
        finalEquity: "Equity finale",
        yearsTested: "Années testées",
        maxDrawdown: "Drawdown maximum",
        maxDdDuration: "Durée max du Drawdown",
        avgDdDuration: "Durée moy. du Drawdown",
        sharpeRatio: "Ratio de Sharpe",
        sortinoRatio: "Ratio de Sortino",
        calmarRatio: "Ratio de Calmar",
        totalTrades: "Nombre total de trades",
        winRate: "Taux de réussite",
        winsLosses: "Gains / Pertes",
        longTrades: "Trades Long",
        shortTrades: "Trades Short",
        avgBarsHeld: "Barres détenues en moy.",
        profitFactor: "Profit Factor",
        payoffRatio: "Ratio de gain",
        expectancy: "Espérance",
        avgWin: "Gain moyen",
        avgLoss: "Perte moyenne",
        largestWin: "Plus grand gain",
        largestLoss: "Plus grande perte",
        avgRMultiple: "R-multiple moyen",
        bestRMultiple: "Meilleur R-multiple",
        worstRMultiple: "Pire R-multiple",
        maxConsecWins: "Gains consécutifs max",
        maxConsecLosses: "Pertes consécutives max",
        totalCommission: "Commission totale",
        avgCommissionPerTrade: "Commission moy. par trade",
        commissionPctOfGross: "Commission en % du brut",
        bars: "barres",
        wr: "TR",
      },
    },
  },

  about: {
    metaTitle: "À propos de Helix · Méthodologie et évolution de la stratégie",
    metaDescription:
      "Comment Helix a évolué de V1 à V5 — Market Structure, Fair Value Gap, suppression du SL, Take Profits progressifs et validation walk-forward.",
    title: "À propos de Helix",
    subtitle:
      "Un cadre de recherche pour tester des concepts institutionnels d'action des prix sur les marchés de cryptomonnaies.",
    onThisPage: "Sur cette page",
    sections: {
      evolution: "Évolution de la stratégie",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "Scoring de confluence",
      risk: "Gestion du risque",
      tps: "Take Profits progressifs",
      execution: "Modèle d'exécution",
      walkForward: "Walk-forward",
      disclaimer: "Avertissement",
    },
    evolutionIntro:
      "Chaque version est une amélioration unique et validée par rapport à la version précédente. Pas de suroptimisation — chaque modification a été retestée avec une validation walk-forward.",
    table: {
      version: "Version",
      changes: "Modifications clés",
      return: "Rendement",
      sharpe: "Sharpe",
      maxDd: "Drawdown max",
      winRate: "Taux de réussite",
      current: "actuelle",
    },
    methodology: {
      ms: "Le moteur identifie les points hauts et bas de swing à l'aide d'une fenêtre de 5 barres de chaque côté. Chaque nouveau swing est classifié comme Higher High (HH), Higher Low (HL), Lower High (LH) ou Lower Low (LL). Le marché est en tendance haussière lorsqu'on observe HH+HL et en tendance baissière lorsqu'on observe LH+LL. Une clôture au-dessus du dernier point haut de swing en tendance haussière produit un signal Long de Break of Structure (BOS) ; un retournement de tendance haussière à baissière produit un signal de retournement Change of Character (CHoCH). La force du signal évolue avec la maturité de la tendance (swings consécutifs dans la même direction) et la taille de la bougie de cassure par rapport à l'ATR.",
      fvg: "Un Fair Value Gap est un pattern à 3 bougies où le prix laisse un déséquilibre non comblé entre la bougie 1 et la bougie 3. Chaque écart doit mesurer au moins 0,3× ATR pour être considéré comme significatif. Le moteur suit chaque FVG actif et émet un signal d'entrée en retest la première fois que le prix revient dans la zone. La force du signal valorise les écarts plus grands et plus récents.",
      confluence:
        "L'agrégateur combine les signaux de Market Structure et FVG en une seule décision. Chaque indicateur activé contribue à un score normalisé de 0 à 1. Un trade n'est déclenché que lorsque le score agrégé est d'au moins 0,50 (deux sources de confirmation requises) ET passe le filtre post-agrégation de 0,60.",
      risk: "V5 risque 3% de l'Equity par trade avec un plafond de position de 80%. Le Stop Loss est calculé à 1× ATR — mais le SL régulier est supprimé pendant les 50 premières barres du trade. Pendant la fenêtre de suppression, seul un « hard stop » à 15× ATR fournit une protection catastrophique. Après 50 barres, le stop régulier est actif. Cela réduit considérablement le problème de sortie prématurée observé sur les marchés crypto volatils.",
      tpsLead: "Les profits sont pris en trois tranches :",
      tpsBullets: [
        "5% de la position clôturés à 1× ATR (TP1)",
        "30% clôturés à 4× ATR (TP2) — uniquement après TP1",
        "65% clôturés à 6× ATR (TP3) — uniquement après TP2",
      ],
      tpsTail:
        "Lorsque TP1 est atteint, le Stop Loss est déplacé à l'entrée + 0,30 × ATR (breakeven plus une petite marge), verrouillant la protection tout en laissant les 95% restants de la position capturer le mouvement plus large.",
      execution:
        "Chaque entrée est exécutée à la clôture de la barre avec un slippage adverse de 0,02%. Les sorties par Stop Loss et fin de données incluent également le slippage ; les exécutions de Take Profit n'en ont pas (ce sont des ordres limites). Chaque clôture partielle est soumise à une commission de 0,075% sur le notionnel d'entrée et de sortie, reproduisant de manière réaliste les frais taker de Binance.",
      walkForward:
        "Le code de recherche Python exécute une validation walk-forward à 5 folds avec une répartition 60/40 entraînement/test par fold. V5 produit 5/5 folds de test rentables avec un rendement moyen hors échantillon de +48,72%. L'application web affiche uniquement le Backtest in-sample — pour la validation complète, consultez le dépôt de recherche.",
    },
    disclaimer: {
      heading: "Avertissement",
      body: "Helix est un outil de recherche et d'éducation. Les résultats de Backtest ne prédisent pas les performances futures. Les performances passées ne sont pas indicatives des résultats futurs. Le trading de cryptomonnaies comporte un risque substantiel de perte et ne convient pas à tous. Rien sur ce site ne constitue un conseil en investissement, financier, de trading ou de toute autre nature. Vous êtes seul responsable de toute décision prise sur la base des informations présentées ici.",
    },
    cta: "Essayez par vous-même",
  },

  changelog: {
    metaTitle: "Historique des versions et feuille de route",
    metaDescription:
      "Notes de version Helix de V1 à V5, ainsi que les prochaines étapes pour V6 et la recherche sur le trading en direct.",
    badge: "Progression de la recherche · open source",
    title: "Historique des versions et feuille de route",
    subtitle:
      "Chaque version de Helix est une amélioration unique et validée par rapport à la précédente. Pas de suroptimisation — chaque modification a été soumise à une validation walk-forward avant d'être intégrée.",
    releasesHeading: "Versions",
    roadmapHeading: "Feuille de route",
    roadmapIntro:
      "Ce sur quoi nous travaillons ensuite. Rien de tout cela n'est engagé — ce sont des directions de recherche, classées approximativement par probabilité.",
    currentBadge: "Actuelle",
    cta: "Essayer V5 sur n'importe quelle paire",
    statuses: {
      inProgress: "En cours",
      planned: "Planifié",
      researching: "En recherche",
    },
  },

  notFound: {
    metaTitle: "404 · Page introuvable",
    code: "404",
    title: "Cette route n'existe pas",
    body: "La page que vous recherchez a été déplacée, n'a jamais existé ou vous avez mal saisi l'URL. Le moteur de Backtest fonctionne toujours parfaitement.",
    goHome: "Retour à l'accueil",
    runBacktest: "Lancer un Backtest",
  },

  commandPalette: {
    placeholder: "Rechercher ou accéder à…",
    empty: "Aucun résultat",
    groups: {
      navigate: "Navigation",
      quickRun: "Lancement rapide",
      external: "Externe",
    },
    items: {
      home: "Accueil",
      backtest: "Backtest",
      about: "À propos",
      changelog: "Historique des versions",
      runBtc: "Lancer BTCUSDT 1H · 2023→aujourd'hui",
      runEth: "Lancer ETHUSDT 1H · 2023→aujourd'hui",
      runSol: "Lancer SOLUSDT 1H · 2023→aujourd'hui",
      githubRepo: "Dépôt GitHub",
    },
    hints: {
      navigate: "naviguer",
      select: "sélectionner",
      toggle: "basculer",
    },
  },

  errorPage: {
    title: "Une erreur est survenue",
    body: "Une erreur inattendue s'est produite lors du rendu de cette page.",
    digest: "digest",
    tryAgain: "Réessayer",
    backtestTitle: "La page Backtest a planté",
    backtestBody: "Une erreur s'est produite lors du rendu de la page Backtest.",
    reloadBacktest: "Recharger le Backtest",
  },

  live: {
    badge: "Forward test depuis",
    title: "Forward Test en Direct",
    subtitle: "Helix V5 fonctionne sur 5 cryptos avec 10 000 $ de capital virtuel chacune. Bougies Binance 1h réelles, sans anticipation, sans réinitialisation.",
    disclaimer: "Helix V5 a été optimisé sur les données BTC 1h de Jan 2023 à Fév 2026. Ce tableau de bord en direct est le seul véritable test hors échantillon. Les résultats peuvent différer significativement du backtest.",
    loading: "Chargement des données en direct...",
    errorPrefix: "Échec du chargement :",
    kpis: {
      totalEquity: "Capital Total",
      totalReturn: "Rendement Total",
      bestPerformer: "Meilleur Performer",
      totalTrades: "Total des Trades",
    },
    trades: {
      title: "Trades Récents",
      coin: "Crypto",
      dir: "Dir",
      entry: "Entrée",
      exit: "Sortie",
      pnl: "P&L",
      reason: "Raison",
      time: "Heure",
    },
    updated: "Mis à jour",
  },

  language: {
    label: "Langue",
  },
} as const;
