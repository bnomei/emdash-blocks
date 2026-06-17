import { Button, Input, MenuBar, Select, Switch, Textarea } from "@cloudflare/kumo";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  EyeIcon,
  EyeSlashIcon,
  ImageIcon,
  ParagraphIcon,
  PlusIcon,
  QuotesIcon,
  TextBIcon,
  TextHThreeIcon,
  TextItalicIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { safeLinkHref } from "./linkProtocols";
import { defaultBlockDefinitions, defaultPropsForDefinition } from "./schema";
import type {
  BlockBuilderBlock,
  BlockBuilderDefinition,
  BlockBuilderPropChoice,
  BlockBuilderPropField,
  BlockBuilderProps,
  BlockBuilderValue,
} from "./types";

type FieldWidgetProps<TOptions = Record<string, unknown>> = {
  value: unknown;
  onChange: (value: unknown) => void;
  id?: string;
  options?: TOptions;
};

type BlockBuilderOptions = {
  blockTypes?: BlockBuilderDefinition[];
  blockDefinitions?: BlockBuilderDefinition[];
  helpText?: string;
};

type MediaValue = {
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

type MediaItem = {
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

type PortableTextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
};

type PortableTextMarkDef = {
  _key: string;
  _type: "link";
  href: string;
};

type PortableTextBlock = {
  _type: string;
  _key: string;
  style?: string;
  listItem?: "bullet" | "number";
  level?: number;
  markDefs?: PortableTextMarkDef[];
  children?: PortableTextSpan[];
  [key: string]: unknown;
};

const wrapperStyle = {
  display: "grid",
  gap: "0.75rem",
} satisfies CSSProperties;

const blockBandColor = "#ffd84d";

const rowStyle = {
  border:
    "1px solid var(--color-kumo-hairline, var(--color-kumo-line, color-mix(in srgb, currentColor 16%, transparent)))",
  borderRadius: "0.5rem",
  padding: "0.75rem",
  display: "grid",
  gap: "0.75rem",
  position: "relative",
  background: "var(--color-kumo-base, transparent)",
  boxShadow: `inset 3px 0 0 ${blockBandColor}`,
} satisfies CSSProperties;

const anchorStyle = {
  position: "absolute",
  insetBlockStart: 0,
  insetInlineStart: 0,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  pointerEvents: "none",
  scrollMarginBlock: "6rem",
} satisfies CSSProperties;

const hiddenRowStyle = {
  opacity: 0.48,
} satisfies CSSProperties;

const inlineStyle = {
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
  alignItems: "center",
} satisfies CSSProperties;

const checkboxRowStyle = {
  ...inlineStyle,
  color: "var(--text-color-kumo-default, currentColor)",
} satisfies CSSProperties;

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
} satisfies CSSProperties;

const cardTitleStyle = {
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
  alignItems: "center",
  minWidth: 0,
  lineHeight: 1.2,
} satisfies CSSProperties;

const cardControlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  flexShrink: 0,
  marginLeft: "auto",
} satisfies CSSProperties;

const fullWidthButtonClassName = "h-9 min-h-9 w-full justify-center";
const menuBarClassName = "h-9 min-h-9";

const fieldStyle = {
  display: "grid",
  gap: "0.35rem",
} satisfies CSSProperties;

const settingRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  borderTop: "1px solid var(--color-kumo-hairline, transparent)",
  paddingTop: "0.75rem",
} satisfies CSSProperties;

const settingTextStyle = {
  display: "grid",
  gap: "0.15rem",
} satisfies CSSProperties;

const labelStyle = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--text-color-kumo-strong, currentColor)",
} satisfies CSSProperties;

const codeStyle = {
  color: "var(--text-color-kumo-strong, currentColor)",
  fontSize: "1rem",
  fontFamily: "inherit",
  fontWeight: 700,
  lineHeight: 1.35,
} satisfies CSSProperties;

const helpTextStyle = {
  color: "var(--text-color-kumo-subtle, currentColor)",
  fontSize: "0.85rem",
} satisfies CSSProperties;

const writerShellStyle = {
  display: "grid",
  gap: "0.5rem",
  border:
    "1px solid var(--color-kumo-hairline, var(--color-kumo-line, color-mix(in srgb, currentColor 16%, transparent)))",
  borderRadius: "0.5rem",
  padding: "0.5rem",
  background: "var(--color-kumo-base, transparent)",
} satisfies CSSProperties;

const writerToolbarStyle = {
  display: "flex",
  gap: "0.25rem",
  flexWrap: "wrap",
  alignItems: "center",
  paddingBottom: "0.5rem",
  borderBottom: "1px solid var(--color-kumo-hairline, transparent)",
} satisfies CSSProperties;

const writerSurfaceStyle = {
  minHeight: "9rem",
  padding: "0.65rem",
  borderRadius: "0.35rem",
  outline: "none",
  color: "var(--text-color-kumo-default, currentColor)",
  background: "var(--color-kumo-recessed, transparent)",
} satisfies CSSProperties;

const mediaPreviewGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))",
  gap: "0.5rem",
} satisfies CSSProperties;

const mediaPreviewStyle = {
  display: "grid",
  gap: "0.35rem",
  border:
    "1px solid var(--color-kumo-hairline, var(--color-kumo-line, color-mix(in srgb, currentColor 16%, transparent)))",
  borderRadius: "0.5rem",
  padding: "0.5rem",
} satisfies CSSProperties;

const mediaImageStyle = {
  width: "100%",
  aspectRatio: "4 / 3",
  objectFit: "cover",
  borderRadius: "0.35rem",
  background: "var(--color-kumo-tint, color-mix(in srgb, currentColor 8%, transparent))",
} satisfies CSSProperties;

const mediaFilenameStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.8rem",
  color: "var(--text-color-kumo-subtle, currentColor)",
} satisfies CSSProperties;

function randomId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function shortId(value: string) {
  return value.includes("-") ? value.slice(0, 8) : value;
}

function visualAnchorId(baseId: string, ...segments: string[]) {
  return [baseId, ...segments.map((segment) => encodeURIComponent(segment))].join(":");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeBlock(value: unknown, index: number): BlockBuilderBlock {
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

function asBlocks(value: unknown): BlockBuilderValue {
  return Array.isArray(value) ? value.map((item, index) => normalizeBlock(item, index)) : [];
}

function parseJsonValue(value: string): unknown {
  try {
    return value.trim() ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
}

function parseProps(value: string): BlockBuilderProps | null {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as BlockBuilderProps)
    : null;
}

function isMediaValue(value: unknown): value is MediaValue {
  const record = asRecord(value);
  return typeof record.id === "string" || typeof record.src === "string";
}

function mediaValues(value: unknown): MediaValue[] {
  if (Array.isArray(value)) return value.filter(isMediaValue);
  return isMediaValue(value) ? [value] : [];
}

function firstMediaValue(value: unknown): MediaValue | null {
  return mediaValues(value)[0] ?? null;
}

function mediaStorageKey(value: MediaValue): string {
  const storageKey = value.meta?.storageKey;
  return typeof storageKey === "string" && storageKey ? storageKey : "";
}

function mediaIdentity(value: MediaValue): string {
  return value.id || mediaStorageKey(value) || value.src || value.previewUrl || "";
}

function mediaUrl(value: MediaValue): string {
  if (typeof value.previewUrl === "string" && value.previewUrl) return value.previewUrl;
  if (typeof value.src === "string" && value.src) return value.src;

  const storageKey = mediaStorageKey(value);
  if (storageKey) return `/_emdash/api/media/file/${encodeStorageKey(storageKey)}`;
  if (value.id) return `/_emdash/api/media/file/${encodeURIComponent(value.id)}`;
  return "";
}

function encodeStorageKey(storageKey: string): string {
  return storageKey.split("/").map(encodeURIComponent).join("/");
}

function mediaValueFromItem(item: MediaItem): MediaValue {
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

function mediaSelectLabel(value: MediaValue): string {
  return value.filename || mediaStorageKey(value) || value.id || value.src || "Selected media";
}

function blockDefinitions(
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

function selectItems(options: BlockBuilderDefinition[]) {
  return options.map((option) => ({ value: option.type, label: option.label ?? option.type }));
}

function compactControlWidth(values: string[], min = 10, max = 32) {
  const contentWidth = values.reduce((longest, value) => Math.max(longest, value.length), 0);
  return Math.min(Math.max(contentWidth + 6, min), max);
}

function choices(value?: BlockBuilderPropChoice[] | string[]): BlockBuilderPropChoice[] {
  return (value ?? []).map((choice) =>
    typeof choice === "string" ? { value: choice, label: choice } : choice,
  );
}

function inputType(field: BlockBuilderPropField) {
  if (field.type === "number" || field.type === "integer") return "number";
  if (field.type === "color") return "color";
  if (field.type === "datetime") return "datetime-local";
  if (field.type === "url") return "url";
  return "text";
}

function normalizeNumber(value: string, integer: boolean) {
  if (value === "") return undefined;
  const number = integer ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isPortableTextBlock(value: unknown): value is PortableTextBlock {
  const record = asRecord(value);
  return typeof record._type === "string" && typeof record._key === "string";
}

function portableTextBlocks(value: unknown): PortableTextBlock[] {
  if (Array.isArray(value)) return value.filter(isPortableTextBlock);
  if (typeof value === "string" && value.trim()) return markdownToPortableText(value);
  return [];
}

function normalizeMarkdownSource(value: string): string {
  return value.replace(/^(#{1,6})(?=\S)/gm, "$1 ");
}

function markdownToPortableText(value: string): PortableTextBlock[] {
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

function portableTextToEditorHtml(value: unknown): string {
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
      html += `<li>${content}</li>`;
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

function editorHtmlToPortableText(element: HTMLElement | null): PortableTextBlock[] {
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

function appendPortableTextNode(node: ChildNode, blocks: PortableTextBlock[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text.trim()) blocks.push(makeTextBlock(text));
    return;
  }

  if (!(node instanceof HTMLElement)) return;
  const tag = node.tagName.toLowerCase();

  if (tag === "ul" || tag === "ol") {
    const listItem = tag === "ol" ? "number" : "bullet";
    node.querySelectorAll(":scope > li").forEach((item) => {
      if (!(item instanceof HTMLElement)) return;
      blocks.push(elementToTextBlock(item, "normal", listItem));
    });
    return;
  }

  if (tag === "li") {
    blocks.push(elementToTextBlock(node, "normal", "bullet"));
    return;
  }

  if (tag === "blockquote") {
    blocks.push(elementToTextBlock(node, "blockquote"));
    return;
  }

  if (/^h[1-6]$/.test(tag)) {
    blocks.push(elementToTextBlock(node, `h${Math.min(Number(tag.slice(1)), 4)}`));
    return;
  }

  if (tag === "p" || tag === "div") {
    blocks.push(elementToTextBlock(node));
    return;
  }

  node.childNodes.forEach((child) => appendPortableTextNode(child, blocks));
}

function elementToTextBlock(
  element: HTMLElement,
  style = "normal",
  listItem?: "bullet" | "number",
): PortableTextBlock {
  const markDefs: PortableTextMarkDef[] = [];
  const children = inlineNodesToSpans(Array.from(element.childNodes), [], markDefs);
  return {
    _type: "block",
    _key: randomId("pt"),
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    markDefs,
    children: children.length ? children : [makeSpan("")],
  };
}

function inlineNodesToSpans(
  nodes: ChildNode[],
  marks: string[],
  markDefs: PortableTextMarkDef[],
): PortableTextSpan[] {
  const spans: PortableTextSpan[] = [];

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      spans.push(makeSpan(node.textContent ?? "", marks));
      continue;
    }

    if (!(node instanceof HTMLElement)) continue;

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

function MediaPropField({
  field,
  value,
  onChange,
  id,
  multiple,
}: {
  field: BlockBuilderPropField;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
  multiple: boolean;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const selected = multiple ? mediaValues(value) : mediaValues(firstMediaValue(value));
  const selectedKeys = useMemo(() => new Set(selected.map(mediaIdentity)), [selected]);
  const allItems = useMemo(() => {
    const known = new Map<string, MediaValue | MediaItem>();
    for (const item of items) known.set(item.id, item);
    for (const item of selected) known.set(mediaIdentity(item), item);
    return [...known.values()];
  }, [items, selected]);
  const selectItemsForMedia = [
    { value: "", label: multiple ? "Add media" : "No media" },
    ...allItems.map((item) => {
      const value = "storageKey" in item ? item.id : mediaIdentity(item);
      const label = "storageKey" in item ? item.filename : mediaSelectLabel(item);
      return { value, label };
    }),
  ];

  useEffect(() => {
    const controller = new AbortController();

    async function loadMedia() {
      setStatus("loading");
      try {
        const url = new URL("/_emdash/api/media", globalThis.location.origin);
        url.searchParams.set("limit", "100");
        url.searchParams.set("mimeType", "image/");
        const response = await fetch(url, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Media request failed: ${response.status}`);
        const body = (await response.json()) as { data?: { items?: MediaItem[] } };
        setItems(body.data?.items ?? []);
        setStatus("idle");
      } catch {
        if (!controller.signal.aborted) {
          setStatus("error");
        }
      }
    }

    void loadMedia();
    return () => controller.abort();
  }, []);

  function selectMedia(identity: string) {
    if (!identity) {
      if (!multiple) onChange(null);
      return;
    }

    const item = items.find((media) => media.id === identity);
    const media = item
      ? mediaValueFromItem(item)
      : selected.find((entry) => mediaIdentity(entry) === identity);
    if (!media) return;

    if (multiple) {
      if (selectedKeys.has(mediaIdentity(media))) return;
      onChange([...selected, media]);
      return;
    }

    onChange(media);
  }

  function removeMedia(identity: string) {
    if (multiple) {
      onChange(selected.filter((item) => mediaIdentity(item) !== identity));
      return;
    }

    onChange(null);
  }

  return (
    <div key={field.key} id={id} style={fieldStyle}>
      <span style={labelStyle}>{field.label}</span>
      {selected.length ? (
        <div style={mediaPreviewGridStyle}>
          {selected.map((item) => {
            const identity = mediaIdentity(item);
            return (
              <div key={identity} style={mediaPreviewStyle}>
                {mediaUrl(item) ? (
                  <img src={mediaUrl(item)} alt={item.alt ?? ""} style={mediaImageStyle} />
                ) : (
                  <div style={{ ...mediaImageStyle, display: "grid", placeItems: "center" }}>
                    <ImageIcon size={24} />
                  </div>
                )}
                <small title={mediaSelectLabel(item)} style={mediaFilenameStyle}>
                  {mediaSelectLabel(item)}
                </small>
                <Button
                  type="button"
                  size="sm"
                  className={fullWidthButtonClassName}
                  icon={TrashIcon}
                  onClick={() => removeMedia(identity)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
      <Select
        aria-label={field.label}
        className="w-full"
        items={selectItemsForMedia}
        value={multiple ? "" : selected[0] ? mediaIdentity(selected[0]) : ""}
        onValueChange={(nextValue) => selectMedia(String(nextValue))}
      />
      {status === "loading" ? <small style={helpTextStyle}>Loading media...</small> : null}
      {status === "error" ? (
        <small style={helpTextStyle}>Could not load media library.</small>
      ) : null}
      {field.helpText ? <small style={helpTextStyle}>{field.helpText}</small> : null}
    </div>
  );
}

function PortableTextPropField({
  field,
  value,
  onChange,
  id,
}: {
  field: BlockBuilderPropField;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
}) {
  const valueKey = JSON.stringify(value ?? null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(() => portableTextToEditorHtml(value));

  useEffect(() => {
    const nextHtml = portableTextToEditorHtml(value);
    setHtml(nextHtml);
    if (editorRef.current && globalThis.document?.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [valueKey]);

  function commit() {
    const nextValue = editorHtmlToPortableText(editorRef.current);
    onChange(nextValue);
  }

  function runCommand(command: string, commandValue?: string) {
    editorRef.current?.focus();
    globalThis.document?.execCommand(command, false, commandValue);
    setHtml(editorRef.current?.innerHTML ?? "");
    commit();
  }

  function createLink() {
    const href = globalThis.prompt?.("Link URL");
    if (!href) return;
    const safeHref = safeLinkHref(href);
    if (!safeHref) {
      globalThis.alert?.(
        "Links must use http:, https:, mailto:, tel:, root-relative, or relative URLs.",
      );
      return;
    }
    runCommand("createLink", safeHref);
  }

  const toolbarButtons = [
    { label: "Paragraph", icon: ParagraphIcon, command: "formatBlock", value: "p" },
    { label: "Heading", icon: TextHThreeIcon, command: "formatBlock", value: "h3" },
    { label: "Quote", icon: QuotesIcon, command: "formatBlock", value: "blockquote" },
    { label: "Bold", icon: TextBIcon, command: "bold" },
    { label: "Italic", icon: TextItalicIcon, command: "italic" },
    { label: "Bulleted list", icon: ListBulletsIcon, command: "insertUnorderedList" },
    { label: "Numbered list", icon: ListNumbersIcon, command: "insertOrderedList" },
  ];

  return (
    <div key={field.key} style={fieldStyle}>
      <span style={labelStyle}>{field.label}</span>
      <div style={writerShellStyle}>
        <div style={writerToolbarStyle}>
          {toolbarButtons.map((button) => (
            <Button
              key={button.label}
              type="button"
              size="sm"
              shape="square"
              variant="ghost"
              title={button.label}
              aria-label={button.label}
              icon={button.icon}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(button.command, button.value)}
            />
          ))}
          <Button
            type="button"
            size="sm"
            shape="square"
            variant="ghost"
            title="Link"
            aria-label="Link"
            icon={LinkIcon}
            onMouseDown={(event) => event.preventDefault()}
            onClick={createLink}
          />
        </div>
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-label={field.label}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          style={writerSurfaceStyle}
          data-empty={!html.trim() ? "true" : undefined}
          onInput={() => setHtml(editorRef.current?.innerHTML ?? "")}
          onBlur={commit}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {field.helpText ? <small style={helpTextStyle}>{field.helpText}</small> : null}
    </div>
  );
}

function renderPropField(
  field: BlockBuilderPropField,
  value: unknown,
  onChange: (value: unknown) => void,
  idPrefix: string,
) {
  const id = `${idPrefix}-${field.key}`;
  const type = field.type ?? "text";
  const stringValue = typeof value === "string" || typeof value === "number" ? String(value) : "";

  if (type === "boolean") {
    return (
      <div key={field.key} style={settingRowStyle}>
        <span style={settingTextStyle}>
          <strong>{field.label}</strong>
          {field.helpText ? <small style={helpTextStyle}>{field.helpText}</small> : null}
        </span>
        <Switch
          aria-label={field.label}
          checked={Boolean(value)}
          controlFirst={false}
          variant="neutral"
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
      </div>
    );
  }

  if (type === "select") {
    return (
      <div key={field.key} style={fieldStyle}>
        <span style={labelStyle}>{field.label}</span>
        <Select
          aria-label={field.label}
          className="w-full"
          items={choices(field.options).map((choice) => ({
            value: choice.value,
            label: choice.label ?? choice.value,
          }))}
          value={typeof value === "string" ? value : ""}
          onValueChange={(nextValue) => onChange(String(nextValue))}
        />
        {field.helpText ? <small style={helpTextStyle}>{field.helpText}</small> : null}
      </div>
    );
  }

  if (type === "multiSelect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    const selectChoices = choices(field.options);

    if (!selectChoices.length) {
      return renderJsonLikePropField(field, value, onChange, id, "JSON string array");
    }

    return (
      <div key={field.key} style={fieldStyle}>
        <span style={labelStyle}>{field.label}</span>
        <div style={wrapperStyle}>
          {selectChoices.map((choice) => {
            const checked = selected.includes(choice.value);
            return (
              <label key={choice.value} style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={checked}
                  name={`${id}-${choice.value}`}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const nextChecked = event.currentTarget.checked;
                    onChange(
                      nextChecked
                        ? [...selected, choice.value]
                        : selected.filter((item) => item !== choice.value),
                    );
                  }}
                />
                {choice.label ?? choice.value}
              </label>
            );
          })}
        </div>
        {field.helpText ? <small style={helpTextStyle}>{field.helpText}</small> : null}
      </div>
    );
  }

  if (type === "text" || type === "markdown" || type === "textarea") {
    return (
      <label key={field.key} htmlFor={id} style={fieldStyle}>
        <span style={labelStyle}>{field.label}</span>
        <Textarea
          id={id}
          aria-label={field.label}
          className="min-h-24 w-full"
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(event.currentTarget.value)
          }
        />
        {field.helpText ? <small style={helpTextStyle}>{field.helpText}</small> : null}
      </label>
    );
  }

  if (type === "portableText" || type === "writer") {
    return (
      <PortableTextPropField
        key={field.key}
        field={field}
        value={value}
        onChange={onChange}
        id={id}
      />
    );
  }

  if (type === "json" || type === "repeater") {
    const fallback =
      type === "repeater" ? "JSON array until a repeater prop editor is wired." : "JSON value";
    return renderJsonLikePropField(field, value, onChange, id, fallback);
  }

  if (type === "media" || type === "media-list") {
    return (
      <MediaPropField
        key={field.key}
        field={field}
        value={value}
        onChange={onChange}
        id={id}
        multiple={type === "media-list"}
      />
    );
  }

  return (
    <label key={field.key} htmlFor={id} style={fieldStyle}>
      <span style={labelStyle}>{field.label}</span>
      <Input
        id={id}
        aria-label={field.label}
        className="w-full"
        placeholder={field.placeholder}
        type={inputType(field)}
        step={type === "integer" ? 1 : undefined}
        value={stringValue}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          if (type === "number" || type === "integer") {
            onChange(normalizeNumber(event.currentTarget.value, type === "integer"));
          } else {
            onChange(event.currentTarget.value);
          }
        }}
      />
      {field.helpText ? <small style={helpTextStyle}>{field.helpText}</small> : null}
    </label>
  );
}

function renderJsonLikePropField(
  field: BlockBuilderPropField,
  value: unknown,
  onChange: (value: unknown) => void,
  id: string,
  fallbackHelpText: string,
) {
  return (
    <label key={field.key} htmlFor={id} style={fieldStyle}>
      <span style={labelStyle}>{field.label}</span>
      <Textarea
        id={id}
        aria-label={field.label}
        className="min-h-24 w-full font-mono text-sm"
        placeholder={field.placeholder}
        defaultValue={value === undefined ? "" : JSON.stringify(value, null, 2)}
        onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => {
          const nextValue = parseJsonValue(event.currentTarget.value);
          onChange(nextValue);
        }}
      />
      <small style={helpTextStyle}>{field.helpText ?? fallbackHelpText}</small>
    </label>
  );
}

function renderPropsEditor(
  definition: BlockBuilderDefinition | undefined,
  props: BlockBuilderProps,
  onChange: (value: BlockBuilderProps) => void,
  idPrefix: string,
) {
  if (!definition?.props) {
    return (
      <label htmlFor={`${idPrefix}-props`} style={fieldStyle}>
        <span style={labelStyle}>Props</span>
        <Textarea
          id={`${idPrefix}-props`}
          aria-label="Block props"
          className="min-h-28 w-full font-mono text-sm"
          defaultValue={JSON.stringify(props ?? {}, null, 2)}
          onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => {
            const nextProps = parseProps(event.currentTarget.value);
            if (nextProps) onChange(nextProps);
          }}
        />
      </label>
    );
  }

  if (!definition.props.length) {
    return <small style={helpTextStyle}>This block type has no editable props.</small>;
  }

  return (
    <div style={wrapperStyle}>
      {definition.props.map((field) =>
        renderPropField(
          field,
          props[field.key],
          (nextValue) => onChange({ ...props, [field.key]: nextValue }),
          idPrefix,
        ),
      )}
    </div>
  );
}

export function BlocksField({
  value,
  onChange,
  id = "block-builder",
  options,
}: FieldWidgetProps<BlockBuilderOptions>) {
  const blocks = asBlocks(value);
  const definitions = blockDefinitions(blocks, options);

  function updateBlocks(nextBlocks: BlockBuilderValue) {
    onChange(nextBlocks.map((block) => ({ ...block, hidden: block.hidden || undefined })));
  }

  function updateBlock(index: number, nextBlock: BlockBuilderBlock) {
    const nextBlocks = [...blocks];
    nextBlocks[index] = nextBlock;
    updateBlocks(nextBlocks);
  }

  function moveBlock(fromIndex: number, toIndex: number) {
    const nextBlocks = [...blocks];
    const [moved] = nextBlocks.splice(fromIndex, 1);
    if (!moved) return;
    nextBlocks.splice(toIndex, 0, moved);
    updateBlocks(nextBlocks);
  }

  return (
    <div id={id} tabIndex={-1} style={wrapperStyle}>
      {blocks.map((block, index) => {
        const definition = definitions.find((item) => item.type === block.type);
        const blockTypeItems = selectItems(definitions);
        const blockTypeLabel =
          blockTypeItems.find((item) => item.value === block.type)?.label ?? block.type;
        const propsId = `${id}-${index}-props`;
        const blockAnchorId = visualAnchorId(id, "block", block.id);
        return (
          <section
            key={block.id}
            style={block.hidden ? { ...rowStyle, ...hiddenRowStyle } : rowStyle}
          >
            <span id={blockAnchorId} aria-hidden="true" style={anchorStyle} />
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <strong style={codeStyle} title={block.id}>
                  {shortId(block.id)}
                </strong>
              </div>
              <div style={cardControlsStyle}>
                <div
                  style={{
                    width: `${compactControlWidth([blockTypeLabel, "Type"], 10, 28)}ch`,
                  }}
                >
                  <Select
                    aria-label={`Block ${index + 1} type`}
                    className="w-full"
                    items={blockTypeItems}
                    value={block.type}
                    onValueChange={(nextValue) => {
                      const nextType = String(nextValue);
                      const nextDefinition = definitions.find((item) => item.type === nextType);
                      updateBlock(index, {
                        ...block,
                        type: nextType,
                        props: defaultPropsForDefinition(nextDefinition),
                      });
                    }}
                  />
                </div>
                <MenuBar
                  className={menuBarClassName}
                  isActive="visibility"
                  optionIds
                  options={[
                    ...(blocks.length > 1 && index > 0
                      ? [
                          {
                            icon: <ArrowUpIcon size={14} />,
                            id: "move-up",
                            tooltip: "Move block up",
                            onClick: () => moveBlock(index, index - 1),
                          },
                        ]
                      : []),
                    ...(blocks.length > 1 && index < blocks.length - 1
                      ? [
                          {
                            icon: <ArrowDownIcon size={14} />,
                            id: "move-down",
                            tooltip: "Move block down",
                            onClick: () => moveBlock(index, index + 1),
                          },
                        ]
                      : []),
                    {
                      icon: block.hidden ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />,
                      id: "visibility",
                      tooltip: block.hidden ? "Show block" : "Hide block",
                      onClick: () => updateBlock(index, { ...block, hidden: !block.hidden }),
                    },
                    {
                      icon: <TrashIcon size={14} />,
                      id: "remove",
                      tooltip: "Remove block",
                      onClick: () =>
                        updateBlocks(blocks.filter((_block, blockIndex) => blockIndex !== index)),
                    },
                  ]}
                />
              </div>
            </div>
            {renderPropsEditor(
              definition,
              block.props ?? {},
              (props) => updateBlock(index, { ...block, props }),
              propsId,
            )}
          </section>
        );
      })}
      <Button
        type="button"
        size="sm"
        className={fullWidthButtonClassName}
        icon={PlusIcon}
        onClick={() =>
          updateBlocks([
            ...blocks,
            {
              id: randomId("block"),
              type: definitions[0]?.type ?? "text",
              props: defaultPropsForDefinition(definitions[0]),
            },
          ])
        }
      >
        Add Block
      </Button>
      {options?.helpText ? <small style={helpTextStyle}>{options.helpText}</small> : null}
    </div>
  );
}

export const fields = {
  blocks: BlocksField,
};
