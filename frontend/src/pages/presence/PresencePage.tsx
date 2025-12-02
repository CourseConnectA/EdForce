import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Drawer,
  Autocomplete,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import { RootState } from '../../store/store';
import { ManagerWithCounselors, PresenceState, usersService } from '../../services/usersService';

const presenceColor = (p: PresenceState | undefined) => {
  switch (p) {
    case 'online': return 'success.main';
    case 'on_call': return 'info.main';
    case 'in_meeting': return 'warning.main';
    default: return 'text.disabled';
  }
};

const PresencePage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const role = ((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();
  const isSuperAdmin = role === 'super-admin' || !!(user as any)?.isAdmin;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ManagerWithCounselors[]>([]);
  const [filter, setFilter] = useState('');
  const [presenceFilter, setPresenceFilter] = useState<'all' | PresenceState>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; kind: 'manager'|'counselor'; name: string; cascadeCount?: number } | null>(null);
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name'|'counselorCount'|'presence'>('name');
  const [centerFilter, setCenterFilter] = useState<string>('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await usersService.getHierarchy();
        if (!alive) return;
        setData(resp.data || []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load presence');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Live presence updates (SSE with resilient reconnect + fallback polling)
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 8; // exponential backoff upper bound (~ >30s)
    const startPollingFallback = () => {
      if (pollRef.current) return; // already running
      pollRef.current = window.setInterval(async () => {
        try {
          const resp = await usersService.getHierarchy();
          setData(resp.data || []);
        } catch {}
      }, 5000); // 5s lightweight polling
    };
    const stopPollingFallback = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  const attachSse = () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          startPollingFallback();
          return;
        }
        const env = (import.meta as any).env || {};
        const isDev = !!env.DEV;
        const envBase = env?.VITE_APP_API_URL as string | undefined;
        let url = '';
        if (!isDev && envBase && /^https?:\/\//i.test(envBase)) {
          // Absolute base provided; ensure it includes /api prefix
          const normalized = envBase.replace(/\/$/, '');
          const withApi = /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
          url = `${withApi}/users/events?access_token=${encodeURIComponent(token)}`;
        } else {
          // Use relative path so Vite proxy forwards to backend in dev
          url = `/api/users/events?access_token=${encodeURIComponent(token)}`;
        }
        // Pass token as query param since EventSource cannot set Authorization header
        es = new EventSource(url, { withCredentials: true } as any);
        es.onmessage = (evt) => {
          try {
            const payload = JSON.parse((evt as MessageEvent).data || '{}') as { userId?: string; presence?: PresenceState };
            if (!payload?.userId) return;
            setData((prev) => prev.map((m) => ({
              ...m,
              centerManager: m.centerManager.id === payload.userId
                ? { ...m.centerManager, presence: (payload.presence || m.centerManager.presence) as PresenceState }
                : m.centerManager,
              counselors: m.counselors.map((c) => c.id === payload.userId ? { ...c, presence: (payload.presence || c.presence) as PresenceState } : c),
            })));
          } catch {}
        };
        es.onerror = () => {
          // On error attempt reconnect; if exhausted start polling fallback.
          try { es && es.close(); } catch {}
          if (reconnectAttempts >= MAX_RECONNECT) {
            startPollingFallback();
            return;
          }
          const timeout = Math.min(30000, 500 * Math.pow(2, reconnectAttempts));
          reconnectAttempts += 1;
          setTimeout(() => attachSse(), timeout);
        };
        es.onopen = () => {
          // Connected; stop fallback polling if any
          reconnectAttempts = 0;
          stopPollingFallback();
        };
      } catch {
        startPollingFallback();
      }
    };
    attachSse();
    return () => {
      try { es && es.close(); } catch {}
      stopPollingFallback();
    };
  }, []);

  const textFiltered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((group) => {
        const cm = group.centerManager;
        const cmName = `${cm.firstName} ${cm.lastName}`.toLowerCase();
        const inHeader = cmName.includes(q) || (cm.centerName || '').toLowerCase().includes(q) || cm.userName.toLowerCase().includes(q);
        if (inHeader) return group;
        const counselors = group.counselors.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.userName.toLowerCase().includes(q));
        return { ...group, counselors };
      })
      .filter((g) => g.counselors.length > 0 || `${g.centerManager.firstName} ${g.centerManager.lastName}`.toLowerCase().includes(q));
  }, [data, filter]);

  const filtered = useMemo(() => {
    if (presenceFilter === 'all') return textFiltered;
    return textFiltered
      .map((g) => ({ ...g, counselors: g.counselors.filter((c) => c.presence === presenceFilter) }))
      .filter((g) => g.counselors.length > 0);
  }, [textFiltered, presenceFilter]);

  // Group by center for better scannability
  const groupedByCenter = useMemo(() => {
    const groups = new Map<string, ManagerWithCounselors[]>();
    for (const g of filtered) {
      const key = (g.centerManager.centerName || 'Unassigned Center');
      const arr = groups.get(key) || [];
      arr.push(g);
      groups.set(key, arr);
    }
    // Optional center filter (super admin convenience)
    if (centerFilter) {
      for (const k of Array.from(groups.keys())) {
        if (!k.toLowerCase().includes(centerFilter.toLowerCase())) {
          groups.delete(k);
        }
      }
    }
    return groups;
  }, [filtered, centerFilter]);

  // Global totals across filtered set
  const globalTotals = useMemo(() => {
    const totals: Record<PresenceState, number> = { online: 0, on_call: 0, in_meeting: 0, offline: 0 } as any;
    filtered.forEach((mg) => mg.counselors.forEach((c) => { totals[c.presence] = (totals[c.presence] || 0) + 1; }));
    return totals;
  }, [filtered]);

  const centerOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach((mg) => set.add(mg.centerManager.centerName || 'Unassigned Center'));
    return Array.from(set).sort();
  }, [data]);

  const managerPresencePriority: Record<PresenceState, number> = {
    online: 0,
    on_call: 1,
    in_meeting: 2,
    offline: 3,
  } as any;

  const sortManagers = (arr: ManagerWithCounselors[]) => {
    const copy = [...arr];
    if (sortBy === 'name') {
      copy.sort((a, b) => {
        const na = `${a.centerManager.firstName} ${a.centerManager.lastName}`.toLowerCase();
        const nb = `${b.centerManager.firstName} ${b.centerManager.lastName}`.toLowerCase();
        return na < nb ? -1 : na > nb ? 1 : 0;
      });
    } else if (sortBy === 'counselorCount') {
      copy.sort((a, b) => b.counselors.length - a.counselors.length);
    } else if (sortBy === 'presence') {
      copy.sort((a, b) => {
        const pa = managerPresencePriority[a.centerManager.presence] ?? 99;
        const pb = managerPresencePriority[b.centerManager.presence] ?? 99;
        if (pa !== pb) return pa - pb;
        return b.counselors.length - a.counselors.length;
      });
    }
    return copy;
  };

  const openConfirm = (target: { id: string; kind: 'manager'|'counselor'; name: string; cascadeCount?: number }) => {
    setConfirmTarget(target);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      await usersService.deleteUser(confirmTarget.id);
      const resp = await usersService.getHierarchy();
      setData(resp.data || []);
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  return (
    <Box sx={{ px: isMobile ? 0 : 1 }}>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, fontSize: isMobile ? '1.5rem' : '1.5rem' }}>Presence</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
        {isSuperAdmin ? 'View all centers with their Center Managers and Counselors.' : 'Counselors in your center.'}
      </Typography>

      {/* Compact header with Filters button + global totals - responsive */}
      <Stack 
        direction={isMobile ? 'column' : 'row'} 
        spacing={1} 
        sx={{ mb: 2, alignItems: isMobile ? 'stretch' : 'center' }}
      >
        <Button 
          variant="outlined" 
          onClick={() => setFilterDrawerOpen(true)}
          startIcon={<FilterListIcon />}
          size={isMobile ? 'small' : 'medium'}
          fullWidth={isMobile}
        >
          Filters
        </Button>
        {!isMobile && <Box sx={{ flex: 1 }} />}
        {/* Status chips - scrollable on mobile */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 0.5, 
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            overflowX: isMobile ? 'auto' : 'visible',
            pb: isMobile ? 0.5 : 0,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 },
          }}
        >
          <Chip size="small" icon={<FiberManualRecordIcon sx={{ color: 'success.main !important', fontSize: isMobile ? 10 : 12 }} />} label={`${globalTotals.online || 0}`} sx={{ fontSize: isMobile ? '0.7rem' : '0.8125rem' }} />
          <Chip size="small" icon={<FiberManualRecordIcon sx={{ color: 'info.main !important', fontSize: isMobile ? 10 : 12 }} />} label={`${globalTotals.on_call || 0}`} sx={{ fontSize: isMobile ? '0.7rem' : '0.8125rem' }} />
          <Chip size="small" icon={<FiberManualRecordIcon sx={{ color: 'warning.main !important', fontSize: isMobile ? 10 : 12 }} />} label={`${globalTotals.in_meeting || 0}`} sx={{ fontSize: isMobile ? '0.7rem' : '0.8125rem' }} />
          <Chip size="small" icon={<FiberManualRecordIcon sx={{ color: 'text.disabled !important', fontSize: isMobile ? 10 : 12 }} />} label={`${globalTotals.offline || 0}`} sx={{ fontSize: isMobile ? '0.7rem' : '0.8125rem' }} />
        </Box>
      </Stack>

      {/* Unified Filter Drawer */}
      <Drawer anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: { xs: '100vw', sm: 360 }, p: 2 }} role="presentation">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)} size="small" aria-label="close">
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <TextField
              size="small"
              label="Search"
              placeholder="Search center, manager, or counselor"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              fullWidth
            />
            <Box>
              <Typography variant="caption" color="text.secondary">Presence</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
                {[{k:'all', c:'inherit', label:'All'}, {k:'online', c:'success.main', label:'Online'}, {k:'on_call', c:'info.main', label:'On Call'}, {k:'in_meeting', c:'warning.main', label:'In Meeting'}, {k:'offline', c:'text.disabled', label:'Offline'}]
                  .map((tab: any) => (
                    <Chip
                      key={tab.k}
                      clickable
                      variant={presenceFilter === tab.k ? 'filled' : 'outlined'}
                      color={presenceFilter === tab.k && tab.k !== 'all' ? 'primary' : undefined}
                      icon={<FiberManualRecordIcon sx={{ color: `${tab.c} !important` }} />}
                      label={tab.label}
                      onClick={() => setPresenceFilter(tab.k)}
                    />
                  ))}
              </Stack>
            </Box>
            {isSuperAdmin && (
              <Autocomplete
                freeSolo
                options={centerOptions}
                value={centerFilter}
                onInputChange={(_, v) => setCenterFilter(v)}
                renderInput={(params) => <TextField {...params} label="Center" size="small" />}
              />
            )}
            <FormControl size="small" fullWidth>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} displayEmpty>
                <MenuItem value="name">Sort: Name</MenuItem>
                <MenuItem value="counselorCount">Sort: Counselor count</MenuItem>
                <MenuItem value="presence">Sort: Presence (Online first)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="text"
              onClick={() => {
                setFilter('');
                setPresenceFilter('all');
                setCenterFilter('');
                setSortBy('name');
              }}
            >Clear</Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => {
              // Expand all centers and managers for quick view
              const centers = Array.from(groupedByCenter.keys());
              setExpandedCenters(new Set(centers));
              const allMgrIds = new Set<string>();
              centers.forEach((cn) => {
                (groupedByCenter.get(cn) || []).forEach((g) => allMgrIds.add(g.centerManager.id));
              });
              setExpandedManagers(allMgrIds);
            }}>Expand all</Button>
            <Button onClick={() => { setExpandedCenters(new Set()); setExpandedManagers(new Set()); }}>Collapse all</Button>
            <Button variant="contained" onClick={() => setFilterDrawerOpen(false)}>Apply</Button>
          </Stack>
        </Box>
      </Drawer>

      {loading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}
      {!loading && !error && filtered.length === 0 && (
        <Typography color="text.secondary">No results.</Typography>
      )}

      {/* Grouped by center */}
      <Stack spacing={1}>
        {Array.from(groupedByCenter.entries()).map(([centerName, managers]) => {
          // Totals per center
          const centerTotals: Record<PresenceState, number> = { online: 0, on_call: 0, in_meeting: 0, offline: 0 } as any;
          managers.forEach((m) => m.counselors.forEach((c) => { centerTotals[c.presence] = (centerTotals[c.presence] || 0) + 1; }));
          const expanded = expandedCenters.has(centerName);
          const sortedManagers = sortManagers(managers);
          return (
            <Accordion key={centerName} expanded={expanded} onChange={() => {
              const next = new Set(expandedCenters);
              if (expanded) next.delete(centerName); else next.add(centerName);
              setExpandedCenters(next);
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: isMobile ? 1 : 2 }}>
                <Stack 
                  direction={isMobile ? 'column' : 'row'} 
                  spacing={isMobile ? 0.5 : 2} 
                  alignItems={isMobile ? 'flex-start' : 'center'} 
                  sx={{ width: '100%', pr: isMobile ? 0 : 2 }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: isMobile ? '0.9rem' : '1rem' }}>{centerName}</Typography>
                  {!isMobile && <Box sx={{ flex: 1 }} />}
                  {/* Status chips - compact on mobile */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5, 
                    flexWrap: 'wrap',
                    mt: isMobile ? 0.5 : 0,
                  }}>
                    <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'success.main !important', fontSize: isMobile ? 8 : 12 }} />} label={isMobile ? centerTotals.online || 0 : `${centerTotals.online || 0} Online`} sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: isMobile ? 20 : 24 }} />
                    <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'info.main !important', fontSize: isMobile ? 8 : 12 }} />} label={isMobile ? centerTotals.on_call || 0 : `${centerTotals.on_call || 0} On Call`} sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: isMobile ? 20 : 24 }} />
                    <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'warning.main !important', fontSize: isMobile ? 8 : 12 }} />} label={isMobile ? centerTotals.in_meeting || 0 : `${centerTotals.in_meeting || 0} In Meeting`} sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: isMobile ? 20 : 24 }} />
                    <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'text.disabled !important', fontSize: isMobile ? 8 : 12 }} />} label={isMobile ? centerTotals.offline || 0 : `${centerTotals.offline || 0} Offline`} sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: isMobile ? 20 : 24 }} />
                  </Box>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ px: isMobile ? 1 : 2 }}>
                <Stack spacing={1}>
                  {sortedManagers.map((group) => {
                    const cm = group.centerManager;
                    const headerName = `${cm.firstName} ${cm.lastName}`.trim() || cm.userName;
                    const counts = group.counselors.reduce((acc: Record<string, number>, c) => {
                      acc[c.presence] = (acc[c.presence] || 0) + 1;
                      return acc;
                    }, {} as Record<PresenceState, number> as any);
                    const mgrExpanded = expandedManagers.has(cm.id);
                    return (
                      <Accordion key={cm.id} expanded={mgrExpanded} onChange={() => {
                        const next = new Set(expandedManagers);
                        if (mgrExpanded) next.delete(cm.id); else next.add(cm.id);
                        setExpandedManagers(next);
                      }} disableGutters>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: isMobile ? 1 : 2 }}>
                          <Stack 
                            direction="column"
                            spacing={0.5}
                            sx={{ width: '100%', pr: isMobile ? 0 : 2 }}
                          >
                            {/* Manager info row */}
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, bgcolor: 'primary.light', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                                {`${(cm.firstName||' ')[0]}${(cm.lastName||' ')[0]}`.toUpperCase()}
                              </Avatar>
                              <FiberManualRecordIcon sx={{ fontSize: isMobile ? 10 : 14, color: presenceColor(cm.presence) }} />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: isMobile ? '0.8rem' : '1rem' }}>
                                  {headerName} {!isMobile && `@${cm.userName}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                                  Center Manager
                                </Typography>
                              </Box>
                              <Chip size="small" color="primary" label={`${group.counselors.length}`} sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: isMobile ? 20 : 24, minWidth: isMobile ? 28 : 'auto' }} />
                              {isSuperAdmin && !isMobile && (
                                <Tooltip title="Delete Center Manager and all counselors under them">
                                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); openConfirm({ id: cm.id, kind: 'manager', name: headerName, cascadeCount: group.counselors.length }); }}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                            {/* Status chips - hidden on mobile to save space */}
                            {!isMobile && (
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 5 }}>
                                <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'success.main !important' }} />} label={counts['online'] ? `${counts['online']} Online` : '0 Online'} />
                                <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'info.main !important' }} />} label={counts['on_call'] ? `${counts['on_call']} On Call` : '0 On Call'} />
                                <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'warning.main !important' }} />} label={counts['in_meeting'] ? `${counts['in_meeting']} In Meeting` : '0 In Meeting'} />
                                <Chip size="small" variant="outlined" icon={<FiberManualRecordIcon sx={{ color: 'text.disabled !important' }} />} label={counts['offline'] ? `${counts['offline']} Offline` : '0 Offline'} />
                              </Stack>
                            )}
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: isMobile ? 0.5 : 2 }}>
                          {group.counselors.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ pl: isMobile ? 2 : 5, py: 1, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                              No counselors found for this manager.
                            </Typography>
                          ) : (
                            <Stack divider={<Divider flexItem />}>
                              {group.counselors.map((c) => {
                                const name = `${c.firstName} ${c.lastName}`.trim() || c.userName;
                                return (
                                  <Stack key={c.id} direction="row" spacing={isMobile ? 1 : 2} alignItems="center" sx={{ pl: isMobile ? 1 : 5, py: isMobile ? 0.75 : 1 }}>
                                    <Avatar sx={{ width: isMobile ? 20 : 24, height: isMobile ? 20 : 24, bgcolor: 'secondary.light', fontSize: isMobile ? '0.6rem' : '0.7rem' }}>
                                      {`${(c.firstName||' ')[0]}${(c.lastName||' ')[0]}`.toUpperCase()}
                                    </Avatar>
                                    <FiberManualRecordIcon sx={{ fontSize: isMobile ? 10 : 12, color: presenceColor(c.presence) }} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: isMobile ? '0.75rem' : '0.875rem' }}>{name}</Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>Counselor</Typography>
                                    </Box>
                                    {isSuperAdmin && !isMobile && (
                                      <Tooltip title="Delete Counselor">
                                        <IconButton size="small" color="error" onClick={() => openConfirm({ id: c.id, kind: 'counselor', name })}>
                                          <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Stack>
                                );
                              })}
                            </Stack>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmTarget?.kind === 'manager'
              ? `Delete Center Manager “${confirmTarget?.name}”? This will also delete ${confirmTarget?.cascadeCount || 0} counselor(s) under them.`
              : `Delete Counselor “${confirmTarget?.name}”?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PresencePage;
