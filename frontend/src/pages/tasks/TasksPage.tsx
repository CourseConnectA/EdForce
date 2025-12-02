import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const TasksPage: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Tasks
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your tasks and activities
          </Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} size="large">
          New Task
        </Button>
      </Box>
      <Typography variant="body1">
        Task management functionality coming soon...
      </Typography>
    </Box>
  );
};

export default TasksPage;