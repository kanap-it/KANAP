import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import DateEUField from '../../../components/fields/DateEUField';
import api from '../../../api';

interface InterfaceForMigration {
  id: string;
  name: string | null;
  interface_id: string;
  lifecycle: string;
  source_app_name: string | null;
  target_app_name: string | null;
  app_role: 'source' | 'target' | 'both' | 'via_middleware';
}

interface SourceApp {
  id: string;
  name: string;
  version?: string | null;
}

interface CreateVersionDialogProps {
  open: boolean;
  onClose: () => void;
  sourceApp: SourceApp;
  onSuccess: (newApp: any) => void;
}

const STEPS = ['Version Details', 'Copy Options', 'Interfaces'];

export default function CreateVersionDialog({ open, onClose, sourceApp, onSuccess }: CreateVersionDialogProps) {
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [interfaces, setInterfaces] = React.useState<InterfaceForMigration[]>([]);
  const [interfacesLoading, setInterfacesLoading] = React.useState(false);

  // Form state - Step 1
  const [name, setName] = React.useState('');
  const [version, setVersion] = React.useState('');
  const [goLiveDate, setGoLiveDate] = React.useState<string>('');
  const [endOfSupportDate, setEndOfSupportDate] = React.useState<string>('');

  // Form state - Step 2
  const [copyOptions, setCopyOptions] = React.useState({
    copyOwners: true,
    copyCompanies: true,
    copyDepartments: true,
    copyDataResidency: true,
    copyLinks: true,
    copySupportContacts: true,
    copySpendItems: true,
    copyCapexItems: true,
    copyContracts: true,
    copyInstances: false,
    copyBindings: false,
  });

  // Form state - Step 3
  const [selectedInterfaceIds, setSelectedInterfaceIds] = React.useState<string[]>([]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setStep(0);
      setError(null);
      setName(`${sourceApp.name} - New Version`);
      setVersion('');
      setGoLiveDate('');
      setEndOfSupportDate('');
      setCopyOptions({
        copyOwners: true,
        copyCompanies: true,
        copyDepartments: true,
        copyDataResidency: true,
        copyLinks: true,
        copySupportContacts: true,
        copySpendItems: true,
        copyCapexItems: true,
        copyContracts: true,
        copyInstances: false,
        copyBindings: false,
      });
      setSelectedInterfaceIds([]);
      setInterfaces([]);
    }
  }, [open, sourceApp.name]);

  // Load interfaces when reaching step 3
  React.useEffect(() => {
    if (open && step === 2 && interfaces.length === 0) {
      setInterfacesLoading(true);
      api.get(`/applications/${sourceApp.id}/interfaces-for-migration`)
        .then(res => setInterfaces(res.data || []))
        .catch(() => setInterfaces([]))
        .finally(() => setInterfacesLoading(false));
    }
  }, [open, step, sourceApp.id, interfaces.length]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Application name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.post(`/applications/${sourceApp.id}/create-version`, {
        name: name.trim(),
        version: version.trim() || undefined,
        go_live_date: goLiveDate || undefined,
        end_of_support_date: endOfSupportDate || undefined,
        ...copyOptions,
        interfaceIds: selectedInterfaceIds,
      });
      onSuccess(result.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create version');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterface = (id: string) => {
    setSelectedInterfaceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllInterfaces = () => {
    setSelectedInterfaceIds(interfaces.map(i => i.id));
  };

  const deselectAllInterfaces = () => {
    setSelectedInterfaceIds([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Version</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, mt: 1 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Creating a new version of: <strong>{sourceApp.name}</strong>
              {sourceApp.version && ` (${sourceApp.version})`}
            </Typography>
            <TextField
              label="Application Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g., 2.0, 2024, Q1 2025"
              fullWidth
            />
            <DateEUField
              label="Go Live Date"
              valueYmd={goLiveDate}
              onChangeYmd={setGoLiveDate}
            />
            <DateEUField
              label="End of Support Date"
              valueYmd={endOfSupportDate}
              onChangeYmd={setEndOfSupportDate}
            />
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Select what to copy from the source application:
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyOwners}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copyOwners: e.target.checked })}
                />
              }
              label="Owners (Business & IT)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyCompanies}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copyCompanies: e.target.checked })}
                />
              }
              label="Companies (Audience)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyDepartments}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copyDepartments: e.target.checked })}
                />
              }
              label="Departments"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyDataResidency}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copyDataResidency: e.target.checked })}
                />
              }
              label="Data Residency"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyLinks}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copyLinks: e.target.checked })}
                />
              }
              label="Links (Documentation)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copySupportContacts}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copySupportContacts: e.target.checked })}
                />
              }
              label="Support Contacts"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copySpendItems}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copySpendItems: e.target.checked, copyCapexItems: e.target.checked })}
                />
              }
              label="OPEX/CAPEX Items"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyContracts}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copyContracts: e.target.checked })}
                />
              }
              label="Contracts"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyInstances}
                  onChange={(e) => setCopyOptions({
                    ...copyOptions,
                    copyInstances: e.target.checked,
                    // Clear bindings when instances is unchecked
                    copyBindings: e.target.checked ? copyOptions.copyBindings : false,
                  })}
                />
              }
              label="Instances (Environments)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyOptions.copyBindings}
                  disabled={!copyOptions.copyInstances}
                  onChange={(e) => setCopyOptions({ ...copyOptions, copyBindings: e.target.checked })}
                />
              }
              label="Bindings (environment connections)"
              sx={{ ml: 3 }}
            />
            {copyOptions.copyBindings && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                Bindings connect interface legs to app instances. Environment-specific details (endpoints, auth, job names) will be cleared.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Note: Suites and attachments are not copied.
            </Typography>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Select interfaces to migrate to the new version.
              Selected interfaces will be duplicated and linked to the new version.
            </Typography>

            {interfacesLoading ? (
              <Stack alignItems="center" py={4}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Loading interfaces...
                </Typography>
              </Stack>
            ) : interfaces.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No interfaces found for this application.
              </Typography>
            ) : (
              <>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={selectAllInterfaces}>Select All</Button>
                  <Button size="small" onClick={deselectAllInterfaces}>Deselect All</Button>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
                    {selectedInterfaceIds.length} of {interfaces.length} selected
                  </Typography>
                </Stack>
                <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {interfaces.map(iface => {
                    const isMiddleware = iface.app_role === 'via_middleware';
                    const roleLabel = isMiddleware
                      ? 'via middleware'
                      : iface.app_role === 'both'
                        ? 'source & target'
                        : iface.app_role;
                    return (
                      <ListItem key={iface.id} disablePadding>
                        <ListItemButton onClick={() => toggleInterface(iface.id)}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={selectedInterfaceIds.includes(iface.id)}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={iface.name || iface.interface_id}
                            secondary={
                              isMiddleware
                                ? `${iface.source_app_name || '?'} → ${iface.target_app_name || '?'} (flows through this ETL)`
                                : `${iface.source_app_name || '?'} → ${iface.target_app_name || '?'} (as ${roleLabel})`
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
                {interfaces.some(i => i.app_role === 'via_middleware') && (
                  <Typography variant="caption" color="text.secondary">
                    Interfaces marked "flows through this ETL" use this application as middleware.
                    Copying them creates new interface definitions for the upgraded ETL.
                  </Typography>
                )}
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        {step > 0 && (
          <Button onClick={() => setStep(step - 1)} disabled={loading}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button variant="contained" onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? <CircularProgress size={20} /> : 'Create Version'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
