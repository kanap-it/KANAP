import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { describe, expect, it } from 'vitest';
import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { normalizeInlineFencedCodeBlocks, normalizeMarkdownForRichTextEditor } from './markdownEditorNormalization';

function expectMarkdownToParse(markdown: string) {
  expect(() => fromMarkdown(markdown, {
    extensions: [mdxJsx()],
    mdastExtensions: [mdxJsxFromMarkdown()],
  })).not.toThrow();
}

describe('markdownEditorNormalization', () => {
  it('normalizes fenced SQL blocks started inline after prose', () => {
    const markdown = [
      '**Attention** : Toujours verifier les vrais noms avant creation :```sql',
      'SELECT COLUMN_NAME',
      'FROM INFORMATION_SCHEMA.COLUMNS',
      "WHERE TABLE_NAME = '<TABLE>'",
      "  AND COLUMN_NAME LIKE '%<motif>%'",
      'ORDER BY COLUMN_NAME;',
      '```',
    ].join('\n');

    expect(() => fromMarkdown(markdown, {
      extensions: [mdxJsx()],
      mdastExtensions: [mdxJsxFromMarkdown()],
    })).toThrow(/closing tag/i);

    const normalized = normalizeMarkdownForRichTextEditor(markdown);

    expect(normalized).toContain('creation :\n```sql');
    expectMarkdownToParse(normalized);
  });

  it('leaves already-valid fenced blocks unchanged', () => {
    const markdown = [
      'Paragraph before.',
      '',
      '```sql',
      'SELECT *',
      'FROM users;',
      '```',
    ].join('\n');

    expect(normalizeInlineFencedCodeBlocks(markdown)).toBe(markdown);
  });

  it('does not rewrite content inside existing fenced blocks', () => {
    const markdown = [
      '```txt',
      'Example :```sql',
      '%<motif>%',
      '```',
    ].join('\n');

    expect(normalizeInlineFencedCodeBlocks(markdown)).toBe(markdown);
  });

  it('normalizes quoted fenced SQL blocks started inline after prose', () => {
    const markdown = [
      '> **Attention** : Toujours verifier les vrais noms avant creation :```sql',
      '> SELECT COLUMN_NAME',
      '> FROM INFORMATION_SCHEMA.COLUMNS',
      "> WHERE TABLE_NAME = '<TABLE>'",
      ">   AND COLUMN_NAME LIKE '%<motif>%'",
      '> ORDER BY COLUMN_NAME;',
      '> ```',
    ].join('\n');

    expect(() => fromMarkdown(markdown, {
      extensions: [mdxJsx()],
      mdastExtensions: [mdxJsxFromMarkdown()],
    })).toThrow(/closing tag/i);

    const normalized = normalizeMarkdownForRichTextEditor(markdown);

    expect(normalized).toContain('creation :\n> ```sql');
    expectMarkdownToParse(normalized);
  });
});
