import React from 'react';
import PageHeader from '../../components/PageHeader';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BillingContact,
  BillingProfileResponse,
  BillingProfileUpdateResponse,
  BillingSubscription,
  BillingInvoice,
  getBillingProfile,
  updateBillingProfile,
} from '../../services/billing';
import PlanSelectionDialog from './PlanSelectionPage';

type BillingContactForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  vatNumber: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
};

const EMPTY_FORM: BillingContactForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  vatNumber: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  },
};

function contactToForm(contact: BillingContact | undefined): BillingContactForm {
  if (!contact) return { ...EMPTY_FORM, address: { ...EMPTY_FORM.address } };
  return {
    name: contact.name ?? '',
    company: contact.company ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    vatNumber: contact.vatNumber ?? '',
    address: {
      line1: contact.address?.line1 ?? '',
      line2: contact.address?.line2 ?? '',
      city: contact.address?.city ?? '',
      state: contact.address?.state ?? '',
      postalCode: contact.address?.postalCode ?? '',
      country: contact.address?.country ?? '',
    },
  };
}

function cloneForm(form: BillingContactForm): BillingContactForm {
  return {
    ...form,
    address: { ...form.address },
  };
}

function normaliseValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function formToPayload(form: BillingContactForm): Partial<BillingContact> {
  return {
    name: normaliseValue(form.name),
    company: normaliseValue(form.company),
    email: normaliseValue(form.email),
    phone: normaliseValue(form.phone),
    vatNumber: normaliseValue(form.vatNumber),
    address: {
      line1: normaliseValue(form.address.line1),
      line2: normaliseValue(form.address.line2),
      city: normaliseValue(form.address.city),
      state: normaliseValue(form.address.state),
      postalCode: normaliseValue(form.address.postalCode),
      country: normaliseValue(form.address.country)?.toUpperCase() ?? null,
    },
  };
}

function formsEqual(a: BillingContactForm, b: BillingContactForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatMoney(amount?: number | null, currency?: string | null) {
  if (amount == null || !currency) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${amount / 100} ${currency.toUpperCase()}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(value?: string | null) {
  return formatDate(value);
}

const STATUS_META: Record<string, { label: string; color: ChipProps['color'] }> = {
  active: { label: 'Active', color: 'success' },
  trialing: { label: 'Trialing', color: 'info' },
  incomplete: { label: 'Incomplete', color: 'warning' },
  incomplete_expired: { label: 'Incomplete (expired)', color: 'default' },
  past_due: { label: 'Past due', color: 'warning' },
  canceled: { label: 'Canceled', color: 'default' },
  unpaid: { label: 'Unpaid', color: 'error' },
  paused: { label: 'Paused', color: 'warning' },
};

const INVOICE_STATUS_META: Record<string, { label: string; color: ChipProps['color'] }> = {
  draft: { label: 'Draft', color: 'default' },
  open: { label: 'Open', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  void: { label: 'Voided', color: 'default' },
  uncollectible: { label: 'Uncollectible', color: 'error' },
};

function derivePlanLabel(subscription?: BillingSubscription | null): string {
  if (!subscription) return '—';
  // Local trial (no Stripe subscription)
  if (subscription.status === 'trialing' && !subscription.stripe_subscription_id) return 'Free trial';
  if (subscription.plan_name) return subscription.plan_name;
  const seats = Math.max(subscription.seat_limit ?? 0, subscription.seats_used ?? 0);
  if (!seats) return '—';
  if (seats <= 2) return 'Solo';
  if (seats <= 9) return 'Team';
  return 'Pro';
}

function formatSubscriptionType(subscription?: BillingSubscription | null): string {
  if (!subscription?.subscription_type) return '—';
  return subscription.subscription_type === 'annual' ? 'Annual' : 'Monthly';
}

function formatCollectionMethod(subscription?: BillingSubscription | null): string {
  if (!subscription?.collection_method) return 'Automatic charge';
  return subscription.collection_method === 'send_invoice' ? 'Invoice (manual payment)' : 'Automatic charge';
}

function formatPaymentMode(subscription?: BillingSubscription | null): string {
  if (!subscription?.payment_mode) return 'Card';
  return subscription.payment_mode === 'bank_transfer' ? 'Bank transfer' : 'Card';
}

function getStatusMeta(subscription?: BillingSubscription | null): { label: string; color: ChipProps['color'] } {
  if (subscription?.status) {
    return STATUS_META[subscription.status] ?? { label: subscription.status.replace(/_/g, ' '), color: 'default' };
  }
  if (!subscription?.stripe_subscription_id) {
    return { label: 'Not subscribed', color: 'default' };
  }
  return { label: 'Pending', color: 'default' };
}

function getInvoiceStatusMeta(subscription?: BillingSubscription | null): { label: string; color: ChipProps['color'] } {
  return getInvoiceStatusMetaFromStatus(subscription?.latest_invoice_status);
}

function getInvoiceStatusMetaFromStatus(status?: string | null): { label: string; color: ChipProps['color'] } {
  if (!status) return { label: '—', color: 'default' };
  return INVOICE_STATUS_META[status] ?? { label: status.replace(/_/g, ' '), color: 'default' };
}

type SummaryItemProps = {
  label: string;
  children: React.ReactNode;
};

function SummaryItem({ label, children }: SummaryItemProps) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

export default function BillingCenter() {
  const { subscription, claims } = useAuth();
  const [portalError, setPortalError] = React.useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);
  const [opening, setOpening] = React.useState(false);
  const [customerForm, setCustomerForm] = React.useState<BillingContactForm>(cloneForm(EMPTY_FORM));
  const [invoiceForm, setInvoiceForm] = React.useState<BillingContactForm>(cloneForm(EMPTY_FORM));
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [showAllInvoices, setShowAllInvoices] = React.useState(false);

  const canManage = !!claims?.isBillingAdmin;
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['billing-profile'],
    queryFn: getBillingProfile,
  });

  React.useEffect(() => {
    if (profileQuery.data) {
      setCustomerForm(contactToForm(profileQuery.data.customer));
      setInvoiceForm(contactToForm(profileQuery.data.invoice));
      setShowAllInvoices(false);
    }
  }, [profileQuery.data]);

  const baseCustomerForm = React.useMemo(
    () => contactToForm(profileQuery.data?.customer),
    [profileQuery.data?.customer],
  );
  const baseInvoiceForm = React.useMemo(
    () => contactToForm(profileQuery.data?.invoice),
    [profileQuery.data?.invoice],
  );

  const isDirty = profileQuery.data
    ? !formsEqual(customerForm, baseCustomerForm) || !formsEqual(invoiceForm, baseInvoiceForm)
    : false;

  const updateMutation = useMutation<
    BillingProfileUpdateResponse,
    any,
    { customer: Partial<BillingContact>; invoice: Partial<BillingContact> }
  >({
    mutationFn: (payload: { customer: Partial<BillingContact>; invoice: Partial<BillingContact> }) =>
      updateBillingProfile(payload),
    onSuccess: (data: BillingProfileUpdateResponse) => {
      setFormError(null);
      setFormSuccess('Billing details updated');
      setCheckoutError(null);
      const nextCustomer = contactToForm(data.customer);
      const nextInvoice = contactToForm(data.invoice);
      setCustomerForm(nextCustomer);
      setInvoiceForm(nextInvoice);
      queryClient.setQueryData<BillingProfileResponse | undefined>(['billing-profile'], (prev) => {
        if (!prev) return prev;
        return { ...prev, customer: data.customer, invoice: data.invoice, invoices: data.invoices };
      });
    },
    onError: (err: any) => {
      setFormSuccess(null);
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save billing profile');
      setCheckoutError(null);
    },
  });

  const subscriptionSummary = profileQuery.data?.subscription ?? subscription;
  const loadingProfile = (profileQuery.isLoading && !profileQuery.data) || profileQuery.isFetching;
  const hasSubscription = !!subscriptionSummary?.stripe_subscription_id;
  const subscriptionStatus = subscriptionSummary?.status ?? null;
  const planLabel = React.useMemo(() => derivePlanLabel(subscriptionSummary), [subscriptionSummary]);
  const seatsLabel = subscriptionSummary
    ? subscriptionSummary.seat_limit != null
      ? `${subscriptionSummary.seats_used}/${subscriptionSummary.seat_limit}`
      : `${subscriptionSummary.seats_used} (unlimited)`
    : '—';
  const statusMeta = React.useMemo(() => getStatusMeta(subscriptionSummary), [subscriptionSummary]);
  const frequencyLabel = React.useMemo(() => formatSubscriptionType(subscriptionSummary), [subscriptionSummary]);
  const collectionLabel = React.useMemo(() => formatCollectionMethod(subscriptionSummary), [subscriptionSummary]);
  const paymentModeLabel = React.useMemo(() => formatPaymentMode(subscriptionSummary), [subscriptionSummary]);
  const amountLabel = formatMoney(
    subscriptionSummary?.amount ?? subscriptionSummary?.estimated_amount ?? null,
    subscriptionSummary?.currency ?? subscriptionSummary?.estimated_currency ?? null
  );
  const paymentMethodLabel = (() => {
    if (!subscriptionSummary?.default_payment_method_id) return paymentModeLabel;
    if (subscriptionSummary.default_payment_method_brand && subscriptionSummary.default_payment_method_last4) {
      return `${subscriptionSummary.default_payment_method_brand.toUpperCase()} •••• ${subscriptionSummary.default_payment_method_last4}`;
    }
    if (subscriptionSummary.default_payment_method_brand) return subscriptionSummary.default_payment_method_brand.toUpperCase();
    return paymentModeLabel;
  })();
  const renewalLabel = formatDate(
    subscriptionSummary?.renewal_at ??
    subscriptionSummary?.current_period_end ??
    subscriptionSummary?.next_payment_at ??
    subscriptionSummary?.payment_due_at ??
    null
  );
  const trialLabel = subscriptionSummary?.trial_end ? formatDate(subscriptionSummary.trial_end) : null;
  const lastSyncedLabel = formatDateTime(subscriptionSummary?.last_synced_at);
  const allowPortal = hasSubscription;
  const isTrialing = subscriptionStatus === 'trialing';
  const isLocalTrial = isTrialing && !hasSubscription;
  const trialDaysRemaining = subscription?.trial_days_remaining;
  const isHealthy = subscription?.is_subscription_healthy;
  const planActionLabel = hasSubscription ? 'Change plan' : 'Choose plan';
  const invoices = profileQuery.data?.invoices ?? [];
  const invoicesToShow = showAllInvoices ? invoices : invoices.slice(0, 5);
  const canToggleInvoices = invoices.length > 5;

  const openPortal = async () => {
    setPortalError(null);
    setCheckoutError(null);
    setOpening(true);
    try {
      const res = await api.post('/billing/portal', { returnUrl: window.location.origin + '/admin/billing' });
      const url = res.data?.url;
      if (url) window.location.href = url;
      else setPortalError('Portal URL not available.');
    } catch (e: any) {
      setPortalError(e?.response?.data?.message || e?.message || 'Failed to open billing portal');
    } finally {
      setOpening(false);
    }
  };

  // Auto-open plan dialog when subscription is unhealthy
  const isHealthyRef = React.useRef(isHealthy);
  React.useEffect(() => {
    if (isHealthy === false && canManage && isHealthyRef.current === undefined) {
      setPlanDialogOpen(true);
    }
    isHealthyRef.current = isHealthy;
  }, [isHealthy, canManage]);

  const handleContactChange = (section: 'customer' | 'invoice', field: keyof BillingContactForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormError(null);
      setFormSuccess(null);
      setCheckoutError(null);
      if (section === 'customer') {
        setCustomerForm((prev) => ({ ...prev, [field]: value }));
      } else {
        setInvoiceForm((prev) => ({ ...prev, [field]: value }));
      }
    };

  const handleAddressChange = (
    section: 'customer' | 'invoice',
    field: keyof BillingContactForm['address'],
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormError(null);
    setFormSuccess(null);
    setCheckoutError(null);
    if (section === 'customer') {
      setCustomerForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setInvoiceForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    }
  };

  const handleCopyFromCustomer = () => {
    setFormError(null);
    setFormSuccess(null);
    setCheckoutError(null);
    setInvoiceForm(cloneForm(customerForm));
  };

  const handleReset = () => {
    if (!profileQuery.data) return;
    setFormError(null);
    setFormSuccess(null);
    setCheckoutError(null);
    setCustomerForm(contactToForm(profileQuery.data.customer));
    setInvoiceForm(contactToForm(profileQuery.data.invoice));
  };

  const handleSave = () => {
    if (!profileQuery.data) return;
    setCheckoutError(null);
    updateMutation.mutate({
      customer: formToPayload(customerForm),
      invoice: formToPayload(invoiceForm),
    });
  };

  return (
    <>
      <PageHeader title="Billing" />
      <Stack spacing={2}>
        {!!checkoutError && <Alert severity="error">{checkoutError}</Alert>}
        {!!portalError && <Alert severity="error">{portalError}</Alert>}
        {profileQuery.isError && (
          <Alert severity="error">{(profileQuery.error as Error)?.message || 'Failed to load billing profile'}</Alert>
        )}
        {!!formError && <Alert severity="error">{formError}</Alert>}
        {!!formSuccess && <Alert severity="success">{formSuccess}</Alert>}
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Subscription</Typography>
              <Grid container spacing={3} alignItems="flex-start">
                <Grid item xs={12} sm={6} md={3}>
                  <SummaryItem label="Plan">
                    <Typography fontWeight={600}>{planLabel}</Typography>
                  </SummaryItem>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <SummaryItem label="Seats">
                    <Typography>{seatsLabel}</Typography>
                  </SummaryItem>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <SummaryItem label="Status">
                    <Chip label={statusMeta.label} color={statusMeta.color} size="small" sx={{ textTransform: 'capitalize' }} />
                  </SummaryItem>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <SummaryItem label="Renewal date">
                    <Typography>{renewalLabel}</Typography>
                  </SummaryItem>
                </Grid>
                {!isLocalTrial && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <SummaryItem label="Amount per period">
                        <Typography>{amountLabel}</Typography>
                      </SummaryItem>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <SummaryItem label="Billing frequency">
                        <Typography>{frequencyLabel}</Typography>
                      </SummaryItem>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <SummaryItem label="Collection method">
                        <Typography>{collectionLabel}</Typography>
                      </SummaryItem>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <SummaryItem label="Payment method">
                        <Typography>{paymentMethodLabel}</Typography>
                      </SummaryItem>
                    </Grid>
                  </>
                )}
                {trialLabel && trialLabel !== '—' && (
                  <Grid item xs={12} sm={6} md={3}>
                    <SummaryItem label="Trial ends">
                      <Typography>{trialLabel}</Typography>
                    </SummaryItem>
                  </Grid>
                )}
                {!isLocalTrial && (
                  <Grid item xs={12} sm={6} md={3}>
                    <SummaryItem label="Last Stripe sync">
                      <Typography>{lastSyncedLabel}</Typography>
                    </SummaryItem>
                  </Grid>
                )}
                {isTrialing && trialDaysRemaining != null && trialDaysRemaining > 0 && (
                  <Grid item xs={12} md={4}>
                    <SummaryItem label="Trial">
                      <Typography>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining</Typography>
                    </SummaryItem>
                  </Grid>
                )}
                <Grid item xs={12} md={4}>
                  <SummaryItem label="Actions">
                    <Stack
                      direction={{ xs: 'column', sm: 'row', md: 'column' }}
                      spacing={1}
                      alignItems={{ xs: 'stretch', sm: 'center', md: 'flex-start' }}
                    >
                      <Button
                        variant={isHealthy ? 'outlined' : 'contained'}
                        onClick={() => setPlanDialogOpen(true)}
                        disabled={!canManage}
                      >
                        {planActionLabel}
                      </Button>
                      {allowPortal && (
                        <Button
                          variant={isHealthy ? 'contained' : 'outlined'}
                          onClick={openPortal}
                          disabled={!canManage || opening}
                        >
                          {opening ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : 'Manage subscription'}
                        </Button>
                      )}
                    </Stack>
                    {!canManage && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Billing Admin required
                      </Typography>
                    )}
                  </SummaryItem>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {invoices.length > 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Invoice history</Typography>
              <Stack spacing={1.5}>
                {invoicesToShow.map((invoice: BillingInvoice) => {
                  const statusMeta = getInvoiceStatusMetaFromStatus(invoice.status);
                  return (
                    <Stack
                      key={invoice.id}
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'flex-start', md: 'center' }}
                    >
                      <Box sx={{ minWidth: 160 }}>
                        <Typography fontWeight={600}>{invoice.number || invoice.id}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {invoice.createdAt ? formatDate(invoice.createdAt) : '—'}
                        </Typography>
                      </Box>
                      <Chip label={statusMeta.label} color={statusMeta.color} size="small" sx={{ textTransform: 'capitalize' }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography>{formatMoney(invoice.total, invoice.currency)}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {invoice.hostedInvoiceUrl && (
                          <Button
                            component="a"
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                          >
                            View
                          </Button>
                        )}
                        {invoice.invoicePdf && (
                          <Button
                            component="a"
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                          >
                            Download
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
              {canToggleInvoices && (
                <Button
                  variant="text"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => setShowAllInvoices((prev) => !prev)}
                >
                  {showAllInvoices ? 'Show fewer invoices' : 'Show more invoices'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Customer Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Customer name"
                  value={customerForm.name}
                  onChange={handleContactChange('customer', 'name')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Company"
                  value={customerForm.company}
                  onChange={handleContactChange('customer', 'company')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={customerForm.email}
                  onChange={handleContactChange('customer', 'email')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                  autoComplete="email"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone"
                  value={customerForm.phone}
                  onChange={handleContactChange('customer', 'phone')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="VAT number"
                  value={customerForm.vatNumber}
                  onChange={handleContactChange('customer', 'vatNumber')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Address line 1"
                  value={customerForm.address.line1}
                  onChange={handleAddressChange('customer', 'line1')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Address line 2"
                  value={customerForm.address.line2}
                  onChange={handleAddressChange('customer', 'line2')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="City"
                  value={customerForm.address.city}
                  onChange={handleAddressChange('customer', 'city')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="State / Province"
                  value={customerForm.address.state}
                  onChange={handleAddressChange('customer', 'state')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Postal code"
                  value={customerForm.address.postalCode}
                  onChange={handleAddressChange('customer', 'postalCode')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Country"
                  value={customerForm.address.country}
                  onChange={handleAddressChange('customer', 'country')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Invoicing Information</Typography>
              <Button
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={handleCopyFromCustomer}
                disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
              >
                Copy from customer
              </Button>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Recipient name"
                  value={invoiceForm.name}
                  onChange={handleContactChange('invoice', 'name')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Company"
                  value={invoiceForm.company}
                  onChange={handleContactChange('invoice', 'company')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={invoiceForm.email}
                  onChange={handleContactChange('invoice', 'email')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                  autoComplete="email"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone"
                  value={invoiceForm.phone}
                  onChange={handleContactChange('invoice', 'phone')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="VAT number"
                  value={invoiceForm.vatNumber}
                  onChange={handleContactChange('invoice', 'vatNumber')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Address line 1"
                  value={invoiceForm.address.line1}
                  onChange={handleAddressChange('invoice', 'line1')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Address line 2"
                  value={invoiceForm.address.line2}
                  onChange={handleAddressChange('invoice', 'line2')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="City"
                  value={invoiceForm.address.city}
                  onChange={handleAddressChange('invoice', 'city')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="State / Province"
                  value={invoiceForm.address.state}
                  onChange={handleAddressChange('invoice', 'state')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Postal code"
                  value={invoiceForm.address.postalCode}
                  onChange={handleAddressChange('invoice', 'postalCode')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Country"
                  value={invoiceForm.address.country}
                  onChange={handleAddressChange('invoice', 'country')}
                  fullWidth
                  disabled={!canManage || loadingProfile || updateMutation.isPending || checkoutLoading}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {canManage && (
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={!isDirty || updateMutation.isPending || loadingProfile || checkoutLoading}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending || loadingProfile || checkoutLoading}
            >
              {updateMutation.isPending ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : 'Save changes'}
            </Button>
          </Stack>
        )}
      </Stack>

      <PlanSelectionDialog
        open={planDialogOpen}
        onClose={() => setPlanDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['billing-profile'] });
        }}
      />
    </>
  );
}
