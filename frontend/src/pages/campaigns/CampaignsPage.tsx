import React, { useState } from 'react';
import { Box } from '@mui/material';
import CampaignsDataTable from '../../components/campaigns/CampaignsDataTable';
import CampaignForm from '../../components/campaigns/CampaignForm';
import { Campaign } from '../../types/campaign.types';

const CampaignsPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const handleCreateCampaign = () => {
    setCreateDialogOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedCampaign(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <CampaignsDataTable
        onCreateCampaign={handleCreateCampaign}
        onEditCampaign={handleEditCampaign}
      />
      
      {/* Create Campaign Dialog */}
      <CampaignForm
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        mode="create"
      />

      {/* Edit Campaign Dialog */}
      <CampaignForm
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        campaign={selectedCampaign}
        mode="edit"
      />
    </Box>
  );
};

export default CampaignsPage;