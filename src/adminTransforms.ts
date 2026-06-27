import { safeLinkHref } from "./linkProtocols";
import { defaultBlockDefinitions, defaultPropsForDefinition } from "./schema";
import type {
  BlockBuilderBlock,
  BlockBuilderDefinition,
  BlockBuilderOptions,
  BlockBuilderProps,
  BlockBuilderValue,
} from "./types";

export type MediaValue = {
  id: string;
  provider?: string;
  src?: string;
  previewUrl?: string;
  filename?: string;
  mimeType?: string;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  meta?: Record<string, unknown>;
};

export type MediaItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
  storageKey: string;
  status: string;
  blurhash: string | null;
  dominantColor: string | null;
  url?: string;
};

export type PortableTextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
};

export type PortableTextMarkDef = {
  _key: string;
  _type: "link";
  href: string;
};

export type PortableTextBlock = {
  _type: string;
  _key: string;
  style?: string;
  listItem?: "bullet" | "number";
  level?: number;
  markDefs?: PortableTextMarkDef[];
  children?: PortableTextSpan[];
  [key: string]: unknown;
};

export type JsonDraftParseResult = { ok: true; value: unknown } | { ok: false; error: string };

const TEXT_NODE = 3;

type TextNodeLike = {
  nodeType: number;
  textContent?: string | null;
};

type ElementLike = {
  nodeType?: number;
  tagName: string;
  childNodes: Array<ChildNode | TextNodeLike | ElementLike>;
  getAttribute(name: string): string | null;
  querySelectorAll(selector: string): Array<ElementLike>;
};

function isElementLike(value: unknown): value is ElementLike {
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return true;
  return value !== null && typeof value === "object" && "tagName" in value && "childNodes" in value;
}

function isTextNodeLike(value: unknown): value is TextNodeLike {
  return value !== null && typeof value === "object" && "nodeType" in value;
}

export function randomId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeEditorBlock(value: unknown, index: number): BlockBuilderBlock {
  const record = asRecord(value);
  const props =
    record.props && typeof record.props === "object" && !Array.isArray(record.props)
      ? (record.props as Record<string, unknown>)
      : {};

  return {
    id: typeof record.id === "string" && record.id ? record.id : `block-${index + 1}`,
    type: typeof record.type === "string" && record.type ? record.type : "text",
    hidden: typeof record.hidden === "boolean" ? record.hidden : undefined,
    props,
  };
}

function isBlockRecord(value: unknown): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Ensure every block has a unique id. Duplicate ids would collide as React
// list keys and bind stateful per-block editors to the wrong row.
function dedupeBlockIds(blocks: BlockBuilderValue): BlockBuilderValue {
  const seen = new Set<string>();
  return blocks.map((block, index) => {
    if (!seen.has(block.id)) {
      seen.add(block.id);
      return block;
    }
    let uniqueId = `${block.id}-${index + 1}`;
    while (seen.has(uniqueId)) uniqueId = `${uniqueId}-x`;
    seen.add(uniqueId);
    return { ...block, id: uniqueId };
  });
}

export function normalizeEditorBlocks(value: unknown): BlockBuilderValue {
  if (Array.isArray(value)) {
    // Drop null/primitive/array slots so sparse or corrupted arrays do not
    // materialize phantom empty text blocks that get persisted on save.
    return dedupeBlockIds(
      value.filter(isBlockRecord).map((item, index) => normalizeEditorBlock(item, index)),
    );
  }
  // A single stored block object (a plausible migration/corruption shape) is
  // coerced into a one-element list so its content is shown and preserved,
  // rather than presented as empty and silently overwritten on the first edit.
  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).type === "string" &&
    (value as Record<string, unknown>).type
  ) {
    return [normalizeEditorBlock(value, 0)];
  }
  return [];
}

export function prepareBlocksForChange(nextBlocks: BlockBuilderValue): BlockBuilderValue {
  return nextBlocks.map((block) => ({ ...block, hidden: block.hidden || undefined }));
}

export function resolveBlockDefinitions(
  blocks: BlockBuilderValue,
  options?: BlockBuilderOptions,
): BlockBuilderDefinition[] {
  const configured = options?.blockDefinitions?.length
    ? options.blockDefinitions
    : (options?.blockTypes ?? []);
  const configuredTypes = new Set(configured.map((definition) => definition.type));
  const merged = [
    ...configured,
    ...defaultBlockDefinitions.filter((definition) => !configuredTypes.has(definition.type)),
  ];
  const definitions = merged.map((definition) => {
    const defaultDefinition = defaultBlockDefinitions.find((item) => item.type === definition.type);
    return {
      ...defaultDefinition,
      ...definition,
      props: definition.props ?? defaultDefinition?.props ?? [],
    };
  });
  const known = new Set(definitions.map((option) => option.type));
  const extra = blocks
    .map((block) => block.type)
    .filter((type, index, list) => type && !known.has(type) && list.indexOf(type) === index)
    .map((type) => ({ type, label: type, props: undefined }));
  return [...definitions, ...extra];
}

export function createBlockForDefinition(
  definition?: BlockBuilderDefinition,
  createId = randomId,
): BlockBuilderBlock {
  return {
    id: createId("block"),
    type: definition?.type ?? "text",
    props: defaultPropsForDefinition(definition),
  };
}

export function blockWithType(
  block: BlockBuilderBlock,
  nextType: string,
  definitions: BlockBuilderDefinition[],
): BlockBuilderBlock {
  const nextDefinition = definitions.find((item) => item.type === nextType);
  return {
    ...block,
    type: nextType,
    props: defaultPropsForDefinition(nextDefinition),
  };
}

export function parseJsonDraft(value: string): JsonDraftParseResult {
  try {
    return { ok: true, value: value.trim() ? JSON.parse(value) : undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function parseJsonValue(value: string): unknown {
  const result = parseJsonDraft(value);
  return result.ok ? result.value : undefined;
}

export function parseProps(value: string): BlockBuilderProps | null {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as BlockBuilderProps)
    : null;
}

export function isMediaValue(value: unknown): value is MediaValue {
  const record = asRecord(value);
  if (typeof record.id !== "string" && typeof record.src !== "string") return false;
  // Require a non-empty identity source so a value that survives mediaValues can
  // always derive a stable, unique key. Empty-string id/src would collapse
  // distinct entries onto the same dedup/React key and make a single remove
  // delete every empty-identity entry at once.
  const identitySources = [record.id, record.src, record.previewUrl, asRecord(record.meta).storageKey];
  return identitySources.some((candidate) => typeof candidate === "string" && candidate.length > 0);
}

export function mediaValues(value: unknown): MediaValue[] {
  if (Array.isArray(value)) return value.filter(isMediaValue);
  return isMediaValue(value) ? [value] : [];
}

export function firstMediaValue(value: unknown): MediaValue | null {
  return mediaValues(value)[0] ?? null;
}

export function mediaStorageKey(value: MediaValue): string {
  const storageKey = value.meta?.storageKey;
  return typeof storageKey === "string" && storageKey ? storageKey : "";
}

export function mediaIdentity(value: MediaValue): string {
  return value.id || mediaStorageKey(value) || value.src || value.previewUrl || "";
}

export function mediaUrl(value: MediaValue): string {
  if (typeof value.previewUrl === "string" && value.previewUrl) return value.previewUrl;
  if (typeof value.src === "string" && value.src) return value.src;

  const storageKey = mediaStorageKey(value);
  if (storageKey) return `/_emdash/api/media/file/${encodeStorageKey(storageKey)}`;
  if (value.id) return `/_emdash/api/media/file/${encodeURIComponent(value.id)}`;
  return "";
}

export function encodeStorageKey(storageKey: string): string {
  // Drop empty, "." and ".." segments so a stored storageKey cannot produce a
  // path-traversal URL (e.g. "../../sensitive") when used as an <img src>.
  return storageKey
    .split("/")
    .filter((segment) => segment !== "" && segment !== "." && segment !== "..")
    .map(encodeURIComponent)
    .join("/");
}

export function mediaValueFromItem(item: MediaItem): MediaValue {
  return {
    id: item.id,
    provider: "local",
    filename: item.filename,
    mimeType: item.mimeType,
    size: item.size,
    width: item.width,
    height: item.height,
    alt: item.alt ?? "",
    meta: {
      storageKey: item.storageKey,
      caption: item.caption,
      blurhash: item.blurhash,
      dominantColor: item.dominantColor,
    },
  };
}

export function mediaSelectLabel(value: MediaValue): string {
  return value.filename || mediaStorageKey(value) || value.id || value.src || "Selected media";
}

function isPortableTextBlock(value: unknown): value is PortableTextBlock {
  const record = asRecord(value);
  return typeof record._type === "string" && typeof record._key === "string";
}

export function portableTextBlocks(value: unknown): PortableTextBlock[] {
  if (Array.isArray(value)) return value.filter(isPortableTextBlock);
  if (typeof value === "string" && value.trim()) return markdownToPortableText(value);
  return [];
}

function normalizeMarkdownSource(value: string): string {
  return value.replace(/^(#{1,6})(?=\S)/gm, "$1 ");
}

export function markdownToPortableText(value: string): PortableTextBlock[] {
  const blocks: PortableTextBlock[] = [];
  const lines = normalizeMarkdownSource(value).split("\n");

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push(makeTextBlock(heading[2], `h${Math.min(heading[1].length, 4)}`));
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      blocks.push(makeTextBlock(quote[1], "blockquote"));
      continue;
    }

    const unordered = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (unordered) {
      blocks.push(makeTextBlock(unordered[2], "normal", "bullet", listLevel(unordered[1])));
      continue;
    }

    const ordered = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (ordered) {
      blocks.push(makeTextBlock(ordered[2], "normal", "number", listLevel(ordered[1])));
      continue;
    }

    const paragraphLines = [line];
    while (index + 1 < lines.length && lines[index + 1].trim()) {
      const next = lines[index + 1];
      if (/^(#{1,6})\s+/.test(next) || /^>\s+/.test(next) || /^\s*[-*+]\s+/.test(next)) break;
      if (/^\s*\d+\.\s+/.test(next)) break;
      paragraphLines.push(next);
      index++;
    }
    blocks.push(makeTextBlock(paragraphLines.join("\n")));
  }

  return blocks;
}

function listLevel(value: string): number {
  return Math.floor(value.length / 2) + 1;
}

function makeTextBlock(
  text: string,
  style = "normal",
  listItem?: "bullet" | "number",
  level?: number,
): PortableTextBlock {
  const { children, markDefs } = parseInlineMarkdown(text);
  return {
    _type: "block",
    _key: randomId("pt"),
    style,
    ...(listItem ? { listItem, level: level ?? 1 } : {}),
    markDefs,
    children,
  };
}

function parseInlineMarkdown(text: string): {
  children: PortableTextSpan[];
  markDefs: PortableTextMarkDef[];
} {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  const pattern = /(\*\*(.+?)\*\*)|(_(.+?)_)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))|(~~(.+?)~~)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      children.push(makeSpan(text.slice(cursor, match.index)));
    }

    if (match[2] != null) {
      children.push(makeSpan(match[2], ["strong"]));
    } else if (match[4] != null) {
      children.push(makeSpan(match[4], ["em"]));
    } else if (match[6] != null) {
      children.push(makeSpan(match[6], ["code"]));
    } else if (match[8] != null && match[9] != null) {
      const href = safeLinkHref(match[9]);
      if (href) {
        const key = randomId("link");
        markDefs.push({ _key: key, _type: "link", href });
        children.push(makeSpan(match[8], [key]));
      } else {
        children.push(makeSpan(match[8]));
      }
    } else if (match[11] != null) {
      children.push(makeSpan(match[11], ["strike-through"]));
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) children.push(makeSpan(text.slice(cursor)));
  return { children: children.length ? children : [makeSpan("")], markDefs };
}

function makeSpan(text: string, marks: string[] = []): PortableTextSpan {
  return { _type: "span", _key: randomId("span"), text, marks };
}

export function portableTextToEditorHtml(value: unknown): string {
  const blocks = portableTextBlocks(value);
  if (!blocks.length) return "";

  let html = "";
  let openList: "bullet" | "number" | null = null;

  for (const block of blocks) {
    if (block._type !== "block") continue;
    const content = spansToHtml(block.children ?? [], block.markDefs ?? []);

    if (block.listItem) {
      if (openList !== block.listItem) {
        if (openList) html += openList === "number" ? "</ol>" : "</ul>";
        html += block.listItem === "number" ? "<ol>" : "<ul>";
        openList = block.listItem;
      }
      const levelAttr =
        typeof block.level === "number" && block.level > 1 ? ` data-level="${block.level}"` : "";
      html += `<li${levelAttr}>${content}</li>`;
      continue;
    }

    if (openList) {
      html += openList === "number" ? "</ol>" : "</ul>";
      openList = null;
    }

    const tag = block.style?.match(/^h[1-6]$/)
      ? block.style
      : block.style === "blockquote"
        ? "blockquote"
        : "p";
    html += `<${tag}>${content}</${tag}>`;
  }

  if (openList) html += openList === "number" ? "</ol>" : "</ul>";
  return html;
}

function spansToHtml(spans: PortableTextSpan[], markDefs: PortableTextMarkDef[]): string {
  return spans
    .map((span) => {
      const marks = span.marks ?? [];
      const link = marks
        .map((mark) => markDefs.find((definition) => definition._key === mark))
        .find(Boolean);
      let html = escapeHtml(span.text ?? "");

      if (marks.includes("code")) html = `<code>${html}</code>`;
      if (marks.includes("strong")) html = `<strong>${html}</strong>`;
      if (marks.includes("em")) html = `<em>${html}</em>`;
      if (marks.includes("strike-through") || marks.includes("strikethrough"))
        html = `<s>${html}</s>`;
      if (link?.href) {
        const href = safeLinkHref(link.href);
        if (href) html = `<a href="${escapeAttribute(href)}">${html}</a>`;
      }
      return html.replace(/\n/g, "<br>");
    })
    .join("");
}

export function editorHtmlToPortableText(
  element: HTMLElement | ElementLike | null,
): PortableTextBlock[] {
  if (!element) return [];
  const blocks: PortableTextBlock[] = [];

  for (const child of Array.from(element.childNodes)) {
    appendPortableTextNode(child, blocks);
  }

  return blocks.filter((block) => {
    if (block._type !== "block") return true;
    return (block.children ?? []).some((span) => span.text.trim());
  });
}

function appendPortableTextNode(
  node: ChildNode | TextNodeLike | ElementLike,
  blocks: PortableTextBlock[],
  level = 1,
) {
  if (isTextNodeLike(node) && node.nodeType === TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text.trim()) blocks.push(makeTextBlock(text));
    return;
  }

  if (!isElementLike(node)) return;
  const tag = node.tagName.toLowerCase();

  if (tag === "ul" || tag === "ol") {
    const listItem = tag === "ol" ? "number" : "bullet";
    node.querySelectorAll(":scope > li").forEach((item) => {
      if (!isElementLike(item)) return;
      appendListItem(item, blocks, listItem, level);
    });
    return;
  }

  if (tag === "li") {
    appendListItem(node, blocks, "bullet", level);
    return;
  }

  if (tag === "blockquote") {
    blocks.push(elementToTextBlock(node, "blockquote"));
    return;
  }

  if (/^h[1-6]$/.test(tag)) {
    // Preserve the full h1-h6 range; the export path (portableTextToEditorHtml)
    // already emits these faithfully, so capping here downgraded h5/h6 to h4 on
    // an untouched open/blur round-trip.
    blocks.push(elementToTextBlock(node, tag));
    return;
  }

  if (tag === "p" || tag === "div") {
    blocks.push(elementToTextBlock(node));
    return;
  }

  node.childNodes.forEach((child) => appendPortableTextNode(child, blocks));
}

// Restore the nested list level: prefer the data-level attribute emitted by
// portableTextToEditorHtml, otherwise fall back to the structural nesting depth
// derived from how deep the <ul>/<ol> ancestry is.
function listItemLevel(element: ElementLike, fallback: number): number {
  const raw = Number(element.getAttribute("data-level"));
  return Number.isInteger(raw) && raw > 1 ? raw : fallback;
}

// Emit one block for a list item from its inline content only, then recurse into
// any nested <ul>/<ol> so their items become their own blocks (at the next
// level) instead of being fused into this item's text.
function appendListItem(
  item: ElementLike,
  blocks: PortableTextBlock[],
  listItem: "bullet" | "number",
  level: number,
) {
  const inlineNodes: Array<ChildNode | TextNodeLike | ElementLike> = [];
  const nestedLists: ElementLike[] = [];
  for (const child of Array.from(item.childNodes)) {
    const childTag = isElementLike(child) ? child.tagName.toLowerCase() : "";
    if (childTag === "ul" || childTag === "ol") {
      nestedLists.push(child as ElementLike);
    } else {
      inlineNodes.push(child);
    }
  }

  const itemLevel = listItemLevel(item, level);
  const markDefs: PortableTextMarkDef[] = [];
  const children = inlineNodesToSpans(inlineNodes, [], markDefs);
  blocks.push({
    _type: "block",
    _key: randomId("pt"),
    style: "normal",
    listItem,
    level: itemLevel,
    markDefs,
    children: children.length ? children : [makeSpan("")],
  });

  for (const nested of nestedLists) {
    appendPortableTextNode(nested, blocks, itemLevel + 1);
  }
}

function elementToTextBlock(element: ElementLike, style = "normal"): PortableTextBlock {
  const markDefs: PortableTextMarkDef[] = [];
  const children = inlineNodesToSpans(Array.from(element.childNodes), [], markDefs);
  return {
    _type: "block",
    _key: randomId("pt"),
    style,
    markDefs,
    children: children.length ? children : [makeSpan("")],
  };
}

function inlineNodesToSpans(
  nodes: Array<ChildNode | TextNodeLike | ElementLike>,
  marks: string[],
  markDefs: PortableTextMarkDef[],
): PortableTextSpan[] {
  const spans: PortableTextSpan[] = [];

  for (const node of nodes) {
    if (isTextNodeLike(node) && node.nodeType === TEXT_NODE) {
      spans.push(makeSpan(node.textContent ?? "", marks));
      continue;
    }

    if (!isElementLike(node)) continue;

    if (node.tagName.toLowerCase() === "br") {
      spans.push(makeSpan("\n", marks));
      continue;
    }

    const nextMarks = [...marks];
    const tag = node.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") nextMarks.push("strong");
    if (tag === "em" || tag === "i") nextMarks.push("em");
    if (tag === "code") nextMarks.push("code");
    if (tag === "s" || tag === "del" || tag === "strike") nextMarks.push("strike-through");
    if (tag === "a") {
      const href = safeLinkHref(node.getAttribute("href") ?? "");
      if (href) {
        const key = randomId("link");
        markDefs.push({ _key: key, _type: "link", href });
        nextMarks.push(key);
      }
    }

    spans.push(...inlineNodesToSpans(Array.from(node.childNodes), nextMarks, markDefs));
  }

  return spans;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
