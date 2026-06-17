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
import {
  blockWithType,
  createBlockForDefinition,
  editorHtmlToPortableText,
  firstMediaValue,
  mediaIdentity,
  mediaSelectLabel,
  mediaUrl,
  mediaValueFromItem,
  mediaValues,
  normalizeEditorBlocks,
  parseJsonDraft,
  parseProps,
  portableTextToEditorHtml,
  prepareBlocksForChange,
  randomId,
  resolveBlockDefinitions,
} from "./adminTransforms";
import type { MediaItem, MediaValue } from "./adminTransforms";
import { editorCommandAdapter } from "./editorCommandAdapter";
import { safeLinkHref } from "./linkProtocols";
import type {
  BlockBuilderBlock,
  BlockBuilderDefinition,
  BlockBuilderOptions,
  BlockBuilderPropChoice,
  BlockBuilderPropField,
  BlockBuilderProps,
  BlockBuilderValue,
} from "./types";

export { parseJsonDraft } from "./adminTransforms";

type FieldWidgetProps<TOptions = Record<string, unknown>> = {
  value: unknown;
  onChange: (value: unknown) => void;
  id?: string;
  options?: TOptions;
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

function shortId(value: string) {
  return value.includes("-") ? value.slice(0, 8) : value;
}

function visualAnchorId(baseId: string, ...segments: string[]) {
  return [baseId, ...segments.map((segment) => encodeURIComponent(segment))].join(":");
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
    editorCommandAdapter.dispatchCommand(editorRef.current, command, commandValue);
    setHtml(editorRef.current?.innerHTML ?? "");
    commit();
  }

  function createLink() {
    const href = editorCommandAdapter.requestLinkHref();
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

function JsonLikePropField({
  field,
  value,
  onChange,
  id,
  fallbackHelpText,
}: {
  field: BlockBuilderPropField;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
  fallbackHelpText: string;
}) {
  const valueKey = JSON.stringify(value ?? null);
  const [draft, setDraft] = useState(() =>
    value === undefined ? "" : JSON.stringify(value, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value === undefined ? "" : JSON.stringify(value, null, 2));
    setParseError(null);
  }, [valueKey]);

  function commit(nextDraft: string) {
    const result = parseJsonDraft(nextDraft);
    if (result.ok) {
      setParseError(null);
      onChange(result.value);
    } else {
      setParseError(result.error);
    }
  }

  return (
    <label key={field.key} htmlFor={id} style={fieldStyle}>
      <span style={labelStyle}>{field.label}</span>
      <Textarea
        id={id}
        aria-label={field.label}
        aria-invalid={parseError ? true : undefined}
        aria-describedby={parseError ? `${id}-json-error` : undefined}
        className="min-h-24 w-full font-mono text-sm"
        placeholder={field.placeholder}
        value={draft}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          setDraft(event.currentTarget.value);
          if (parseError) commit(event.currentTarget.value);
        }}
        onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => commit(event.currentTarget.value)}
      />
      {parseError ? (
        <small id={`${id}-json-error`} role="alert" style={{ ...helpTextStyle, color: "#b42318" }}>
          Invalid JSON: {parseError}
        </small>
      ) : null}
      <small style={helpTextStyle}>{field.helpText ?? fallbackHelpText}</small>
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
    <JsonLikePropField
      key={field.key}
      field={field}
      value={value}
      onChange={onChange}
      id={id}
      fallbackHelpText={fallbackHelpText}
    />
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
  const blocks = normalizeEditorBlocks(value);
  const definitions = resolveBlockDefinitions(blocks, options);

  function updateBlocks(nextBlocks: BlockBuilderValue) {
    onChange(prepareBlocksForChange(nextBlocks));
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
                      updateBlock(index, blockWithType(block, nextType, definitions));
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
          updateBlocks([...blocks, createBlockForDefinition(definitions[0], randomId)])
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
