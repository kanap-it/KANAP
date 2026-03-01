import React from 'react';
import { Box, GlobalStyles } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  headingsPlugin,
  imagePlugin,
  InsertImage,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  MDXEditorMethods,
  quotePlugin,
  StrikeThroughSupSubToggles,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { htmlToMarkdown, isHtml } from '../utils/htmlToMarkdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (md: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  focusNonce?: number;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minRows = 8,
  maxRows = 16,
  disabled = false,
  focusNonce,
  onImageUpload,
}: MarkdownEditorProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const minHeight = minRows * 24;
  const maxHeight = maxRows * 24;
  const mdxRef = React.useRef<MDXEditorMethods>(null);
  const internalChangeRef = React.useRef(false);
  const mdxRootClassName = React.useMemo(
    () => `kanap-mdx-root ${isDarkMode ? 'dark-theme' : 'light-theme'}`,
    [isDarkMode],
  );
  const mdxThemeVariables = React.useMemo<Record<string, string>>(
    () => ({
      colorScheme: isDarkMode ? 'dark' : 'light',
      '--basePageBg': theme.palette.background.paper,
      '--baseBase': theme.palette.background.paper,
      '--baseBgSubtle': isDarkMode ? alpha(theme.palette.common.white, 0.04) : theme.palette.grey[50],
      '--baseBg': isDarkMode ? alpha(theme.palette.common.white, 0.06) : theme.palette.grey[100],
      '--baseBgHover': isDarkMode ? alpha(theme.palette.common.white, 0.1) : theme.palette.grey[200],
      '--baseBgActive': isDarkMode ? alpha(theme.palette.common.white, 0.14) : theme.palette.grey[300],
      '--baseLine': alpha(theme.palette.divider, isDarkMode ? 0.8 : 1),
      '--baseBorder': theme.palette.divider,
      '--baseBorderHover': theme.palette.text.secondary,
      '--baseSolid': isDarkMode ? theme.palette.grey[700] : theme.palette.grey[400],
      '--baseSolidHover': isDarkMode ? theme.palette.grey[600] : theme.palette.grey[500],
      '--baseText': theme.palette.text.secondary,
      '--baseTextContrast': theme.palette.text.primary,
      '--accentBorder': theme.palette.primary.main,
      '--accentSolid': theme.palette.primary.main,
      '--accentSolidHover': theme.palette.primary.dark,
      '--accentText': theme.palette.primary.main,
      '--accentTextContrast': theme.palette.primary.contrastText,
    }),
    [isDarkMode, theme],
  );
  const mdxThemeVariablesImportant = React.useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        Object.entries(mdxThemeVariables).map(([key, value]) => [key, `${value} !important`]),
      ),
    [mdxThemeVariables],
  );

  const fallbackImageUpload = React.useCallback(async (file: File): Promise<string> => {
    if (onImageUpload) return onImageUpload(file);
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const value = String(event.target?.result || '');
        if (!value) {
          reject(new Error('Failed to read image'));
          return;
        }
        resolve(value);
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  }, [onImageUpload]);

  const normalizeIncoming = React.useCallback((raw: string): string => {
    const text = raw || '';
    return isHtml(text) ? htmlToMarkdown(text) : text;
  }, []);

  const [initialMarkdown] = React.useState(() => normalizeIncoming(value));

  const handleChange = React.useCallback(
    (markdown: string, initialMarkdownNormalize: boolean) => {
      if (initialMarkdownNormalize) return;
      internalChangeRef.current = true;
      onChange(markdown);
    },
    [onChange],
  );

  React.useEffect(() => {
    if (!mdxRef.current) return;
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }

    const incoming = normalizeIncoming(value);
    const current = mdxRef.current.getMarkdown();
    if (incoming !== current) {
      mdxRef.current.setMarkdown(incoming);
    }
  }, [value, normalizeIncoming]);

  React.useEffect(() => {
    if (!mdxRef.current || disabled || focusNonce === undefined || focusNonce < 1) return;
    mdxRef.current.focus();
  }, [focusNonce, disabled]);

  return (
    <>
      <GlobalStyles
        styles={{
          '.kanap-mdx-root.kanap-mdx-root': mdxThemeVariables,
          '.kanap-mdx-root.kanap-mdx-root *': mdxThemeVariablesImportant,
          '.kanap-mdx-root .mdxeditor-select-content': {
            backgroundColor: `${theme.palette.background.paper} !important`,
            color: `${theme.palette.text.primary} !important`,
            borderColor: `${theme.palette.divider} !important`,
          },
          '.kanap-mdx-root [role="dialog"]': {
            backgroundColor: `${theme.palette.background.paper} !important`,
            color: `${theme.palette.text.primary} !important`,
            borderColor: `${theme.palette.divider} !important`,
          },
          '.kanap-mdx-root [data-editor-dropdown]': {
            backgroundColor: `${theme.palette.background.paper} !important`,
            color: `${theme.palette.text.primary} !important`,
          },
          '.kanap-mdx-root [data-editor-dialog]': {
            color: `${theme.palette.text.primary} !important`,
          },
          '.kanap-mdx-root [data-editor-dialog]::placeholder': {
            color: `${theme.palette.text.secondary} !important`,
          },
        }}
      />
      <Box
        sx={{
          border: 1,
          borderColor: disabled ? 'action.disabled' : 'divider',
          borderRadius: 1,
          bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
          '&:focus-within': {
            borderColor: 'primary.main',
            borderWidth: 2,
          },
          '& .kanap-mdx-toolbar': {
            p: 0.5,
            borderBottom: 1,
            borderColor: 'divider',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 0.5,
          },
          '& .kanap-mdx-content': {
            p: 1.5,
            minHeight: minHeight - 24,
            maxHeight: maxHeight - 24,
            overflow: 'auto',
            outline: 'none',
            '& p': { my: 0.5 },
            '& h1': { fontSize: '1.5rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 1.5, mb: 0.75 },
            '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1, mb: 0.5 },
            '& ul, & ol': { pl: 3, my: 0.5 },
            '& li': { my: 0.25 },
            '& ul.contains-task-list': {
              listStyle: 'none',
              pl: 0,
              '& li': {
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
              },
              '& input[type="checkbox"]': {
                mt: 0.5,
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
            '& a': { color: 'primary.main', textDecoration: 'underline' },
            '& img': {
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              borderRadius: 1,
              my: 1,
            },
          },
        }}
      >
        <MDXEditor
          ref={mdxRef}
          markdown={initialMarkdown}
          readOnly={disabled}
          placeholder={placeholder}
          className={mdxRootClassName}
          contentEditableClassName="kanap-mdx-content"
          onChange={handleChange}
          plugins={[
            headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
            listsPlugin(),
            quotePlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin({ imageUploadHandler: fallbackImageUpload }),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            toolbarPlugin({
              toolbarClassName: 'kanap-mdx-toolbar',
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <BlockTypeSelect />
                  <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
                  <StrikeThroughSupSubToggles options={['Strikethrough']} />
                  <ListsToggle options={['bullet', 'number', 'check']} />
                  <CreateLink />
                  <InsertImage />
                  <CodeToggle />
                  <InsertThematicBreak />
                </>
              ),
            }),
          ]}
        />
      </Box>
    </>
  );
}
