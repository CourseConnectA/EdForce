import React, { useState } from 'react';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Business as CenterIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  SupervisorAccount as ManagerIcon,
  SupportAgent as CounselorIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/apiService';

const UsersPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useSelector((s: RootState) => s.auth);
  const derivedRole = (user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor');
  const isSuperAdmin = (derivedRole || '').toLowerCase() === 'super-admin' || !!(user as any)?.isAdmin;
  const isCenterManager = (derivedRole || '').toLowerCase() === 'center-manager';
  const defaultCenter = (user as any)?.centerName || '';
  
  const [form, setForm] = useState({
    userName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    centerName: isCenterManager ? defaultCenter : '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Determine target role based on who's creating
  const targetRole = isCenterManager ? 'counselor' : 'center-manager';
  const targetRoleLabel = isCenterManager ? 'Counselor' : 'Center Manager';
  const TargetRoleIcon = isCenterManager ? CounselorIcon : ManagerIcon;

  if (!isSuperAdmin && !isCenterManager) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            backgroundColor: alpha(theme.palette.warning.main, 0.05),
          }}
        >
          <Typography variant="h6" color="warning.main" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Only Super Admins or Center Managers can create users
          </Typography>
        </Paper>
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const payload: any = { ...form, role: targetRole };
      if (isCenterManager) {
        payload.centerName = defaultCenter;
      }
      await api.post('/users', payload);
      setMessage(`${targetRoleLabel} created successfully!`);
      setShowSuccess(true);
      setForm({
        userName: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        centerName: isCenterManager ? defaultCenter : '',
      });
      
      // Hide success after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = form.userName && form.firstName && form.lastName && form.email && form.password && (isCenterManager || form.centerName);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          }}
        >
          <PersonAddIcon sx={{ fontSize: 28, color: 'white' }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Add New {targetRoleLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isCenterManager
              ? `Create a new counselor for ${defaultCenter}`
              : 'Create a new center manager with center assignment'}
          </Typography>
        </Box>
      </Stack>

      {/* Success Alert */}
      <Collapse in={showSuccess}>
        <Alert
          severity="success"
          icon={<SuccessIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setShowSuccess(false)}
        >
          {message}
        </Alert>
      </Collapse>

      {/* Error Alert */}
      <Collapse in={!!error}>
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      </Collapse>

      {/* Role Preview Card */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 48,
                height: 48,
                backgroundColor: alpha(theme.palette.primary.main, 0.15),
                color: theme.palette.primary.main,
              }}
            >
              <TargetRoleIcon />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Creating: {targetRoleLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isCenterManager
                  ? 'Counselors can manage leads and calls in your center'
                  : 'Center Managers can create counselors and manage their center'}
              </Typography>
            </Box>
            <Chip
              label={targetRole.replace('-', ' ')}
              color="primary"
              variant="outlined"
              sx={{ textTransform: 'capitalize' }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Form Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {/* Personal Information Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Personal Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              {/* Account Information Section */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Account Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  label="Username"
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <HideIcon /> : <ShowIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              {/* Center Assignment Section (for Super Admin) */}
              {!isCenterManager && (
                <Grid item xs={12} sm={6} lg={4}>
                  <TextField
                    fullWidth
                    label="Center Name"
                    value={form.centerName}
                    onChange={(e) => setForm({ ...form, centerName: e.target.value })}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CenterIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    helperText="The center this manager will oversee"
                  />
                </Grid>
              )}

              {/* Center display for Center Manager */}
              {isCenterManager && (
                <Grid item xs={12} sm={6} lg={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <CenterIcon color="primary" />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {defaultCenter}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              )}

              {/* Submit Button */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !isFormValid}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  {loading ? 'Creating...' : `Create ${targetRoleLabel}`}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong>{' '}
          {isCenterManager
            ? 'The new counselor will be able to log in immediately and will be assigned to your center automatically.'
            : 'The new center manager will be able to log in immediately and can start creating counselors for their center.'}
        </Typography>
      </Paper>
    </Box>
  );
};

export default UsersPage;
