const allowedLinkProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

// Named HTML entities that decode to characters relevant to URL scheme/path
// obfuscation. Decoding these mirrors how a browser interprets an href
// attribute value before navigation, so they cannot be used to smuggle a
// disallowed scheme past validation.
const namedSchemeEntities: Record<string, string> = {
  colon: ":",
  tab: "\t",
  newline: "\n",
  sol: "/",
  bsol: "\\",
};

// Decode numeric, hex, and a small set of named HTML entities. Only the
// decoded form is used for validation; the original href is what gets stored.
function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);?/g,
    (match, body: string) => {
      if (body[0] === "#") {
        const isHex = body[1] === "x" || body[1] === "X";
        const codePoint = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
          return match;
        }
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      const named = namedSchemeEntities[body.toLowerCase()];
      return named ?? match;
    },
  );
}

// Remove control characters, Unicode format/zero-width characters, and
// whitespace so that obfuscated schemes (e.g. a leading U+200B) cannot block
// the start-anchored scheme detector.
function stripInvisibleCharacters(value: string): string {
  return value.replace(/[\p{Cc}\p{Cf}\p{Zs}\s]/gu, "");
}

// Decode percent-encoded octets so an encoded scheme separator (e.g. "%3A" for
// ":") cannot hide a disallowed scheme from the start-anchored detector. Only
// the decoded form is used for validation; the original href is what is stored.
function decodePercentEncoding(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // Decode only well-formed ASCII octets so a stray "%" doesn't abort.
    return value.replace(/%[0-9a-fA-F]{2}/g, (octet) =>
      String.fromCharCode(Number.parseInt(octet.slice(1), 16)),
    );
  }
}

export function isSafeLinkHref(value: string): boolean {
  const href = value.trim();
  if (!href) return false;

  const normalizedHref = stripInvisibleCharacters(
    decodePercentEncoding(decodeHtmlEntities(href)),
  );
  if (!normalizedHref) return false;

  const slashNormalizedHref = normalizedHref.replace(/\\/g, "/");
  if (slashNormalizedHref.startsWith("//")) return false;

  const scheme = normalizedHref.match(/^[a-zA-Z][a-zA-Z\d+.-]*:/)?.[0].toLowerCase();
  if (scheme) return allowedLinkProtocols.has(scheme);

  return true;
}

export function safeLinkHref(value: string): string | null {
  const href = value.trim();
  return isSafeLinkHref(href) ? href : null;
}
