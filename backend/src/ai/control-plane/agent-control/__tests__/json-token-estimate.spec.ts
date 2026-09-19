import * as assert from 'node:assert/strict';
import { estimateJsonTokens } from '../json-token-estimate';

/**
 * This estimator defines the prompt-budgeting margin shared by six agentic stages. Each
 * stage used to carry its own copy with a comment saying the margin had to stay aligned
 * with synthesis, so the exact ratio is pinned here.
 */
function testUsesTheDocumentedCharsPerTokenMargin() {
  // 3.5 chars per token, not 4: multilingual text plus JSON overhead undercounts at /4.
  // `{"a":1}` is 7 characters -> 7 / 3.5 = 2.
  assert.equal(JSON.stringify({ a: 1 }), '{"a":1}');
  assert.equal(estimateJsonTokens({ a: 1 }), 2);
  // `{"a":11}` is 8 -> ceil(8 / 3.5) = 3.
  assert.equal(JSON.stringify({ a: 11 }), '{"a":11}');
  assert.equal(estimateJsonTokens({ a: 11 }), 3);
}

function testABareStringIsMeasuredWithItsJsonQuotes() {
  // Worth pinning: the value is JSON-serialized, so a 7-character string measures 9
  // characters and rounds up to 3.
  assert.equal(estimateJsonTokens('a'.repeat(7)), 3);
}

function testMeasuresTheSerializedPayloadNotTheObject() {
  assert.equal(estimateJsonTokens({ a: 1 }), 2);
}

function testNeverReturnsZero() {
  // A floor of 1 keeps an empty payload from budgeting as free.
  assert.equal(estimateJsonTokens({}), 1);
  assert.equal(estimateJsonTokens(null), 1);
  assert.equal(estimateJsonTokens(undefined), 1);
  assert.equal(estimateJsonTokens(''), 1);
}

function testGrowsWithThePayload() {
  const small = estimateJsonTokens({ a: 1 });
  const large = estimateJsonTokens({ a: 'x'.repeat(1000) });
  assert.ok(large > small);
}

function run() {
  testUsesTheDocumentedCharsPerTokenMargin();
  testABareStringIsMeasuredWithItsJsonQuotes();
  testMeasuresTheSerializedPayloadNotTheObject();
  testNeverReturnsZero();
  testGrowsWithThePayload();
}

void run();
