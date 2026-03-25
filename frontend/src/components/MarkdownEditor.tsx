import React from 'react';
import { Box, GlobalStyles } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ButtonOrDropdownButton,
  ChangeCodeMirrorLanguage,
  codeBlockPlugin,
  codeMirrorPlugin,
  CodeToggle,
  ConditionalContents,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  directivesPlugin,
  frontmatterPlugin,
  headingsPlugin,
  HighlightToggle,
  imagePlugin,
  InsertAdmonition,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  MDXEditorMethods,
  quotePlugin,
  Separator,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  insertMarkdown$,
  usePublisher,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import {
  convertRichClipboardToMarkdown,
  extractClipboardImageFiles,
  looksLikeMarkdown,
  shouldHandleRichClipboardImport,
} from '../lib/richClipboardMarkdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (md: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  fillHeight?: boolean;
  disabled?: boolean;
  focusNonce?: number;
  refreshNonce?: number;
  onImageUpload?: (file: File) => Promise<string>;
  onImageUrlImport?: (sourceUrl: string) => Promise<string>;
}

const EMOJI_OPTIONS = [
  { value: '🙂', label: 'Smile' },
  { value: '😀', label: 'Grin' },
  { value: '😂', label: 'Laugh' },
  { value: '😍', label: 'Love' },
  { value: '🤔', label: 'Think' },
  { value: '👍', label: 'Thumbs up' },
  { value: '🎉', label: 'Celebrate' },
  { value: '🔥', label: 'Fire' },
  { value: '✅', label: 'Done' },
  { value: '🚀', label: 'Launch' },
] as const;

function EmojiPickerButton() {
  const insertMarkdown = usePublisher(insertMarkdown$);
  const items = React.useMemo(
    () => EMOJI_OPTIONS.map(({ value, label }) => ({
      value,
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <span aria-hidden="true">{value}</span>
          <span>{label}</span>
        </span>
      ),
    })),
    [],
  );

  return (
    <ButtonOrDropdownButton
      title="Insert emoji"
      items={items}
      onChoose={(value) => {
        insertMarkdown(value);
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>
        🙂
      </span>
    </ButtonOrDropdownButton>
  );
}

function getPasteTargetElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  if (target instanceof Text) return target.parentElement;
  return null;
}

const MarkdownEditor = React.memo(function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minRows = 10,
  maxRows = 18,
  fillHeight = false,
  disabled = false,
  focusNonce,
  refreshNonce,
  onImageUpload,
  onImageUrlImport,
}: MarkdownEditorProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const minHeight = minRows * 24;
  const maxHeight = maxRows * 24;
  const contentHeightOffset = disabled ? 0 : 24;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mdxRef = React.useRef<MDXEditorMethods>(null);
  const internalChangeRef = React.useRef(false);
  const currentMarkdownRef = React.useRef(value || '');
  const imageUploadHandlerRef = React.useRef<MarkdownEditorProps['onImageUpload']>(onImageUpload);
  const imageUrlImportHandlerRef = React.useRef<MarkdownEditorProps['onImageUrlImport']>(onImageUrlImport);
  imageUploadHandlerRef.current = onImageUpload;
  imageUrlImportHandlerRef.current = onImageUrlImport;
  const [editorInstanceKey, setEditorInstanceKey] = React.useState(0);
  const mdxRootClassName = React.useMemo(
    () => `kanap-mdx-root ${isDarkMode ? 'dark-theme' : 'light-theme'}`,
    [isDarkMode],
  );
  const mdxEditorKey = React.useMemo(
    () => `${editorInstanceKey}:${disabled ? 'readonly' : 'editable'}:${onImageUpload ? 'image' : 'no-image'}`,
    [disabled, editorInstanceKey, onImageUpload],
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

  const codeBlockLanguages = React.useMemo<Record<string, string>>(
    () =>
      // Proxy lets Object.hasOwn() return true for ANY language (so MDXEditor's
      // codeMirrorPlugin descriptor matches unknown languages like "ini" instead
      // of crashing), while Object.entries() still returns only the curated set
      // shown in the toolbar dropdown.
      new Proxy(
        {
          '': 'Plain text',
          txt: 'Plain text',
          md: 'Markdown',
          abap: 'ABAP (plain)',
          powershell: 'PowerShell',
          bash: 'Bash / Shell',
          yml: 'YAML',
          yaml: 'YAML',
          json: 'JSON',
          sql: 'SQL',
          html: 'HTML',
          css: 'CSS',
          js: 'JavaScript',
          jsx: 'JavaScript (React)',
          ts: 'TypeScript',
          tsx: 'TypeScript (React)',
          py: 'Python',
          java: 'Java',
          go: 'Go',
          rust: 'Rust',
          xml: 'XML',
          dockerfile: 'Dockerfile',
        } as Record<string, string>,
        {
          getOwnPropertyDescriptor(target, prop) {
            const real = Object.getOwnPropertyDescriptor(target, prop);
            if (real) return real;
            // Unknown language: non-enumerable so it won't appear in the dropdown
            return { configurable: true, enumerable: false, value: String(prop) };
          },
          get(target, prop) {
            if (prop in target) return target[prop as string];
            if (typeof prop === 'string') return prop;
            return undefined;
          },
        },
      ),
    [],
  );

  const handleChange = React.useCallback(
    (markdown: string, initialMarkdownNormalize: boolean) => {
      if (initialMarkdownNormalize) return;
      currentMarkdownRef.current = markdown;
      internalChangeRef.current = true;
      onChange(markdown);
    },
    [onChange],
  );

  React.useEffect(() => {
    const incoming = value || '';
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      currentMarkdownRef.current = incoming;
      return;
    }
    if (incoming === currentMarkdownRef.current) return;
    currentMarkdownRef.current = incoming;
    // Remount on true external resets so rich image nodes render immediately.
    setEditorInstanceKey((prev) => prev + 1);
  }, [value]);

  React.useEffect(() => {
    if (refreshNonce === undefined || refreshNonce < 1) return;
    const incoming = value || '';
    currentMarkdownRef.current = incoming;
    mdxRef.current?.setMarkdown(incoming);
  }, [refreshNonce, value]);

  React.useEffect(() => {
    if (!mdxRef.current || disabled || focusNonce === undefined || focusNonce < 1) return;
    mdxRef.current.focus();
  }, [focusNonce, disabled]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;
      if (clipboardData.getData('application/x-lexical-editor')) return;

      const target = getPasteTargetElement(event.target);
      if (!target || !container.contains(target)) return;
      if (!target.closest('.kanap-mdx-content')) return;
      if (target.closest('.cm-editor, input, textarea, [data-editor-dialog], [role="dialog"], [contenteditable="false"]')) {
        return;
      }

      const html = clipboardData.getData('text/html');
      const plainText = clipboardData.getData('text/plain');
      const imageFiles = extractClipboardImageFiles(clipboardData);

      if (!shouldHandleRichClipboardImport({ html, plainText, imageFiles })) {
        if (plainText && looksLikeMarkdown(plainText)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          const content = plainText.trim();
          if (content) {
            mdxRef.current?.insertMarkdown(content);
          }
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      void convertRichClipboardToMarkdown({
        html,
        plainText,
        imageFiles,
        uploadImage: imageUploadHandlerRef.current || undefined,
        importRemoteImage: imageUrlImportHandlerRef.current || undefined,
      })
        .then((markdown) => {
          const content = String(markdown || '').trim();
          if (!content) return;
          mdxRef.current?.insertMarkdown(content);
        })
        .catch((error) => {
          console.error('Failed to import rich clipboard content', error);
          const fallback = plainText.trim();
          if (fallback) {
            mdxRef.current?.insertMarkdown(fallback);
          }
        });
    };

    container.addEventListener('paste', handlePaste, true);
    return () => {
      container.removeEventListener('paste', handlePaste, true);
    };
  }, [disabled]);

  const plugins = React.useMemo(() => {
    const basePlugins = [
      headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin({
        imageUploadHandler: async (file: File) => {
          const handler = imageUploadHandlerRef.current;
          if (!handler) {
            throw new Error('Image upload is unavailable in this editor state');
          }
          return handler(file);
        },
      }),
      thematicBreakPlugin(),
      tablePlugin(),
      frontmatterPlugin(),
      directivesPlugin({
        directiveDescriptors: [AdmonitionDirectiveDescriptor],
        escapeUnknownTextDirectives: true,
      }),
      codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
      codeMirrorPlugin({ codeBlockLanguages }),
      diffSourcePlugin({ viewMode: 'rich-text' }),
      markdownShortcutPlugin(),
    ];

    if (!disabled) {
      basePlugins.push(
        toolbarPlugin({
          toolbarClassName: 'kanap-mdx-toolbar',
          toolbarContents: () => (
            <DiffSourceToggleWrapper options={['rich-text', 'source']}>
              <ConditionalContents
                options={[
                  {
                    when: (editor) => editor?.editorType === 'codeblock',
                    contents: () => (
                      <>
                        <ChangeCodeMirrorLanguage />
                      </>
                    ),
                  },
                  {
                    fallback: () => (
                      <>
                        <UndoRedo />
                        <Separator />
                        <BlockTypeSelect />
                        <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
                        <StrikeThroughSupSubToggles options={['Strikethrough', 'Sub', 'Sup']} />
                        <HighlightToggle />
                        <CodeToggle />
                        <Separator />
                        <ListsToggle options={['bullet', 'number', 'check']} />
                        <Separator />
                        <CreateLink />
                        <EmojiPickerButton />
                        {onImageUpload ? <InsertImage /> : null}
                        <InsertTable />
                        <InsertCodeBlock />
                        <InsertAdmonition />
                        <InsertThematicBreak />
                      </>
                    ),
                  },
                ]}
              />
            </DiffSourceToggleWrapper>
          ),
        }),
      );
    }

    return basePlugins;
  }, [codeBlockLanguages, disabled, onImageUpload]);

  return (
    <>
      <GlobalStyles
        styles={{
          '.kanap-mdx-root.kanap-mdx-root': mdxThemeVariables,
          '.kanap-mdx-root.kanap-mdx-root *': mdxThemeVariablesImportant,
          '.mdxeditor-select-content, .kanap-mdx-root .mdxeditor-select-content': {
            backgroundColor: `${theme.palette.background.paper} !important`,
            color: `${theme.palette.text.primary} !important`,
            borderColor: `${theme.palette.divider} !important`,
            width: 'min(92vw, 22rem) !important',
            maxWidth: 'min(92vw, 22rem) !important',
          },
          '.mdxeditor-select-content [data-editor-dropdown], .kanap-mdx-root [data-editor-dropdown]': {
            backgroundColor: `${theme.palette.background.paper} !important`,
            color: `${theme.palette.text.primary} !important`,
            maxHeight: 'min(55vh, 20rem)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          },
          '.mdxeditor-select-content [data-highlighted], .kanap-mdx-root .mdxeditor-select-content [data-highlighted]': {
            backgroundColor: `${alpha(theme.palette.action.selected, isDarkMode ? 0.32 : 0.22)} !important`,
            color: `${theme.palette.text.primary} !important`,
          },
          '.kanap-mdx-root [role="dialog"]': {
            backgroundColor: `${theme.palette.background.paper} !important`,
            color: `${theme.palette.text.primary} !important`,
            borderColor: `${theme.palette.divider} !important`,
          },
          '.kanap-mdx-root [data-editor-dialog]': {
            color: `${theme.palette.text.primary} !important`,
          },
          '.kanap-mdx-root [data-editor-dialog]::placeholder': {
            color: `${theme.palette.text.secondary} !important`,
          },
          '.kanap-mdx-root .cm-cursor, .kanap-mdx-root .cm-cursor-primary': {
            borderLeftColor: `${theme.palette.text.primary} !important`,
          },
          '.kanap-mdx-root.dark-theme .cm-editor': {
            backgroundColor: `${alpha(theme.palette.background.default, 0.66)} !important`,
            color: `${theme.palette.text.primary} !important`,
          },
          '.kanap-mdx-root.dark-theme .cm-gutters': {
            backgroundColor: `${alpha(theme.palette.background.default, 0.52)} !important`,
            color: `${theme.palette.text.secondary} !important`,
            borderColor: `${theme.palette.divider} !important`,
          },
          '.kanap-mdx-root.dark-theme .cm-activeLine, .kanap-mdx-root.dark-theme .cm-activeLineGutter': {
            backgroundColor: `${alpha(theme.palette.primary.main, 0.12)} !important`,
          },
          '.kanap-mdx-root.dark-theme .cm-tooltip, .kanap-mdx-root.dark-theme .cm-tooltip.cm-tooltip-autocomplete': {
            backgroundColor: `${theme.palette.background.paper} !important`,
            color: `${theme.palette.text.primary} !important`,
            borderColor: `${theme.palette.divider} !important`,
          },
          '.kanap-mdx-root.dark-theme .cm-tooltip .cm-completionLabel, .kanap-mdx-root.dark-theme .cm-tooltip .cm-completionDetail': {
            color: `${theme.palette.text.primary} !important`,
          },
        }}
      />
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: fillHeight ? '100%' : 'auto',
          minHeight: 0,
          overflow: 'hidden',
          border: 1,
          borderColor: disabled ? 'divider' : 'divider',
          borderRadius: 1,
          bgcolor: disabled && isDarkMode ? 'action.disabledBackground' : 'background.paper',
          ...(disabled && !isDarkMode ? {
            boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.main, 0.06)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.18),
              zIndex: 1,
            },
          } : {}),
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
            flexShrink: 0,
            top: 0,
            zIndex: 1,
            bgcolor: 'background.paper',
          },
          '& .kanap-mdx-root': {
            display: 'flex',
            flexDirection: 'column',
            height: fillHeight ? '100%' : 'auto',
            minHeight: 0,
          },
          '& .kanap-mdx-root .mdxeditor-root-contenteditable': {
            ...(fillHeight ? { display: 'flex', flex: 1, minHeight: 0, height: '100%' } : {}),
          },
          '& .kanap-mdx-root .mdxeditor-root-contenteditable > div': {
            ...(fillHeight
              ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }
              : {}),
          },
          '& .kanap-mdx-content': {
            p: 1.5,
            minHeight: fillHeight ? 0 : (minHeight - contentHeightOffset),
            maxHeight: fillHeight ? '100%' : (maxHeight - contentHeightOffset),
            ...(fillHeight ? { flex: 1, height: '100%' } : {}),
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            outline: 'none',
            '& p': { my: 2 },
            '& hr': { my: 4 },
            '& h1': { fontSize: '1.5rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 1.5, mb: 0.75 },
            '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1, mb: 0.5 },
            '& h4': { fontSize: '1rem', fontWeight: 600, mt: 1, mb: 0.5 },
            '& h5': { fontSize: '0.95rem', fontWeight: 600, mt: 0.75, mb: 0.4 },
            '& h6': { fontSize: '0.9rem', fontWeight: 600, mt: 0.75, mb: 0.4 },
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
              borderRadius: 1,
              my: 1,
            },
          },
        }}
      >
        <MDXEditor
          key={mdxEditorKey}
          ref={mdxRef}
          markdown={currentMarkdownRef.current}
          readOnly={disabled}
          placeholder={placeholder}
          className={mdxRootClassName}
          contentEditableClassName="kanap-mdx-content"
          onChange={handleChange}
          plugins={plugins}
        />
      </Box>
    </>
  );
});

export default MarkdownEditor;
