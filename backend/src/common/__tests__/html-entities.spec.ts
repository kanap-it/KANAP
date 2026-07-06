import * as assert from 'node:assert/strict';
import { decodeNumericHtmlEntities } from '../html-entities';

function run() {
  assert.equal(decodeNumericHtmlEntities('A &#38; B &#60; C &#62; D'), 'A & B < C > D');
  assert.equal(decodeNumericHtmlEntities('Quote: &#34;hello&#34;'), 'Quote: "hello"');
  assert.equal(decodeNumericHtmlEntities('Hex &#x26; mixed &#X3c;'), 'Hex & mixed <');
  assert.equal(decodeNumericHtmlEntities('A&#160;B'), 'A B');
  assert.equal(decodeNumericHtmlEntities('Keep &#0; and &#1114112; and &#x110000; and &#55296;'), 'Keep &#0; and &#1114112; and &#x110000; and &#55296;');
  assert.equal(decodeNumericHtmlEntities('&amp; &lt; &nbsp;'), '&amp; &lt; &nbsp;');
}

run();
