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

export const baseThemeComponents: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      a: {
        color: theme.palette.primary.main,
        '&:visited': {
          color: theme.palette.primary.main,
        },
      },
    }),
  },
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
      root: ({ theme }) => ({
        // Add background so shrunk labels "cut" outlined borders cleanly.
        backgroundColor: theme.palette.background.default,
        paddingLeft: 4,
        paddingRight: 4,
      }),
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      notchedOutline: {
        '& legend': {
          maxWidth: '100%',
        },
      },
    },
  },
};

export function createAppTheme(mode: PaletteMode, brandingPrimaryColors?: BrandingPrimaryColors) {
  const lightPrimary = normalizeHexColor(brandingPrimaryColors?.light);
  const darkPrimary = normalizeHexColor(brandingPrimaryColors?.dark);
  const primaryMain = mode === 'dark'
    ? (darkPrimary ?? lightPrimary)
    : (lightPrimary ?? darkPrimary);

  const baseTheme = createTheme({
    palette: {
      mode,
      ...(primaryMain ? { primary: { main: primaryMain } } : {}),
    },
    components: baseThemeComponents,
  });

  const darkPaletteOverrides = mode === 'dark'
    ? {
      background: {
        default: '#182230',
        paper: '#1f2b3b',
      },
      divider: 'rgba(255,255,255,0.12)',
      text: {
        primary: 'rgba(255,255,255,0.92)',
        secondary: 'rgba(255,255,255,0.68)',
      },
      action: {
        hover: 'rgba(255,255,255,0.08)',
      },
    }
    : {};

  return createTheme(baseTheme, {
    palette: {
      warning: {
        50: mode === 'dark' ? 'rgba(237, 108, 2, 0.12)' : '#fff3e0',
      },
      error: {
        50: mode === 'dark' ? 'rgba(211, 47, 47, 0.12)' : '#ffebee',
      },
      ...darkPaletteOverrides,
    },
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
