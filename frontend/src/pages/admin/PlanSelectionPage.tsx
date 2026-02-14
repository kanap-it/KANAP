import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api';
import { useQuery } from '@tanstack/react-query';

type PlanPrice = {
  monthly: number;
  annual: number;
};

type PlanPaymentOption = {
  card: boolean;
  bank_transfer: boolean;
};

type Plan = {
  plan_key: string;
  display_name: string;
  seat_limit: number | null;
  invoice_eligible: boolean;
  bank_transfer_min_amount?: number;
  payment_options?: {
    monthly: PlanPaymentOption;
    annual: PlanPaymentOption;
  };
  prices: PlanPrice;
};

function formatPrice(cents: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} EUR`;
  }
}

function formatSeatLimit(limit: number | null): string {
  if (limit == null) return 'Unlimited';
  return `Up to ${limit}`;
}

function parseApiError(error: any): string {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message[0] || 'Failed to process request';
  if (message === 'PLAN_NOT_BANK_TRANSFER_ELIGIBLE') {
    return 'Bank transfer is only available for plans above 1,000 EUR.';
  }
  if (message === 'NO_ACTIVE_SUBSCRIPTION') {
    return 'No active subscription found for this plan change.';
  }
  if (typeof message === 'string' && message.trim()) return message;
  return error?.message || 'Failed to process request';
}

type PlanSelectionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function PlanSelectionDialog({ open, onClose, onSuccess }: PlanSelectionDialogProps) {
  const { subscription, claims } = useAuth();
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('monthly');
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionInfo, setActionInfo] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const isBillingAdmin = !!claims?.isBillingAdmin;
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysRemaining = subscription?.trial_days_remaining;
  const hasStripeSubscription = !!subscription?.stripe_subscription_id;
  const hasHealthyStripeSubscription = hasStripeSubscription && subscription?.is_subscription_healthy === true;

  const plansQuery = useQuery<Plan[]>({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const res = await api.get<Plan[]>('/billing/plans');
      return res.data;
    },
    enabled: open,
  });

  const handleCardFlow = async (planKey: string) => {
    if (!isBillingAdmin) return;
    setActionError(null);
    setActionInfo(null);
    setActionLoading(`${planKey}:card`);
    try {
      if (hasHealthyStripeSubscription) {
        await api.post('/billing/change-plan', {
          plan_key: planKey,
          subscription_type: billingCycle,
        });
        onSuccess?.();
        onClose();
        return;
      }

      const res = await api.post<{ url: string }>('/billing/checkout', {
        plan_key: planKey,
        interval: billingCycle,
        success_url: window.location.origin + '/admin/billing',
        cancel_url: window.location.origin + '/admin/billing',
      });
      const url = res.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setActionError('Checkout URL not available.');
      }
    } catch (e: any) {
      setActionError(parseApiError(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBankTransferFlow = async (planKey: string) => {
    if (!isBillingAdmin) return;
    setActionError(null);
    setActionInfo(null);
    setActionLoading(`${planKey}:bank_transfer`);
    try {
      const res = await api.post<any>('/billing/request-invoice', {
        plan_key: planKey,
        subscription_type: billingCycle,
      });
      onSuccess?.();

      const hostedInvoiceUrl =
        res?.data?.hosted_invoice_url ||
        res?.data?.latest_invoice_url ||
        null;

      if (hostedInvoiceUrl) {
        window.location.href = hostedInvoiceUrl;
      } else {
        setActionInfo('Invoice created. You can complete payment from invoice history in Billing.');
      }
    } catch (e: any) {
      setActionError(parseApiError(e));
    } finally {
      setActionLoading(null);
    }
  };

  const plans = plansQuery.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Choose a plan
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ py: 1 }}>
          {isTrialing && trialDaysRemaining != null && trialDaysRemaining > 0 && (
            <Alert severity="info">
              Your trial expires in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}. Choose a plan to continue.
            </Alert>
          )}
          {isTrialing && (trialDaysRemaining == null || trialDaysRemaining <= 0) && (
            <Alert severity="warning">
              Your trial has expired. Choose a plan to continue using the platform.
            </Alert>
          )}

          {!!actionError && <Alert severity="error">{actionError}</Alert>}
          {!!actionInfo && <Alert severity="success">{actionInfo}</Alert>}

          {plansQuery.isLoading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}
          {plansQuery.isError && (
            <Alert severity="error">
              {(plansQuery.error as Error)?.message || 'Failed to load plans'}
            </Alert>
          )}

          {!plansQuery.isLoading && plans.length > 0 && (
            <>
              <Box display="flex" justifyContent="center">
                <ToggleButtonGroup
                  value={billingCycle}
                  exclusive
                  onChange={(_, val) => { if (val) setBillingCycle(val); }}
                  size="small"
                >
                  <ToggleButton value="monthly">Monthly</ToggleButton>
                  <ToggleButton value="annual">Annual (2 months free)</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(plans.length, 3)}, 1fr)` },
                  gap: 2,
                }}
              >
                {plans.map((plan) => {
                  const price = billingCycle === 'annual' ? plan.prices.annual : plan.prices.monthly;
                  const optionForCycle = billingCycle === 'annual'
                    ? plan.payment_options?.annual
                    : plan.payment_options?.monthly;
                  const bankTransferEligible = !!optionForCycle?.bank_transfer;
                  const cardLoading = actionLoading === `${plan.plan_key}:card`;
                  const bankTransferLoading = actionLoading === `${plan.plan_key}:bank_transfer`;
                  const isAnyLoading = !!actionLoading;
                  const cardLabel = hasHealthyStripeSubscription ? 'Change plan (card)' : 'Pay by card';
                  const bankTransferLabel = hasHealthyStripeSubscription ? 'Change plan (bank transfer)' : 'Pay by bank transfer';

                  return (
                    <Card key={plan.plan_key} variant="outlined">
                      <CardContent>
                        <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center', py: 1 }}>
                          <Typography variant="h6" fontWeight={700}>
                            {plan.display_name}
                          </Typography>
                          <Chip
                            label={`${formatSeatLimit(plan.seat_limit)} contributors`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Box>
                            <Typography variant="h4" fontWeight={700}>
                              {formatPrice(price)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              per {billingCycle === 'annual' ? 'year' : 'month'}
                            </Typography>
                          </Box>

                          {!bankTransferEligible && (
                            <Button
                              variant="contained"
                              fullWidth
                              onClick={() => handleCardFlow(plan.plan_key)}
                              disabled={!isBillingAdmin || isAnyLoading}
                            >
                              {cardLoading ? (
                                <CircularProgress size={20} sx={{ color: 'inherit' }} />
                              ) : (
                                cardLabel
                              )}
                            </Button>
                          )}

                          {bankTransferEligible && (
                            <Stack spacing={1} sx={{ width: '100%' }}>
                              <Button
                                variant="contained"
                                fullWidth
                                onClick={() => handleCardFlow(plan.plan_key)}
                                disabled={!isBillingAdmin || isAnyLoading}
                              >
                                {cardLoading ? (
                                  <CircularProgress size={20} sx={{ color: 'inherit' }} />
                                ) : (
                                  cardLabel
                                )}
                              </Button>
                              <Button
                                variant="outlined"
                                fullWidth
                                onClick={() => handleBankTransferFlow(plan.plan_key)}
                                disabled={!isBillingAdmin || isAnyLoading}
                              >
                                {bankTransferLoading ? (
                                  <CircularProgress size={20} sx={{ color: 'inherit' }} />
                                ) : (
                                  bankTransferLabel
                                )}
                              </Button>
                            </Stack>
                          )}

                          {!isBillingAdmin && (
                            <Typography variant="caption" color="text.secondary">
                              Billing Admin required
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
