import { createTheme } from '@mui/material/styles';
import '@mui/x-data-grid/themeAugmentation';

// Screenshot exact colors - light blue gradient background with dark header
export const screenshotColors = {
  // Light blue gradient background (from user's Figma: 30deg, #C0DAFD -> #FBFBFB -> #C0DAFD)
  bgGradientStart: '#C0DAFD',
  bgGradientMid: '#FBFBFB',
  bgGradientEnd: '#C0DAFD',
  // Dark header/chart background
  darkBg: '#2d3436',
  darkBgLight: '#3d4448',
  // Glassmorphism stat cards
  statCardBg: 'rgba(255, 255, 255, 0.25)',
  statCardBorder: 'rgba(255, 255, 255, 0.4)',
  statCardShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  // Yellow/cream sections
  yellowBg: '#f5f0c8',
  yellowBgLight: '#faf8e8',
  yellowAccent: '#e8e4b8',
  // Chart bar colors (yellow-green gradient)
  chartYellow: '#e8f0a0',
  chartGreen: '#b8e8a0',
  // Text colors
  darkText: '#2d3436',
  lightText: '#ffffff',
  mutedText: '#636e72',
};

// Glassmorphism style for stat cards
export const glassMorphism = {
  background: 'rgba(255, 255, 255, 0.35)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
};

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2d3436',
      light: '#636e72',
      dark: '#1e2426',
    },
    secondary: {
      main: '#ddeef8',
      light: '#e8f4fc',
      dark: '#b8d4e8',
    },
    background: {
      default: '#e8f4fc',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d3436',
      secondary: '#636e72',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#2d3436',
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      color: '#2d3436',
    },
    body2: {
      color: '#636e72',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: `linear-gradient(30deg, ${screenshotColors.bgGradientStart} 0%, ${screenshotColors.bgGradientMid} 51%, ${screenshotColors.bgGradientEnd} 100%)`,
          minHeight: '100vh',
          margin: 0,
          padding: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
        },
      },
    },
  },
});
