import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import SuperAdminCenterSettings from './SuperAdminCenterSettings';
import LeadFieldSettingsPage from './LeadFieldSettingsPage';
import { Box, Typography } from '@mui/material';

/**
 * Unified Settings Page that renders appropriate settings based on user role:
 * - Super Admin: Center Settings (dropdown option management per center)
 * - Center Manager: Lead Field Settings (enable/disable fields)
 * - Counselor: No access (redirected away in TopNavBar, but fallback shown here)
 */
const SettingsPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const role = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor'));

  // Super Admin sees Center Settings
  if (role === 'super-admin') {
    return <SuperAdminCenterSettings />;
  }

  // Center Manager sees Lead Field Settings (enable/disable fields)
  if (role === 'center-manager') {
    return <LeadFieldSettingsPage />;
  }

  // Counselors should not reach here (icon is hidden), but show fallback
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Settings</Typography>
      <Typography variant="body2" color="text.secondary">
        You do not have access to settings. Please contact your administrator.
      </Typography>
    </Box>
  );
};

export default SettingsPage;
