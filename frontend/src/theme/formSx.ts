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

export const drawerSelectSx = {
  width: '100%',
  fontSize: 13,
  color: 'kanap.text.primary',
  ...nakedControlHoverSx,
  '& .MuiSelect-select': {
    padding: '4px 0',
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
