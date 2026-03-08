import React from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

export type PortfolioWorkspaceShellTab = {
  key: string;
  label: string;
  disabled?: boolean;
};

type PortfolioWorkspaceShellProps = {
  activeTab: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  headerContent: React.ReactNode;
  onTabChange: (nextTab: string) => void;
  sidebar: React.ReactNode;
  sidebarDefaultWidth?: number;
  sidebarMaxWidth?: number;
  sidebarMinWidth?: number;
  sidebarStorageKey: string;
  sidebarTitle?: string;
  tabs: PortfolioWorkspaceShellTab[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function PortfolioWorkspaceShell({
  activeTab,
  children,
  headerActions,
  headerContent,
  onTabChange,
  sidebar,
  sidebarDefaultWidth = 320,
  sidebarMaxWidth = 440,
  sidebarMinWidth = 280,
  sidebarStorageKey,
  sidebarTitle = 'Properties',
  tabs,
}: PortfolioWorkspaceShellProps) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const [mobilePanelOpen, setMobilePanelOpen] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    if (typeof window === 'undefined') return sidebarDefaultWidth;
    const raw = window.localStorage.getItem(sidebarStorageKey);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed)
      ? clamp(parsed, sidebarMinWidth, sidebarMaxWidth)
      : sidebarDefaultWidth;
  });
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isNarrow) {
      setMobilePanelOpen(false);
    }
  }, [isNarrow]);

  React.useEffect(() => {
    if (!isResizing || isNarrow) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!sidebarRef.current) return;
      const containerLeft = sidebarRef.current.getBoundingClientRect().left;
      const nextWidth = clamp(event.clientX - containerLeft, sidebarMinWidth, sidebarMaxWidth);
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.localStorage.setItem(sidebarStorageKey, String(sidebarWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isNarrow, isResizing, sidebarMaxWidth, sidebarMinWidth, sidebarStorageKey, sidebarWidth]);

  const mobileDrawer = (
    <Drawer
      anchor="left"
      open={mobilePanelOpen}
      onClose={() => setMobilePanelOpen(false)}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: 'min(100vw, 420px)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {sidebarTitle}
        </Typography>
        <IconButton size="small" onClick={() => setMobilePanelOpen(false)} title="Close properties">
          <ChevronLeftIcon />
        </IconButton>
      </Stack>
      <Box sx={{ p: 2, overflow: 'auto', flex: 1, minHeight: 0 }}>
        {sidebar}
      </Box>
    </Drawer>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 560 }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          bgcolor: 'background.default',
          pb: 1.5,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 1.5 }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {headerContent}
          </Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            flexWrap="wrap"
            useFlexGap
          >
            {isNarrow && (
              <IconButton
                size="small"
                onClick={() => setMobilePanelOpen(true)}
                title="Open properties"
                aria-label="Open properties"
              >
                <MenuOpenIcon />
              </IconButton>
            )}
            {headerActions}
          </Stack>
        </Stack>

        <Tabs
          value={activeTab}
          onChange={(_, nextValue) => onTabChange(String(nextValue))}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={tab.label}
              disabled={tab.disabled}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isNarrow && (
          <Box
            ref={sidebarRef}
            sx={{
              width: sidebarWidth,
              flexShrink: 0,
              position: 'relative',
              borderRight: 1,
              borderColor: 'divider',
              pr: 0.5,
            }}
          >
            <Box sx={{ height: '100%', overflow: 'auto', pr: 1.5 }}>
              {sidebar}
            </Box>
            <Box
              onMouseDown={() => setIsResizing(true)}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 6,
                height: '100%',
                cursor: 'col-resize',
                '&:hover': { bgcolor: 'primary.main', opacity: 0.18 },
                ...(isResizing && { bgcolor: 'primary.main', opacity: 0.3 }),
              }}
            />
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0, pl: { xs: 0, md: 3 }, pt: 2 }}>
          {children}
        </Box>
      </Box>

      {isNarrow && mobileDrawer}
    </Box>
  );
}
