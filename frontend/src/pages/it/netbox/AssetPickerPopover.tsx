import React from 'react';
import { Autocomplete, Box, CircularProgress, Popover, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { assetsApi } from '../../../api/endpoints/assets';
import { drawerAutocompleteListboxSx } from '../../../theme/formSx';
import type { NetboxAssetRef } from '../../../api/endpoints/netbox';

const MONO_FONT = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";

/**
 * One shared asset picker for the whole Netbox preview. The preview can list
 * hundreds of objects, so a single popover is anchored to the row being settled
 * instead of one search field per row.
 */
export default function AssetPickerPopover({ anchorEl, onClose, onPick }: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onPick: (asset: NetboxAssetRef) => void;
}) {
  const { t } = useTranslation('it');
  const open = !!anchorEl;
  const [search, setSearch] = React.useState('');
  const [options, setOptions] = React.useState<NetboxAssetRef[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSearch('');
      return undefined;
    }
    let alive = true;
    setLoading(true);
    // Server-side search: the asset catalogue is far too large to filter locally.
    const handle = window.setTimeout(() => {
      assetsApi
        .list({ q: search || undefined, limit: 50, sort: 'name:ASC' })
        .then((result) => {
          if (!alive) return;
          setOptions((result.items || []).map((item) => ({
            id: item.id,
            name: item.name,
            asset_reference: item.asset_reference ?? null,
          })));
        })
        .catch(() => { if (alive) setOptions([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 200);
    return () => { alive = false; window.clearTimeout(handle); };
  }, [open, search]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ p: 1.5, width: 320 }}>
        <Autocomplete
          openOnFocus
          autoHighlight
          options={options}
          filterOptions={(items) => items}
          value={null}
          inputValue={search}
          onInputChange={(_event, value) => setSearch(value)}
          onChange={(_event, value) => { if (value) onPick(value); }}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          ListboxProps={{ sx: drawerAutocompleteListboxSx }}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box
                component="span"
                sx={(theme) => ({
                  mr: 0.75,
                  fontFamily: MONO_FONT,
                  fontSize: 11,
                  color: theme.palette.kanap.text.tertiary,
                })}
              >
                {option.asset_reference || ''}
              </Box>
              {option.name}
            </li>
          )}
          loading={loading}
          noOptionsText={loading ? t('pages.netbox.preview.picker.searching') : t('pages.netbox.preview.picker.noResults')}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              variant="standard"
              placeholder={t('pages.netbox.preview.picker.placeholder')}
              inputProps={{ ...params.inputProps, 'aria-label': t('pages.netbox.preview.picker.label') }}
              InputProps={{
                ...params.InputProps,
                endAdornment: loading ? <CircularProgress color="inherit" size={14} /> : params.InputProps.endAdornment,
              }}
            />
          )}
        />
      </Box>
    </Popover>
  );
}
