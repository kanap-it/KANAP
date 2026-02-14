import React from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../../../api';
import EnumAutocomplete from '../../../../components/fields/EnumAutocomplete';
import UserSelect from '../../../../components/fields/UserSelect';
import CompanySelect from '../../../../components/fields/CompanySelect';
import type { InterfaceDetail, InterfaceOwner, InterfaceCompany, InterfaceTabProps } from './types';

export default function OwnershipTab({ data, update, markDirty }: InterfaceTabProps) {
  const owners = (data?.owners || []) as InterfaceOwner[];
  const companies = (data?.companies || []) as InterfaceCompany[];

  const bizOwners = owners.map((o, i) => ({ ...o, __idx: i })).filter((o) => o.owner_type === 'business');
  const itOwners = owners.map((o, i) => ({ ...o, __idx: i })).filter((o) => o.owner_type === 'it');

  const [userById, setUserById] = React.useState<Record<string, any>>({});
  React.useEffect(() => {
    const ids = Array.from(new Set(owners.map((o) => o.user_id).filter(Boolean)));
    const missing = ids.filter((id) => !userById[id]);
    if (missing.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await api.get(`/users/${id}`);
            return [id, res.data];
          } catch {
            return [id, null];
          }
        }),
      );
      setUserById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [owners, userById]);

  const [companyRows, setCompanyRows] = React.useState<Array<{ __id: string; company_id: string | null }>>([]);
  const rowsEditedRef = React.useRef(false);

  React.useEffect(() => {
    if (rowsEditedRef.current) return;
    const next: Array<{ __id: string; company_id: string | null }> = [];
    for (const c of companies || []) {
      next.push({ __id: `${c.company_id || ''}-${Math.random().toString(36).slice(2)}`, company_id: c.company_id });
    }
    setCompanyRows(next.length > 0 ? next : [{ __id: `row-${Math.random().toString(36).slice(2)}`, company_id: null }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(companies)]);

  const syncCompaniesFromRows = React.useCallback(
    (rows: Array<{ __id: string; company_id: string | null }>) => {
      const seen = new Set<string>();
      const list: InterfaceCompany[] = [];
      for (const r of rows) {
        if (!r.company_id) continue;
        if (seen.has(r.company_id)) continue;
        seen.add(r.company_id);
        list.push({ company_id: r.company_id });
      }
      rowsEditedRef.current = true;
      markDirty();
      update({ companies: list });
    },
    [markDirty, update],
  );

  const addCompanyRow = () => {
    setCompanyRows((prev) => {
      const next = [...prev, { __id: `row-${Math.random().toString(36).slice(2)}`, company_id: null }];
      return next;
    });
  };

  const removeCompanyRow = (idx: number) => {
    setCompanyRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const normalized = next.length > 0 ? next : [{ __id: `row-${Math.random().toString(36).slice(2)}`, company_id: null }];
      syncCompaniesFromRows(normalized);
      return normalized;
    });
  };

  const setRowCompany = (idx: number, companyId: string | null) => {
    setCompanyRows((prev) => {
      const next = prev.map((row, i) => (i === idx ? { ...row, company_id: companyId } : row));
      syncCompaniesFromRows(next);
      return next;
    });
  };

  const upsertOwner = (ownerType: 'business' | 'it', owner: { __idx?: number; user_id: string; __tid?: string }) => {
    const idx = owner.__idx ?? -1;
    const exists = owners.some((o, i) => o.owner_type === ownerType && o.user_id === owner.user_id && i !== idx);
    if (exists) return;
    markDirty();
    if (idx >= 0) {
      const next = owners.map((o, i) => (i === idx ? { ...o, user_id: owner.user_id } : o));
      update({ owners: next });
    } else {
      const next: InterfaceOwner[] = [...owners, { owner_type: ownerType, user_id: owner.user_id, __tid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` }];
      update({ owners: next });
    }
  };

  const removeOwnerAtIndex = (idx: number) => {
    markDirty();
    update({ owners: owners.filter((_, i) => i !== idx) });
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Business Owners</Typography>
        <Stack spacing={1}>
          {(bizOwners.length > 0 ? bizOwners : ([{ user_id: '' as any, owner_type: 'business' as const, __idx: -1 }] as any)).map((o: any, idx: number) => {
            const u = o.user_id ? userById[o.user_id] : null;
            return (
              <Box
                key={`biz-row-${o.id || o.__tid || o.__idx || idx}`}
                sx={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 1.6fr auto', gap: 1, alignItems: 'center' }}
              >
                <UserSelect
                  label="User"
                  value={o.user_id || null}
                  onChange={(v) => {
                    if (!v) return;
                    upsertOwner('business', { ...o, user_id: v });
                  }}
                />
                <TextField label="Last Name" value={u?.last_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="First Name" value={u?.first_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="Job Title" value={u?.job_title || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                {(o.__idx ?? -1) >= 0 ? (
                  <IconButton aria-label="Remove" onClick={() => removeOwnerAtIndex(o.__idx)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <span />
                )}
              </Box>
            );
          })}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                update({
                  owners: [
                    ...owners,
                    { user_id: '' as any, owner_type: 'business', __tid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
                  ],
                })
              }
              size="small"
            >
              Add row
            </Button>
          </Box>
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">IT Owners</Typography>
        <Stack spacing={1}>
          {(itOwners.length > 0 ? itOwners : ([{ user_id: '' as any, owner_type: 'it' as const, __idx: -1 }] as any)).map((o: any, idx: number) => {
            const u = o.user_id ? userById[o.user_id] : null;
            return (
              <Box
                key={`it-row-${o.id || o.__tid || o.__idx || idx}`}
                sx={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 1.6fr auto', gap: 1, alignItems: 'center' }}
              >
                <UserSelect
                  label="User"
                  value={o.user_id || null}
                  onChange={(v) => {
                    if (!v) return;
                    upsertOwner('it', { ...o, user_id: v });
                  }}
                />
                <TextField label="Last Name" value={u?.last_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="First Name" value={u?.first_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="Job Title" value={u?.job_title || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                {(o.__idx ?? -1) >= 0 ? (
                  <IconButton aria-label="Remove" onClick={() => removeOwnerAtIndex(o.__idx)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <span />
                )}
              </Box>
            );
          })}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                update({
                  owners: [
                    ...owners,
                    { user_id: '' as any, owner_type: 'it', __tid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
                  ],
                })
              }
              size="small"
            >
              Add row
            </Button>
          </Box>
      </Stack>
      </Stack>

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Criticality & impact</Typography>
        <EnumAutocomplete
          label="Criticality"
          value={data?.criticality || 'medium'}
          onChange={(v) => {
            markDirty();
            update({ criticality: v as any });
          }}
          options={[
            { label: 'Business critical', value: 'business_critical' },
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
          ]}
        />
        <TextField
          label="Impact of failure"
          value={data?.impact_of_failure || ''}
          onChange={(e) => {
            markDirty();
            update({ impact_of_failure: e.target.value });
          }}
          multiline
          minRows={3}
        />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Impacted companies</Typography>
        <Stack spacing={1}>
          {companyRows.map((row, idx) => (
            <Box
              key={row.__id}
              sx={{ display: 'grid', gridTemplateColumns: '3fr auto', gap: 1, alignItems: 'center' }}
            >
              <CompanySelect value={row.company_id} onChange={(v) => setRowCompany(idx, v)} size="small" />
              <IconButton aria-label="Remove" onClick={() => removeCompanyRow(idx)} size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button startIcon={<AddIcon />} onClick={addCompanyRow} size="small">
              Add company
            </Button>
          </Box>
        </Stack>
      </Stack>
    </Stack>
  );
}
