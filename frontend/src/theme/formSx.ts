import type { Theme } from '@mui/material/styles';

export const nakedEditableHoverSx = {
  borderRadius: '4px',
  px: '6px',
  py: '3px',
  mx: '-6px',
  my: '-3px',
  transition: 'background-color 120ms ease',
  '&:hover:not(.Mui-disabled):not(.Mui-readOnly)': {
    backgroundColor: (theme: Theme) => theme.palette.kanap.bg.composer,
  },
  '&:focus-within': {
    backgroundColor: 'transparent',
  },
} as const;

export const nakedInputHoverSx = {
  ...nakedEditableHoverSx,
  cursor: 'text',
} as const;

export const nakedControlHoverSx = {
  ...nakedEditableHoverSx,
  cursor: 'pointer',
} as const;

export const nakedFieldPlaceholderSx = {
  '& input::placeholder': {
    color: 'kanap.text.tertiary',
    opacity: 1,
  },
} as const;

export const selectPlaceholderSx = {
  color: 'kanap.text.tertiary',
} as const;

/** Teal action link rendered as an unstyled button (e.g. "+ Link existing", "+ Log time"). */
export const tealLinkSx = {
  color: 'kanap.teal',
  fontSize: 12,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  p: 0,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  '&:hover': {
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
} as const;

/** Charter text tabs: no indicator, active = primary/500, inactive = tertiary/400. */
export const textTabsSx = {
  minHeight: 'auto',
  '& .MuiTabs-indicator': { display: 'none' },
} as const;

export const textTabSx = (active: boolean) => ({
  minHeight: 'auto',
  p: 0,
  mr: 2,
  textTransform: 'none' as const,
  minWidth: 'auto',
  fontSize: 13,
  fontWeight: active ? 500 : 400,
  color: active ? 'kanap.text.primary' : 'kanap.text.tertiary',
});

export const drawerSelectSx = {
  width: '100%',
  fontSize: 13,
  color: 'kanap.text.primary',
  ...nakedControlHoverSx,
  '& .MuiSelect-select': {
    padding: '4px 24px 4px 0', // right: room for the dropdown arrow
    fontSize: 13,
    lineHeight: 1.4,
  },
  '& .MuiSelect-icon': {
    color: 'kanap.text.secondary',
    fontSize: 18,
    right: 0,
  },
  '&:before': { display: 'none' },
  '&:after': { display: 'none' },
  '&:hover:not(.Mui-disabled):before': { display: 'none' },
} as const;

export const drawerMenuItemSx = {
  fontSize: 13,
  paddingTop: '6px',
  paddingBottom: '6px',
  minHeight: 'auto',
} as const;

/** Shared width bounds for page-level dropdowns: the control and its menu match. */
export const COMPACT_SELECT_MIN_WIDTH = 240;
export const COMPACT_SELECT_MAX_WIDTH = 420;

/**
 * Menu sizing for page-level `<Select>`s.
 *
 * MUI pins a Select's menu to the width of its anchor, so a naked select that
 * fills a wide grid cell opens a menu across half the screen. These props size
 * the menu to its content between sane bounds instead.
 *
 * `style` and not `sx` on purpose: MUI writes the anchor width as an *inline*
 * style on the menu paper, and only another inline style can override it
 * (see @mui/material/Select/SelectInput: `style: { minWidth: menuMinWidth, ...paperProps.style }`).
 */
export const compactSelectMenuProps = {
  slotProps: {
    paper: {
      style: { minWidth: COMPACT_SELECT_MIN_WIDTH, maxWidth: COMPACT_SELECT_MAX_WIDTH },
    },
  },
} as const;

/**
 * Page-level `<Select>` styling — use this instead of `drawerSelectSx` outside
 * the 280px properties drawer.
 *
 * `drawerSelectSx` sets `width: '100%'`, which is right in a narrow drawer and
 * wrong on a page: dropped into a settings grid cell it stretches the *closed*
 * control across most of the viewport (measured: 1276px of a 1600px window in
 * the agent Targeting builder). Bounding the menu alone is not enough — the
 * control is what the user looks at when the menu is shut, which is nearly all
 * the time. This caps it at the same width the menu uses, so the field and its
 * menu read as one object.
 *
 * The charter: "page-level dropdowns and metadata dropdowns should size to
 * content or a modest max width, never stretch across the full page."
 *
 * Pair with `MenuProps={compactSelectMenuProps}`.
 */
export const pageSelectSx = {
  ...drawerSelectSx,
  maxWidth: COMPACT_SELECT_MAX_WIDTH,
} as const;

export const drawerDatePickerSx = {
  '& input': { fontSize: 13, padding: '4px 0' },
  '& .MuiInput-underline:before': { display: 'none' },
  '& .MuiInput-underline:after': { display: 'none' },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { display: 'none' },
} as const;

export const drawerFieldValueSx = {
  fontSize: 13,
  lineHeight: 1.4,
  minHeight: 26,
  '& .MuiInputLabel-root': { display: 'none' },
  '& .MuiFormLabel-root': { display: 'none' },
  '& .kanap-field-label': { display: 'none' },
  '& .MuiInput-root': { mt: '0 !important' },
  '& .MuiInput-input': { py: '3px !important', fontSize: '13px !important' },
  '& .MuiOutlinedInput-root': {
    p: '0 !important',
    minHeight: 26,
    '& fieldset': { display: 'none' },
  },
  '& .MuiOutlinedInput-input': { py: '3px !important', px: '0 !important', fontSize: '13px !important' },
  '& .MuiAutocomplete-input': { py: '3px !important', fontSize: '13px !important' },
  '& .MuiAutocomplete-inputRoot': {
    rowGap: '3px',
  },
  '& .MuiAutocomplete-tag ~ .MuiAutocomplete-input': {
    flexBasis: '100% !important',
    width: '100% !important',
    minWidth: '100% !important',
  },
  '& .MuiInput-underline:before': { display: 'none !important' },
  '& .MuiInput-underline:after': { display: 'none !important' },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { display: 'none !important' },
} as const;

export const editableFieldValueSx = {
  ...drawerFieldValueSx,
  ...nakedInputHoverSx,
} as const;

export const dialogBorderedFieldSx = {
  '& .MuiInputBase-root': {
    border: (theme: Theme) => `1px solid ${theme.palette.kanap.border.default}`,
    borderRadius: '6px',
    px: '8px',
    py: '6px',
    bgcolor: (theme: Theme) => theme.palette.kanap.bg.primary,
  },
  '& .MuiInputBase-root:focus-within': {
    borderColor: (theme: Theme) => theme.palette.kanap.teal,
  },
  '& input': {
    p: '0 !important',
  },
  '& textarea': {
    p: '0 !important',
  },
} as const;

export const longFormSurfaceFieldSx = {
  width: '100%',
  maxWidth: 900,
  '& .MuiInputBase-root': {
    alignItems: 'flex-start',
    minHeight: 154,
    px: '16px',
    py: '14px',
    border: (theme: Theme) => `1px solid ${theme.palette.kanap.border.default}`,
    borderRadius: '8px',
    bgcolor: (theme: Theme) => theme.palette.kanap.bg.composer,
    color: (theme: Theme) => theme.palette.kanap.text.primary,
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    '&.Mui-focused': {
      borderColor: (theme: Theme) => theme.palette.kanap.teal,
    },
    '&.Mui-disabled': {
      bgcolor: (theme: Theme) => theme.palette.kanap.bg.drawer,
      color: (theme: Theme) => theme.palette.kanap.text.secondary,
    },
  },
  '& .MuiInputBase-input': {
    p: '0 !important',
    fontSize: '14px !important',
    lineHeight: '1.6 !important',
    color: 'inherit',
  },
  '& textarea::placeholder': {
    color: 'kanap.text.tertiary',
    opacity: 1,
  },
  '& .MuiInput-underline:before': { display: 'none' },
  '& .MuiInput-underline:after': { display: 'none' },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { display: 'none' },
} as const;

export const drawerAutocompleteListboxSx = {
  py: '4px',
  '& .MuiAutocomplete-option': {
    minHeight: 'auto',
    py: '6px',
    px: '14px',
    fontSize: 13,
    lineHeight: 1.35,
  },
  '& .MuiAutocomplete-groupLabel': {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.5,
    color: 'kanap.text.tertiary',
  },
  '& .kanap-autocomplete-option-primary': {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.35,
  },
  '& .kanap-autocomplete-option-secondary': {
    mt: '2px',
    fontSize: 12,
    lineHeight: 1.3,
    color: 'kanap.text.secondary',
  },
} as const;
