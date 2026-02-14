import React from 'react';
import { Box, Divider, IconButton, Stack, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Tooltip } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import ContactSelect from '../../../components/fields/ContactSelect';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNavigate } from 'react-router-dom';

type Link = {
  id: string;
  supplier_id: string;
  contact_id: string;
  role: 'commercial'|'technical'|'support'|'other';
  is_primary: boolean;
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    job_title: string | null;
    email: string;
    mobile: string | null;
  };
};

export default function SupplierContactsPanel({ supplierId, canManage }: { supplierId: string; canManage: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: links } = useQuery({
    queryKey: ['supplier-contacts', supplierId],
    queryFn: async () => (await api.get<Link[]>(`/suppliers/${supplierId}/contacts`)).data,
    // Always refetch on mount/focus to avoid stale contact details after edits
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const grouped: Record<string, Link[]> = React.useMemo(() => {
    const out: Record<string, Link[]> = { commercial: [], technical: [], support: [], other: [] } as any;
    (links || []).forEach((l) => { (out[l.role] ||= []).push(l); });
    return out;
  }, [links]);

  const [addingRole, setAddingRole] = React.useState<'commercial'|'technical'|'support'|'other' | null>(null);
  const [selectedContact, setSelectedContact] = React.useState<string | null>(null);

  const { mutateAsync: attach, isPending: attaching } = useMutation({
    mutationFn: async () => {
      if (!addingRole || !selectedContact) return;
      await api.post(`/suppliers/${supplierId}/contacts`, { contactId: selectedContact, role: addingRole });
    },
    onSuccess: async () => { setSelectedContact(null); setAddingRole(null); await qc.invalidateQueries({ queryKey: ['supplier-contacts', supplierId] }); },
  });
  const { mutateAsync: detach } = useMutation({
    mutationFn: async (linkId: string) => { await api.delete(`/suppliers/${supplierId}/contacts/${linkId}`); },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['supplier-contacts', supplierId] }); },
  });

  const roles: Array<{ key: 'commercial'|'technical'|'support'|'other'; label: string }> = [
    { key: 'commercial', label: 'Commercial' },
    { key: 'technical', label: 'Technical' },
    { key: 'support', label: 'Support' },
    { key: 'other', label: 'Other' },
  ];

  return (
    <Stack spacing={2}>
      {roles.map((r, idx) => {
        const items = grouped[r.key] || [];
        return (
          <Box key={r.key}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ minWidth: 120 }}>{r.label}</Typography>
              {canManage && addingRole !== r.key && (
                <>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddingRole(r.key)}>Add</Button>
                  <Button size="small" variant="outlined" startIcon={<PersonAddIcon />} onClick={() => navigate(`/master-data/contacts/new/overview?supplier_id=${supplierId}&supplier_role=${r.key}&returnTo=/master-data/suppliers/${supplierId}/contacts`)}>Create</Button>
                </>
              )}
            </Stack>

            {addingRole === r.key && (
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <ContactSelect label={`Select ${r.label} Contact`} value={selectedContact} onChange={setSelectedContact} />
                </Box>
                <Button size="small" variant="contained" disabled={!selectedContact || attaching} onClick={() => attach()}>Attach</Button>
                <Button size="small" onClick={() => { setAddingRole(null); setSelectedContact(null); }}>Cancel</Button>
              </Stack>
            )}

            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, mb: 1 }}>No contacts</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small" sx={{ '& tbody tr': { cursor: 'pointer' }, '& tbody tr:hover': { backgroundColor: 'action.hover' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>First name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Last name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Job title</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, width: 80 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((l) => (
                      <TableRow key={l.id} hover onClick={() => navigate(`/master-data/contacts/${l.contact.id}/overview`)}>
                        <TableCell>{l.contact.first_name || ''}</TableCell>
                        <TableCell>{l.contact.last_name || ''}</TableCell>
                        <TableCell>{l.contact.job_title || ''}</TableCell>
                        <TableCell>{l.contact.email}</TableCell>
                        <TableCell>{l.contact.mobile || ''}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title={canManage ? 'Remove link' : 'Insufficient permission'}>
                            <span>
                              <IconButton size="small" color="error" aria-label="Delete" disabled={!canManage} onClick={() => detach(l.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {idx < roles.length - 1 && <Divider sx={{ mt: 1 }} />}
          </Box>
        );
      })}
    </Stack>
  );
}
