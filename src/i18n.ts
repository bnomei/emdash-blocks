export type LocalizedString = string | Record<string, string | undefined>;

export type BlocksMessageKey =
  | "addBlock"
  | "addMedia"
  | "blockProps"
  | "blocks"
  | "bold"
  | "bulletedList"
  | "couldNotLoadMedia"
  | "heading"
  | "hideBlock"
  | "invalidJson"
  | "italic"
  | "jsonStringArray"
  | "jsonValue"
  | "link"
  | "linkProtocolError"
  | "loadingMedia"
  | "moveBlockDown"
  | "moveBlockUp"
  | "noEditableProps"
  | "noMedia"
  | "numberedList"
  | "paragraph"
  | "props"
  | "propsMustBeObject"
  | "quote"
  | "remove"
  | "removeBlock"
  | "repeaterMustBeArray"
  | "showBlock"
  | "type";

export type BlocksI18nMessages = Partial<
  Record<string, Partial<Record<BlocksMessageKey, string | undefined>>>
>;

export type BlocksI18nConfig = {
  locale?: string;
  defaultLocale?: string;
  locales?: string[];
  fallback?: Record<string, string>;
  messages?: BlocksI18nMessages;
};

export const DEFAULT_LOCALE = "en";

export const DEFAULT_BLOCKS_I18N = {
  defaultLocale: DEFAULT_LOCALE,
  locales: [DEFAULT_LOCALE],
  messages: {
    en: {
      addBlock: "Add Block",
      addMedia: "Add media",
      blockProps: "Block props",
      blocks: "Blocks",
      bold: "Bold",
      bulletedList: "Bulleted list",
      couldNotLoadMedia: "Could not load media library.",
      heading: "Heading",
      hideBlock: "Hide block",
      invalidJson: "Invalid JSON: {error}",
      italic: "Italic",
      jsonStringArray: "JSON string array",
      jsonValue: "JSON value",
      link: "Link",
      linkProtocolError:
        "Links must use http:, https:, mailto:, tel:, root-relative, or relative URLs.",
      loadingMedia: "Loading media...",
      moveBlockDown: "Move block down",
      moveBlockUp: "Move block up",
      noEditableProps: "This block type has no editable props.",
      noMedia: "No media",
      numberedList: "Numbered list",
      paragraph: "Paragraph",
      props: "Props",
      propsMustBeObject: "Props must be a JSON object.",
      quote: "Quote",
      remove: "Remove",
      removeBlock: "Remove block",
      repeaterMustBeArray: "This field must be a JSON array.",
      showBlock: "Show block",
      type: "Type",
    },
  },
} satisfies {
  defaultLocale: string;
  locales: string[];
  messages: Record<typeof DEFAULT_LOCALE, Record<BlocksMessageKey, string>>;
};

export function normalizeLocale(locale: string | null | undefined): string {
  return (locale ?? DEFAULT_LOCALE).trim() || DEFAULT_LOCALE;
}

export function localeFallbacks(i18n: BlocksI18nConfig | string | null | undefined): string[] {
  const config = typeof i18n === "string" ? { locale: i18n } : (i18n ?? {});
  const defaultLocale = normalizeLocale(config.defaultLocale ?? DEFAULT_BLOCKS_I18N.defaultLocale);
  const startLocale = normalizeLocale(config.locale ?? defaultLocale);
  const chain: string[] = [startLocale];
  const visited = new Set(chain);
  let current = startLocale;

  while (config.fallback?.[current]) {
    const next = config.fallback[current];
    if (!next || visited.has(next)) break;
    chain.push(next);
    visited.add(next);
    current = next;
  }

  if (!visited.has(defaultLocale)) {
    chain.push(defaultLocale);
  }

  return chain;
}

export function localizedString(
  value: LocalizedString | null | undefined,
  i18n: BlocksI18nConfig | string | null | undefined,
  fallback = "",
): string {
  if (typeof value === "string") return value;
  if (!value) return fallback;

  for (const candidate of localeFallbacks(i18n)) {
    const translated = value[candidate];
    if (typeof translated === "string" && translated.length > 0) return translated;
  }

  const source = value[DEFAULT_LOCALE];
  if (typeof source === "string" && source.length > 0) return source;

  const first = Object.values(value).find(
    (translated): translated is string => typeof translated === "string" && translated.length > 0,
  );
  return first ?? fallback;
}

export function blockMessage(
  key: BlocksMessageKey,
  i18n: BlocksI18nConfig | string | null | undefined,
): string {
  const config = typeof i18n === "string" ? { locale: i18n } : (i18n ?? {});

  // Consult the entire fallback chain for a configured override before falling
  // back to the built-in English default. Returning the built-in default at the
  // DEFAULT_LOCALE position mid-loop would shadow an override on a later
  // fallback-chain locale (mirrors localizedString's resolution order).
  for (const locale of localeFallbacks(config)) {
    const override = config.messages?.[locale]?.[key];
    if (typeof override === "string" && override.length > 0) return override;
  }

  const sourceOverride = config.messages?.[DEFAULT_LOCALE]?.[key];
  if (typeof sourceOverride === "string" && sourceOverride.length > 0) return sourceOverride;

  return DEFAULT_BLOCKS_I18N.messages.en[key] ?? key;
}

export function formatBlockMessage(
  key: BlocksMessageKey,
  i18n: BlocksI18nConfig | string | null | undefined,
  replacements: Record<string, string | number>,
): string {
  return blockMessage(key, i18n).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const replacement = replacements[name];
    return replacement === undefined ? match : String(replacement);
  });
}
