import api from '../api';
import { ProviderDescriptor, AiProviderTestResult } from './aiApi';

export type PlatformAiConfig = {
  id: string;
  provider: string;
  model: string;
  endpoint_url: string | null;
  rate_limit_tenant_per_minute: number;
  rate_limit_user_per_hour: number;
  updated_at: string;
  updated_by: string | null;
  has_api_key: boolean;
};

export type PlatformAiPlanLimit = {
  plan_name: string;
  monthly_message_limit: number;
  updated_at: string;
};

export type PlatformAiUsageRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  plan_name: string | null;
  plan_key: string | null;
  used: number;
  limit: number | null;
  usage_ratio: number | null;
  year_month: string;
};

export type PlatformAiConfigPayload = {
  config: PlatformAiConfig | null;
  available_providers: ProviderDescriptor[];
  plan_limits: PlatformAiPlanLimit[];
  usage: PlatformAiUsageRow[];
};

export const platformAiApi = {
  async getConfig(): Promise<PlatformAiConfigPayload> {
    const res = await api.get('/admin/ai/config');
    return res.data;
  },
  async updateConfig(payload: Record<string, unknown>): Promise<{ config: PlatformAiConfig }> {
    const res = await api.patch('/admin/ai/config', payload);
    return res.data;
  },
  async testConfig(payload: Record<string, unknown>): Promise<AiProviderTestResult> {
    const res = await api.post('/admin/ai/config/test', payload);
    return res.data;
  },
  async updatePlanLimits(items: PlatformAiPlanLimit[]): Promise<{ plan_limits: PlatformAiPlanLimit[] }> {
    const res = await api.put('/admin/ai/plan-limits', { items });
    return res.data;
  },
  async getUsage(): Promise<{ items: PlatformAiUsageRow[] }> {
    const res = await api.get('/admin/ai/usage');
    return res.data;
  },
};
