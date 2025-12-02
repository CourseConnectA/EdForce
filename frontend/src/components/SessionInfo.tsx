import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

const SessionInfo: React.FC = () => {
  const { user, isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !user) {
    return null;
  }

  const tokenPayload = accessToken ? JSON.parse(atob(accessToken.split('.')[1])) : null;
  const expirationTime = tokenPayload ? new Date(tokenPayload.exp * 1000).toLocaleString() : 'Unknown';

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Session Information
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2">
            <strong>User:</strong> {user.firstName} {user.lastName} ({user.userName})
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {user.email}
          </Typography>
          <Typography variant="body2">
            <strong>Admin:</strong> {user.isAdmin ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            <strong>Token Expires:</strong> {expirationTime}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {!!(user as any)?.role && (
              <Chip label={(user as any).role} size="small" variant="outlined" />
            )}
            {!!(user as any)?.centerName && (
              <Chip label={(user as any).centerName} size="small" color="info" variant="outlined" />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SessionInfo;