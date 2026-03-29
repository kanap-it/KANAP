import * as assert from 'node:assert/strict';
import { markdownToSearchText } from '../markdown-search-text';

function testPreservesVisibleLinkText() {
  assert.equal(
    markdownToSearchText('Un paragraphe sur les [fleurs](https://example.com) dans un document.'),
    'Un paragraphe sur les fleurs dans un document.',
  );
}

function testPreservesInlineCodeText() {
  assert.equal(
    markdownToSearchText('Cherche `fleurs` dans ce document.'),
    'Cherche fleurs dans ce document.',
  );
}

function testKeepsWordsWholeAcrossInlineFormatting() {
  assert.equal(
    markdownToSearchText('Un paragraphe sur les fle**ur**s dans un document.'),
    'Un paragraphe sur les fleurs dans un document.',
  );
}

function testPreservesFencedCodeText() {
  assert.equal(
    markdownToSearchText('Avant\n```txt\nfleurs\n```\nApres'),
    'Avant fleurs Apres',
  );
}

function run() {
  testPreservesVisibleLinkText();
  testPreservesInlineCodeText();
  testKeepsWordsWholeAcrossInlineFormatting();
  testPreservesFencedCodeText();
}

run();
