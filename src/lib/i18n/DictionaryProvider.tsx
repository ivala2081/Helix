"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./dictionaries/en";
import type { Locale } from "./locales";

interface DictionaryContextValue {
  dict: Dictionary;
  locale: Locale;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  dict,
  locale,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={{ dict, locale }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): Dictionary {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error(
      "useDictionary must be used within <DictionaryProvider>. " +
        "Make sure the layout is wrapping the app correctly.",
    );
  }
  return ctx.dict;
}

export function useLocale(): Locale {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error("useLocale must be used within <DictionaryProvider>");
  }
  return ctx.locale;
}
