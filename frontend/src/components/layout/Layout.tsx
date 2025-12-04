import React from 'react';
import {
  Box,
  CssBaseline,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import TopNavBar from './TopNavBar';
import MobileTopHeader from './MobileTopHeader';
import MobileBottomNav from './MobileBottomNav';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  // Detect mobile/tablet (under 900px width)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      // Add safe area padding for mobile app (notch, camera, status bar)
      pt: isMobile ? 'env(safe-area-inset-top, 24px)' : 0,
    }}>
      <CssBaseline />
      
      {/* Conditional Navigation based on screen size */}
      {isMobile ? (
        <>
          {/* Mobile: Top Header with Logo, Settings, Profile */}
          <MobileTopHeader />
          
          {/* Main Content with reduced top padding and bottom padding for nav bar */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              px: 1.5,
              pt: 0.5, // Reduced gap between header and content
              pb: 'calc(20px + env(safe-area-inset-bottom, 16px))', // Precise padding for bottom nav
              overflowY: 'auto',
            }}
          >
            {children}
          </Box>
          
          {/* Mobile: Bottom Navigation Bar */}
          <MobileBottomNav />
        </>
      ) : (
        <>
          {/* Desktop: Top Navigation Bar */}
          <TopNavBar />
          
          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: { xs: 2, md: 3 },
              mx: 2,
              mt: 0.5,
              mb: 2,
              overflowY: 'auto',
            }}
          >
            {children}
          </Box>
        </>
      )}
    </Box>
  );
};

export default Layout;