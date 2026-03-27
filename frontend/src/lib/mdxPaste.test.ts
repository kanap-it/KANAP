import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { describe, expect, it } from 'vitest';
import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { hasPotentiallyUnsafeMdxPaste, sanitizeMarkdownForMdxPaste } from './mdxPaste';

function expectMarkdownToParse(markdown: string) {
  expect(() => fromMarkdown(markdown, {
    extensions: [mdxJsx()],
    mdastExtensions: [mdxJsxFromMarkdown()],
  })).not.toThrow();
}

describe('mdxPaste', () => {
  it('detects plain-text paste that MDX misinterprets as JSX', () => {
    expect(hasPotentiallyUnsafeMdxPaste('172.30.2.1 <-> 10.18.199.11 : SMB')).toBe(true);
    expect(hasPotentiallyUnsafeMdxPaste('x<y')).toBe(true);
    expect(hasPotentiallyUnsafeMdxPaste('a < b')).toBe(false);
  });

  it('escapes literal angle-bracket text so it parses as markdown', () => {
    const markdown = sanitizeMarkdownForMdxPaste('172.30.2.1 <-> 10.18.199.11 : SMB');

    expect(markdown).toBe('172.30.2.1 \\<-> 10.18.199.11 : SMB');
    expectMarkdownToParse(markdown);
  });

  it('converts autolinks into markdown links', () => {
    const markdown = sanitizeMarkdownForMdxPaste('Docs: <https://example.com/docs>');

    expect(markdown).toBe('Docs: [https://example.com/docs](https://example.com/docs)');
    expectMarkdownToParse(markdown);
  });

  it('converts email autolinks into mailto links', () => {
    const markdown = sanitizeMarkdownForMdxPaste('Contact: <user@example.com>');

    expect(markdown).toBe('Contact: [user@example.com](mailto:user@example.com)');
    expectMarkdownToParse(markdown);
  });

  it('leaves fenced and inline code untouched', () => {
    const markdown = sanitizeMarkdownForMdxPaste([
      'Inline: `<tag>` and `172.30.2.1 <-> 10.18.199.11`',
      '',
      '```txt',
      '172.30.2.1 <-> 10.18.199.11',
      '<tag>',
      '```',
    ].join('\n'));

    expect(markdown).toContain('`<tag>`');
    expect(markdown).toContain('`172.30.2.1 <-> 10.18.199.11`');
    expect(markdown).toContain('```txt\n172.30.2.1 <-> 10.18.199.11\n<tag>\n```');
    expectMarkdownToParse(markdown);
  });

  it('does not rewrite angle-bracket link destinations', () => {
    const markdown = sanitizeMarkdownForMdxPaste('[docs](<https://example.com/a path>)');

    expect(markdown).toBe('[docs](<https://example.com/a path>)');
    expectMarkdownToParse(markdown);
  });
});
