import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  keyframes,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { RootState } from '../../store/store';
import { logoutUser, clearError } from '../../store/slices/authSlice';
import webSocketService from '../../services/webSocketService';

// Pulse animation for online status
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

// Presence configuration
const presenceConfig: Record<string, { color: string; label: string; bgColor: string }> = {
  online: { color: '#4caf50', label: 'Online', bgColor: 'rgba(76, 175, 80, 0.15)' },
  offline: { color: '#9e9e9e', label: 'Offline', bgColor: 'rgba(158, 158, 158, 0.15)' },
  in_meeting: { color: '#ff9800', label: 'In Meeting', bgColor: 'rgba(255, 152, 0, 0.15)' },
  on_call: { color: '#2196f3', label: 'On Call', bgColor: 'rgba(33, 150, 243, 0.15)' },
};

const MobileTopHeader: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [myPresence, setMyPresence] = useState<string>('online');

  // Get user role
  const userRole = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor'));
  const isCounselor = userRole === 'counselor';

  // Subscribe to presence updates for counselors
  useEffect(() => {
    if (!isCounselor || !user) return;

    // Set initial presence from user data
    if ((user as any)?.presence) {
      setMyPresence((user as any).presence);
    }

    // Listen for WebSocket presence updates
    const handlePresenceUpdate = (data: { userId: string; presence: string }) => {
      if (data.userId === (user as any)?.id) {
        setMyPresence(data.presence);
      }
    };

    webSocketService.onPresenceUpdate(handlePresenceUpdate);

    return () => {
      // Cleanup listener
      (webSocketService as any).presenceListeners?.delete(handlePresenceUpdate);
    };
  }, [isCounselor, user]);

  // Get current presence config
  const currentPresence = useMemo(() => {
    return presenceConfig[myPresence] || presenceConfig.online;
  }, [myPresence]);

  const handleProfileClose = () => setProfileAnchor(null);

  const handleLogout = async () => {
    handleProfileClose();
    dispatch(clearError());
    navigate('/login', { replace: true });
    dispatch(logoutUser() as any);
  };

  const getInitials = () => {
    const first = user?.firstName?.trim() || '';
    const last = user?.lastName?.trim() || '';
    const firstInitial = first ? first[0].toUpperCase() : '';
    const lastInitial = last ? last[0].toUpperCase() : '';
    if (firstInitial && lastInitial) return `${firstInitial}${lastInitial}`;
    if (firstInitial) return firstInitial;
    return 'AG';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        py: 1,
        backgroundColor: 'transparent',
      }}
    >
      {/* Left Section: Logo */}
      <Box
        sx={{
          cursor: 'pointer',
        }}
        onClick={() => navigate('/dashboard')}
      >
       <img
            src="/favicon1.png"
            alt="Edforce"
            style={{
              height: 50,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
      </Box>

      {/* Right Section: Settings + Presence + Profile */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Settings Icon - Hidden for counselors */}
        {!isCounselor && (
          <IconButton
            size="small"
            onClick={() => navigate('/settings')}
            sx={{
              width: 44,
              height: 44,
              border: '1.5px solid #d0d8e0',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              color: '#636e72',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <SettingsIcon sx={{ fontSize: 22 }} />
          </IconButton>
        )}

        {/* Presence Status Indicator - Only for counselors */}
        {isCounselor && (
          <Box
            onClick={() => navigate('/presence')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.75,
              borderRadius: '20px',
              backgroundColor: currentPresence.bgColor,
              cursor: 'pointer',
              border: `1px solid ${currentPresence.color}30`,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: `0 2px 8px ${currentPresence.color}40`,
              },
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: currentPresence.color,
                animation: myPresence === 'online' ? `${pulse} 2s infinite` : 'none',
              }}
            />
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: currentPresence.color,
                textTransform: 'capitalize',
              }}
            >
              {currentPresence.label}
            </Typography>
          </Box>
        )}

        {/* Profile Avatar */}
        <Avatar
          onClick={(e) => setProfileAnchor(e.currentTarget)}
          sx={{
            width: 44,
            height: 44,
            bgcolor: '#7EB1FD',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {getInitials()}
        </Avatar>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={handleProfileClose}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: 2,
              minWidth: 160,
            },
          }}
        >
          <MenuItem onClick={handleLogout} sx={{ color: '#ff6b6b' }}>
            <LogoutIcon sx={{ mr: 1.5, fontSize: '1.1rem' }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default MobileTopHeader;
