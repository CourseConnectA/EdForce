import React, { useState } from 'react';
import { Box, Typography, Grid, TextField, MenuItem, Button, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/apiService';

// Note: roles list retained for reference, but UI locks to allowed role per creator

const UsersPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const derivedRole = (user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor');
  const isSuperAdmin = (derivedRole || '').toLowerCase() === 'super-admin' || !!(user as any)?.isAdmin;
  const isCenterManager = (derivedRole || '').toLowerCase() === 'center-manager';
  const defaultCenter = (user as any)?.centerName || '';
  const [form, setForm] = useState({ userName: '', firstName: '', lastName: '', email: '', password: '', role: isCenterManager ? 'counselor' : 'center-manager', centerName: isCenterManager ? defaultCenter : '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  if (!isSuperAdmin && !isCenterManager) {
    return <Alert severity="warning" sx={{ m: 2 }}>Only Super Admins or Center Managers can create users</Alert>;
  }

  const onSubmit = async () => {
    setLoading(true); setMessage(null); setError(null);
    try {
      const payload: any = { ...form };
      if (isCenterManager) {
        // CM can only create counselor and must be in their center
        payload.role = 'counselor';
        payload.centerName = defaultCenter;
      } else {
        // Super Admin can only create Center Managers
        payload.role = 'center-manager';
      }
      await api.post('/users', payload);
      setMessage('User created');
  setForm({ userName: '', firstName: '', lastName: '', email: '', password: '', role: isCenterManager ? 'counselor' : 'counselor', centerName: isCenterManager ? defaultCenter : '' });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>User Management</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Create users and assign roles.</Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}><TextField fullWidth label="Username" value={form.userName} onChange={e=>setForm({...form,userName:e.target.value})}/></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="First Name" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="Last Name" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="Role" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} disabled>
            {(isCenterManager ? ['counselor'] : ['center-manager']).map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </Grid>
        {(form.role === 'center-manager' || form.role === 'counselor') && (
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Center Name" value={form.centerName} onChange={e=>setForm({...form,centerName:e.target.value})} disabled={isCenterManager} helperText={isCenterManager ? 'Locked to your center' : ''} />
          </Grid>
        )}
        <Grid item xs={12}>
          <Button variant="contained" disabled={loading || !form.userName || !form.email || !form.password || ((form.role === 'center-manager' || form.role === 'counselor') && !form.centerName)} onClick={onSubmit}>
            {loading ? 'Saving…' : 'Create User'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UsersPage;
