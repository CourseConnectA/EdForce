import React from 'react';
import { Box, Typography } from '@mui/material';

const ComingSoon: React.FC<{ title?: string; subtitle?: string }> = ({ title = 'Coming soon', subtitle = 'This feature is under development.' }) => {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Typography variant="body1" color="text.secondary">{subtitle}</Typography>
    </Box>
  );
};

export default ComingSoon;
