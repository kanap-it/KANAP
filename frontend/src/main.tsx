import React from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { SessionManager } from './auth/SessionManager'
import { WithQueryClient } from './lib/queryClient'
import { ThemeModeProvider, createAppTheme, useThemeMode } from './config/ThemeContext'
import { TenantProvider, useTenant } from './tenant/TenantContext'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import './styles/print.css'

function AppShell() {
  const { resolvedMode } = useThemeMode()
  const { primaryColorLight, primaryColorDark } = useTenant()
  const theme = React.useMemo(
    () => createAppTheme(resolvedMode, { light: primaryColorLight, dark: primaryColorDark }),
    [resolvedMode, primaryColorDark, primaryColorLight],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <WithQueryClient>
          <AuthProvider>
            <SessionManager>
              <App />
            </SessionManager>
          </AuthProvider>
        </WithQueryClient>
      </BrowserRouter>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <TenantProvider>
        <AppShell />
      </TenantProvider>
    </ThemeModeProvider>
  </React.StrictMode>
)
