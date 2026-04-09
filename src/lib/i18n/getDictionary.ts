// Server-side dictionary loader. Lazy-imports the requested locale's
// dictionary file so we don't ship all 10 languages in a single bundle.

import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";
import { en, type Dictionary } from "./dictionaries/en";

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => Promise.resolve({ default: en }),
  tr: () => import("./dictionaries/tr").then((m) => ({ default: m.tr as unknown as Dictionary })),
  es: () => import("./dictionaries/es").then((m) => ({ default: m.es as unknown as Dictionary })),
  de: () => import("./dictionaries/de").then((m) => ({ default: m.de as unknown as Dictionary })),
  fr: () => import("./dictionaries/fr").then((m) => ({ default: m.fr as unknown as Dictionary })),
  pt: () => import("./dictionaries/pt").then((m) => ({ default: m.pt as unknown as Dictionary })),
  ru: () => import("./dictionaries/ru").then((m) => ({ default: m.ru as unknown as Dictionary })),
  zh: () => import("./dictionaries/zh").then((m) => ({ default: m.zh as unknown as Dictionary })),
  ja: () => import("./dictionaries/ja").then((m) => ({ default: m.ja as unknown as Dictionary })),
  ko: () => import("./dictionaries/ko").then((m) => ({ default: m.ko as unknown as Dictionary })),
};

/**
 * Memoized for the lifetime of a single request — multiple server components
 * in the same render call only load the dictionary once.
 */
export const getDictionary = cache(async (locale: Locale): Promise<Dictionary> => {
  try {
    const mod = await loaders[locale]();
    return mod.default;
  } catch {
    return en;
  }
});

/**
 * Read the locale from the cookie set by middleware. Falls back to the
 * default if the cookie is missing or invalid.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const cookie = store.get(LOCALE_COOKIE);
  if (cookie && isLocale(cookie.value)) return cookie.value;
  return DEFAULT_LOCALE;
});

/**
 * Convenience: load the dictionary for the current request's locale in one call.
 */
export async function getCurrentDictionary(): Promise<{
  locale: Locale;
  dict: Dictionary;
}> {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return { locale, dict };
}
