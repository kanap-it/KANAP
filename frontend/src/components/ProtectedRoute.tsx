import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTenant } from '../tenant/TenantContext';
import { useFeatures } from '../config/FeaturesContext';
import { Box, CircularProgress } from '@mui/material';
import { useAiCapabilities } from '../ai/useAiCapabilities';

export default function ProtectedRoute() {
  const { token, isAuthenticating, claims, hasLevel, subscription } = useAuth();
  const location = useLocation();
  const { isPlatformHost } = useTenant();
  const { config } = useFeatures();
  const aiCapabilities = useAiCapabilities();

  // Show loading spinner while authenticating
  if (isAuthenticating) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if no token after authentication check
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If authenticated but claims not yet loaded, show spinner briefly
  if (token && !claims) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Minimal per-route gating based on path prefix and resource name
  if (token && claims) {
    const path = location.pathname;
    const isAiWorkspaceRoute = path === '/ai' || path.startsWith('/ai/');
    const isAdminAiRoute = path === '/admin/ai' || path.startsWith('/admin/ai/');
    if (isPlatformHost && !path.startsWith('/admin')) {
      return <Navigate to="/admin/tenants" replace />;
    }
    if (isAiWorkspaceRoute) {
      if (!config.features.aiChat) {
        return <Navigate to="/403" replace />;
      }
      if (aiCapabilities.isLoading || (!aiCapabilities.data && aiCapabilities.isFetching)) {
        return (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
          >
            <CircularProgress />
          </Box>
        );
      }
      if (aiCapabilities.isError || aiCapabilities.data?.surfaces.chat.available !== true) {
        return <Navigate to="/403" replace />;
      }
    }
    if (isAdminAiRoute) {
      if (!config.features.aiSettings) {
        return <Navigate to="/403" replace />;
      }
      if (aiCapabilities.isLoading || (!aiCapabilities.data && aiCapabilities.isFetching)) {
        return (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
          >
            <CircularProgress />
          </Box>
        );
      }
      if (aiCapabilities.isError || aiCapabilities.data?.surfaces.settings.available !== true) {
        return <Navigate to="/403" replace />;
      }
    }

    let resource: string | null = null;
    const isSelfContributorRoute = (
      path === '/portfolio/contributors/me' ||
      path.startsWith('/portfolio/contributors/me/')
    );
    const adminAliases: Record<string, string> = {
      roles: 'users',
      auth: 'users',
      branding: 'users',
      'audit-logs': 'users',
      'choose-plan': 'billing',
      ai: 'ai_settings',
      'scheduled-tasks': 'users',
    };
    const opsAliases: Record<string, string> = { reports: 'reporting', servers: 'infrastructure', operations: 'opex' };
    const itAliases: Record<string, string> = {
      locations: 'locations',
      assets: 'infrastructure',
      connections: 'infrastructure',
      'connection-map': 'infrastructure',
      applications: 'applications',
      interfaces: 'applications',
      'interface-map': 'applications',
      settings: 'settings',
    };
    const masterDataAliases: Record<string, string> = {
      companies: 'companies',
      departments: 'departments',
      suppliers: 'suppliers',
      contacts: 'contacts',
      accounts: 'accounts',
      coa: 'accounts',
      currency: 'settings',
      'business-processes': 'business_processes',
      analytics: 'analytics',
      operations: 'companies',
    };
    const portfolioAliases: Record<string, string> = {
      requests: 'portfolio_requests',
      projects: 'portfolio_projects',
      planning: 'portfolio_planning',
      reports: 'portfolio_reports',
      contributors: 'portfolio_settings',
      'team-members': 'portfolio_settings',
      settings: 'portfolio_settings',
    };
    const knowledgeAliases: Record<string, string> = {
      settings: 'knowledge',
    };

    if (isSelfContributorRoute) {
      const hasPortfolioReader = (
        hasLevel('tasks', 'reader') ||
        hasLevel('portfolio_requests', 'reader') ||
        hasLevel('portfolio_projects', 'reader') ||
        hasLevel('portfolio_planning', 'reader') ||
        hasLevel('portfolio_reports', 'reader') ||
        hasLevel('portfolio_settings', 'reader')
      );
      if (!hasPortfolioReader) {
        return <Navigate to="/403" replace />;
      }
      resource = null;
    } else if (path.startsWith('/admin/')) {
      const seg = path.split('/')[2] || null;
      resource = seg ? (adminAliases[seg] || seg) : null;
    } else if (path === '/ai' || path.startsWith('/ai/')) {
      resource = 'ai_chat';
    } else if (path.startsWith('/ops/')) {
      const seg = path.split('/')[2] || null;
      resource = seg ? (opsAliases[seg] || seg) : null;
    } else if (path.startsWith('/it/')) {
      const seg = path.split('/')[2] || null;
      resource = seg ? (itAliases[seg] || seg) : null;
    } else if (path.startsWith('/master-data/')) {
      const seg = path.split('/')[2] || null;
      resource = seg ? (masterDataAliases[seg] || seg) : null;
    } else if (path.startsWith('/portfolio/')) {
      const seg = path.split('/')[2] || null;
      resource = seg ? (portfolioAliases[seg] || seg) : null;
    } else if (path === '/knowledge' || path.startsWith('/knowledge/')) {
      const seg = path.split('/')[2] || null;
      resource = seg ? (knowledgeAliases[seg] || 'knowledge') : 'knowledge';
    } else {
      resource = null; // dashboard and other root pages allowed
    }
    if (isAdminAiRoute) {
      if (!hasLevel('ai_settings', 'admin')) {
        return <Navigate to="/403" replace />;
      }
    } else if (resource && !hasLevel(resource, 'reader')) {
      return <Navigate to="/403" replace />;
    }

    // Redirect billing admins to billing page when subscription is unhealthy (only when billing is enabled)
    if (
      config.features.billing &&
      subscription?.is_subscription_healthy === false &&
      claims.isBillingAdmin &&
      !path.startsWith('/admin/billing') &&
      !claims.isPlatformAdmin
    ) {
      return <Navigate to="/admin/billing" replace />;
    }
  }

  return <Outlet />;
}
