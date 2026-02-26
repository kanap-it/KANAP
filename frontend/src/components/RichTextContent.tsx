import { Box } from '@mui/material';

interface RichTextContentProps {
  content: string;
  variant?: 'default' | 'compact';
}

export function RichTextContent({ content, variant = 'default' }: RichTextContentProps) {
  const isCompact = variant === 'compact';

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
        '& ul[data-type="taskList"]': {
          listStyle: 'none',
          pl: 0,
          '& li': {
            display: 'flex',
            alignItems: 'flex-start',
            '& > label': { mr: 1 },
            '& > div': { flex: 1 },
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
        '& mark': {
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#665600' : '#ffff00'),
          color: 'inherit',
          px: 0.25,
          borderRadius: 0.25,
        },
        '& img': {
          maxWidth: '100%',
          width: 'auto',
          height: 'auto',
          borderRadius: 1,
          my: 1,
        },
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
