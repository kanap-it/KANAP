import React from 'react';
import { Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { useFeatures } from '../config/FeaturesContext';

export default function SubscriptionBanner() {
  const { t } = useTranslation('common');
  const { subscription, claims } = useAuth();
  const navigate = useNavigate();
  const { config } = useFeatures();
  const isBillingAdmin = claims?.isBillingAdmin;

  // Don't show billing banner when billing is disabled
  if (!config.features.billing) return null;

  // Don't show the banner if user is platform admin
  if (claims?.isPlatformAdmin) return null;

  // Don't show the banner if no subscription data yet (loading) or subscription is healthy
  if (!subscription || subscription.is_subscription_healthy) return null;

  const status = subscription.status;
  const isTrialing = status === 'trialing';
  const trialDaysRemaining = subscription.trial_days_remaining;

  // Active trial - info banner
  if (isTrialing && trialDaysRemaining != null && trialDaysRemaining > 0) {
    return (
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          isBillingAdmin ? (
            <Button color="inherit" size="small" onClick={() => navigate('/admin/billing')}>
              {t('subscription.choosePlan')}
            </Button>
          ) : undefined
        }
      >
        {trialDaysRemaining === 1 ? t('subscription.trialExpiresIn', { count: trialDaysRemaining }) : t('subscription.trialExpiresIn_plural', { count: trialDaysRemaining })}
        {!isBillingAdmin && ` ${t('subscription.choosePlanToContinue')}`}
      </Alert>
    );
  }

  // Trial expired
  if (isTrialing && (trialDaysRemaining == null || trialDaysRemaining <= 0)) {
    if (isBillingAdmin) {
      return (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/admin/billing')}>
              {t('subscription.choosePlanToContinueAction')}
            </Button>
          }
        >
          {t('subscription.trialExpired')}
        </Alert>
      );
    }
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {t('subscription.trialExpiredContactAdmin')}
      </Alert>
    );
  }

  // Frozen subscription
  if (isBillingAdmin) {
    return (
      <Alert
        severity="error"
        sx={{ mb: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/admin/billing')}>
            {t('subscription.goToBilling')}
          </Button>
        }
      >
        {t('subscription.subscriptionNeedsAttention')}
      </Alert>
    );
  }

  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {t('subscription.accountAccessLimited')}
    </Alert>
  );
}
