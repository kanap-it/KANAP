import type { Theme } from '@mui/material/styles';

export const drawerSelectSx = {
  width: '100%',
  fontSize: 13,
  color: 'kanap.text.primary',
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
  '& .MuiInput-underline:before': { display: 'none !important' },
  '& .MuiInput-underline:after': { display: 'none !important' },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { display: 'none !important' },
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
