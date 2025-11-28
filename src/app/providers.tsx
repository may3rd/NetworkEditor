"use client";

import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ReactNode, useState, useMemo } from "react";
import { ColorModeContext } from "@/contexts/ColorModeContext";

const getDesignTokens = (mode: 'light' | 'dark') => ({
  typography: {
    fontFamily: 'var(--font-inter), "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none' as const,
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '9999px', // Pill shape for buttons
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient overlay in dark mode
        },
      },
    },
  },
  palette: {
    mode,
    ...(mode === 'light' ? {
      primary: {
        main: '#0284c7', // Sky 600
      },
      background: {
        default: '#f8fafc', // Slate 50
        paper: 'rgba(255, 255, 255, 0.8)',
      },
      text: {
        primary: '#0f172a', // Slate 900
        secondary: '#475569', // Slate 600
      },
      borderRight: '#e2e8f0', // Slate 200
    } : {
      primary: {
        main: '#38bdf8', // Sky 400
      },
      secondary: {
        main: '#fbbf24', // Amber 400
      },
      background: {
        default: '#0f172a', // Slate 900
        paper: 'rgba(30, 41, 59, 0.7)', // Slate 800 with opacity
      },
      text: {
        primary: '#f1f5f9', // Slate 100
        secondary: '#94a3b8', // Slate 400
      },
      borderRight: 'rgba(255, 255, 255, 0.08)',
    }),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <AppRouterCacheProvider>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
