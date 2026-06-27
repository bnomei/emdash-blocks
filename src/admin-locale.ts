/**
 * Admin locale reader for the `emdash-locale` cookie.
 *
 * `useAdminLocale` re-syncs on window focus and a short interval so locale
 * switches elsewhere in the admin UI propagate to the blocks field widget.
 */
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, normalizeLocale } from "./i18n";

const LOCALE_COOKIE_NAME = "emdash-locale";

/** Reads the active admin locale from the `emdash-locale` cookie. */
export function readAdminLocale(fallback = DEFAULT_LOCALE): string {
  const normalizedFallback = normalizeLocale(fallback);

  if (typeof document === "undefined") return normalizedFallback;

  const cookieLocale = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.slice(LOCALE_COOKIE_NAME.length + 1);

  if (!cookieLocale) return normalizedFallback;

  try {
    return normalizeLocale(decodeURIComponent(cookieLocale)) || normalizedFallback;
  } catch {
    return normalizedFallback;
  }
}

/** React hook that tracks the admin locale cookie across focus and navigation. */
export function useAdminLocale(fallback = DEFAULT_LOCALE): string {
  const [locale, setLocale] = useState(() => readAdminLocale(fallback));

  useEffect(() => {
    function syncLocale() {
      setLocale(readAdminLocale(fallback));
    }

    syncLocale();
    window.addEventListener("focus", syncLocale);
    const interval = window.setInterval(syncLocale, 1000);

    return () => {
      window.removeEventListener("focus", syncLocale);
      window.clearInterval(interval);
    };
  }, [fallback]);

  return locale;
}
