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
import { useAdminLocale } from "./admin-locale";
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
import { blockMessage, formatBlockMessage, localizedString, type BlocksI18nConfig } from "./i18n";

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

function useBlockI18n(i18n: BlocksI18nConfig | undefined): BlocksI18nConfig {
  const locale = useAdminLocale(i18n?.locale ?? i18n?.defaultLocale);
  return { ...i18n, locale };
}

function selectItems(options: BlockBuilderDefinition[], i18n: BlocksI18nConfig) {
  return options.map((option) => ({
    value: option.type,
    label: localizedString(option.label, i18n, option.type),
  }));
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

function NumberPropField({
  field,
  value,
  onChange,
  id,
  label,
  helpText,
  placeholder,
  integer,
}: {
  field: BlockBuilderPropField;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
  label: string;
  helpText: string;
  placeholder?: string;
  integer: boolean;
}) {
  // Keep a local draft string so intermediate values like "-", "-0" or "1."
  // are not wiped while typing. The committed value still flows through
  // normalizeNumber; the draft only resyncs when the external value diverges.
  const valueKey = typeof value === "number" ? String(value) : "";
  const [draft, setDraft] = useState(() => valueKey);

  useEffect(() => {
    setDraft((current) => (normalizeNumber(current, integer) === value ? current : valueKey));
  }, [valueKey]);

  return (
    <label key={field.key} htmlFor={id} style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <Input
        id={id}
        aria-label={label}
        className="w-full"
        placeholder={placeholder}
        type="number"
        step={integer ? 1 : undefined}
        value={draft}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const next = event.currentTarget.value;
          setDraft(next);
          const parsed = normalizeNumber(next, integer);
          // Commit cleared input (undefined) or a complete finite number; keep
          // intermediate prefixes ("-", "1.") in the draft without committing.
          if (next === "" || parsed !== undefined) onChange(parsed);
        }}
      />
      {helpText ? <small style={helpTextStyle}>{helpText}</small> : null}
    </label>
  );
}

function MediaPropField({
  field,
  value,
  onChange,
  id,
  multiple,
  i18n,
}: {
  field: BlockBuilderPropField;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
  multiple: boolean;
  i18n: BlocksI18nConfig;
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
    {
      value: "",
      label: multiple ? blockMessage("addMedia", i18n) : blockMessage("noMedia", i18n),
    },
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
      <span style={labelStyle}>{localizedString(field.label, i18n)}</span>
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
                  {blockMessage("remove", i18n)}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
      <Select
        aria-label={localizedString(field.label, i18n)}
        className="w-full"
        items={selectItemsForMedia}
        value={multiple ? "" : selected[0] ? mediaIdentity(selected[0]) : ""}
        onValueChange={(nextValue) => selectMedia(String(nextValue))}
      />
      {status === "loading" ? (
        <small style={helpTextStyle}>{blockMessage("loadingMedia", i18n)}</small>
      ) : null}
      {status === "error" ? (
        <small style={helpTextStyle}>{blockMessage("couldNotLoadMedia", i18n)}</small>
      ) : null}
      {field.helpText ? (
        <small style={helpTextStyle}>{localizedString(field.helpText, i18n)}</small>
      ) : null}
    </div>
  );
}

function PortableTextPropField({
  field,
  value,
  onChange,
  id,
  i18n,
}: {
  field: BlockBuilderPropField;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
  i18n: BlocksI18nConfig;
}) {
  const valueKey = JSON.stringify(value ?? null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(() => portableTextToEditorHtml(value));
  // Set when an external `value` update arrives while the editor is focused and
  // the user has not yet re-edited. Blur then resyncs to the external value
  // instead of committing pre-update DOM over it.
  const externalUpdateWhileFocusedRef = useRef(false);

  useEffect(() => {
    const nextHtml = portableTextToEditorHtml(value);
    setHtml(nextHtml);
    if (editorRef.current && globalThis.document?.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    } else if (editorRef.current) {
      externalUpdateWhileFocusedRef.current = true;
    }
  }, [valueKey]);

  function commit() {
    if (externalUpdateWhileFocusedRef.current) {
      // A newer external value arrived during this edit session and the user
      // did not edit further; resync the DOM to it rather than overwriting it.
      externalUpdateWhileFocusedRef.current = false;
      const syncedHtml = portableTextToEditorHtml(value);
      setHtml(syncedHtml);
      if (editorRef.current) editorRef.current.innerHTML = syncedHtml;
      return;
    }
    const nextValue = editorHtmlToPortableText(editorRef.current);
    onChange(nextValue);
  }

  function runCommand(command: string, commandValue?: string) {
    // Toolbar actions are deliberate edits, so the editor content is now
    // authoritative again.
    externalUpdateWhileFocusedRef.current = false;
    editorCommandAdapter.dispatchCommand(editorRef.current, command, commandValue);
    setHtml(editorRef.current?.innerHTML ?? "");
    commit();
  }

  function createLink() {
    const href = editorCommandAdapter.requestLinkHref();
    if (!href) return;
    const safeHref = safeLinkHref(href);
    if (!safeHref) {
      globalThis.alert?.(blockMessage("linkProtocolError", i18n));
      return;
    }
    runCommand("createLink", safeHref);
  }

  const toolbarButtons = [
    {
      label: blockMessage("paragraph", i18n),
      icon: ParagraphIcon,
      command: "formatBlock",
      value: "p",
    },
    {
      label: blockMessage("heading", i18n),
      icon: TextHThreeIcon,
      command: "formatBlock",
      value: "h3",
    },
    {
      label: blockMessage("quote", i18n),
      icon: QuotesIcon,
      command: "formatBlock",
      value: "blockquote",
    },
    { label: blockMessage("bold", i18n), icon: TextBIcon, command: "bold" },
    { label: blockMessage("italic", i18n), icon: TextItalicIcon, command: "italic" },
    {
      label: blockMessage("bulletedList", i18n),
      icon: ListBulletsIcon,
      command: "insertUnorderedList",
    },
    {
      label: blockMessage("numberedList", i18n),
      icon: ListNumbersIcon,
      command: "insertOrderedList",
    },
  ];

  return (
    <div key={field.key} style={fieldStyle}>
      <span style={labelStyle}>{localizedString(field.label, i18n)}</span>
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
            title={blockMessage("link", i18n)}
            aria-label={blockMessage("link", i18n)}
            icon={LinkIcon}
            onMouseDown={(event) => event.preventDefault()}
            onClick={createLink}
          />
        </div>
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-label={localizedString(field.label, i18n)}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          style={writerSurfaceStyle}
          data-empty={!html.trim() ? "true" : undefined}
          onFocus={() => {
            externalUpdateWhileFocusedRef.current = false;
          }}
          onInput={() => {
            externalUpdateWhileFocusedRef.current = false;
            setHtml(editorRef.current?.innerHTML ?? "");
          }}
          onBlur={commit}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {field.helpText ? (
        <small style={helpTextStyle}>{localizedString(field.helpText, i18n)}</small>
      ) : null}
    </div>
  );
}

function renderPropField(
  field: BlockBuilderPropField,
  value: unknown,
  onChange: (value: unknown) => void,
  idPrefix: string,
  i18n: BlocksI18nConfig,
) {
  const id = `${idPrefix}-${field.key}`;
  const type = field.type ?? "text";
  const stringValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const label = localizedString(field.label, i18n);
  const helpText = localizedString(field.helpText, i18n);
  const placeholder = localizedString(field.placeholder, i18n) || undefined;

  if (type === "boolean") {
    return (
      <div key={field.key} style={settingRowStyle}>
        <span style={settingTextStyle}>
          <strong>{label}</strong>
          {helpText ? <small style={helpTextStyle}>{helpText}</small> : null}
        </span>
        <Switch
          aria-label={label}
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
        <span style={labelStyle}>{label}</span>
        <Select
          aria-label={label}
          className="w-full"
          items={choices(field.options).map((choice) => ({
            value: choice.value,
            label: localizedString(choice.label, i18n, choice.value),
          }))}
          value={typeof value === "string" ? value : ""}
          onValueChange={(nextValue) => onChange(String(nextValue))}
        />
        {helpText ? <small style={helpTextStyle}>{helpText}</small> : null}
      </div>
    );
  }

  if (type === "multiSelect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    const selectChoices = choices(field.options);

    if (!selectChoices.length) {
      return renderJsonLikePropField(
        field,
        value,
        onChange,
        id,
        blockMessage("jsonStringArray", i18n),
        i18n,
      );
    }

    return (
      <div key={field.key} style={fieldStyle}>
        <span style={labelStyle}>{label}</span>
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
                {localizedString(choice.label, i18n, choice.value)}
              </label>
            );
          })}
        </div>
        {helpText ? <small style={helpTextStyle}>{helpText}</small> : null}
      </div>
    );
  }

  if (type === "text" || type === "markdown" || type === "textarea") {
    return (
      <label key={field.key} htmlFor={id} style={fieldStyle}>
        <span style={labelStyle}>{label}</span>
        <Textarea
          id={id}
          aria-label={label}
          className="min-h-24 w-full"
          placeholder={placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(event.currentTarget.value)
          }
        />
        {helpText ? <small style={helpTextStyle}>{helpText}</small> : null}
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
        i18n={i18n}
      />
    );
  }

  if (type === "json" || type === "repeater") {
    const fallback =
      type === "repeater" ? blockMessage("jsonStringArray", i18n) : blockMessage("jsonValue", i18n);
    return renderJsonLikePropField(field, value, onChange, id, fallback, i18n);
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
        i18n={i18n}
      />
    );
  }

  if (type === "number" || type === "integer") {
    return (
      <NumberPropField
        key={field.key}
        field={field}
        value={value}
        onChange={onChange}
        id={id}
        label={label}
        helpText={helpText}
        placeholder={placeholder}
        integer={type === "integer"}
      />
    );
  }

  return (
    <label key={field.key} htmlFor={id} style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <Input
        id={id}
        aria-label={label}
        className="w-full"
        placeholder={placeholder}
        type={inputType(field)}
        value={stringValue}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
      />
      {helpText ? <small style={helpTextStyle}>{helpText}</small> : null}
    </label>
  );
}

function JsonLikePropField({
  field,
  value,
  onChange,
  id,
  fallbackHelpText,
  i18n,
}: {
  field: BlockBuilderPropField;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
  fallbackHelpText: string;
  i18n: BlocksI18nConfig;
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
      <span style={labelStyle}>{localizedString(field.label, i18n)}</span>
      <Textarea
        id={id}
        aria-label={localizedString(field.label, i18n)}
        aria-invalid={parseError ? true : undefined}
        aria-describedby={parseError ? `${id}-json-error` : undefined}
        className="min-h-24 w-full font-mono text-sm"
        placeholder={localizedString(field.placeholder, i18n) || undefined}
        value={draft}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          setDraft(event.currentTarget.value);
          if (parseError) commit(event.currentTarget.value);
        }}
        onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => commit(event.currentTarget.value)}
      />
      {parseError ? (
        <small id={`${id}-json-error`} role="alert" style={{ ...helpTextStyle, color: "#b42318" }}>
          {formatBlockMessage("invalidJson", i18n, { error: parseError })}
        </small>
      ) : null}
      <small style={helpTextStyle}>
        {localizedString(field.helpText, i18n) || fallbackHelpText}
      </small>
    </label>
  );
}

function renderJsonLikePropField(
  field: BlockBuilderPropField,
  value: unknown,
  onChange: (value: unknown) => void,
  id: string,
  fallbackHelpText: string,
  i18n: BlocksI18nConfig,
) {
  return (
    <JsonLikePropField
      key={field.key}
      field={field}
      value={value}
      onChange={onChange}
      id={id}
      fallbackHelpText={fallbackHelpText}
      i18n={i18n}
    />
  );
}

function RawPropsField({
  props,
  onChange,
  idPrefix,
  i18n,
}: {
  props: BlockBuilderProps;
  onChange: (value: BlockBuilderProps) => void;
  idPrefix: string;
  i18n: BlocksI18nConfig;
}) {
  // Controlled textarea that resyncs when the parent props change (e.g. after a
  // block type change resets props). An uncontrolled defaultValue would keep
  // showing the previous JSON and could restore it on a no-edit blur.
  const valueKey = JSON.stringify(props ?? {});
  const [draft, setDraft] = useState(() => JSON.stringify(props ?? {}, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const errorId = `${idPrefix}-props-error`;

  useEffect(() => {
    setDraft(JSON.stringify(props ?? {}, null, 2));
    setParseError(null);
  }, [valueKey]);

  function commit(nextDraft: string) {
    const result = parseJsonDraft(nextDraft);
    if (!result.ok) {
      setParseError(formatBlockMessage("invalidJson", i18n, { error: result.error }));
      return;
    }
    if (result.value === undefined) {
      // Clearing the textarea resets props to an empty object.
      setParseError(null);
      onChange({});
      return;
    }
    if (typeof result.value !== "object" || Array.isArray(result.value)) {
      setParseError(blockMessage("propsMustBeObject", i18n));
      return;
    }
    setParseError(null);
    onChange(result.value as BlockBuilderProps);
  }

  return (
    <label htmlFor={`${idPrefix}-props`} style={fieldStyle}>
      <span style={labelStyle}>{blockMessage("props", i18n)}</span>
      <Textarea
        id={`${idPrefix}-props`}
        aria-label={blockMessage("blockProps", i18n)}
        aria-invalid={parseError ? true : undefined}
        aria-describedby={parseError ? errorId : undefined}
        className="min-h-28 w-full font-mono text-sm"
        value={draft}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          setDraft(event.currentTarget.value);
          if (parseError) commit(event.currentTarget.value);
        }}
        onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => commit(event.currentTarget.value)}
      />
      {parseError ? (
        <small id={errorId} role="alert" style={{ ...helpTextStyle, color: "#b42318" }}>
          {parseError}
        </small>
      ) : null}
    </label>
  );
}

function renderPropsEditor(
  definition: BlockBuilderDefinition | undefined,
  props: BlockBuilderProps,
  onChange: (value: BlockBuilderProps) => void,
  idPrefix: string,
  i18n: BlocksI18nConfig,
) {
  if (!definition?.props) {
    return (
      <RawPropsField props={props} onChange={onChange} idPrefix={idPrefix} i18n={i18n} />
    );
  }

  if (!definition.props.length) {
    return <small style={helpTextStyle}>{blockMessage("noEditableProps", i18n)}</small>;
  }

  return (
    <div style={wrapperStyle}>
      {definition.props.map((field) =>
        renderPropField(
          field,
          props[field.key],
          (nextValue) => onChange({ ...props, [field.key]: nextValue }),
          idPrefix,
          i18n,
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
  const i18n = useBlockI18n(options?.i18n);
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
        const blockTypeItems = selectItems(definitions, i18n);
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
                    width: `${compactControlWidth([blockTypeLabel, blockMessage("type", i18n)], 10, 28)}ch`,
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
                            tooltip: blockMessage("moveBlockUp", i18n),
                            onClick: () => moveBlock(index, index - 1),
                          },
                        ]
                      : []),
                    ...(blocks.length > 1 && index < blocks.length - 1
                      ? [
                          {
                            icon: <ArrowDownIcon size={14} />,
                            id: "move-down",
                            tooltip: blockMessage("moveBlockDown", i18n),
                            onClick: () => moveBlock(index, index + 1),
                          },
                        ]
                      : []),
                    {
                      icon: block.hidden ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />,
                      id: "visibility",
                      tooltip: block.hidden
                        ? blockMessage("showBlock", i18n)
                        : blockMessage("hideBlock", i18n),
                      onClick: () => updateBlock(index, { ...block, hidden: !block.hidden }),
                    },
                    {
                      icon: <TrashIcon size={14} />,
                      id: "remove",
                      tooltip: blockMessage("removeBlock", i18n),
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
              i18n,
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
        {blockMessage("addBlock", i18n)}
      </Button>
      {options?.helpText ? (
        <small style={helpTextStyle}>{localizedString(options.helpText, i18n)}</small>
      ) : null}
    </div>
  );
}

export const fields = {
  blocks: BlocksField,
};
