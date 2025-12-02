import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Chip, Stack, Alert, TextField, MenuItem, Select, InputLabel, FormControl, IconButton, Tooltip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TablePagination } from '@mui/material';
import api from '../../services/apiService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import RefreshIcon from '@mui/icons-material/Refresh';

const AccountsPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const myId = (user as any)?.id;
  const myRole = (user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor');
  const myCenter = (user as any)?.centerName || '';
  const roleNorm = String(myRole || '').toLowerCase();
  const hidePresenceAndDesignationFilters = roleNorm === 'super-admin';
  // Show presence column only for Center Manager access
  const showPresenceColumn = roleNorm === 'center-manager';
  // Determine role if needed in future: const role = (user as any)?.role || ((user as any)?.isAdmin ? 'admin' : 'agent');
  // const isAdminRole = ['admin','super-admin'].includes(role);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Filters
  const [search, setSearch] = useState('');
  const [presence, setPresenceFilter] = useState<string>('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setUsersError(null);
    try {
      const params: any = {};
      // Apply server-side role scoping for presence list
      const roleNorm = String(myRole || '').toLowerCase();
      if (roleNorm === 'super-admin') {
        params.role = 'super-admin,center-manager';
      } else if (roleNorm === 'center-manager') {
        params.role = 'counselor';
      }
      if (search) params.search = search;
      if (presence) params.presence = presence;
  // designation filtering removed
      params.page = page;
      params.limit = limit;
      const qs = new URLSearchParams(params).toString();
      const resp = await api.get(`/users${qs ? `?${qs}` : ''}`);
      if (resp && typeof resp === 'object' && Array.isArray(resp.data)) {
        setUsers(resp.data);
        setTotal(Number(resp.total) || 0);
        setPage(Number(resp.page) || 1);
        setLimit(Number(resp.limit) || limit);
      } else {
        // Fallback if backend returns array (older behavior)
        setUsers(Array.isArray(resp) ? resp : []);
        setTotal(Array.isArray(resp) ? resp.length : 0);
      }
    } catch (e: any) {
      setUsersError(e?.response?.data?.message || e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, presence, myRole, page, limit]);

  // Initial load
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Instant filtering (debounced slightly for type-ahead)
  useEffect(() => {
    const t = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(t);
  }, [search, presence, loadUsers]);

  // Live updates via SSE for presence changes
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const es = new EventSource(`/api/users/events?access_token=${encodeURIComponent(token)}`);
    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload && payload.userId && payload.presence) {
          setUsers((prev) => prev.map(u => (u.id === payload.userId ? { ...u, presence: payload.presence } : u)));
        }
      } catch {}
    };
    es.onerror = () => {
      // In case of error, close the stream to avoid reconnect loops; page has manual refresh
      try { es.close(); } catch {}
    };
    return () => {
      try { es.close(); } catch {}
    };
  }, []);

  // const myId = (user as any)?.id;

  // Presence update is moved to Dashboard for admins only

  // Compute which users to show based on current viewer's role
  const visibleUsers = useMemo(() => {
    if (!Array.isArray(users)) return [] as any[];
    const roleNorm = (myRole || '').toLowerCase();
    const normalizeRole = (u: any) => String(u?.role || ((u?.isAdmin ? 'super-admin' : 'counselor'))).toLowerCase();

    if (roleNorm === 'super-admin') {
      // Only super-admins and center-managers, exclude self
      return users.filter((u: any) => u.id !== myId && ['super-admin','center-manager'].includes(normalizeRole(u)));
    }
    if (roleNorm === 'center-manager') {
      // Only counselors in my center
      return users.filter((u: any) => normalizeRole(u) === 'counselor' && (u.centerName || u.center_name) === myCenter);
    }
    // Counselors shouldn't be here; return empty
    return [] as any[];
  }, [users, myId, myRole, myCenter]);

  return (
    <Box sx={{ p: 3 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Typography variant="h6">Presence</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, @username or email" />
            {!hidePresenceAndDesignationFilters && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="presence-filter-label">Presence</InputLabel>
                <Select labelId="presence-filter-label" label="Presence" value={presence} onChange={(e) => setPresenceFilter(e.target.value)}>
                  <MenuItem value=""><em>All</em></MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                  <MenuItem value="in_meeting">In meeting</MenuItem>
                  <MenuItem value="on_call">On call</MenuItem>
                </Select>
              </FormControl>
            )}
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={loadUsers} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {usersError && <Alert severity="error" sx={{ mb: 2 }}>{usersError}</Alert>}

      {/* Presence toggle removed from this page as per requirement */}

      {/* Users list as a table (rows and columns) */}
      <Paper variant="outlined" sx={{ p: 0 }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Center</TableCell>
                {showPresenceColumn && <TableCell>Presence</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleUsers.map((u) => {
                const roleLabel = (u.role || ((u.isAdmin ? 'super-admin' : 'counselor')));
                const center = u.centerName || u.center_name || '—';
                const presence = (u.presence || 'offline') as string;
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
                return (
                  <TableRow key={u.id} hover>
                    <TableCell>{fullName || '—'}</TableCell>
                    <TableCell>@{u.userName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Chip size="small" label={roleLabel} /></TableCell>
                    <TableCell>{center}</TableCell>
                    {showPresenceColumn && (
                      <TableCell>
                        <Chip size="small" label={presence.replace('_',' ')} color={presence === 'online' ? 'success' : presence === 'on_call' ? 'warning' : 'default'} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {visibleUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showPresenceColumn ? 7 : 6}>
                    <Typography variant="body2" color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {total > 0 ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : 'No results'}
          </Typography>
          <TablePagination
            component="div"
            count={total}
            page={page - 1}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default AccountsPage;