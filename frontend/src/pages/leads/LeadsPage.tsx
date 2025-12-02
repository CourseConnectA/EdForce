import React, { useState } from 'react';
import { Box, Alert, useTheme, useMediaQuery } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import LeadsDataTable from '../../components/leads/LeadsDataTable';
import LeadForm from '../../components/leads/LeadForm';

const LeadsPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Inline edit dialog removed; editing happens on the lead detail page

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleCreateLead = () => {
    setCreateDialogOpen(true);
  };

  // No edit handler needed; row click in the table navigates to the lead page

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  // No edit dialog to close

  // Role gate: Center Manager, Counselor, and Admins can access Leads
  const { user } = useSelector((s: RootState) => s.auth);
  const role = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();
  const allowed = ['center-manager', 'counselor', 'admin', 'super-admin'].includes(role);

  if (!allowed) {
    return (
      <Box sx={{ p: isMobile ? 1.5 : 3 }}>
        <Alert severity="warning">You are not authorized to access Leads.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 0 : 3 }}>
      <LeadsDataTable onCreateLead={handleCreateLead} />
      
      {/* Create Lead Dialog */}
      <LeadForm
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        mode="create"
      />

      {/* Editing is done inside the lead page; no edit dialog here */}
    </Box>
  );
};

export default LeadsPage;