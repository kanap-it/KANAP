import '@mui/material/styles';
import type { ResolvedKanapPalette } from './pages/tasks/theme/taskDetailTokens';

declare module '@mui/material/styles' {
  interface PaletteColor {
    50?: string;
  }

  interface SimplePaletteColorOptions {
    50?: string;
  }

  interface Palette {
    kanap: ResolvedKanapPalette;
  }

  interface PaletteOptions {
    kanap?: ResolvedKanapPalette;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    action: true;
    'action-danger': true;
  }
}
