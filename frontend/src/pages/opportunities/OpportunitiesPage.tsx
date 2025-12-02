import React, { useState } from 'react';
import { Box } from '@mui/material';
import OpportunitiesDataTable from '../../components/opportunities/OpportunitiesDataTable';
import OpportunityForm from '../../components/opportunities/OpportunityForm';
import { Opportunity } from '../../services/opportunitiesService';

const OpportunitiesPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  const handleCreateOpportunity = () => {
    setCreateDialogOpen(true);
  };

  const handleEditOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setEditDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedOpportunity(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <OpportunitiesDataTable
        onCreateOpportunity={handleCreateOpportunity}
        onEditOpportunity={handleEditOpportunity}
      />
      
      {/* Create Opportunity Dialog */}
      <OpportunityForm
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        mode="create"
      />

      {/* Edit Opportunity Dialog */}
      <OpportunityForm
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        opportunity={selectedOpportunity}
        mode="edit"
      />
    </Box>
  );
};

export default OpportunitiesPage;