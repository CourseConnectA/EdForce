import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  Fade,
  Zoom,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  FiberManualRecord as DotIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  DeleteOutline as DeleteIcon,
  PhoneInTalk as OnCallIcon,
  Groups as MeetingIcon,
  WifiOff as OfflineIcon,
  Wifi as OnlineIcon,
  Business as CenterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { RootState } from '../../store/store';
import { ManagerWithCounselors, PresenceState, usersService } from '../../services/usersService';
import { webSocketService } from '../../services/webSocketService';

// Presence configuration
const presenceConfig: Record<PresenceState, { color: string; label: string; icon: React.ReactElement; bgColor: string }> = {
  online: { 
    color: '#22c55e', 
    label: 'Online', 
    icon: <OnlineIcon />,
    bgColor: 'rgba(34, 197, 94, 0.1)',
  },
  on_call: { 
    color: '#3b82f6', 
    label: 'On Call', 
    icon: <OnCallIcon />,
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  in_meeting: { 
    color: '#f59e0b', 
    label: 'In Meeting', 
    icon: <MeetingIcon />,
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  offline: { 
    color: '#94a3b8', 
    label: 'Offline', 
    icon: <OfflineIcon />,
    bgColor: 'rgba(148, 163, 184, 0.1)',
  },
};

const PresencePage: React.FC = () => {
  const theme = useTheme();
  const { user } = useSelector((s: RootState) => s.auth);
  const currentUserId = (user as any)?.id;
  const role = ((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();
  const isSuperAdmin = role === 'super-admin' || !!(user as any)?.isAdmin;
  const isCounselor = role === 'counselor';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ManagerWithCounselors[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; kind: 'manager' | 'counselor'; cascadeCount?: number } | null>(null);
  
  // Current user's presence (for counselor toggle)
  const [myPresence, setMyPresence] = useState<PresenceState>('offline');
  const [updatingPresence, setUpdatingPresence] = useState(false);

  // Fetch hierarchy data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await usersService.getHierarchy();
      setData(resp.data || []);
      setError(null);
      
      // Find current user's presence
      if (currentUserId) {
        for (const group of resp.data || []) {
          if (group.centerManager.id === currentUserId) {
            setMyPresence(group.centerManager.presence);
            break;
          }
          const counselor = group.counselors.find(c => c.id === currentUserId);
          if (counselor) {
            setMyPresence(counselor.presence);
            break;
          }
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load presence data');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    // For counselors, just get their own presence without calling hierarchy
    if (isCounselor) {
      setLoading(false);
      // Get presence from user object
      setMyPresence(((user as any)?.presence as PresenceState) || 'offline');
    } else {
      fetchData();
    }
  }, [fetchData, isCounselor, user]);

  // Subscribe to WebSocket presence updates
  useEffect(() => {
    const unsubscribe = webSocketService.onPresenceUpdate((update) => {
      setData(prev => prev.map(group => ({
        ...group,
        centerManager: group.centerManager.id === update.userId
          ? { ...group.centerManager, presence: update.presence as PresenceState }
          : group.centerManager,
        counselors: group.counselors.map(c => 
          c.id === update.userId 
            ? { ...c, presence: update.presence as PresenceState }
            : c
        ),
      })));
      
      // Update my presence if it's me
      if (update.userId === currentUserId) {
        setMyPresence(update.presence as PresenceState);
      }
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Handle presence toggle for counselors
  const handlePresenceChange = async (_: React.MouseEvent<HTMLElement>, newPresence: PresenceState | null) => {
    if (!newPresence || newPresence === myPresence) return;
    
    setUpdatingPresence(true);
    try {
      await usersService.updateMyPresence(newPresence);
      setMyPresence(newPresence);
    } catch (e: any) {
      console.error('Failed to update presence:', e);
    } finally {
      setUpdatingPresence(false);
    }
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data
      .map(group => ({
        ...group,
        counselors: group.counselors.filter(c => 
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
          c.userName.toLowerCase().includes(query)
        ),
      }))
      .filter(group => 
        group.counselors.length > 0 ||
        `${group.centerManager.firstName} ${group.centerManager.lastName}`.toLowerCase().includes(query) ||
        (group.centerManager.centerName || '').toLowerCase().includes(query)
      );
  }, [data, searchQuery]);

  // Group by center
  const centerGroups = useMemo(() => {
    const groups = new Map<string, ManagerWithCounselors[]>();
    for (const group of filteredData) {
      const centerName = group.centerManager.centerName || 'Unassigned';
      const existing = groups.get(centerName) || [];
      existing.push(group);
      groups.set(centerName, existing);
    }
    return groups;
  }, [filteredData]);

  // Global stats
  const stats = useMemo(() => {
    const counts: Record<PresenceState, number> = { online: 0, on_call: 0, in_meeting: 0, offline: 0 };
    data.forEach(group => {
      group.counselors.forEach(c => {
        counts[c.presence] = (counts[c.presence] || 0) + 1;
      });
    });
    return counts;
  }, [data]);

  const toggleCenter = (centerName: string) => {
    setExpandedCenters(prev => {
      const next = new Set(prev);
      if (next.has(centerName)) next.delete(centerName);
      else next.add(centerName);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await usersService.deleteUser(confirmDelete.id);
      await fetchData();
    } finally {
      setConfirmDelete(null);
    }
  };

  // Counselor view - simple presence toggle
  if (isCounselor) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          Your Status
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Set your availability status to let your team know when you're available
        </Typography>

        <Card 
          elevation={0} 
          sx={{ 
            borderRadius: 4, 
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(presenceConfig[myPresence].color, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack alignItems="center" spacing={3}>
              {/* Current status display */}
              <Zoom in key={myPresence}>
                <Box 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: presenceConfig[myPresence].bgColor,
                    border: `3px solid ${presenceConfig[myPresence].color}`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {React.cloneElement(presenceConfig[myPresence].icon, { 
                    sx: { fontSize: 48, color: presenceConfig[myPresence].color } 
                  })}
                </Box>
              </Zoom>

              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  color: presenceConfig[myPresence].color,
                  transition: 'color 0.3s ease',
                }}
              >
                {presenceConfig[myPresence].label}
              </Typography>

              <Divider sx={{ width: '100%' }} />

              {/* Toggle buttons */}
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                  Change your status
                </Typography>
                <ToggleButtonGroup
                  value={myPresence}
                  exclusive
                  onChange={handlePresenceChange}
                  disabled={updatingPresence}
                  fullWidth
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                    '& .MuiToggleButton-root': {
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                      py: 1.5,
                      textTransform: 'none',
                      '&.Mui-selected': {
                        fontWeight: 600,
                      },
                    },
                  }}
                >
                  {(Object.entries(presenceConfig) as [PresenceState, typeof presenceConfig.online][]).map(([key, config]) => (
                    <ToggleButton 
                      key={key} 
                      value={key}
                      sx={{
                        '&.Mui-selected': {
                          backgroundColor: config.bgColor,
                          borderColor: `${config.color} !important`,
                          color: config.color,
                          '&:hover': {
                            backgroundColor: alpha(config.color, 0.15),
                          },
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        {React.cloneElement(config.icon, { sx: { fontSize: 20 } })}
                        <span>{config.label}</span>
                      </Stack>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {updatingPresence && (
                <Fade in>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Updating...
                    </Typography>
                  </Stack>
                </Fade>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Manager/Admin view
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Team Presence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isSuperAdmin ? 'Real-time status of all team members across centers' : 'Your center team status'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(Object.entries(presenceConfig) as [PresenceState, typeof presenceConfig.online][]).map(([key, config]) => (
          <Grid item xs={6} sm={3} key={key}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: `linear-gradient(135deg, ${alpha(config.color, 0.08)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box 
                  sx={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(config.color, 0.15),
                  }}
                >
                  {React.cloneElement(config.icon, { sx: { color: config.color } })}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
                    {stats[key]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {config.label}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search team members or centers..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
        }}
      />

      {/* Loading state */}
      {loading && (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading team data...
          </Typography>
        </Stack>
      )}

      {/* Error state */}
      {error && (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="error">{error}</Typography>
          <Button onClick={fetchData} sx={{ mt: 2 }}>Retry</Button>
        </Paper>
      )}

      {/* Empty state */}
      {!loading && !error && filteredData.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">No team members found</Typography>
        </Paper>
      )}

      {/* Center cards */}
      {!loading && !error && Array.from(centerGroups.entries()).map(([centerName, managers]) => {
        const isExpanded = expandedCenters.has(centerName);
        const centerStats: Record<PresenceState, number> = { online: 0, on_call: 0, in_meeting: 0, offline: 0 };
        let totalInCenter = 0;
        managers.forEach(m => m.counselors.forEach(c => {
          centerStats[c.presence]++;
          totalInCenter++;
        }));

        return (
          <Paper 
            key={centerName}
            elevation={0}
            sx={{ 
              mb: 2, 
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflow: 'hidden',
            }}
          >
            {/* Center header */}
            <Box 
              onClick={() => toggleCenter(centerName)}
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
                transition: 'background-color 0.2s',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <CenterIcon color="primary" />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {centerName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {managers.length} manager{managers.length > 1 ? 's' : ''} • {totalInCenter} counselor{totalInCenter > 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={1} alignItems="center">
                {/* Mini status indicators */}
                <Stack direction="row" spacing={0.5}>
                  {(Object.entries(presenceConfig) as [PresenceState, typeof presenceConfig.online][]).map(([key, config]) => (
                    centerStats[key] > 0 && (
                      <Chip
                        key={key}
                        size="small"
                        icon={<DotIcon sx={{ fontSize: 10, color: `${config.color} !important` }} />}
                        label={centerStats[key]}
                        sx={{ 
                          height: 24,
                          fontSize: '0.75rem',
                          backgroundColor: alpha(config.color, 0.1),
                        }}
                      />
                    )
                  ))}
                </Stack>
                <IconButton size="small">
                  {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              </Stack>
            </Box>

            {/* Center content */}
            <Collapse in={isExpanded}>
              <Divider />
              <Box sx={{ p: 2 }}>
                {managers.map((group) => {
                  const cm = group.centerManager;
                  const cmName = `${cm.firstName} ${cm.lastName}`.trim() || cm.userName;

                  return (
                    <Box key={cm.id} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                      {/* Manager header */}
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                        <Avatar 
                          sx={{ 
                            width: 36, 
                            height: 36, 
                            bgcolor: alpha(theme.palette.primary.main, 0.2),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          {`${(cm.firstName || ' ')[0]}${(cm.lastName || ' ')[0]}`.toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {cmName}
                            </Typography>
                            <Chip 
                              size="small" 
                              label="Manager" 
                              sx={{ 
                                height: 20, 
                                fontSize: '0.7rem',
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                              }} 
                            />
                            <Chip
                              size="small"
                              icon={<DotIcon sx={{ fontSize: 10, color: `${presenceConfig[cm.presence].color} !important` }} />}
                              label={presenceConfig[cm.presence].label}
                              sx={{ 
                                height: 20, 
                                fontSize: '0.7rem',
                                backgroundColor: presenceConfig[cm.presence].bgColor,
                              }}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            @{cm.userName}
                          </Typography>
                        </Box>
                        {isSuperAdmin && (
                          <Tooltip title="Delete manager and all counselors">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={(e) => { 
                                e.stopPropagation();
                                setConfirmDelete({ 
                                  id: cm.id, 
                                  name: cmName, 
                                  kind: 'manager',
                                  cascadeCount: group.counselors.length,
                                });
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>

                      {/* Counselors grid */}
                      {group.counselors.length > 0 ? (
                        <Grid container spacing={1.5} sx={{ pl: 6 }}>
                          {group.counselors.map((counselor) => {
                            const name = `${counselor.firstName} ${counselor.lastName}`.trim() || counselor.userName;
                            const config = presenceConfig[counselor.presence];

                            return (
                              <Grid item xs={12} sm={6} md={4} lg={3} key={counselor.id}>
                                <Paper
                                  elevation={0}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    backgroundColor: alpha(config.color, 0.03),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      borderColor: alpha(config.color, 0.3),
                                      backgroundColor: alpha(config.color, 0.08),
                                    },
                                  }}
                                >
                                  <Box sx={{ position: 'relative' }}>
                                    <Avatar 
                                      sx={{ 
                                        width: 32, 
                                        height: 32,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {`${(counselor.firstName || ' ')[0]}${(counselor.lastName || ' ')[0]}`.toUpperCase()}
                                    </Avatar>
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        bottom: -2,
                                        right: -2,
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: config.color,
                                        border: '2px solid white',
                                      }}
                                    />
                                  </Box>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: 500,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {name}
                                    </Typography>
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        color: config.color,
                                        fontWeight: 500,
                                      }}
                                    >
                                      {config.label}
                                    </Typography>
                                  </Box>
                                  {isSuperAdmin && (
                                    <IconButton 
                                      size="small" 
                                      sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        setConfirmDelete({ id: counselor.id, name, kind: 'counselor' });
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      ) : (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ pl: 6, fontStyle: 'italic' }}
                        >
                          No counselors assigned
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Paper>
        );
      })}

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDelete?.kind === 'manager'
              ? `Are you sure you want to delete "${confirmDelete?.name}"? This will also delete ${confirmDelete?.cascadeCount || 0} counselor(s) under them.`
              : `Are you sure you want to delete "${confirmDelete?.name}"?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PresencePage;
