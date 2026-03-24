import React, { useCallback, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../components/ServerDataGrid';
import { ICellRendererParams } from 'ag-grid-community';
import { Button, Stack, Box, Chip } from '@mui/material';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import FormModal from '../components/forms/FormModal';
import UserForm, { UserInput, UserFormValues } from './forms/UserForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import { useLocale } from '../i18n/useLocale';
import { useTranslation } from 'react-i18next';
import ForbiddenPage from './ForbiddenPage';

export default function UsersPage() {
  const { t } = useTranslation(['admin', 'common']);
  const locale = useLocale();
  const { hasLevel, subscription, tenantAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create'|'edit'>('create');
  const [currentId, setCurrentId] = useState<string|number|undefined>();
  const [defaultValues, setDefaultValues] = useState<Partial<UserInput> | Partial<UserFormValues> | undefined>();
  const [serverError, setServerError] = useState<unknown>();
  const [canSave, setCanSave] = useState<{ isDirty: boolean; isValid: boolean; isSubmitting: boolean }>({ isDirty: false, isValid: false, isSubmitting: false });
  const [submitIntent, setSubmitIntent] = useState<'save' | 'save-invite'>('save');
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);

  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const gridApiRef = useRef<any>(null);
  const canManageUsers = hasLevel('users', 'admin');
  const { mutateAsync: createItem, isPending: creating } = useMutation({
    mutationFn: async (payload: UserInput) => {
      const res = await api.post('/users', payload);
      return res.data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setRefreshKey((k)=>k+1); },
  });
  const { mutateAsync: updateItem, isPending: updating } = useMutation({
    mutationFn: async ({ id, payload }: { id: string|number; payload: Partial<UserInput> }) => {
      const res = await api.patch(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: (_d: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', vars.id] });
      setRefreshKey((k)=>k+1);
    },
  });

  // Seat-controlled status actions
  const enableUser = async (id: string) => { await api.post(`/users/${id}/enable`); setRefreshKey((k)=>k+1); };
  const disableUser = async (id: string) => { await api.post(`/users/${id}/disable`); setRefreshKey((k)=>k+1); };
  const inviteUser = async (id: string) => { await api.post(`/users/${id}/invite`); setRefreshKey((k)=>k+1); };

  // Per-user permissions removed: managed by role assignments

  const handleNew = () => {
    setMode('create');
    setDefaultValues({
      email: '',
      first_name: '',
      last_name: '',
      job_title: '',
      business_phone: '',
      mobile_phone: '',
      role_ids: [],
      company_id: null,
      department_id: null,
      status: true,
    });
    setServerError(undefined);
    setSubmitIntent('save');
    setOpen(true);
  };
  const handleEdit = async (row: any) => {
    if (!canManageUsers) return;
    setMode('edit');
    setServerError(undefined);
    setCurrentId(row.id);
    setSubmitIntent('save');
    try {
      const [userRes, rolesRes] = await Promise.all([
        api.get(`/users/${row.id}`),
        api.get(`/users/${row.id}/roles`),
      ]);
      const roles = rolesRes.data?.items ?? [];
      setDefaultValues({
        ...userRes.data,
        roles, // Pass roles array for form to parse
      });
    } catch (e) {
      // Fallback to legacy single role
      setDefaultValues({
        ...row,
        role_ids: row?.role?.id ? [row.role.id] : [],
      });
    }
    setOpen(true);
  };
  const onSubmit = async (values: UserInput) => {
    try {
      setServerError(undefined);
      const { role_ids, ...userPayload } = values;
      if (mode === 'create') {
        // Create user with first role as role_id for backwards compat
        const createPayload = { ...userPayload, role_id: role_ids[0] ?? null };
        const created = await createItem(createPayload as any);
        // Set roles via dedicated endpoint
        if (created?.id && role_ids.length > 0) {
          await api.put(`/users/${created.id}/roles`, { role_ids });
        }
        if (submitIntent === 'save-invite' && created?.id) {
          try {
            await inviteUser(created.id);
          } catch (inviteErr) {
            setServerError(inviteErr);
            return;
          }
        }
      } else if (mode === 'edit' && currentId != null) {
        // Update user basic info
        await updateItem({ id: currentId, payload: userPayload as any });
        // Update roles via dedicated endpoint
        if (role_ids.length > 0) {
          await api.put(`/users/${currentId}/roles`, { role_ids });
        }
      }
      setOpen(false);
      setSubmitIntent('save');
    } catch (e: any) {
      if (e?.response?.status === 409) setServerError(new Error(t('users.messages.emailUnique')));
      else setServerError(e);
    }
  };
  const onClose = useCallback(() => {
    setOpen(false);
    setSubmitIntent('save');
  }, []);

  const ClickableCell: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box
      component="span"
      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
      onClick={() => handleEdit(params.data)}
    >
      {params.value}
    </Box>
  );
  const ClickableCellGeneric: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box
      component="span"
      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
      onClick={() => handleEdit(params.data)}
    >
      {params.valueFormatted ?? params.value}
    </Box>
  );

  const columns: EnhancedColDef<any>[] = useMemo(() => [
    { field: 'last_name', headerName: t('users.columns.lastName'), width: 150, cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'first_name', headerName: t('users.columns.firstName'), width: 150, cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'email', headerName: t('users.columns.email'), flex: 1, minWidth: 220, required: true, cellRenderer: canManageUsers ? ClickableCell : undefined },
    { field: 'job_title', headerName: t('users.columns.jobTitle'), width: 200, cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'role', headerName: t('users.columns.role'), width: 140, valueGetter: (params) => params.data?.role?.role_name || '', cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'company', headerName: t('users.columns.company'), width: 200, valueGetter: (params) => params.data?.company?.name || '', cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'department', headerName: t('users.columns.department'), width: 200, valueGetter: (params) => params.data?.department?.name || '', cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'business_phone', headerName: t('users.columns.businessPhone'), width: 180, defaultHidden: true, cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'mobile_phone', headerName: t('users.columns.mobilePhone'), width: 160, defaultHidden: true, cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'mfa_enabled', headerName: t('users.columns.mfaEnabled'), width: 120, defaultHidden: true, valueGetter: (params) => params.data?.mfa_enabled ? t('users.mfaValues.yes') : t('users.mfaValues.no'), cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
    { field: 'created_at', headerName: t('users.columns.created'), width: 200, valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString(locale) : ''), defaultHidden: true, cellRenderer: canManageUsers ? ClickableCellGeneric : undefined },
  ], [ClickableCell, ClickableCellGeneric, canManageUsers, locale, t]);

  if (!hasLevel('users', 'reader')) {
    return <ForbiddenPage />;
  }

  const handleInviteSelected = async () => {
    if (!selectedRows.length) return;
    setInviting(true);
    try {
      const results = await Promise.allSettled(
        selectedRows.map((row) => api.post(`/users/${row.id}/invite`))
      );
      const success = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - success;
      if (failed === 0) {
        window.alert(t('users.messages.inviteSuccess', { success }));
      } else {
        window.alert(t('users.messages.invitePartialFail', { success, failed }));
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      window.alert(t('users.messages.inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const actions = (
    <Stack direction="row" spacing={1} alignItems="center">
      {canManageUsers && <Button variant="contained" onClick={handleNew}>{t('users.actions.new')}</Button>}
      {canManageUsers && <Button onClick={() => setImportOpen(true)}>{t('users.actions.importCsv')}</Button>}
      {canManageUsers && <Button onClick={() => setExportOpen(true)}>{t('users.actions.exportCsv')}</Button>}
      {canManageUsers && (
        <Button
          variant="outlined"
          onClick={handleInviteSelected}
          disabled={inviting || selectedRows.length === 0}
        >
          {inviting ? t('users.actions.inviting') : t('users.actions.invite', { count: selectedRows.length })}
        </Button>
      )}
      {canManageUsers && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/users/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.email || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'User'}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => setRefreshKey((k) => k + 1)}
          label="Delete"
        />
      )}
      {subscription && (
        <Chip label={subscription.seat_limit != null ? t('users.seats.limited', { used: subscription.seats_used, limit: subscription.seat_limit }) : t('users.seats.unlimited', { used: subscription.seats_used })} size="small" color={subscription.seat_limit != null && subscription.seats_used >= subscription.seat_limit ? 'warning' : 'default'} />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title={t('users.title')} actions={actions} />
      <ServerDataGrid<any>
        columns={columns}
        endpoint="/users"
        queryKey="users"
        getRowId={(r) => r.id}
        enableSearch
        refreshKey={refreshKey}
        columnPreferencesKey="users-v2"
        enableColumnChooser={true}
        requiredColumns={['email']}
        defaultHiddenColumns={['mfa_enabled', 'created_at']}
        defaultSort={{ field: 'last_name', direction: 'ASC' }}
        initialState={{
          sort: {
            sortModel: [{ colId: 'last_name', sort: 'asc' }]
          }
        }}
        enableRowSelection={canManageUsers}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        statusScopeConfig={{ defaultScope: 'enabled' }}
      />
      <FormModal
        title={mode === 'create' ? t('users.dialogs.newUser') : t('users.dialogs.editUser')}
        open={open}
        onClose={onClose}
        formId="user-form"
        actions={(
          <Stack direction="row" spacing={1.5}>
            <Button onClick={onClose} color="inherit">{t('common:buttons.cancel')}</Button>
            {mode === 'create' && (
            <Button
              variant="contained"
              color="secondary"
              disabled={!(canSave.isDirty && canSave.isValid) || canSave.isSubmitting || creating}
              onClick={() => {
                setSubmitIntent('save-invite');
                window.setTimeout(() => {
                  const form = document.getElementById('user-form') as HTMLFormElement | null;
                  form?.requestSubmit();
                  }, 0);
                }}
              >
                {creating && submitIntent === 'save-invite' ? t('users.dialogs.saving') : t('users.dialogs.saveAndInvite')}
              </Button>
            )}
            <Button
              variant="contained"
              color={canSave.isDirty ? 'primary' : 'inherit'}
              disabled={!(canSave.isDirty && canSave.isValid) || canSave.isSubmitting || (mode === 'create' ? creating : updating)}
              onClick={() => {
                setSubmitIntent('save');
                window.setTimeout(() => {
                  const form = document.getElementById('user-form') as HTMLFormElement | null;
                  form?.requestSubmit();
                }, 0);
              }}
            >
              {(mode === 'create' ? creating : updating) && submitIntent === 'save' ? t('users.dialogs.saving') : t('common:buttons.save')}
            </Button>
          </Stack>
        )}
      >
        <UserForm
          formId="user-form"
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          serverError={serverError}
          onStateChange={setCanSave}
          managedByEntra={tenantAuth?.sso_provider === 'entra' && tenantAuth?.sso_enabled && (defaultValues as any)?.external_auth_provider === 'entra'}
        />
      </FormModal>
      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/users" title={t('users.exportTitle')} />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/users"
        title={t('users.importTitle')}
        onImported={() => setRefreshKey((k) => k + 1)}
      />

      {/* Per-user permissions modal removed */}
    </>
  );
}
