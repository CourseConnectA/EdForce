import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
  Tooltip,
  keyframes,
} from '@mui/material';
import {
  DashboardOutlined as GridIcon,
  WbSunnyOutlined as SunIcon,
  AutoAwesomeOutlined as StarIcon,
  PersonAddAlt as PersonAddIcon,
  BarChart as AnalyticsIcon,
  CalendarMonth as CalendarIcon,
  BugReportOutlined as BugsIcon,
  WorkspacesOutlined as LeadIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  PhoneInTalk as CallIcon,
  Circle as CircleIcon,
  Groups as GroupsIcon,
  PhoneInTalk as OnCallIcon,
  PowerSettingsNew as OfflineIcon,
} from '@mui/icons-material';
import { RootState } from '../../store/store';
import { logoutUser } from '../../store/slices/authSlice';
import webSocketService from '../../services/webSocketService';

// Pulse animation for online status
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

const TopNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  
  // Get user role
  const userRole = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();
  
  // Counselor presence status
  const [myPresence, setMyPresence] = useState<string>((user as any)?.presence || 'offline');
  
  // Expandable states
  const [sunExpanded, setSunExpanded] = useState(false);
  const [clockExpanded, setClockExpanded] = useState(false);

  // Subscribe to presence updates for counselors
  useEffect(() => {
    if (userRole !== 'counselor') return;
    
    const handlePresenceUpdate = (data: { userId: string; presence: string }) => {
      if (String(data.userId) === String((user as any)?.id)) {
        setMyPresence(data.presence);
      }
    };
    
    const unsubscribe = webSocketService.onPresenceUpdate(handlePresenceUpdate);
    
    return () => {
      unsubscribe();
    };
  }, [userRole, user]);

  // Update presence when user changes
  useEffect(() => {
    if ((user as any)?.presence) {
      setMyPresence((user as any).presence);
    }
  }, [(user as any)?.presence]);

  // Presence status config
  const presenceConfig = useMemo(() => ({
    online: {
      label: 'Online',
      color: '#4caf50',
      bgColor: 'rgba(76, 175, 80, 0.15)',
      icon: <CircleIcon sx={{ fontSize: 10 }} />,
    },
    offline: {
      label: 'Offline',
      color: '#9e9e9e',
      bgColor: 'rgba(158, 158, 158, 0.15)',
      icon: <OfflineIcon sx={{ fontSize: 14 }} />,
    },
    in_meeting: {
      label: 'In Meeting',
      color: '#ff9800',
      bgColor: 'rgba(255, 152, 0, 0.15)',
      icon: <GroupsIcon sx={{ fontSize: 14 }} />,
    },
    on_call: {
      label: 'On Call',
      color: '#2196f3',
      bgColor: 'rgba(33, 150, 243, 0.15)',
      icon: <OnCallIcon sx={{ fontSize: 14 }} />,
    },
  }), []);

  const currentPresence = presenceConfig[myPresence as keyof typeof presenceConfig] || presenceConfig.offline;

  const handleProfileClose = () => setProfileAnchor(null);
  const handleLogout = () => {
    dispatch(logoutUser() as any);
    handleProfileClose();
    navigate('/login');
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

  const getDisplayName = () => {
    const first = user?.firstName?.trim() || '';
    if (first) return first;
    return 'Aryan';
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Circle icon button style (default state)
  const circleIconStyle = (active: boolean = false) => ({
    width: 50,
    height: 50,
    border: '1.5px solid #d0d8e0',
    borderRadius: '50%',
    backgroundColor: active ? 'rgba(74, 144, 217, 0.1)' : 'transparent',
    color: active ? '#4a90d9' : '#636e72',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.04)',
      borderColor: '#4a90d9',
    },
  });

  // Handle sun icon click
  const handleSunClick = () => {
    setSunExpanded(!sunExpanded);
    if (clockExpanded) setClockExpanded(false);
  };

  // Handle clock icon click
  const handleClockClick = () => {
    setClockExpanded(!clockExpanded);
    if (sunExpanded) setSunExpanded(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 1.5,
        backgroundColor: 'transparent',
        position: 'relative',
      }}
    >
      {/* Left Section: Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: 60, md: 140 }, zIndex: 1 }}>
        {/* EdForce Logo - Using Image */}
        <Box 
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <img
            src="/favicon1.png"
            alt="Edforce"
            style={{
              height: 80,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>
      </Box>

      {/* Center Section: All Icons - Absolutely positioned for true centering */}
      <Box 
        sx={{ 
          position: { xs: 'static', md: 'absolute' },
          left: { md: '50%' },
          transform: { md: 'translateX(-50%)' },
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 1 },
          justifyContent: 'center',
          flex: { xs: 1, md: 'none' },
        }}
      >
        {/* Grid/Dashboard Icon */}
        <IconButton
          size="small"
          onClick={() => navigate('/dashboard')}
          sx={circleIconStyle(isActive('/dashboard'))}
        >
          <GridIcon sx={{ fontSize: 22 }} />
        </IconButton>

        {/* Sun Icon - Expandable */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: sunExpanded ? '#2d3436' : 'transparent',
            borderRadius: '25px',
            border: sunExpanded ? 'none' : '1.5px solid #d0d8e0',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
          }}
        >
          <IconButton
            size="small"
            onClick={handleSunClick}
            sx={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: sunExpanded ? '#4a5568' : 'transparent',
              color: sunExpanded ? '#fff' : '#636e72',
              border: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: sunExpanded ? '#4a5568' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <SunIcon sx={{ fontSize: 24 }} />
          </IconButton>
          
          <Collapse in={sunExpanded} orientation="horizontal" timeout={300}>
            <Box sx={{ display: 'flex', alignItems: 'center', pr: 2 }}>
              <Typography
                onClick={() => { navigate('/presence'); setSunExpanded(false); }}
                sx={{
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  px: 2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                Presence
              </Typography>
              <Typography
                onClick={() => { navigate('/rule'); setSunExpanded(false); }}
                sx={{
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  px: 2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                Rule
              </Typography>
            </Box>
          </Collapse>
        </Box>

        {/* Call Management Icon */}
        <Tooltip title="Call Management" arrow placement="bottom" enterDelay={200} leaveDelay={0}>
          <IconButton
            size="small"
            onClick={() => navigate('/calls')}
            sx={circleIconStyle(isActive('/calls'))}
          >
            <CallIcon sx={{ fontSize: 24 }} />
          </IconButton>
        </Tooltip>

        {/* Person Add Icon */}
       <Tooltip title="Leads" arrow placement="bottom" enterDelay={200} leaveDelay={0}>
        <IconButton
          size="small"
          onClick={() => navigate('/leads')}
          sx={circleIconStyle(isActive('/leads'))}
        >
          <LeadIcon sx={{ fontSize: 22 }} />
        </IconButton>
       </Tooltip>

        {/* Analytics/Bar Chart Icon */}
        <Tooltip title="Reports" arrow placement="bottom" enterDelay={200} leaveDelay={0}>
          <IconButton
            size="small"
            onClick={() => navigate('/reports')}
            sx={circleIconStyle(isActive('/reports'))}
          >
            <AnalyticsIcon sx={{ fontSize: 24 }} />
          </IconButton>
        </Tooltip>

         {/* Clock Icon - Expandable */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: clockExpanded ? '#2d3436' : 'transparent',
            borderRadius: '25px',
            border: clockExpanded ? 'none' : '1.5px solid #d0d8e0',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
          }}
        >
          <IconButton
            size="small"
            onClick={handleClockClick}
            sx={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: clockExpanded ? '#4a90d9' : 'transparent',
              color: clockExpanded ? '#fff' : '#636e72',
              border: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: clockExpanded ? '#4a90d9' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <StarIcon sx={{ fontSize: 22 }} />
          </IconButton>
          
          <Collapse in={clockExpanded} orientation="horizontal" timeout={300}>
            <Box sx={{ display: 'flex', alignItems: 'center', pr: 2 }}>
              <Typography
                onClick={() => { navigate('/marketing'); setClockExpanded(false); }}
                sx={{
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  px: 2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                Email
              </Typography>
              <Typography
                onClick={() => { navigate('/whatsapp'); setClockExpanded(false); }}
                sx={{
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  px: 2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                WhatsApp
              </Typography>
            </Box>
          </Collapse>
        </Box>

        {/* Calendar Icon */}
        <Tooltip title="Tasks" arrow placement="bottom" enterDelay={200} leaveDelay={0}>
          <IconButton
            size="small"
            onClick={() => navigate('/tasks')}
            sx={circleIconStyle(isActive('/tasks'))}
          >
            <CalendarIcon sx={{ fontSize: 24 }} />
          </IconButton>
        </Tooltip>

        {/* Notes Icon */}
        <IconButton
          size="small"
          onClick={() => navigate('/cases')}
          sx={circleIconStyle(isActive('/cases'))}
        >
          <BugsIcon sx={{ fontSize: 22 }} />
        </IconButton>

        {/* Add User Icon - Hidden for counselors */}
        {userRole !== 'counselor' && (
          <Tooltip title="Add User" arrow placement="bottom" enterDelay={200} leaveDelay={0}>
            <IconButton
              size="small"
              onClick={() => navigate('/users')}
              sx={circleIconStyle(isActive('/users'))}
            >
              <PersonAddIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Settings Icon - Hidden for counselors */}
        {userRole !== 'counselor' && (
          <Tooltip title="Settings" arrow placement="bottom" enterDelay={200} leaveDelay={0}>
            <IconButton
              size="small"
              onClick={() => navigate('/settings')}
              sx={circleIconStyle(isActive('/settings'))}
            >
              <SettingsIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Right Section: Profile */}
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: 'auto', md: 140 }, justifyContent: 'flex-end', gap: { xs: 1, sm: 2 }, zIndex: 1 }}>
        
        {/* Counselor Presence Status Indicator - Compact on mobile */}
        {userRole === 'counselor' && (
          <Tooltip title="Click to change your status" arrow placement="bottom">
            <Box
              onClick={() => navigate('/presence')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                height: 36,
                borderRadius: '18px',
                backgroundColor: currentPresence.bgColor,
                border: `1.5px solid ${currentPresence.color}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                animation: myPresence === 'online' ? `${pulse} 2s infinite` : 'none',
                px: { xs: 1.5, sm: 2 },
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: `0 4px 12px ${currentPresence.color}40`,
                },
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: currentPresence.color,
                }}
              />
              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: currentPresence.color,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentPresence.label}
              </Typography>
            </Box>
          </Tooltip>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
          }}
          onClick={(e) => setProfileAnchor(e.currentTarget)}
        >
          <Typography
            sx={{
              display: { xs: 'none', md: 'block' },
              color: '#2d3436',
              fontSize: '1.1rem',
              fontWeight: 500,
            }}
          >
            Hey, {getDisplayName()}
          </Typography>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: '#7EB1FD',
              borderRadius: 0.5,
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {getInitials()}
          </Avatar>
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={handleProfileClose}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: 1,
              minWidth: 180,
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

export default TopNavBar;
