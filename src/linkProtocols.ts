/**
 * Link href policy for portable-text markDefs and editor output.
 *
 * Validates a canonical decoded form of each href (entities, percent-encoding,
 * and invisible characters stripped) while storing the original trimmed value.
 * Rejects protocol-relative `//` URLs and disallowed schemes.
 */
const allowedLinkProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

const namedSchemeEntities: Record<string, string> = {
  colon: ":",
  tab: "\t",
  newline: "\n",
  sol: "/",
  bsol: "\\",
};

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

function stripInvisibleCharacters(value: string): string {
  return value.replace(/[\p{Cc}\p{Cf}\p{Zs}\s]/gu, "");
}

function decodePercentEncoding(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%[0-9a-fA-F]{2}/g, (octet) =>
      String.fromCharCode(Number.parseInt(octet.slice(1), 16)),
    );
  }
}

/** Returns whether a trimmed href passes the portable-text link policy. */
export function isSafeLinkHref(value: string): boolean {
  const href = value.trim();
  if (!href) return false;

  // Scheme and protocol-relative checks share one canonical form so obfuscation
  // cannot satisfy one guard while bypassing the other.
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

/** Returns the trimmed href when safe, otherwise `null`. */
export function safeLinkHref(value: string): string | null {
  const href = value.trim();
  return isSafeLinkHref(href) ? href : null;
}
