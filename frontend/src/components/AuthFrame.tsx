import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import { ReactNode } from 'react';
import { useThemeMode } from '../config/ThemeContext';
import { useTenant } from '../tenant/TenantContext';

interface AuthFrameProps {
  children: ReactNode;
}

export default function AuthFrame({ children }: AuthFrameProps) {
  const { mode, resolvedMode, setMode } = useThemeMode();
  const { logoUrl, tenantName, useLogoInDark } = useTenant();

  const themeModeLabel = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';
  const themeModeIcon = mode === 'dark'
    ? <DarkModeOutlinedIcon />
    : mode === 'light'
      ? <LightModeOutlinedIcon />
      : <BrightnessAutoIcon />;
  const showLogo = !!logoUrl && (resolvedMode !== 'dark' || useLogoInDark);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AppBar position="static">
        <Toolbar
          sx={{
            px: { xs: 2, sm: 3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showLogo ? (
              <Box
                component="img"
                src={logoUrl || undefined}
                alt={tenantName || 'Logo'}
                sx={{ height: 32, maxWidth: 140, objectFit: 'contain' }}
              />
            ) : (
              <Box
                component="img"
                src="/icon-192.png"
                alt="KANAP"
                sx={{ width: 32, height: 32 }}
              />
            )}
            {!showLogo && (
              <Typography variant="h6" fontWeight={700} color="inherit">
                KANAP
              </Typography>
            )}
          </Box>

          <Tooltip title={`Theme: ${themeModeLabel} (click to switch)`}>
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')}
              aria-label={`Theme: ${themeModeLabel}`}
            >
              {themeModeIcon}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          px: 2,
          pt: 'calc(25vh - 60px)',
          pb: { xs: 4, md: 6 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
