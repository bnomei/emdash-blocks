import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonDraft } from "../dist/admin.mjs";

test("invalid JSON drafts report parse errors without a committed value", () => {
  const result = parseJsonDraft('{"title":');

  assert.equal(result.ok, false);
  assert.match(result.error, /JSON|Unexpected|Expected|position/i);
});

test("corrected JSON drafts parse to committed values", () => {
  const result = parseJsonDraft('{"title":"Hello"}');

  assert.deepEqual(result, { ok: true, value: { title: "Hello" } });
});

test("valid JSON primitives parse to committed values", () => {
  assert.deepEqual(parseJsonDraft('["a", "b"]'), { ok: true, value: ["a", "b"] });
  assert.deepEqual(parseJsonDraft(""), { ok: true, value: undefined });
});
