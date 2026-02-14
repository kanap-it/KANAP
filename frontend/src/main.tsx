import React from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { SessionManager } from './auth/SessionManager'
import { WithQueryClient } from './lib/queryClient'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import './styles/print.css'

// Create a theme with default props for TextField labels to always appear shrunk (top-left)
const theme = createTheme({
  components: {
    MuiTextField: {
      defaultProps: {
        InputLabelProps: {
          shrink: true,
        },
      },
    },
    MuiInputLabel: {
      defaultProps: {
        shrink: true,
      },
      styleOverrides: {
        root: {
          // Add background to label so it properly "cuts" the border when shrunk
          backgroundColor: '#fff',
          paddingLeft: 4,
          paddingRight: 4,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          // Ensure the legend (notch) is visible
          '& legend': {
            maxWidth: '100%',
          },
        },
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>
)
