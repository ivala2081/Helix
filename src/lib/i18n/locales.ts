// Supported locales config. Adding/removing a language is one entry here.

export const LOCALES = [
  "en",
  "tr",
  "es",
  "de",
  "fr",
  "pt",
  "ru",
  "zh",
  "ja",
  "ko",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; flag: string }> = {
  en: { native: "English", english: "English", flag: "🇬🇧" },
  tr: { native: "Türkçe", english: "Turkish", flag: "🇹🇷" },
  es: { native: "Español", english: "Spanish", flag: "🇪🇸" },
  de: { native: "Deutsch", english: "German", flag: "🇩🇪" },
  fr: { native: "Français", english: "French", flag: "🇫🇷" },
  pt: { native: "Português", english: "Portuguese", flag: "🇵🇹" },
  ru: { native: "Русский", english: "Russian", flag: "🇷🇺" },
  zh: { native: "中文", english: "Chinese", flag: "🇨🇳" },
  ja: { native: "日本語", english: "Japanese", flag: "🇯🇵" },
  ko: { native: "한국어", english: "Korean", flag: "🇰🇷" },
};

export const LOCALE_COOKIE = "helix-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Pick the best matching locale from a browser Accept-Language header.
 * E.g. "tr-TR,tr;q=0.9,en-US;q=0.8" → "tr"
 */
export function pickLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  // Parse the header into ordered language tags by quality.
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q = "q=1"] = part.trim().split(";");
      const quality = parseFloat(q.replace("q=", "")) || 0;
      return { tag: tag.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of tags) {
    // Try full tag (e.g., "zh-cn"), then primary (e.g., "zh")
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
