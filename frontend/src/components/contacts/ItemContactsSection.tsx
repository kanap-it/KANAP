import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Chip,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import ContactSelect from '../fields/ContactSelect';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

type SupplierContactRole = 'commercial' | 'technical' | 'support' | 'other';
type ContactOrigin = 'supplier' | 'manual';

type ItemContactLink = {
  id: string;
  contact_id: string;
  role: SupplierContactRole;
  origin: ContactOrigin;
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    job_title: string | null;
    email: string;
    mobile: string | null;
  };
};

type Props = {
  itemType: 'spend-items' | 'capex-items' | 'contracts';
  itemId: string;
  canManage: boolean;
};



export default function ItemContactsSection({ itemType, itemId, canManage }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['item-contacts', itemType, itemId],
    queryFn: async () => (await api.get<ItemContactLink[]>(`/${itemType}/${itemId}/contacts`)).data,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<SupplierContactRole>('commercial');

  const { mutateAsync: attach, isPending: attaching } = useMutation({
    mutationFn: async () => {
      if (!selectedContact) return;
      await api.post(`/${itemType}/${itemId}/contacts`, { contactId: selectedContact, role: selectedRole });
    },
    onSuccess: async () => {
      setSelectedContact(null);
      setSelectedRole('commercial');
      setIsAdding(false);
      await qc.invalidateQueries({ queryKey: ['item-contacts', itemType, itemId] });
    },
  });

  const { mutateAsync: detach } = useMutation({
    mutationFn: async (linkId: string) => {
      await api.delete(`/${itemType}/${itemId}/contacts/${linkId}`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['item-contacts', itemType, itemId] });
    },
  });

  const handleRoleChange = (e: SelectChangeEvent<string>) => {
    setSelectedRole(e.target.value as SupplierContactRole);
  };

  if (isLoading) {
    return <Typography variant="body2" color="text.secondary">{t('contacts.loadingContacts')}</Typography>;
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2">{t('contacts.title')}</Typography>
        {canManage && !isAdding && (
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setIsAdding(true)}>
            {t('buttons.add')}
          </Button>
        )}
      </Stack>

      {isAdding && (
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <ContactSelect label={t('contacts.selectContact')} value={selectedContact} onChange={setSelectedContact} />
          </Box>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="role-select-label">{t('labels.role')}</InputLabel>
            <Select
              labelId="role-select-label"
              value={selectedRole}
              label={t('labels.role')}
              onChange={handleRoleChange}
            >
              {(['commercial', 'technical', 'support', 'other'] as const).map((value) => (
                <MenuItem key={value} value={value}>{t(`contacts.role${value.charAt(0).toUpperCase() + value.slice(1)}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            disabled={!selectedContact || attaching}
            onClick={() => attach()}
          >
            Add
          </Button>
          <Button size="small" onClick={() => { setIsAdding(false); setSelectedContact(null); }}>
            {t('buttons.cancel')}
          </Button>
        </Stack>
      )}

      {contacts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('contacts.noContactsLinked')}</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" sx={{ '& tbody tr': { cursor: 'pointer' }, '& tbody tr:hover': { backgroundColor: 'action.hover' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: 130 }}>{t('labels.role')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('contacts.firstName')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('contacts.lastName')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('contacts.jobTitle')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('labels.email')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('contacts.mobile')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: 80 }}>{t('labels.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((link) => (
                <TableRow key={link.id} hover onClick={() => navigate(`/master-data/contacts/${link.contact.id}/overview`)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Chip
                      label={t(`contacts.role${link.role.charAt(0).toUpperCase() + link.role.slice(1)}`)}
                      size="small"
                      variant={link.origin === 'supplier' ? 'filled' : 'outlined'}
                      color={link.origin === 'supplier' ? 'primary' : 'default'}
                      title={link.origin === 'supplier' ? t('contacts.fromSupplier') : t('contacts.manuallyAdded')}
                    />
                  </TableCell>
                  <TableCell>{link.contact.first_name || ''}</TableCell>
                  <TableCell>{link.contact.last_name || ''}</TableCell>
                  <TableCell>{link.contact.job_title || ''}</TableCell>
                  <TableCell>{link.contact.email}</TableCell>
                  <TableCell>{link.contact.mobile || ''}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={canManage ? t('contacts.removeContact') : t('contacts.insufficientPermission')}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Delete"
                          disabled={!canManage}
                          onClick={() => detach(link.id)}
                        >
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
    </Stack>
  );
}
