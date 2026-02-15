import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTenant } from '../tenant/TenantContext';
import { useFeatures } from '../config/FeaturesContext';
import { Box, CircularProgress } from '@mui/material';

export default function ProtectedRoute() {
  const { token, isAuthenticating, claims, hasLevel, subscription } = useAuth();
  const location = useLocation();
  const { isPlatformHost } = useTenant();
  const { config } = useFeatures();

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
    if (isPlatformHost && !path.startsWith('/admin')) {
      return <Navigate to="/admin/tenants" replace />;
    }
    if (claims.isPlatformAdmin) {
      return <Outlet />;
    }
    
    let resource: string | null = null;
    const adminAliases: Record<string, string> = { roles: 'users' };
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

    if (path.startsWith('/admin/')) {
      const seg = path.split('/')[2] || null;
      resource = seg ? (adminAliases[seg] || seg) : null;
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
    } else {
      resource = null; // dashboard and other root pages allowed
    }
    if (resource && !hasLevel(resource, 'reader')) {
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
