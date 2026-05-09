import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { normalizeMarkdownForRichTextEditor } from '../lib/markdownEditorNormalization';

interface MarkdownContentProps {
  content: string;
  variant?: 'default' | 'compact';
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    img: [...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title', 'width', 'height'],
    input: [...(defaultSchema.attributes?.input || []), 'type', 'checked', 'disabled'],
    li: [...(defaultSchema.attributes?.li || []), 'className', 'data-type', 'data-checked'],
    ul: [...(defaultSchema.attributes?.ul || []), 'className', 'data-type'],
    ol: [...(defaultSchema.attributes?.ol || []), 'className'],
    // rehype-highlight emits class="hljs language-xxx hljs-keyword" etc on
    // pre/code/span elements. Allow the className attribute on those tags so the
    // sanitizer doesn't strip the highlight classes (they're safe — pure presentation).
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
  },
};

function sanitizeUrl(url: string, key?: string): string {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('#')) return value;

  if (key === 'href') {
    if (/^(https?:|mailto:)/i.test(value)) return value;
    if (value.startsWith('/')) return value;
    return '';
  }

  if (key === 'src') {
    if (/^https?:/i.test(value)) return value;
    if (value.startsWith('/')) return value;
    return '';
  }

  return value;
}

export function MarkdownContent({ content, variant = 'default' }: MarkdownContentProps) {
  const isCompact = variant === 'compact';
  const value = normalizeMarkdownForRichTextEditor(content || '');
  const isDark = useTheme().palette.mode === 'dark';

  // KANAP-tuned syntax palette. Code blocks get a sober, semantic ramp rather than
  // the loud github-* defaults: orange for keywords/control flow, green for strings,
  // red for numbers, purple for types/literals, neutral for everything else. Dark mode
  // uses the lighter variants so contrast stays readable on bg.composer.
  const syntax = isDark
    ? {
        comment: 'rgba(255,255,255,0.42)',
        keyword: '#F0A830',
        string: '#34D399',
        number: '#F87171',
        type: '#A78BFA',
        title: '#E5E7EB',
        tag: '#F87171',
        attr: '#9CA3AF',
      }
    : {
        comment: 'rgba(15,17,23,0.5)',
        keyword: '#E8920F',
        string: '#10B981',
        number: '#DC2626',
        type: '#8B5CF6',
        title: '#111827',
        tag: '#DC2626',
        attr: '#6B7280',
      };

  return (
    <Box
      sx={{
        '& p': { my: isCompact ? 0.25 : 1 },
        '& p:first-of-type': { mt: 0 },
        '& p:last-of-type': { mb: 0 },
        '& h1': { fontSize: '1.5rem', fontWeight: 600, mt: 2, mb: 1 },
        '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 1.5, mb: 0.75 },
        '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1, mb: 0.5 },
        '& h4': { fontSize: '1rem', fontWeight: 600, mt: 1, mb: 0.5 },
        '& h5': { fontSize: '0.95rem', fontWeight: 600, mt: 0.75, mb: 0.4 },
        '& h6': { fontSize: '0.9rem', fontWeight: 600, mt: 0.75, mb: 0.4 },
        '& ul, & ol': { pl: 3, my: 0.5 },
        '& li': { my: 0.25 },
        '& ul[data-type="taskList"], & ul.contains-task-list': {
          listStyle: 'none',
          pl: 0,
          '& li': {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          },
          '& input[type="checkbox"]': {
            mt: 0.5,
            pointerEvents: 'none',
          },
        },
        '& code': {
          bgcolor: 'action.hover',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontFamily: 'monospace',
          fontSize: '0.875em',
        },
        '& pre': {
          bgcolor: 'action.hover',
          p: 1.5,
          borderRadius: 1,
          overflow: 'auto',
          '& code': { bgcolor: 'transparent', p: 0 },
        },
        // rehype-highlight token colors — applied only inside <pre><code class="hljs ...">
        // so inline `code` spans keep their plain neutral styling.
        '& pre code.hljs, & pre .hljs': {
          color: 'inherit',
          background: 'transparent',
        },
        '& .hljs-comment, & .hljs-quote': { color: syntax.comment, fontStyle: 'italic' },
        '& .hljs-keyword, & .hljs-selector-tag, & .hljs-section, & .hljs-link': {
          color: syntax.keyword,
        },
        '& .hljs-literal, & .hljs-built_in, & .hljs-type, & .hljs-class .hljs-title': {
          color: syntax.type,
        },
        '& .hljs-string, & .hljs-symbol, & .hljs-bullet, & .hljs-addition': {
          color: syntax.string,
        },
        '& .hljs-number, & .hljs-meta': { color: syntax.number },
        '& .hljs-title, & .hljs-name, & .hljs-selector-id, & .hljs-selector-class': {
          color: syntax.title,
          fontWeight: 500,
        },
        '& .hljs-tag': { color: syntax.tag },
        '& .hljs-attr, & .hljs-attribute, & .hljs-template-variable, & .hljs-variable': {
          color: syntax.attr,
        },
        '& .hljs-regexp, & .hljs-deletion': { color: syntax.number },
        '& .hljs-emphasis': { fontStyle: 'italic' },
        '& .hljs-strong': { fontWeight: 500 },
        '& blockquote': {
          borderLeft: 3,
          borderColor: 'divider',
          pl: 2,
          ml: 0,
          color: 'text.secondary',
          fontStyle: 'italic',
        },
        '& a': { color: 'primary.main' },
        '& img': {
          maxWidth: '100%',
          borderRadius: 1,
          my: 1,
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // rehypeHighlight runs AFTER rehypeSanitize so the class names it adds aren't
        // stripped. (Sanitize would also drop them anyway because they're presentation,
        // but the order keeps the output predictable.)
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema as any],
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        urlTransform={sanitizeUrl}
        components={{
          a: ({ node: _node, ...props }: any) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {value}
      </ReactMarkdown>
    </Box>
  );
}
