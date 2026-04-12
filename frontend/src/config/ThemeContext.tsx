import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

const THEME_MODE_STORAGE_KEY = 'themeMode';

export type ThemeModePreference = 'light' | 'dark' | 'system';
type PaletteMode = 'light' | 'dark';
type BrandingPrimaryColors = {
  light?: string | null;
  dark?: string | null;
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeHexColor(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!HEX_COLOR_RE.test(text)) return null;
  return text.toUpperCase();
}

type ThemeModeContextValue = {
  mode: ThemeModePreference;
  resolvedMode: PaletteMode;
  setMode: (mode: ThemeModePreference) => void;
};

/* ------------------------------------------------------------------ */
/*  KANAP "Refined Density" design system                             */
/* ------------------------------------------------------------------ */

const FONT_FAMILY = "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO_FONT_FAMILY = "'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code', monospace";

const KANAP_PRIMARY = {
  light: { main: '#1A6B7A', dark: '#134E5A', light: '#E6F4F7', contrastText: '#FFFFFF' },
  dark:  { main: '#4DB8C9', dark: '#2D9AAD', light: 'rgba(77,184,201,0.12)', contrastText: '#0F1117' },
};

function getComponentOverrides(mode: PaletteMode): ThemeOptions['components'] {
  const isDark = mode === 'dark';
  return {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        // Prose links only: MUI Link components that are NOT inside a table,
        // navigation, or other component that manages its own color.
        // The MuiLink-underlineAlways/Hover classes identify standalone Link components.
        '.MuiLink-root': {
          color: theme.palette.primary.main,
          '&:visited': { color: theme.palette.primary.main },
        },
        // Breadcrumb links
        '.MuiBreadcrumbs-root a': {
          color: theme.palette.primary.main,
          '&:visited': { color: theme.palette.primary.main },
        },
      }),
    },
    MuiTextField: {
      defaultProps: {
        variant: 'standard',
        InputLabelProps: { shrink: true },
      },
    },
    MuiSelect: {
      defaultProps: { variant: 'standard' },
    },
    MuiInputLabel: {
      defaultProps: { shrink: true },
      styleOverrides: {
        root: {
          'fontSize': '11px !important' as any,
          'fontWeight': '400 !important' as any,
          'lineHeight': '1.4 !important' as any,
          'letterSpacing': '0 !important' as any,
          'textTransform': 'none !important' as any,
          'color': `${isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'} !important`,
          'position': 'relative !important' as any,
          'transform': 'none !important',
          'marginBottom': '2px !important' as any,
          '&.MuiInputLabel-shrink': {
            transform: 'none !important',
            fontSize: '11px !important' as any,
          },
          '&.Mui-focused': {
            color: `${isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'} !important`,
            fontSize: '11px !important' as any,
          },
        },
        asterisk: {
          color: '#E8920F !important',
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        root: {
          marginTop: '0px !important',
          '&:before': {
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#D1D5DB'}`,
          },
          '&:hover:not(.Mui-disabled):before': {
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : '#9CA3AF'}`,
          },
          '&.Mui-focused:after': {
            borderBottomWidth: '1.5px',
          },
        },
        input: {
          'fontSize': '14px !important' as any,
          'fontWeight': '400 !important' as any,
          'padding': '6px 0 7px !important' as any,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 6 },
        notchedOutline: { '& legend': { maxWidth: '100%' } },
        input: { padding: '8.5px 14px' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none' as const,
          fontWeight: 500,
        },
        sizeMedium: { height: 36 },
        sizeSmall: { height: 32, fontSize: '0.8125rem' },
        outlined: {
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D1D5DB',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#D1D5DB'}`,
          transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: isDark
              ? '0 4px 12px rgba(0,0,0,0.25)'
              : '0 4px 12px rgba(0,0,0,0.05)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 16, '&:last-child': { paddingBottom: 16 } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.75rem' },
        sizeSmall: { height: 22, borderRadius: 9999 },
        sizeMedium: { height: 26, borderRadius: 9999 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: isDark ? '#181A20' : '#FFFFFF',
          color: isDark ? 'rgba(255,255,255,0.95)' : '#111827',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: '48px !important', height: 48 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: isDark ? '#0F1117' : '#FAFAFA',
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          minHeight: 38,
          marginLeft: 8,
          marginRight: 8,
          paddingTop: 7,
          paddingBottom: 7,
          color: 'inherit',
          textDecoration: 'none',
          '&.Mui-selected': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 48,
          color: 'inherit',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 10 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.6875rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 6, fontSize: '0.75rem' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 8 },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 8 },
      },
    },
  };
}

export const baseThemeComponents = getComponentOverrides('light');

export function createAppTheme(mode: PaletteMode, brandingPrimaryColors?: BrandingPrimaryColors) {
  const lightPrimary = normalizeHexColor(brandingPrimaryColors?.light);
  const darkPrimary = normalizeHexColor(brandingPrimaryColors?.dark);
  const hasBranding = !!(lightPrimary || darkPrimary);
  const primaryMain = mode === 'dark'
    ? (darkPrimary ?? lightPrimary)
    : (lightPrimary ?? darkPrimary);

  const kanapPrimary = KANAP_PRIMARY[mode];
  const primary = hasBranding && primaryMain
    ? { main: primaryMain }
    : kanapPrimary;

  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary,
      warning: {
        main: '#E8920F',
        dark: '#C67A00',
        light: isDark ? 'rgba(240,168,48,0.12)' : '#FFF4E0',
        50: isDark ? 'rgba(240,168,48,0.12)' : '#FFF4E0',
      },
      error: {
        main: '#DC2626',
        dark: '#B91C1C',
        light: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
        50: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
      },
      success: {
        main: '#16A34A',
        dark: '#15803D',
        light: isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4',
      },
      info: {
        main: '#2563EB',
        dark: '#1D4ED8',
        light: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
      },
      background: {
        default: isDark ? '#0F1117' : '#FAFAFA',
        paper: isDark ? '#181A20' : '#FFFFFF',
      },
      divider: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
      text: {
        primary: isDark ? 'rgba(255,255,255,0.95)' : '#111827',
        secondary: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280',
      },
      action: {
        hover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      },
    },
    typography: {
      fontFamily: FONT_FAMILY,
      h4: { fontSize: '1.5rem', fontWeight: 600 },
      h5: { fontSize: '1.25rem', fontWeight: 600 },
      h6: { fontSize: '1rem', fontWeight: 600 },
      subtitle1: { fontSize: '0.875rem', fontWeight: 600 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 600 },
      body1: { fontSize: '0.875rem' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem', fontWeight: 500 },
      overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em' },
      button: { fontWeight: 500, textTransform: 'none' as const },
    },
    shape: { borderRadius: 8 },
    shadows: [
      'none',
      isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
      isDark ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.05)',
      ...Array(22).fill(isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.08)'),
    ] as unknown as ThemeOptions['shadows'],
    components: getComponentOverrides(mode),
  });
}

export const lightIslandTheme = createAppTheme('light');

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function parseStoredThemeMode(value: string | null): ThemeModePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

function getInitialSystemPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function usePrintLightMode() {
  const swappedRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const swapToLight = () => {
      const swapped: HTMLElement[] = [];
      const darkGridNodes = document.querySelectorAll<HTMLElement>('.ag-theme-quartz-dark');

      darkGridNodes.forEach((node) => {
        if (node.dataset.printForcedLight === '1') {
          return;
        }

        node.classList.remove('ag-theme-quartz-dark');
        node.classList.add('ag-theme-quartz');
        node.dataset.printForcedLight = '1';
        swapped.push(node);
      });

      swappedRef.current = [...swappedRef.current, ...swapped];
    };

    const restoreThemeClasses = () => {
      swappedRef.current.forEach((node) => {
        if (!node.isConnected || node.dataset.printForcedLight !== '1') {
          return;
        }

        node.classList.remove('ag-theme-quartz');
        node.classList.add('ag-theme-quartz-dark');
        delete node.dataset.printForcedLight;
      });

      swappedRef.current = [];
    };

    const handleBeforePrint = () => {
      swapToLight();
    };

    const handleAfterPrint = () => {
      restoreThemeClasses();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    const printMedia = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
    const legacyPrintMedia = printMedia as (MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    }) | null;
    const handlePrintMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        swapToLight();
      } else {
        restoreThemeClasses();
      }
    };

    if (printMedia) {
      if (printMedia.matches) {
        swapToLight();
      }

      if (typeof printMedia.addEventListener === 'function') {
        printMedia.addEventListener('change', handlePrintMediaChange);
      } else if (legacyPrintMedia && typeof legacyPrintMedia.addListener === 'function') {
        legacyPrintMedia.addListener(handlePrintMediaChange);
      }
    }

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);

      if (printMedia) {
        if (typeof printMedia.removeEventListener === 'function') {
          printMedia.removeEventListener('change', handlePrintMediaChange);
        } else if (legacyPrintMedia && typeof legacyPrintMedia.removeListener === 'function') {
          legacyPrintMedia.removeListener(handlePrintMediaChange);
        }
      }

      restoreThemeClasses();
    };
  }, []);
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeModePreference>(() => {
    if (typeof window === 'undefined') {
      return 'system';
    }

    try {
      return parseStoredThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY));
    } catch {
      return 'system';
    }
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getInitialSystemPrefersDark);

  usePrintLightMode();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    if (typeof legacyMediaQuery.addListener === 'function') {
      legacyMediaQuery.addListener(handleChange);
      return () => legacyMediaQuery.removeListener?.(handleChange);
    }

    return undefined;
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore private mode / storage quota write failures.
    }
  }, [mode]);

  const resolvedMode: PaletteMode = mode === 'system'
    ? (systemPrefersDark ? 'dark' : 'light')
    : mode;

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    resolvedMode,
    setMode,
  }), [mode, resolvedMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
}
