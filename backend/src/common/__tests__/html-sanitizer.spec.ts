import * as assert from 'node:assert/strict';
import { sanitizeRichHtmlForEmail } from '../html-sanitizer';
import { renderMarkdownToHtml } from '../markdown-to-html';

function run() {
  const sanitized = sanitizeRichHtmlForEmail('<p onclick="alert(1)">Hi <a href="javascript:alert(1)">bad</a><script>x</script></p>');
  assert.equal(sanitized.includes('onclick'), false);
  assert.equal(sanitized.includes('javascript:'), false);
  assert.equal(sanitized.includes('<script'), false);

  const markdown = renderMarkdownToHtml('[bad](javascript:alert(1))');
  assert.equal(markdown.includes('javascript:'), false);
}

run();
