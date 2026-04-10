// Turkish dictionary — mirrors en.ts exactly.
// Industry-standard fintech terms stay in English per translation policy.

export const tr = {
  nav: {
    home: "Ana Sayfa",
    backtest: "Backtest",
    live: "Forward Test",
    about: "Hakkında",
    changelog: "Değişiklik Günlüğü",
    github: "GitHub",
    skipToContent: "İçeriğe geç",
  },

  footer: {
    tagline:
      "Kripto para piyasaları için kurumsal düzeyde fiyat hareketi backtesting. Açık kaynak, walk-forward doğrulamalı.",
    starOnGithub: "GitHub'da Yıldızla",
    columns: {
      product: "Ürün",
      resources: "Kaynaklar",
      legal: "Yasal",
    },
    links: {
      home: "Ana Sayfa",
      backtest: "Backtest",
      live: "Forward Test",
      about: "Hakkında",
      changelog: "Değişiklik Günlüğü",
      githubRepo: "GitHub deposu",
      documentation: "Dokümantasyon",
      mitLicense: "MIT Lisansı",
      disclaimer: "Yasal Uyarı",
      license: "Lisans",
    },
    status: "Tüm sistemler çalışıyor",
    build: "sürüm",
    copyright:
      "Geçmiş performans gelecekteki sonuçları garanti etmez · Yatırım tavsiyesi değildir.",
  },

  landing: {
    hero: {
      badge: "V5 stratejisi · walk-forward doğrulamalı",
      titleTop: "Kurumsal düzeyde",
      titleBottom: "fiyat hareketi backtesting",
      subtitle:
        "Market Structure + Fair Value Gap stratejilerini herhangi bir Binance çiftinde test edin. Walk-forward doğrulamalı algoritmalar ile desteklenmektedir — Python gerektirmez.",
      ctaPrimary: "Backtest başlat",
      ctaSecondary: "Nasıl çalışır",
    },
    socialProof: {
      openSource: "GitHub'da açık kaynak",
      mitLicense: "MIT lisansı",
      lastCommit: "Son commit",
    },
    marqueeLabel: "Test edilen çiftler",
    kpis: {
      sectionLabel: "BTCUSDT 1H · örneklem içi referans sonuçları",
      totalReturn: "Toplam getiri",
      totalReturnSublabel: "BTCUSDT 1H · Oca 2023 → Şub 2026",
      sharpeRatio: "Sharpe oranı",
      sharpeSublabel: "Yıllıklandırılmış riske göre düzeltilmiş",
      winRate: "Kazanma oranı",
      winRateSublabel: "Tüm kapatılan işlemler genelinde",
      profitFactor: "Profit Factor",
      profitFactorSublabel: "Brüt kâr / brüt zarar",
    },
    reproduce: {
      lead: "Bize güvenmek zorunda değilsiniz.",
      cta: "Bu sonuçları kendiniz yeniden üretin",
    },
    globe: {
      titleTop: "Her piyasa.",
      titleBottom: "Her zaman dilimi.",
      body: "Helix verileri doğrudan halka açık Binance API'sinden çeker ve V5 Backtester'ı tamamen tarayıcınızda çalıştırır. BTCUSDT veya az bilinen bir altcoin test edin — aynı motor, aynı metrikler, sunucu yok, sınır yok.",
      stats: {
        symbols: "sembol",
        timeframes: "zaman dilimi",
        apiKeys: "API anahtarı",
      },
    },
    howItWorks: {
      title: "Nasıl çalışır",
      subtitle:
        "Üç adım. Kredi kartı yok. Python yok. Tüm motor tarayıcınızda çalışır.",
      cards: {
        pick: {
          title: "1. Piyasanızı seçin",
          text: "Herhangi bir Binance spot çifti, zaman dilimi ve tarih aralığı seçin. Veriler doğrudan halka açık Binance API'sinden aktarılır.",
        },
        engine: {
          title: "2. Motor tarayıcıda çalışır",
          text: "V5 Backtester her barı analiz eder — Market Structure, FVG bölgeleri, sinyal skoru, kısmi Take Profit'ler.",
        },
        results: {
          title: "3. Sonuçları inceleyin",
          text: "Equity eğrisi, Drawdown, işlem günlüğü, çıkış nedeni dağılımı, aylık getiriler, 30+ profesyonel metrik.",
        },
      },
    },
    strategy: {
      title: "Helix V5 stratejisi",
      subtitle: "İki örtüşen avantaj, bir disiplinli risk modeli.",
      cards: {
        ms: {
          title: "Market Structure",
          text: "Salınım zirvelerini ve diplerini tespit eder, HH/HL/LH/LL olarak sınıflandırır, trendi belirler, ardından Break of Structure (BOS) ve Change of Character (CHoCH) teyitleri ile pozisyona girer. Sinyal gücü trend olgunluğu ile orantılı olarak ölçeklenir.",
        },
        fvg: {
          title: "Fair Value Gap",
          text: "Fiyatın boşluk bıraktığı 3 mum dengesizlik bölgelerini takip eder. Fiyat doldurulmamış boşluğa geri döndüğünde yeniden test girişi sinyali üretir. Güç, boşluk büyüklüğü ve tazeliği ile ağırlıklandırılır.",
        },
      },
      mini: {
        risk: { label: "İşlem başına risk", value: "Equity'nin %3'ü" },
        sl: { label: "Stop Loss", value: "1× ATR (50 bar baskılama sonrası)" },
        tps: { label: "Take Profit seviyeleri", value: "Kademeli: %5 / %30 / %65" },
      },
    },
    disclaimer:
      "Geçmiş performans gelecekteki sonuçları garanti etmez. Helix yalnızca eğitim amaçlı bir araştırma aracıdır. Bu sitedeki hiçbir şey finansal tavsiye niteliği taşımaz. Kripto para ticareti önemli kayıp riski içerir.",
  },

  parityBadge: {
    title: "Motor paritesi",
    titleSuffix: "Python araştırma kodu ile bit düzeyinde eşleşme",
    subtitle: "Aynı algoritma, aynı komisyonlar, aynı kayma. Daha fazla bilgi için tıklayın.",
    rows: {
      algorithm: {
        label: "Aynı algoritma",
        body: "Tarayıcınızda çalışan TypeScript motoru, Python araştırma deposundaki backtester.py, indicators.py ve stake_manager.py dosyalarının satır satır doğrudan aktarımıdır. Her formül — ATR, salınım tespiti, BOS/CHoCH sınıflandırması, FVG bölge takibi, toplayıcı, sabit oransal boyutlandırma, kısmi kapanış PnL — aynıdır.",
      },
      execution: {
        label: "Aynı işlem modeli",
        body: "0,075% taker komisyonu, Stop Loss/veri sonu çıkışlarında %0,02 olumsuz kayma, Take Profit dolumlarında kayma yok (limit emirleri). Pozisyon tavanı Equity'nin %80'i. Yayınlanan V5 parametreleri ile birebir aynı.",
      },
      warmup: {
        label: "Aynı ısınma ve baskılama",
        body: "İlk sinyalden önce 50 bar ısınma süresi. Girişten sonra 50 bar SL baskılama penceresi; bu pencere boyunca 15× ATR sabit Stop felaket koruması sağlar. TP1 tetiklendikten sonra Stop Loss giriş + 0,30 × ATR seviyesine taşınır (başabaş artı küçük bir tampon).",
      },
      open: {
        label: "Gizli ayar yok",
        body: "Açık kaynak, MIT lisanslı. Python kaynak kodu ve TypeScript kaynak kodunun ikisi de GitHub'da. Herhangi bir sonucu kendiniz yeniden üretin.",
      },
    },
  },

  backtest: {
    pageTitle: "Backtest",
    pageSubtitle:
      "Helix V5 motorunu herhangi bir Binance çiftinde çalıştırın. Backtest tamamen tarayıcınızda yerel olarak çalışır.",
    historyButton: "Geçmiş",
    form: {
      configHeading: "Yapılandırma",
      customBadge: "Özel",
      quickPickLabel: "Hızlı seçim",
      symbolLabel: "Sembol",
      symbolPlaceholder: "BTCUSDT",
      symbolHelp: "Herhangi bir Binance spot çifti (ör. ETHUSDT, SOLUSDT, AVAXUSDT)",
      timeframeLabel: "Zaman Dilimi",
      timeframes: {
        "15m": "15 dakika",
        "30m": "30 dakika",
        "1h": "1 saat",
        "4h": "4 saat",
        "1d": "1 gün",
      },
      startDateLabel: "Başlangıç Tarihi",
      endDateLabel: "Bitiş Tarihi",
      initialCapitalLabel: "Başlangıç Sermayesi (USD)",
      advancedToggle: "Gelişmiş parametreler (V5 varsayılanları)",
      advancedFields: {
        riskPct: "Risk %",
        maxPositionPct: "Maks pozisyon %",
        slAtrMult: "SL × ATR",
        tp1AtrMult: "TP1 × ATR",
        tp2AtrMult: "TP2 × ATR",
        tp3AtrMult: "TP3 × ATR",
        minSignalScore: "Min sinyal skoru",
        minBarsBeforeSl: "SL baskılama barları",
      },
      resetDefaults: "V5 varsayılanlarına sıfırla",
      runButton: "Backtest Başlat",
      runningButton: "Çalışıyor…",
    },
    emptyState: {
      title: "Hazır olduğunuzda başlayın",
      body: "Sol panelden yapılandırın ve Backtest Başlat'a tıklayın. +%949 referans çalışmasını yeniden üretmek için BTCUSDT 1H üzerinde V5 varsayılanlarını deneyin.",
      runBacktest: "Backtest Başlat",
    },
    progress: {
      fetchingTitle: "Piyasa verileri alınıyor",
      runningTitle: "Backtest çalıştırılıyor",
      stages: {
        fetch: "Veri al",
        indicators: "Göstergeler",
        backtest: "Backtest",
      },
    },
    toast: {
      completeTitle: "Backtest tamamlandı",
      failedTitle: "Backtest başarısız oldu",
      historyLoaded: "Geçmişten yüklendi",
      historyHint: 'Yeniden çalıştırmak için "Backtest Başlat"a tıklayın',
      csvDownloaded: "CSV indirildi",
      csvDownloadedBody: "işlem dışa aktarıldı",
      linkCopied: "Bağlantı kopyalandı",
      linkCopiedBody: "Bu URL'ye sahip herkes backtest'inizi yeniden çalıştırabilir",
      copyFailed: "Kopyalama başarısız",
      copyFailedBody: "Tarayıcınız pano erişimini engelledi",
      chartExported: "Grafik dışa aktarıldı",
      noChart: "Dışa aktarılacak grafik yok",
    },
    errors: {
      invalidDateRange: "Geçersiz tarih aralığı",
      symbolRequired: "Sembol gereklidir (ör. BTCUSDT)",
      notEnoughData: "Yetersiz veri: alınan",
      notEnoughDataNeed: "mum, en az gerekli",
      generic: "Backtest başarısız oldu",
    },
    results: {
      kpis: {
        totalReturn: "Toplam getiri",
        sharpe: "Sharpe",
        maxDrawdown: "Maks Drawdown",
        winRate: "Kazanma oranı",
        profitFactor: "Profit Factor",
        expectancy: "Beklenen değer",
        perTrade: "işlem başına",
      },
      exports: {
        downloadCsv: "CSV İndir",
        copyLink: "Bağlantıyı kopyala",
        chartPng: "Grafik PNG",
      },
    },
    charts: {
      equityCurveTitle: "Equity Eğrisi",
      legendStrategy: "Strateji",
      legendBuyHold: "Al ve Tut",
      legendDrawdown: "Drawdown",
      candlestickTitle: "Fiyat",
      legendLong: "Long",
      legendShort: "Short",
      tradesSuffix: "işlem",
      exitReasonsTitle: "Çıkış Nedenleri",
      monthlyReturnsTitle: "Aylık Getiriler",
      noData: "Veri yok",
    },
    table: {
      heading: "İşlem Günlüğü",
      tradesSuffix: "işlem",
      noTrades: "İşlem üretilmedi.",
      showAll: "Tümünü göster",
      headers: {
        id: "#",
        side: "Yön",
        entryDate: "Giriş Tarihi",
        entryPrice: "Giriş $",
        exitDate: "Çıkış Tarihi",
        exitPrice: "Çıkış $",
        pnl: "PnL $",
        pnlPct: "PnL %",
        rMultiple: "R",
        bars: "Bar",
        exit: "Çıkış",
      },
    },
    metricsPanel: {
      heading: "Detaylı metrik dağılımı",
      sections: {
        returns: "Getiriler",
        risk: "Risk",
        tradeSummary: "İşlem özeti",
        tradeQuality: "İşlem kalitesi",
        costs: "Maliyetler",
      },
      labels: {
        totalReturn: "Toplam getiri",
        annualizedReturn: "Yıllıklandırılmış getiri",
        netProfit: "Net kâr",
        finalEquity: "Son Equity",
        yearsTested: "Test edilen yıl",
        maxDrawdown: "Maks Drawdown",
        maxDdDuration: "Maks DD süresi",
        avgDdDuration: "Ort DD süresi",
        sharpeRatio: "Sharpe oranı",
        sortinoRatio: "Sortino oranı",
        calmarRatio: "Calmar oranı",
        totalTrades: "Toplam işlem",
        winRate: "Kazanma oranı",
        winsLosses: "Kazanç / Kayıp",
        longTrades: "Long işlemler",
        shortTrades: "Short işlemler",
        avgBarsHeld: "Ort tutulan bar",
        profitFactor: "Profit Factor",
        payoffRatio: "Getiri oranı",
        expectancy: "Beklenen değer",
        avgWin: "Ort kazanç",
        avgLoss: "Ort kayıp",
        largestWin: "En büyük kazanç",
        largestLoss: "En büyük kayıp",
        avgRMultiple: "Ort R-multiple",
        bestRMultiple: "En iyi R-multiple",
        worstRMultiple: "En kötü R-multiple",
        maxConsecWins: "Maks ardışık kazanç",
        maxConsecLosses: "Maks ardışık kayıp",
        totalCommission: "Toplam komisyon",
        avgCommissionPerTrade: "İşlem başına ort komisyon",
        commissionPctOfGross: "Komisyonun brüte oranı %",
        bars: "bar",
        wr: "KO",
      },
    },
  },

  about: {
    metaTitle: "Hakkında · Helix Metodoloji ve Strateji Evrimi",
    metaDescription:
      "Helix V1'den V5'e nasıl evrildi — Market Structure, Fair Value Gap, SL baskılama, kademeli Take Profit'ler ve walk-forward doğrulama.",
    title: "Helix Hakkında",
    subtitle:
      "Kripto para piyasalarında kurumsal fiyat hareketi kavramlarını test etmek için bir araştırma çerçevesi.",
    onThisPage: "Bu sayfada",
    sections: {
      evolution: "Strateji evrimi",
      ms: "Market Structure",
      fvg: "Fair Value Gap",
      confluence: "Örtüşme skorlaması",
      risk: "Risk yönetimi",
      tps: "Kademeli TP'ler",
      execution: "İşlem modeli",
      walkForward: "Walk-forward",
      disclaimer: "Yasal uyarı",
    },
    evolutionIntro:
      "Her sürüm, bir önceki temel üzerine tek ve doğrulanmış bir iyileştirmedir. Eğri uydurma yok — her değişiklik walk-forward doğrulaması ile yeniden test edildi.",
    table: {
      version: "Sürüm",
      changes: "Temel değişiklikler",
      return: "Getiri",
      sharpe: "Sharpe",
      maxDd: "Maks DD",
      winRate: "Kazanma oranı",
      current: "güncel",
    },
    methodology: {
      ms: "Motor, her iki yönde 5 bar geriye bakış penceresi kullanarak salınım zirvelerini ve diplerini belirler. Her yeni salınım Higher High (HH), Higher Low (HL), Lower High (LH) veya Lower Low (LL) olarak sınıflandırılır. HH+HL gördüğümüzde piyasa yükseliş trendinde, LH+LL gördüğümüzde düşüş trendindedir. Yükseliş trendinde son salınım zirvesinin üzerinde bir kapanış Break of Structure (BOS) Long sinyali üretir; yükseliş trendinden düşüş trendine geçiş Change of Character (CHoCH) dönüş sinyali üretir. Sinyal gücü trend olgunluğu (ardışık aynı yönlü salınımlar) ve kırılım mumunun ATR'ye göre büyüklüğü ile ölçeklenir.",
      fvg: "Fair Value Gap, fiyatın 1. mum ile 3. mum arasında doldurulmamış bir dengesizlik bıraktığı 3 mumlu bir formasyondur. Her boşluk anlamlı sayılabilmesi için en az 0,3× ATR olmalıdır. Motor her aktif FVG'yi takip eder ve fiyat bölgeye ilk kez geri döndüğünde yeniden test giriş sinyali verir. Sinyal gücü daha büyük ve daha taze boşlukları ödüllendirir.",
      confluence:
        "Toplayıcı, Market Structure ve FVG sinyallerini tek bir karara birleştirir. Her etkinleştirilmiş gösterge normalleştirilmiş 0–1 skoruna katkıda bulunur. Bir işlem yalnızca toplam skor en az 0,50 olduğunda (iki teyit kaynağı gerekli) VE 0,60 sonrası toplama filtresinden geçtiğinde tetiklenir.",
      risk: "V5, işlem başına Equity'nin %3'ünü riske atar ve %80 pozisyon tavanı uygular. Stop Loss 1× ATR olarak hesaplanır — ancak normal SL işlemin ilk 50 barı boyunca baskılanır. Baskılama penceresi boyunca yalnızca 15× ATR \"sabit Stop\" felaket koruması sağlar. 50 bardan sonra normal Stop aktif olur. Bu, değişken kripto piyasalarında gözlemlenen erken sallanma sorununu önemli ölçüde azaltır.",
      tpsLead: "Kârlar üç kademede alınır:",
      tpsBullets: [
        "Pozisyonun %5'i 1× ATR'de kapatılır (TP1)",
        "%30'u 4× ATR'de kapatılır (TP2) — yalnızca TP1 sonrası",
        "%65'i 6× ATR'de kapatılır (TP3) — yalnızca TP2 sonrası",
      ],
      tpsTail:
        "TP1 tetiklendiğinde Stop Loss giriş + 0,30 × ATR seviyesine taşınır (başabaş artı küçük bir tampon); kalan %95'lik pozisyonun daha büyük hareketi yakalaması için koruma kilitlenir.",
      execution:
        "Her giriş bar kapanışında %0,02 olumsuz kayma ile doldurulur. Stop Loss ve veri sonu çıkışları da kayma öder; Take Profit dolumları ödemez (limit emirleridir). Her kısmi kapanıştan hem giriş hem çıkış nominal değeri üzerinden %0,075 komisyon alınır; Binance taker ücretlerini gerçekçi şekilde yansıtır.",
      walkForward:
        "Python araştırma kodu, fold başına 60/40 eğitim/test ayrımı ile 5 katlı walk-forward doğrulaması çalıştırır. V5, 5/5 kârlı test katmanı ve ortalama %48,72 örneklem dışı getiri üretir. Web uygulaması yalnızca örneklem içi backtest'i gösterir — tam doğrulama için araştırma deposuna bakın.",
    },
    disclaimer: {
      heading: "Yasal Uyarı",
      body: "Helix bir araştırma ve eğitim aracıdır. Backtest sonuçları gelecekteki performansı öngörmez. Geçmiş performans gelecekteki sonuçların göstergesi değildir. Kripto para ticareti önemli kayıp riski taşır ve herkes için uygun değildir. Bu sitedeki hiçbir şey yatırım, finansal, ticari veya başka herhangi bir tavsiye niteliğinde değildir. Burada sunulan bilgilere dayanarak aldığınız tüm kararlardan yalnızca siz sorumlusunuz.",
    },
    cta: "Kendiniz deneyin",
  },

  changelog: {
    metaTitle: "Değişiklik Günlüğü ve Yol Haritası",
    metaDescription:
      "Helix V1'den V5'e sürüm notları, artı V6 ve canlı işlem araştırmasında neler gelecek.",
    badge: "Araştırma ilerlemesi · açık kaynak",
    title: "Değişiklik Günlüğü ve Yol Haritası",
    subtitle:
      "Helix'in her sürümü bir önceki üzerine tek ve doğrulanmış bir iyileştirmedir. Eğri uydurma yok — her değişiklik commit edilmeden önce walk-forward doğrulamasından geçirildi.",
    releasesHeading: "Sürümler",
    roadmapHeading: "Yol Haritası",
    roadmapIntro:
      "Sırada üzerinde çalıştığımız konular. Bunların hiçbiri kesinleşmedi — olasılık sırasına göre kabaca sıralanmış araştırma yönleridir.",
    currentBadge: "Güncel",
    cta: "V5'i herhangi bir çiftte deneyin",
    statuses: {
      inProgress: "Devam ediyor",
      planned: "Planlandı",
      researching: "Araştırılıyor",
    },
  },

  notFound: {
    metaTitle: "404 · Sayfa bulunamadı",
    code: "404",
    title: "Bu sayfa mevcut değil",
    body: "Aradığınız sayfa taşınmış, hiç var olmamış veya URL'yi yanlış yazmış olabilirsiniz. Backtest motoru sorunsuz çalışmaya devam ediyor.",
    goHome: "Ana sayfaya dön",
    runBacktest: "Backtest başlat",
  },

  commandPalette: {
    placeholder: "Ara veya git…",
    empty: "Sonuç bulunamadı",
    groups: {
      navigate: "Gezin",
      quickRun: "Hızlı çalıştır",
      external: "Harici",
    },
    items: {
      home: "Ana Sayfa",
      backtest: "Backtest",
      about: "Hakkında",
      changelog: "Değişiklik Günlüğü",
      runBtc: "BTCUSDT 1H çalıştır · 2023→bugün",
      runEth: "ETHUSDT 1H çalıştır · 2023→bugün",
      runSol: "SOLUSDT 1H çalıştır · 2023→bugün",
      githubRepo: "GitHub deposu",
    },
    hints: {
      navigate: "gezin",
      select: "seç",
      toggle: "aç/kapa",
    },
  },

  errorPage: {
    title: "Bir şeyler ters gitti",
    body: "Bu sayfa oluşturulurken beklenmeyen bir hata meydana geldi.",
    digest: "özet",
    tryAgain: "Tekrar dene",
    backtestTitle: "Backtest sayfası çöktü",
    backtestBody: "Backtest sayfası oluşturulurken bir hata meydana geldi.",
    reloadBacktest: "Backtest'i yeniden yükle",
  },

  live: {
    badge: "Forward test başlangıç",
    title: "Canlı Forward Test",
    subtitle: "Helix V5, 5 coinde her biri $10.000 sanal sermaye ile çalışıyor. Gerçek Binance 1s mumları, ileriye bakış yok, sıfırlama yok.",
    disclaimer: "Helix V5, BTC 1s verisi üzerinde Oca 2023 – Şub 2026 arasında optimize edilmiştir. Bu canlı panel tek gerçek örneklem dışı testtir. Sonuçlar backtest'ten önemli ölçüde farklı olabilir.",
    chartTitle: "Varlık Eğrisi (tüm coinler)",
    openPositionsTitle: "Açık Pozisyonlar",
    lastTick: "Son tick",
    loading: "Canlı veriler yükleniyor...",
    errorPrefix: "Veri yüklenemedi:",
    kpis: {
      totalEquity: "Toplam Varlık",
      totalReturn: "Toplam Getiri",
      bestPerformer: "En İyi Performans",
      totalTrades: "Toplam İşlem",
    },
    trades: {
      title: "Son İşlemler",
      coin: "Coin",
      dir: "Yön",
      entry: "Giriş",
      exit: "Çıkış",
      pnl: "K/Z",
      reason: "Sebep",
      time: "Zaman",
    },
    updated: "Güncellendi",
  },

  language: {
    label: "Dil",
  },
} as const;
