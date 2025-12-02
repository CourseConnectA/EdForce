import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const CasesPage: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Cases
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage customer support cases and tickets
          </Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} size="large">
          New Case
        </Button>
      </Box>
      <Typography variant="body1">
        Case management functionality coming soon...
      </Typography>
    </Box>
  );
};

export default CasesPage;