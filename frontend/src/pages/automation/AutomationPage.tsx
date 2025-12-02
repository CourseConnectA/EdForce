import React, { useState } from 'react';
import { Box } from '@mui/material';
import WorkflowsDataTable from '../../components/workflows/WorkflowsDataTable';
import WorkflowBuilder from '../../components/workflows/WorkflowBuilder';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import { Workflow } from '../../types/workflow.types';

const AutomationPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const handleCreateWorkflow = () => {
    setCreateDialogOpen(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setEditDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedWorkflow(null);
  };

  const handleBuilderSave = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedWorkflow(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <WorkflowsDataTable
        onCreateWorkflow={handleCreateWorkflow}
        onEditWorkflow={handleEditWorkflow}
      />
      
      {/* Create Workflow Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCloseCreateDialog}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: { height: '90vh', maxWidth: '95vw' }
        }}
        sx={{
          zIndex: 1300
        }}
      >
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <WorkflowBuilder
            onSave={handleBuilderSave}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Workflow Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: { height: '90vh', maxWidth: '95vw' }
        }}
        sx={{
          zIndex: 1300
        }}
      >
        <DialogTitle>
          Edit Workflow: {selectedWorkflow?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <WorkflowBuilder
            workflowId={selectedWorkflow?.id}
            onSave={handleBuilderSave}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AutomationPage;