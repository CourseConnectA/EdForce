import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  right?: React.ReactNode;
}

const PageHeader: React.FC<React.PropsWithChildren<PageHeaderProps>> = ({ title, subtitle, actions, right, children }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="h4">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
        {actions && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            {actions}
          </Stack>
        )}
        {right}
      </Stack>
      {children && (
        <Box sx={{ mt: 1 }}>
          {children}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
