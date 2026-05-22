import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useAuth } from '../auth/AuthContext';

type BusinessContributorProfile = {
  id?: string | null;
  role?: string | null;
  roles?: Array<{ name?: string | null }> | null;
} | null | undefined;

type ApplicationProbeResponse = {
  items?: unknown[];
  total?: number;
};

export function isBusinessContributorProfile(profile: BusinessContributorProfile): boolean {
  const names = [
    profile?.role,
    ...(profile?.roles || []).map((role) => role.name),
  ];
  return names.some((name) => String(name || '').trim().toLowerCase() === 'business contributor');
}

export function useBusinessContributorApplicationVisibility() {
  const { profile, hasLevel } = useAuth();
  const isBusinessContributor = React.useMemo(
    () => isBusinessContributorProfile(profile),
    [profile],
  );
  const hasScopedApplicationReaderAccess = isBusinessContributor
    && hasLevel('applications', 'reader')
    && !hasLevel('applications', 'member');
  const hasScopedApplicationOnlyAccess = hasScopedApplicationReaderAccess
    && !hasLevel('infrastructure', 'reader')
    && !hasLevel('locations', 'reader')
    && !hasLevel('settings', 'reader');

  const visibilityQuery = useQuery({
    queryKey: ['business-contributor-application-visibility', profile?.id || null],
    enabled: hasScopedApplicationReaderAccess,
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.get<ApplicationProbeResponse>('/applications', {
        params: { page: 1, limit: 1 },
      });
      const total = Number(response.data?.total ?? response.data?.items?.length ?? 0);
      return total > 0;
    },
  });

  const shouldHideApplications = hasScopedApplicationReaderAccess
    && visibilityQuery.isFetched
    && visibilityQuery.data === false;

  return {
    isBusinessContributor,
    hasScopedApplicationReaderAccess,
    hasScopedApplicationOnlyAccess,
    hasVisibleApplications: !hasScopedApplicationReaderAccess || visibilityQuery.isError || visibilityQuery.data !== false,
    isLoading: hasScopedApplicationReaderAccess && visibilityQuery.isLoading,
    shouldHideApplications,
  };
}
