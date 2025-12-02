import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { RootState } from '../../store/store';
import { logoutUser, clearError } from '../../store/slices/authSlice';

const MobileTopHeader: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  // Get user role
  const userRole = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor'));
  const isCounselor = userRole === 'counselor';

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

      {/* Right Section: Settings + Profile */}
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
