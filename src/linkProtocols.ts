const allowedLinkProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

function compactSchemeCandidate(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 0x20 && codePoint !== 0x7f;
    })
    .join("");
}

export function isSafeLinkHref(value: string): boolean {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith("//")) return false;

  const compactHref = compactSchemeCandidate(href);
  const scheme = compactHref.match(/^[a-zA-Z][a-zA-Z\d+.-]*:/)?.[0].toLowerCase();
  if (scheme) return allowedLinkProtocols.has(scheme);

  return true;
}

export function safeLinkHref(value: string): string | null {
  const href = value.trim();
  return isSafeLinkHref(href) ? href : null;
}
