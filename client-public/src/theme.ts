import { createTheme } from '@mui/material/styles';

export const COLORS = {
  primary:     '#1F4E79',
  accent:      '#C0392B',
  surfaceTint: '#FBEEF0',
  ochre:       '#C9A227',
  ink:         '#1A1A1A',
} as const;

const displayFont = '"Lora", "Source Serif 4", Georgia, serif';
const bodyFont    = '"Public Sans", "Inter", system-ui, sans-serif';

export const theme = createTheme({
  palette: {
    primary:    { main: COLORS.primary },
    secondary:  { main: COLORS.accent },
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    text:       { primary: COLORS.ink },
  },
  typography: {
    fontFamily: bodyFont,
    h1: { fontFamily: displayFont },
    h2: { fontFamily: displayFont },
    h3: { fontFamily: displayFont },
    h4: { fontFamily: displayFont },
    h5: { fontFamily: displayFont },
    h6: { fontFamily: displayFont },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});
