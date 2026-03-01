import { BadRequestException } from '@nestjs/common';
import { findRawHtmlSnippets, isAllowedMarkdownHtmlSnippet } from './html-to-markdown';

type NormalizeMarkdownRichTextOptions = {
  fieldName?: string;
};

export function normalizeMarkdownRichText(
  value: unknown,
  opts?: NormalizeMarkdownRichTextOptions,
): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;

  const disallowedHtml = findRawHtmlSnippets(text)
    .filter((snippet) => !isAllowedMarkdownHtmlSnippet(snippet));
  if (disallowedHtml.length > 0) {
    const field = opts?.fieldName || 'content';
    const example = disallowedHtml[0]
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
    throw new BadRequestException(
      `${field} must be Markdown. Raw HTML is not allowed outside code blocks or inline code. ` +
      `Wrap HTML examples in backticks. Example: ${example}`,
    );
  }

  return text;
}
