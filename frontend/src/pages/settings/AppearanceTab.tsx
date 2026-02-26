import { FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useThemeMode } from '../../config/ThemeContext';

export default function AppearanceTab() {
  const { mode, resolvedMode, setMode } = useThemeMode();

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Appearance
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Choose how Kanap should look in this browser.
      </Typography>
      <RadioGroup
        value={mode}
        onChange={(event) => setMode(event.target.value as 'light' | 'dark' | 'system')}
      >
        <FormControlLabel value="light" control={<Radio />} label="Light" />
        <FormControlLabel value="dark" control={<Radio />} label="Dark" />
        <FormControlLabel value="system" control={<Radio />} label="System" />
      </RadioGroup>
      <Typography variant="caption" color="text.secondary">
        Active mode: {resolvedMode === 'dark' ? 'Dark' : 'Light'}
      </Typography>
    </Stack>
  );
}
