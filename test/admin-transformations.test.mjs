import assert from "node:assert/strict";
import test from "node:test";
import {
  blockWithType,
  createBlockForDefinition,
  editorHtmlToPortableText,
  mediaIdentity,
  mediaSelectLabel,
  mediaUrl,
  mediaValueFromItem,
  mediaValues,
  normalizeEditorBlocks,
  parseProps,
  portableTextBlocks,
  portableTextToEditorHtml,
  prepareBlocksForChange,
  resolveBlockDefinitions,
} from "../dist/adminTransforms.mjs";

function textOf(block) {
  return (block.children ?? []).map((span) => span.text).join("");
}

function spanWithText(block, text) {
  return (block.children ?? []).find((span) => span.text === text);
}

class TestText {
  nodeType = 3;

  constructor(textContent) {
    this.textContent = textContent;
  }
}

class TestElement {
  nodeType = 1;

  constructor(tagName, childNodes = [], attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.childNodes = childNodes;
    this.attributes = attributes;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  querySelectorAll(selector) {
    if (selector !== ":scope > li") return [];
    return this.childNodes.filter(
      (child) => child instanceof TestElement && child.tagName === "LI",
    );
  }
}

function text(value) {
  return new TestText(value);
}

function element(tagName, childNodes = [], attributes = {}) {
  return new TestElement(tagName, childNodes, attributes);
}

test("parses JSON props only when the draft is an object record", () => {
  assert.deepEqual(parseProps('{"title":"Hello","nested":{"ok":true}}'), {
    title: "Hello",
    nested: { ok: true },
  });
  assert.deepEqual(parseProps("{}"), {});
  assert.equal(parseProps("[]"), null);
  assert.equal(parseProps("null"), null);
  assert.equal(parseProps('{"title":'), null);
  assert.equal(parseProps(""), null);
});

test("normalizes editor block defaults and submission visibility", () => {
  const blocks = [
    { id: "custom-1", type: "custom", hidden: "yes", props: [] },
    { id: "legacy-1", type: "legacy", props: { title: "Legacy" } },
  ];
  const definitions = resolveBlockDefinitions(blocks, {
    blockDefinitions: [
      {
        type: "custom",
        label: "Custom",
        props: [
          { key: "title", label: "Title", defaultValue: "" },
          { key: "enabled", label: "Enabled", type: "boolean", defaultValue: false },
        ],
      },
    ],
  });

  assert.equal(definitions[0].type, "custom");
  assert.equal(definitions.at(-1).type, "legacy");
  assert.deepEqual(
    createBlockForDefinition(definitions[0], () => "block-fixed"),
    {
      id: "block-fixed",
      type: "custom",
      props: { title: "", enabled: false },
    },
  );
  assert.deepEqual(
    blockWithType({ id: "one", type: "legacy", props: { stale: true } }, "custom", definitions),
    { id: "one", type: "custom", props: { title: "", enabled: false } },
  );
  assert.deepEqual(
    prepareBlocksForChange([
      { id: "shown", type: "custom", hidden: false, props: {} },
      { id: "hidden", type: "custom", hidden: true, props: {} },
    ]),
    [
      { id: "shown", type: "custom", hidden: undefined, props: {} },
      { id: "hidden", type: "custom", hidden: true, props: {} },
    ],
  );
});

test("normalizeEditorBlocks preserves a single stored block object", () => {
  // Arrays normalize element-by-element.
  assert.deepEqual(normalizeEditorBlocks([{ id: "a", type: "heading", props: {} }]), [
    { id: "a", type: "heading", hidden: undefined, props: {} },
  ]);
  // A single block object (migration/corruption shape) is coerced into a
  // one-element list instead of being shown as empty and overwritten.
  assert.deepEqual(
    normalizeEditorBlocks({ id: "hero-1", type: "heading", props: { text: "Hello", level: "h2" } }),
    [{ id: "hero-1", type: "heading", hidden: undefined, props: { text: "Hello", level: "h2" } }],
  );
  // Non-block values still degrade to an empty list.
  assert.deepEqual(normalizeEditorBlocks({ foo: "bar" }), []);
  assert.deepEqual(normalizeEditorBlocks(null), []);
  assert.deepEqual(normalizeEditorBlocks("nope"), []);

  // null/primitive/array slots are dropped, not turned into phantom blocks.
  assert.deepEqual(
    normalizeEditorBlocks([{ id: "hero-1", type: "hero", props: { title: "Hi" } }, null, 5, []]),
    [{ id: "hero-1", type: "hero", hidden: undefined, props: { title: "Hi" } }],
  );
});

test("normalizes media values from stored values and API items", () => {
  const mediaItem = {
    id: "media-1",
    filename: "hero image.png",
    mimeType: "image/png",
    size: 2048,
    width: 1200,
    height: 800,
    alt: null,
    caption: "Hero caption",
    storageKey: "uploads/hero image.png",
    status: "ready",
    blurhash: null,
    dominantColor: "#336699",
  };
  const stored = mediaValueFromItem(mediaItem);

  assert.deepEqual(stored, {
    id: "media-1",
    provider: "local",
    filename: "hero image.png",
    mimeType: "image/png",
    size: 2048,
    width: 1200,
    height: 800,
    alt: "",
    meta: {
      storageKey: "uploads/hero image.png",
      caption: "Hero caption",
      blurhash: null,
      dominantColor: "#336699",
    },
  });
  assert.equal(mediaIdentity(stored), "media-1");
  assert.equal(mediaSelectLabel(stored), "hero image.png");
  assert.equal(mediaUrl(stored), "/_emdash/api/media/file/uploads/hero%20image.png");
  assert.equal(mediaUrl({ id: "asset/id" }), "/_emdash/api/media/file/asset%2Fid");
  assert.equal(
    mediaUrl({ id: "x", meta: { storageKey: "../../sensitive" } }),
    "/_emdash/api/media/file/sensitive",
  );
  assert.equal(
    mediaUrl({ id: "x", meta: { storageKey: "uploads/../../etc/passwd" } }),
    "/_emdash/api/media/file/uploads/etc/passwd",
  );
  assert.equal(
    mediaUrl({ id: "", src: "https://cdn.example/image.jpg" }),
    "https://cdn.example/image.jpg",
  );
  assert.deepEqual(mediaValues([stored, { src: "/fallback.jpg" }, {}, null]), [
    stored,
    { src: "/fallback.jpg" },
  ]);
});

test("converts markdown source to portable text blocks", () => {
  const blocks = portableTextBlocks(`#Title

Intro **bold** _em_ \`code\` [safe](/safe) [bad](javascript:alert) ~~old~~

- One
  - Two
1. First
> Quote`);

  assert.equal(blocks[0].style, "h1");
  assert.equal(textOf(blocks[0]), "Title");
  assert.equal(blocks[1].style, "normal");
  assert.equal(textOf(blocks[1]), "Intro bold em code safe bad old");
  assert.deepEqual(spanWithText(blocks[1], "bold").marks, ["strong"]);
  assert.deepEqual(spanWithText(blocks[1], "em").marks, ["em"]);
  assert.deepEqual(spanWithText(blocks[1], "code").marks, ["code"]);
  assert.deepEqual(spanWithText(blocks[1], "safe").marks, [blocks[1].markDefs[0]._key]);
  assert.deepEqual(spanWithText(blocks[1], "bad").marks, []);
  assert.deepEqual(spanWithText(blocks[1], "old").marks, ["strike-through"]);
  assert.deepEqual(
    blocks[1].markDefs.map((definition) => definition.href),
    ["/safe"],
  );
  assert.equal(blocks[2].listItem, "bullet");
  assert.equal(blocks[2].level, 1);
  assert.equal(blocks[3].listItem, "bullet");
  assert.equal(blocks[3].level, 2);
  assert.equal(blocks[4].listItem, "number");
  assert.equal(blocks[5].style, "blockquote");
});

test("renders portable text as escaped editor HTML with sanitized links and lists", () => {
  const html = portableTextToEditorHtml([
    {
      _type: "block",
      _key: "heading",
      style: "h2",
      markDefs: [
        { _key: "safe", _type: "link", href: "https://example.com?a=1&b=2" },
        { _key: "unsafe", _type: "link", href: "javascript:alert(1)" },
      ],
      children: [
        { _type: "span", _key: "a", text: "A & <B>", marks: ["strong", "safe"] },
        { _type: "span", _key: "b", text: "\nNext", marks: ["em"] },
        { _type: "span", _key: "c", text: " bad", marks: ["unsafe"] },
      ],
    },
    {
      _type: "block",
      _key: "bullet-1",
      listItem: "bullet",
      children: [{ _type: "span", _key: "d", text: "One" }],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "bullet-2",
      listItem: "bullet",
      children: [{ _type: "span", _key: "e", text: "Two" }],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "number-1",
      listItem: "number",
      children: [{ _type: "span", _key: "f", text: "First" }],
      markDefs: [],
    },
  ]);

  assert.equal(
    html,
    '<h2><a href="https://example.com?a=1&amp;b=2"><strong>A &amp; &lt;B&gt;</strong></a><em><br>Next</em> bad</h2><ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>',
  );
});

test("encodes and restores nested list level across editor HTML", () => {
  const leveled = [
    {
      _type: "block",
      _key: "a",
      listItem: "bullet",
      level: 1,
      children: [{ _type: "span", _key: "s1", text: "One" }],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "b",
      listItem: "bullet",
      level: 2,
      children: [{ _type: "span", _key: "s2", text: "Two" }],
      markDefs: [],
    },
  ];

  // Export carries the nested level via data-level (only when > 1).
  assert.equal(
    portableTextToEditorHtml(leveled),
    '<ul><li>One</li><li data-level="2">Two</li></ul>',
  );

  // Import restores the level from data-level.
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = TestElement;
  try {
    const blocks = editorHtmlToPortableText(
      element("div", [
        element("ul", [
          element("li", [text("One")]),
          element("li", [text("Two")], { "data-level": "2" }),
        ]),
      ]),
    );
    assert.equal(blocks[0].level, 1);
    assert.equal(blocks[1].level, 2);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
  }
});

test("converts editor HTML nodes to portable text blocks", () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = TestElement;

  try {
    const blocks = editorHtmlToPortableText(
      element("div", [
        element("h2", [text("Title")]),
        element("p", [
          text("Hello "),
          element("strong", [text("bold")]),
          text(" "),
          element("a", [text("safe")], { href: "/safe" }),
          text(" "),
          element("a", [text("unsafe")], { href: "javascript:alert(1)" }),
          element("br"),
          text("line"),
        ]),
        element("ul", [
          element("li", [text("One")]),
          element("li", [element("em", [text("Two")])]),
        ]),
      ]),
    );

    assert.equal(blocks.length, 4);
    assert.equal(blocks[0].style, "h2");
    assert.equal(textOf(blocks[0]), "Title");
    assert.equal(blocks[1].style, "normal");
    assert.equal(textOf(blocks[1]), "Hello bold safe unsafe\nline");
    assert.deepEqual(spanWithText(blocks[1], "bold").marks, ["strong"]);
    assert.equal(blocks[1].markDefs[0].href, "/safe");
    assert.deepEqual(spanWithText(blocks[1], "safe").marks, [blocks[1].markDefs[0]._key]);
    assert.deepEqual(spanWithText(blocks[1], "unsafe").marks, []);
    assert.equal(blocks[2].listItem, "bullet");
    assert.equal(textOf(blocks[2]), "One");
    assert.equal(blocks[3].listItem, "bullet");
    assert.deepEqual(spanWithText(blocks[3], "Two").marks, ["em"]);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
  }
});

test("preserves h5 and h6 heading levels on editor HTML round-trip", () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = TestElement;

  try {
    const blocks = editorHtmlToPortableText(
      element("div", [
        element("h5", [text("Five")]),
        element("h6", [text("Six")]),
      ]),
    );

    assert.equal(blocks[0].style, "h5");
    assert.equal(blocks[1].style, "h6");
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
  }
});
