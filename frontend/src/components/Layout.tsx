import React from 'react';
import { AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Toolbar, Typography, Tooltip, Tabs, Tab, Menu, MenuItem } from '@mui/material';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import HubIcon from '@mui/icons-material/Hub';
import DnsIcon from '@mui/icons-material/Dns';
import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import MenuIcon from '@mui/icons-material/Menu';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ApartmentIcon from '@mui/icons-material/Apartment';
import SecurityIcon from '@mui/icons-material/Security';
import LanIcon from '@mui/icons-material/Lan';
import InsightsIcon from '@mui/icons-material/Insights';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import StorageIcon from '@mui/icons-material/Storage';
import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import InboxIcon from '@mui/icons-material/Inbox';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useAuth } from '../auth/AuthContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import { useTenant } from '../tenant/TenantContext';
import { useFeatures } from '../config/FeaturesContext';
import { useThemeMode } from '../config/ThemeContext';
import { getDocUrl } from '../utils/docUrls';
import SubscriptionBanner from './SubscriptionBanner';

const drawerWidth = 240;

type NavItem = { to: string; label: string; icon: React.ReactNode; resource?: string };
type NavDivider = { divider: string };
type NavEntry = NavItem | NavDivider;

function isNavItem(entry: NavEntry): entry is NavItem {
  return 'to' in entry;
}

const operations: NavEntry[] = [
  { to: '/ops', label: 'Overview', icon: <DashboardIcon /> },
  { to: '/ops/opex', label: 'OPEX', icon: <AccountBalanceWalletIcon />, resource: 'opex' },
  { to: '/ops/capex', label: 'CAPEX', icon: <AccountBalanceIcon />, resource: 'capex' },
  { to: '/ops/contracts', label: 'Contracts', icon: <DescriptionIcon />, resource: 'contracts' },
  { to: '/ops/reports', label: 'Reporting', icon: <BarChartIcon />, resource: 'reporting' },
  { to: '/ops/operations', label: 'Administration', icon: <SettingsIcon />, resource: 'opex' },
];

const masterData: NavEntry[] = [
  { to: '/master-data', label: 'Master Data Home', icon: <HomeIcon /> },
  { divider: 'Organization' },
  { to: '/master-data/companies', label: 'Companies', icon: <BusinessIcon />, resource: 'companies' },
  { to: '/master-data/departments', label: 'Departments', icon: <AccountTreeIcon />, resource: 'departments' },
  { divider: 'External Parties' },
  { to: '/master-data/suppliers', label: 'Suppliers', icon: <LocalShippingIcon />, resource: 'suppliers' },
  { to: '/master-data/contacts', label: 'Contacts', icon: <PeopleIcon />, resource: 'contacts' },
  { divider: 'Finance' },
  { to: '/master-data/coa', label: 'Charts of Accounts', icon: <StorageIcon />, resource: 'accounts' },
  { to: '/master-data/currency', label: 'Currency', icon: <AttachMoneyIcon />, resource: 'settings' },
  { divider: 'Classification' },
  { to: '/master-data/business-processes', label: 'Business Processes', icon: <WorkOutlineIcon />, resource: 'business_processes' },
  { to: '/master-data/analytics', label: 'Analytics Dimensions', icon: <InsightsIcon />, resource: 'analytics' },
  { divider: '' },
  { to: '/master-data/operations', label: 'Administration', icon: <BuildIcon />, resource: 'companies' },
];

const itOperations: NavEntry[] = [
  { divider: 'Infrastructure' },
  { to: '/it/locations', label: 'Locations', icon: <LocationCityIcon />, resource: 'locations' },
  { to: '/it/assets', label: 'Assets', icon: <DnsIcon />, resource: 'infrastructure' },
  { to: '/it/connections', label: 'Connections', icon: <LanIcon />, resource: 'infrastructure' },
  { to: '/it/connection-map', label: 'Connection Map', icon: <LanIcon />, resource: 'infrastructure' },
  { divider: 'Applications' },
  { to: '/it/applications', label: 'Applications', icon: <WorkOutlineIcon />, resource: 'applications' },
  { to: '/it/interfaces', label: 'Interfaces', icon: <HubIcon />, resource: 'applications' },
  { to: '/it/interface-map', label: 'Interface Map', icon: <AccountTreeIcon />, resource: 'applications' },
  { divider: '' },
  { to: '/it/settings', label: 'Settings', icon: <SettingsIcon />, resource: 'settings' },
];

const portfolioNav: NavEntry[] = [
  { to: '/portfolio/tasks', label: 'Tasks', icon: <AssignmentIcon />, resource: 'tasks' },
  { to: '/portfolio/requests', label: 'Requests', icon: <InboxIcon />, resource: 'portfolio_requests' },
  { to: '/portfolio/projects', label: 'Projects', icon: <AccountTreeIcon />, resource: 'portfolio_projects' },
  { to: '/portfolio/planning', label: 'Planning', icon: <CalendarMonthIcon />, resource: 'portfolio_planning' },
  { to: '/portfolio/reports', label: 'Reporting', icon: <AssessmentIcon />, resource: 'portfolio_reports' },
  { to: '/portfolio/contributors', label: 'Contributors', icon: <PeopleIcon />, resource: 'portfolio_settings' },
  { to: '/portfolio/settings', label: 'Settings', icon: <SettingsIcon />, resource: 'portfolio_settings' },
];

const tenantAdminNav: NavEntry[] = [
  { to: '/admin/users', label: 'Users', icon: <PeopleIcon />, resource: 'users' },
  { to: '/admin/roles', label: 'Roles', icon: <SecurityIcon />, resource: 'users' },
  { to: '/admin/audit-logs', label: 'Audit Log', icon: <HistoryIcon />, resource: 'users' },
  { to: '/admin/billing', label: 'Billing', icon: <CreditCardIcon />, resource: 'billing' },
  { to: '/admin/auth', label: 'Authentication', icon: <AdminPanelSettingsIcon />, resource: 'users' },
];

const platformAdminNav: NavEntry[] = [
  { to: '/admin/tenants', label: 'Tenants', icon: <ApartmentIcon /> },
  { to: '/admin/coa-templates', label: 'CoA Templates', icon: <StorageIcon /> },
  { to: '/admin/standard-accounts', label: 'Standard Accounts', icon: <AccountBalanceIcon /> },
  { divider: '' },
  { to: '/admin/ops-dashboard', label: 'Ops Dashboard', icon: <MonitorHeartIcon /> },
];

// Helper to extract resource strings from a nav array (filtering out dividers)
const getNavResources = (entries: NavEntry[]): string[] =>
  [...new Set(entries.filter(isNavItem).map(i => i.resource).filter(Boolean) as string[])];

// Helper to check if user has ANY permission for resources in a workspace
const getWorkspaceResources = (ws: string): string[] => {
  switch (ws) {
    case 'ops': return getNavResources(operations);
    case 'master-data': return getNavResources(masterData);
    case 'it': return getNavResources(itOperations);
    case 'portfolio': return getNavResources(portfolioNav);
    case 'admin': return getNavResources(tenantAdminNav);
    default: return [];
  }
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, token, hasLevel, claims, profile } = useAuth();
  const { isPlatformHost } = useTenant();
  const { config } = useFeatures();
  const { mode, setMode } = useThemeMode();
  const isSingleTenant = config.deploymentMode === 'single-tenant';
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  // Check if user has access to any resource in a workspace
  const hasWorkspaceAccess = React.useCallback((ws: string): boolean => {
    if (claims?.isGlobalAdmin || claims?.isPlatformAdmin) return true;
    const resources = getWorkspaceResources(ws);
    return resources.some(r => hasLevel(r, 'reader'));
  }, [hasLevel, claims]);

  // Determine which workspaces are visible
  const visibleWorkspaces = React.useMemo(() => {
    if (isPlatformHost) return ['admin'];
    const all = ['portfolio', 'it', 'ops', 'master-data', 'admin'] as const;
    return all.filter(ws => hasWorkspaceAccess(ws));
  }, [isPlatformHost, hasWorkspaceAccess]);

  // Derive active workspace from the current route to keep the top bar highlight in sync
  const workspace: 'ops' | 'it' | 'master-data' | 'portfolio' | 'admin' | 'home' = React.useMemo(() => {
    if (isPlatformHost) return 'admin';
    const p = location.pathname;
    if (p === '/') return 'home';
    if (p.startsWith('/admin')) return 'admin';
    if (p.startsWith('/master-data')) return 'master-data';
    if (p.startsWith('/portfolio')) return 'portfolio';
    if (p.startsWith('/it')) return 'it';
    if (p.startsWith('/settings')) return 'home';
    return 'ops';
  }, [location.pathname, isPlatformHost]);
  const [navOpen, setNavOpen] = React.useState<boolean>(() => {
    // Default to open unless explicitly stored as 'false'
    try {
      return window.localStorage.getItem('navOpen') !== 'false';
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem('navOpen', String(navOpen));
    } catch {}
  }, [navOpen]);

  const themeModeLabel = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';
  const themeModeIcon = mode === 'dark'
    ? <DarkModeOutlinedIcon />
    : mode === 'light'
      ? <LightModeOutlinedIcon />
      : <BrightnessAutoIcon />;

  // workspace is derived from route; no sync to localStorage required

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setNavOpen((v) => !v)}
            sx={{ mr: 2 }}
            title={navOpen ? 'Collapse navigation' : 'Expand navigation'}
            aria-label={navOpen ? 'Collapse navigation' : 'Expand navigation'}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component={Link} to="/" sx={{ mr: 3, textDecoration: 'none', color: 'inherit' }}>KANAP</Typography>
          {!isPlatformHost && visibleWorkspaces.length > 0 && (
            <Tabs
              value={workspace === 'home' ? false : (visibleWorkspaces.includes(workspace) ? workspace : visibleWorkspaces[0])}
              onChange={(_, val) => {
                navigate(val === 'ops' ? '/ops' : val === 'it' ? '/it' : val === 'master-data' ? '/master-data' : val === 'portfolio' ? '/portfolio' : '/admin');
              }}
              sx={{
                flex: 1,
                '& .MuiTab-root': {
                  color: 'rgba(255,255,255,0.7)',
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                },
                '& .MuiTab-root.Mui-selected': {
                  color: 'common.white',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'common.white',
                },
              }}
              aria-label="Section navigation"
            >
              {visibleWorkspaces.includes('portfolio') && <Tab value="portfolio" label="Portfolio" />}
              {visibleWorkspaces.includes('it') && <Tab value="it" label="IT Operations" />}
              {visibleWorkspaces.includes('ops') && <Tab value="ops" label="Budget Management" />}
              {visibleWorkspaces.includes('master-data') && <Tab value="master-data" label="Master Data" />}
              {visibleWorkspaces.includes('admin') && <Tab value="admin" label="Admin" />}
            </Tabs>
          )}
          {isPlatformHost && <Box sx={{ flex: 1 }} />}
          {token && (
            <>
              <IconButton
                color="inherit"
                size="small"
                title="Help"
                component="a"
                href={getDocUrl(location.pathname)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open documentation for this page"
              >
                <HelpOutlineIcon />
              </IconButton>
              <Tooltip title={`Theme: ${themeModeLabel} (click to switch)`}>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')}
                  aria-label={`Theme: ${themeModeLabel}`}
                >
                  {themeModeIcon}
                </IconButton>
              </Tooltip>
              <IconButton color="inherit" onClick={openMenu} size="small" title="Account">
                <AccountCircleIcon />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {profile?.email}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { closeMenu(); navigate('/settings'); }}>My Profile</MenuItem>
                <MenuItem onClick={() => { closeMenu(); logout(); }}>Logout</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {workspace !== 'home' && <Drawer
        variant="permanent"
        sx={{
          width: (theme) => (navOpen ? drawerWidth : `calc(${theme.spacing(7)} + 1px)`),
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: (theme) => ({
            width: navOpen ? drawerWidth : `calc(${theme.spacing(7)} + 1px)`,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: navOpen ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
            }),
          }),
        }}
      >
        <Toolbar />
        <Box sx={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {(() => {
            // Determine which nav entries to render
            let entries: NavEntry[];
            if (workspace === 'admin') {
              const base = isPlatformHost && !isSingleTenant ? platformAdminNav : tenantAdminNav;
              entries = base.filter((entry) => {
                if (!isNavItem(entry)) return true;
                if (entry.to === '/admin/billing' && !config.features.billing) return false;
                if (entry.to === '/admin/auth' && !config.features.sso) return false;
                return true;
              });
            } else if (isPlatformHost) {
              entries = [];
            } else {
              const navMap: Record<string, NavEntry[]> = {
                ops: operations,
                'master-data': masterData,
                it: itOperations,
                portfolio: portfolioNav,
              };
              entries = navMap[workspace] || [];
            }

            // Filter items by permission (dividers pass through)
            const visible = entries.filter((entry) => {
              if (!isNavItem(entry)) return true;
              return !entry.resource || hasLevel(entry.resource, 'reader');
            });

            return (
              <List>
                {visible.map((entry, idx) => {
                  // Render dividers
                  if (!isNavItem(entry)) {
                    if (!navOpen) return null;
                    if (entry.divider) {
                      return (
                        <ListSubheader
                          key={`divider-${idx}`}
                          sx={{
                            lineHeight: '32px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            mt: idx === 0 ? 0 : 1,
                          }}
                        >
                          {entry.divider}
                        </ListSubheader>
                      );
                    }
                    return <Divider key={`divider-${idx}`} sx={{ my: 1 }} />;
                  }

                  // Render nav items
                  const button = (
                    <ListItemButton
                      key={entry.to}
                      component={Link}
                      to={entry.to}
                      selected={location.pathname === entry.to || location.pathname.startsWith(entry.to + '/')}
                      sx={{
                        minHeight: 48,
                        justifyContent: navOpen ? 'initial' : 'center',
                        px: 2.5,
                      }}
                    >
                      <ListItemIcon sx={{
                        minWidth: 0,
                        mr: navOpen ? 3 : 'auto',
                        justifyContent: 'center',
                      }}>
                        {entry.icon}
                      </ListItemIcon>
                      {navOpen && <ListItemText primary={entry.label} />}
                    </ListItemButton>
                  );
                  return navOpen ? (
                    button
                  ) : (
                    <Tooltip key={entry.to} title={entry.label} placement="right">
                      <Box>{button}</Box>
                    </Tooltip>
                  );
                })}
              </List>
            );
          })()}
        </Box>
      </Drawer>}

      <Box component="main" sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Toolbar />
        {config.features.billing && <SubscriptionBanner />}
        <Outlet />
      </Box>
    </Box>
  );
}
