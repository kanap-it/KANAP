import { parseBoolean } from '../common/env';

const deploymentMode = (process.env.DEPLOYMENT_MODE || '').trim().toLowerCase();
const isSingleTenant = deploymentMode === 'single-tenant';

export const Features = {
  DEPLOYMENT_MODE: isSingleTenant ? ('single-tenant' as const) : ('multi-tenant' as const),
  SINGLE_TENANT: isSingleTenant,
  STRIPE_BILLING: !isSingleTenant && !!process.env.STRIPE_SECRET_KEY,
  ENTRA_SSO: !!process.env.ENTRA_CLIENT_ID,
  EMAIL_ENABLED: !!process.env.RESEND_API_KEY,
  AI_CHAT_ENABLED: parseBoolean(process.env.AI_CHAT_ENABLED),
  AI_MCP_ENABLED: parseBoolean(process.env.AI_MCP_ENABLED),
  AI_SETTINGS_ENABLED: parseBoolean(process.env.AI_SETTINGS_ENABLED),
};
