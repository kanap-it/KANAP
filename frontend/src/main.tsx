import React from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import { deDE, enUS, esES, frFR } from '@mui/material/locale'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { SessionManager } from './auth/SessionManager'
import { WithQueryClient } from './lib/queryClient'
import { ThemeModeProvider, createAppTheme, useThemeMode } from './config/ThemeContext'
import { TenantProvider, useTenant } from './tenant/TenantContext'
import './i18n'
import { useLocale } from './i18n/useLocale'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import './styles/print.css'

const MUI_LOCALES = {
  en: enUS,
  fr: frFR,
  de: deDE,
  es: esES,
} as const

function AppShell() {
  const { resolvedMode } = useThemeMode()
  const { primaryColorLight, primaryColorDark } = useTenant()
  const locale = useLocale()
  const theme = React.useMemo(
    () => createTheme(
      createAppTheme(resolvedMode, { light: primaryColorLight, dark: primaryColorDark }),
      MUI_LOCALES[locale] ?? enUS,
    ),
    [resolvedMode, primaryColorDark, primaryColorLight, locale],
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
