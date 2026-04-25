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
