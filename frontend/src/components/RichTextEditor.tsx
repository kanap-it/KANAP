import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import OfficePaste from '@intevation/tiptap-extension-office-paste';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  CheckBox,
  Link as LinkIcon,
  Code,
  FormatQuote,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Highlight as HighlightIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useEffect, useState, useRef, MouseEvent } from 'react';

// Styled button for heading selectors
const HeadingButton = styled(IconButton)(({ theme }) => ({
  minWidth: 28,
  fontSize: '0.75rem',
  fontWeight: 600,
  fontFamily: 'inherit',
}));

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  /** Increment to request focusing the editor content area. */
  focusNonce?: number;
  /** Optional callback to upload pasted images. Returns the URL to use. If not provided, images are stored as base64. */
  onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minRows = 8,
  maxRows = 16,
  disabled = false,
  focusNonce,
  onImageUpload,
}: RichTextEditorProps) {
  const minHeight = minRows * 24;
  const maxHeight = maxRows * 24;

  const [alignAnchor, setAlignAnchor] = useState<null | HTMLElement>(null);

  // Use ref to access latest onImageUpload in paste handler (editor is created once)
  const onImageUploadRef = useRef(onImageUpload);
  useEffect(() => {
    onImageUploadRef.current = onImageUpload;
  }, [onImageUpload]);

  // Track initialization to avoid triggering onChange during initial content normalization
  const isInitializedRef = useRef(false);
  const initialValueRef = useRef(value);

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable built-in extensions we configure separately
        link: false,
        underline: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      OfficePaste,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Skip onChange during initial content normalization to avoid false dirty state
      if (!isInitializedRef.current) {
        return;
      }
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;

            const insertImage = (src: string) => {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src })
                )
              );
            };

            // If upload callback provided, upload to S3; otherwise use base64
            if (onImageUploadRef.current) {
              onImageUploadRef.current(file)
                .then(insertImage)
                .catch((err) => {
                  console.error('Image upload failed, falling back to base64:', err);
                  // Fallback to base64 on error
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    if (base64) insertImage(base64);
                  };
                  reader.readAsDataURL(file);
                });
            } else {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                if (base64) insertImage(base64);
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync external value changes (deferred to ensure editor is ready)
  useEffect(() => {
    if (!editor) return;

    // Defer to next tick to handle race conditions with editor initialization
    const timer = setTimeout(() => {
      if (value !== editor.getHTML()) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [value, editor]);

  // Mark as initialized after the editor is ready and initial normalization is complete
  useEffect(() => {
    if (editor) {
      // Use a microtask to ensure this runs after Tiptap's initial content processing
      const timer = setTimeout(() => {
        isInitializedRef.current = true;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  // Focus editor when parent requests it.
  useEffect(() => {
    if (!editor || disabled || focusNonce === undefined || focusNonce < 1) return;
    editor.chain().focus('end').run();
  }, [focusNonce, editor, disabled]);

  if (!editor) return null;

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleAlignClick = (event: MouseEvent<HTMLElement>) => {
    setAlignAnchor(event.currentTarget);
  };

  const handleAlignClose = () => {
    setAlignAnchor(null);
  };

  const setAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    editor.chain().focus().setTextAlign(align).run();
    handleAlignClose();
  };

  const getCurrentAlignIcon = () => {
    if (editor.isActive({ textAlign: 'center' })) return <FormatAlignCenter fontSize="small" />;
    if (editor.isActive({ textAlign: 'right' })) return <FormatAlignRight fontSize="small" />;
    if (editor.isActive({ textAlign: 'justify' })) return <FormatAlignJustify fontSize="small" />;
    return <FormatAlignLeft fontSize="small" />;
  };

  return (
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
      }}
    >
      {/* Toolbar */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          p: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Text style buttons */}
        <Tooltip title="Paragraph">
          <HeadingButton
            size="small"
            onClick={() => editor.chain().focus().setParagraph().run()}
            color={!editor.isActive('heading') ? 'primary' : 'default'}
            disabled={disabled}
          >
            P
          </HeadingButton>
        </Tooltip>
        <Tooltip title="Heading 1">
          <HeadingButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            color={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
            disabled={disabled}
          >
            H1
          </HeadingButton>
        </Tooltip>
        <Tooltip title="Heading 2">
          <HeadingButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            color={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
            disabled={disabled}
          >
            H2
          </HeadingButton>
        </Tooltip>
        <Tooltip title="Heading 3">
          <HeadingButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            color={editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'}
            disabled={disabled}
          >
            H3
          </HeadingButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Bold">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive('bold') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Italic">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive('italic') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Underline">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            color={editor.isActive('underline') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <FormatUnderlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Strikethrough">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            color={editor.isActive('strike') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <StrikethroughS fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Highlight">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            color={editor.isActive('highlight') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <HighlightIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Alignment dropdown */}
        <Tooltip title="Alignment">
          <IconButton
            size="small"
            onClick={handleAlignClick}
            disabled={disabled}
          >
            {getCurrentAlignIcon()}
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={alignAnchor}
          open={Boolean(alignAnchor)}
          onClose={handleAlignClose}
        >
          <MenuItem onClick={() => setAlignment('left')} selected={editor.isActive({ textAlign: 'left' })}>
            <ListItemIcon><FormatAlignLeft fontSize="small" /></ListItemIcon>
            <ListItemText>Left</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAlignment('center')} selected={editor.isActive({ textAlign: 'center' })}>
            <ListItemIcon><FormatAlignCenter fontSize="small" /></ListItemIcon>
            <ListItemText>Center</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAlignment('right')} selected={editor.isActive({ textAlign: 'right' })}>
            <ListItemIcon><FormatAlignRight fontSize="small" /></ListItemIcon>
            <ListItemText>Right</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAlignment('justify')} selected={editor.isActive({ textAlign: 'justify' })}>
            <ListItemIcon><FormatAlignJustify fontSize="small" /></ListItemIcon>
            <ListItemText>Justify</ListItemText>
          </MenuItem>
        </Menu>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Bullet list">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={editor.isActive('bulletList') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <FormatListBulleted fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Numbered list">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={editor.isActive('orderedList') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <FormatListNumbered fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Task list">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            color={editor.isActive('taskList') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <CheckBox fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Link">
          <IconButton
            size="small"
            onClick={addLink}
            color={editor.isActive('link') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Image">
          <IconButton
            size="small"
            onClick={addImage}
            disabled={disabled}
          >
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Code">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleCode().run()}
            color={editor.isActive('code') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <Code fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Quote">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            color={editor.isActive('blockquote') ? 'primary' : 'default'}
            disabled={disabled}
          >
            <FormatQuote fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Editor Content */}
      <Box
        sx={{
          p: 1.5,
          minHeight,
          maxHeight,
          overflow: 'auto',
          '& .ProseMirror': {
            outline: 'none',
            minHeight: minHeight - 24,
            '& p': { my: 0.5 },
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
                '& > label': { mr: 1, mt: 0.25 },
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
            '& a': { color: 'primary.main', textDecoration: 'underline' },
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
            '& p.is-editor-empty:first-of-type::before': {
              content: 'attr(data-placeholder)',
              color: 'text.disabled',
              pointerEvents: 'none',
              float: 'left',
              height: 0,
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
