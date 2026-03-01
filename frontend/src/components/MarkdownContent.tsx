import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

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
  },
};

function sanitizeUrl(url: string, key?: string): string {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('#')) return value;

  if (key === 'href') {
    if (/^(https?:|mailto:)/i.test(value)) return value;
    return '';
  }

  if (key === 'src') {
    if (/^https?:/i.test(value)) return value;
    if (value.startsWith('/')) return value;
    if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) return value;
    return '';
  }

  return value;
}

export function MarkdownContent({ content, variant = 'default' }: MarkdownContentProps) {
  const isCompact = variant === 'compact';
  const value = content || '';

  return (
    <Box
      sx={{
        '& p': { my: isCompact ? 0.25 : 0.5 },
        '& p:first-of-type': { mt: 0 },
        '& p:last-of-type': { mb: 0 },
        '& h1': { fontSize: '1.5rem', fontWeight: 600, mt: 2, mb: 1 },
        '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 1.5, mb: 0.75 },
        '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1, mb: 0.5 },
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
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema as any]]}
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
