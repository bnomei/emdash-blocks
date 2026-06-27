import assert from "node:assert/strict";
import test from "node:test";
import {
  blockWithType,
  createBlockForDefinition,
  editorHtmlToPortableText,
  isBlockBuilderProps,
  mediaIdentity,
  mediaSelectLabel,
  mediaUrl,
  mediaValueFromItem,
  mediaValues,
  normalizeEditorBlocks,
  parseProps,
  parsePropsDraft,
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
  assert.equal(isBlockBuilderProps(null), false);
  assert.equal(isBlockBuilderProps(["not", "props"]), false);
  assert.equal(isBlockBuilderProps({ title: "Hello" }), true);
  assert.deepEqual(parsePropsDraft('{"title":"Hello"}'), {
    ok: true,
    value: { title: "Hello" },
  });
  assert.deepEqual(parsePropsDraft(""), { ok: true, value: {} });
  assert.deepEqual(parsePropsDraft("null"), { ok: false, error: "propsMustBeObject" });
  assert.deepEqual(parsePropsDraft("[]"), { ok: false, error: "propsMustBeObject" });
  assert.equal(parsePropsDraft('{"title":').ok, false);
  assert.equal(parsePropsDraft('{"title":').error, "invalidJson");
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

  const prepared = prepareBlocksForChange([
    { id: "block-1", type: "text", props: { text: "Hello" } },
    { id: "kept-id", type: "text", props: {} },
  ]);
  assert.equal("id" in prepared[0], false);
  assert.deepEqual(prepared[0], { type: "text", hidden: undefined, props: { text: "Hello" } });
  assert.equal(prepared[1].id, "kept-id");

  const roundTripped = prepareBlocksForChange(
    normalizeEditorBlocks([{ type: "text", props: { text: "Imported" } }]),
  );
  assert.equal("id" in roundTripped[0], false);
});

test("normalizeEditorBlocks preserves a single stored block object", () => {
  assert.deepEqual(normalizeEditorBlocks([{ id: "a", type: "heading", props: {} }]), [
    { id: "a", type: "heading", hidden: undefined, props: {} },
  ]);
  assert.deepEqual(
    normalizeEditorBlocks({ id: "hero-1", type: "heading", props: { text: "Hello", level: "h2" } }),
    [{ id: "hero-1", type: "heading", hidden: undefined, props: { text: "Hello", level: "h2" } }],
  );
  assert.deepEqual(normalizeEditorBlocks({ foo: "bar" }), []);
  assert.deepEqual(normalizeEditorBlocks(null), []);
  assert.deepEqual(normalizeEditorBlocks("nope"), []);

  assert.deepEqual(
    normalizeEditorBlocks([{ id: "hero-1", type: "hero", props: { title: "Hi" } }, null, 5, []]),
    [{ id: "hero-1", type: "hero", hidden: undefined, props: { title: "Hi" } }],
  );

  assert.equal(
    normalizeEditorBlocks([{ id: "x", type: "text", hidden: "true", props: {} }])[0].hidden,
    true,
  );
  assert.equal(
    normalizeEditorBlocks([{ id: "y", type: "text", hidden: "false", props: {} }])[0].hidden,
    false,
  );

  const deduped = normalizeEditorBlocks([
    { id: "dup", type: "text", props: { text: "A" } },
    { id: "dup", type: "text", props: { text: "B" } },
    { id: "dup", type: "text", props: { text: "C" } },
  ]);
  const ids = deduped.map((block) => block.id);
  assert.equal(ids[0], "dup");
  assert.equal(new Set(ids).size, 3, "all ids unique");
  assert.equal(deduped[1].props.text, "B");
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

  assert.deepEqual(mediaValues([{ id: "" }, { src: "" }]), []);
  assert.deepEqual(mediaValues([{ id: "", src: "https://cdn/x.jpg" }]), [
    { id: "", src: "https://cdn/x.jpg" },
  ]);
  assert.deepEqual(mediaValues([{ id: "", meta: { storageKey: "k" } }]), [
    { id: "", meta: { storageKey: "k" } },
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

test("intraword underscores are preserved (not parsed as emphasis)", () => {
  const [block] = portableTextBlocks("foo_bar_baz and my_file_name");
  assert.equal(textOf(block), "foo_bar_baz and my_file_name");
  for (const span of block.children) {
    assert.deepEqual(span.marks ?? [], []);
  }

  const [emphasized] = portableTextBlocks("an _italic_ word");
  assert.deepEqual(spanWithText(emphasized, "italic").marks, ["em"]);
  assert.equal(textOf(emphasized), "an italic word");
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

test("portableTextToEditorHtml tolerates malformed stored blocks without throwing", () => {
  assert.doesNotThrow(() =>
    portableTextToEditorHtml([
      { _type: "block", _key: "k1", children: "oops" },
      { _type: "block", _key: "k2", children: [{ _type: "span", _key: "s", text: 5 }] },
      { _type: "block", _key: "k3", markDefs: "x", children: [{ _type: "span", _key: "s2", text: "hi", marks: ["m"] }] },
      { _type: "block", _key: "k4", children: [null, { _type: "span", _key: "s3", text: "ok" }] },
      {
        _type: "block",
        _key: "k5",
        markDefs: [{ _key: "l", _type: "link", href: 5 }],
        children: [{ _type: "span", _key: "s4", text: "x", marks: ["l"] }],
      },
    ]),
  );

  const html = portableTextToEditorHtml([
    { _type: "block", _key: "k1", children: "oops" },
    { _type: "block", _key: "k2", children: [{ _type: "span", _key: "s2", text: "kept" }] },
  ]);
  assert.match(html, /kept/);
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

  assert.equal(
    portableTextToEditorHtml(leveled),
    '<ul><li>One</li><li data-level="2">Two</li></ul>',
  );

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

test("keeps nested list items as their own blocks instead of fusing into parent", () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = TestElement;

  try {
    const blocks = editorHtmlToPortableText(
      element("div", [
        element("ul", [
          element("li", [
            text("Parent"),
            element("ul", [element("li", [text("Child")])]),
          ]),
        ]),
      ]),
    );

    assert.equal(blocks.length, 2);
    assert.equal(textOf(blocks[0]), "Parent");
    assert.equal(blocks[0].listItem, "bullet");
    assert.equal(blocks[0].level, 1);
    assert.equal(textOf(blocks[1]), "Child");
    assert.equal(blocks[1].listItem, "bullet");
    assert.equal(blocks[1].level, 2);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
  }
});

test("splits a list nested inside a paragraph into list blocks", () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = TestElement;

  try {
    const blocks = editorHtmlToPortableText(
      element("div", [
        element("p", [
          text("Intro"),
          element("ul", [element("li", [text("One")]), element("li", [text("Two")])]),
          text("After"),
        ]),
      ]),
    );

    assert.equal(blocks.length, 4);
    assert.equal(blocks[0].style, "normal");
    assert.equal(textOf(blocks[0]), "Intro");
    assert.equal(blocks[1].listItem, "bullet");
    assert.equal(textOf(blocks[1]), "One");
    assert.equal(blocks[2].listItem, "bullet");
    assert.equal(textOf(blocks[2]), "Two");
    assert.equal(blocks[3].listItem, undefined);
    assert.equal(textOf(blocks[3]), "After");
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
