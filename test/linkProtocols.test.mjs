import assert from "node:assert/strict";
import test from "node:test";
import { isSafeLinkHref, safeLinkHref } from "../dist/index.mjs";

const allowed = [
  "https://example.com/path",
  "http://example.com",
  "mailto:hello@example.com",
  "tel:+15551234567",
  "/root-relative",
  "relative/path",
  "../up-one-level",
  "./same-level",
  "?query=1",
  "#section",
];

const rejected = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "java\nscript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "ftp://example.com/file",
  "//example.com/protocol-relative",
  "\\\\example.com/protocol-relative-backslash",
  "/\\example.com/protocol-relative-mixed",
  "vbscript:msgbox(1)",
  "&#106;avascript:alert(1)",
  "&#x6a;avascript:alert(1)",
  "javascript&colon;alert(1)",
  "​javascript:alert(1)",
  "﻿javascript:alert(1)",
  "&#106;&#x73;cript:alert(1)",
  "\x00//evil.test",
  "​//evil.test",
  "&sol;&sol;evil.test",
];

test("allows safe protocols and relative links", () => {
  for (const href of allowed) {
    assert.equal(isSafeLinkHref(href), true, href);
    assert.equal(safeLinkHref(` ${href} `), href, href);
  }
});

test("rejects unsafe protocols", () => {
  for (const href of rejected) {
    assert.equal(isSafeLinkHref(href), false, href);
    assert.equal(safeLinkHref(href), null, href);
  }
});
