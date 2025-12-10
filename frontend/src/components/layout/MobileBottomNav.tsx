import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton } from '@mui/material';
import {
  DashboardOutlined as DashboardIcon,
  WbSunnyOutlined as SunIcon,
  PhoneInTalk as CallsIcon,
  WorkspacesOutlined as LeadsIcon,
  BarChart as ReportsIcon,
  Apps as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

// Store expanded state outside component to persist across navigations
const navState = { expanded: true };

const MobileBottomNav: React.FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(navState.expanded);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state to persistent store
  useEffect(() => {
    navState.expanded = isExpanded;
  }, [isExpanded]);

  const isActive = useCallback((path: string) => {
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const handleNavClick = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Navigation items
  const navItems = [
    { icon: DashboardIcon, path: '/dashboard' },
    { icon: SunIcon, path: '/presence' },
    { icon: CallsIcon, path: '/calls' },
    { icon: LeadsIcon, path: '/leads' },
    { icon: ReportsIcon, path: '/reports' },
  ];

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(80, 80, 80, 0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 28,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          height: 56,
          px: 0.75,
          gap: 0.25,
        }}
      >
        {isExpanded ? (
          <>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <IconButton
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  disableRipple
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: active ? '#F8F8F8' : 'transparent',
                    color: active ? '#8D8D8D' : '#F8F8F8',
                    '&:active': { opacity: 0.7 },
                  }}
                >
                  <Icon sx={{ fontSize: 22 }} />
                </IconButton>
              );
            })}
            <IconButton
              onClick={handleToggle}
              disableRipple
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(248, 248, 248, 0.1)',
                color: '#F8F8F8',
                ml: 0.25,
                '&:active': { opacity: 0.7 },
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </>
        ) : (
          <IconButton
            onClick={handleToggle}
            disableRipple
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              color: '#F8F8F8',
              '&:active': { opacity: 0.7 },
            }}
          >
            <MenuIcon sx={{ fontSize: 26 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';

export default MobileBottomNav;
