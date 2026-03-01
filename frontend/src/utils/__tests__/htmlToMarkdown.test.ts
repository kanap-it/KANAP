import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, isHtml } from '../htmlToMarkdown';

describe('isHtml', () => {
  it('detects standard html tags', () => {
    expect(isHtml('<p>Hello</p>')).toBe(true);
    expect(isHtml('  <h2>Title</h2>')).toBe(true);
    expect(isHtml('<img src="https://example.com/x.png" />')).toBe(true);
  });

  it('does not treat markdown autolinks as html', () => {
    expect(isHtml('<https://kanap.example/doc>')).toBe(false);
    expect(isHtml('https://kanap.example/doc')).toBe(false);
    expect(isHtml('## Heading')).toBe(false);
  });
});

describe('htmlToMarkdown', () => {
  it('converts basic rich-text formatting', () => {
    const html = '<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em> text.</p>';
    const md = htmlToMarkdown(html);

    expect(md).toContain('## Title');
    expect(md).toContain('**Bold**');
    expect(md).toContain('*italic*');
  });

  it('converts task list items with checked state', () => {
    const html = [
      '<ul data-type="taskList">',
      '<li data-type="taskItem" data-checked="true"><p>Done</p></li>',
      '<li data-type="taskItem" data-checked="false"><p>Todo</p></li>',
      '</ul>',
    ].join('');

    const md = htmlToMarkdown(html);
    expect(md).toContain('- [x] Done');
    expect(md).toContain('- [ ] Todo');
  });

  it('keeps links and image urls', () => {
    const html = [
      '<p><a href="https://example.com">Read more</a></p>',
      '<p><img src="https://api.kanap.local/portfolio/requests/inline/demo/123" alt="diagram" /></p>',
    ].join('');

    const md = htmlToMarkdown(html);
    expect(md).toContain('[Read more](https://example.com)');
    expect(md).toContain('![diagram](https://api.kanap.local/portfolio/requests/inline/demo/123)');
  });

  it('drops highlight and underline formatting but preserves text', () => {
    const html = '<p><mark>Highlighted</mark> and <u>underlined</u></p>';
    const md = htmlToMarkdown(html);

    expect(md).toContain('Highlighted');
    expect(md).toContain('underlined');
    expect(md).not.toContain('<mark>');
    expect(md).not.toContain('<u>');
  });

  it('keeps base64 image content as markdown image target', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
    const html = `<p><img src="${dataUrl}" alt="inline" /></p>`;
    const md = htmlToMarkdown(html);

    expect(md).toContain(`![inline](${dataUrl})`);
  });

  it('returns empty markdown for empty input', () => {
    expect(htmlToMarkdown('')).toBe('');
  });
});
