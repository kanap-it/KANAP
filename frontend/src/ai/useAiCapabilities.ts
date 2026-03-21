import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useAuth } from '../auth/AuthContext';

export type AiSurfaceCapability = {
  feature_enabled: boolean;
  tenant_enabled: boolean;
  permission_granted: boolean;
  provider_ready: boolean;
  available: boolean;
  reasons: string[];
};

export type AiSettingsCapability = {
  feature_enabled: boolean;
  permission_granted: boolean;
  available: boolean;
  reasons: string[];
};

export type AiCapabilities = {
  instance_features: {
    ai_chat: boolean;
    ai_mcp: boolean;
    ai_settings: boolean;
  };
  surfaces: {
    chat: AiSurfaceCapability;
    mcp: AiSurfaceCapability;
    settings: AiSettingsCapability;
  };
};

export function useAiCapabilities() {
  const { token, isAuthenticating } = useAuth();

  return useQuery<AiCapabilities, any>({
    queryKey: ['ai-capabilities'],
    queryFn: async () => {
      const res = await api.get('/ai/capabilities');
      return res.data;
    },
    enabled: !!token && !isAuthenticating,
    staleTime: 30_000,
    retry: false,
  });
}
