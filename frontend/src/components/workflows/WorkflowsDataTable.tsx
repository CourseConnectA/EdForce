import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import { Workflow, WorkflowStatus } from '../../types/workflow.types';
import { workflowService } from '../../services/workflowService';
// import WorkflowBuilder from './WorkflowBuilder';

const getStatusColor = (status: WorkflowStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case WorkflowStatus.ACTIVE:
      return 'success';
    case WorkflowStatus.INACTIVE:
      return 'warning';
    case WorkflowStatus.ARCHIVED:
      return 'error';
    default:
      return 'default';
  }
};

interface WorkflowsDataTableProps {
  onCreateWorkflow?: () => void;
  onEditWorkflow?: (workflow: Workflow) => void;
}

const WorkflowsDataTable: React.FC<WorkflowsDataTableProps> = ({ 
  onCreateWorkflow, 
  onEditWorkflow 
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuWorkflowId, setMenuWorkflowId] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowService.getWorkflows({
        page: page + 1,
        limit: rowsPerPage,
      });
      setWorkflows(response.workflows);
      setTotal(response.total);
    } catch (err) {
      setError('Failed to fetch workflows');
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [page, rowsPerPage]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflowId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuWorkflowId(workflowId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuWorkflowId(null);
  };

  const handleEdit = (workflow: Workflow) => {
    onEditWorkflow?.(workflow);
    handleMenuClose();
  };

  const handleDelete = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleActivate = async (workflow: Workflow) => {
    try {
      await workflowService.activateWorkflow(workflow.id);
      fetchWorkflows();
    } catch (err) {
      setError('Failed to activate workflow');
      console.error('Error activating workflow:', err);
    }
    handleMenuClose();
  };

  const handleDeactivate = async (workflow: Workflow) => {
    try {
      await workflowService.deactivateWorkflow(workflow.id);
      fetchWorkflows();
    } catch (err) {
      setError('Failed to deactivate workflow');
      console.error('Error deactivating workflow:', err);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedWorkflow) {
      try {
        await workflowService.deleteWorkflow(selectedWorkflow.id);
        setDeleteDialogOpen(false);
        setSelectedWorkflow(null);
        fetchWorkflows();
      } catch (err) {
        setError('Failed to delete workflow');
        console.error('Error deleting workflow:', err);
      }
    }
  };

  const handleNewWorkflow = () => {
    onCreateWorkflow?.();
  };

  if (loading && workflows.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Workflow Automation
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewWorkflow}
          sx={{
            zIndex: 1,
            position: 'relative'
          }}
        >
          Create Workflow
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Nodes</TableCell>
                <TableCell>Statistics</TableCell>
                <TableCell>Creator</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {workflow.name}
                      </Typography>
                      {workflow.description && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {workflow.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={workflow.status.toUpperCase()}
                      color={getStatusColor(workflow.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={workflow.isActive ? 'Active' : 'Inactive'}
                      color={workflow.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>v{workflow.version}</TableCell>
                  <TableCell>
                    {workflow.graph?.nodes?.length || 0} nodes
                  </TableCell>
                  <TableCell>
                    {workflow.statistics ? (
                      <Stack spacing={0.5}>
                        <Typography variant="caption">
                          Runs: {workflow.statistics.totalRuns || 0}
                        </Typography>
                        <Typography variant="caption" color="success.main">
                          Success: {workflow.statistics.successfulRuns || 0}
                        </Typography>
                        {(workflow.statistics.failedRuns || 0) > 0 && (
                          <Typography variant="caption" color="error.main">
                            Failed: {workflow.statistics.failedRuns}
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No runs yet
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {workflow.creator
                      ? `${workflow.creator.firstName} ${workflow.creator.lastName}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, workflow.id)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {workflows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No workflows found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            const workflow = workflows.find(w => w.id === menuWorkflowId);
            if (workflow) handleEdit(workflow);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {workflows.find(w => w.id === menuWorkflowId)?.isActive ? (
          <MenuItem
            onClick={() => {
              const workflow = workflows.find(w => w.id === menuWorkflowId);
              if (workflow) handleDeactivate(workflow);
            }}
          >
            <PauseIcon fontSize="small" sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              const workflow = workflows.find(w => w.id === menuWorkflowId);
              if (workflow) handleActivate(workflow);
            }}
          >
            <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
            Activate
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const workflow = workflows.find(w => w.id === menuWorkflowId);
            if (workflow) handleDelete(workflow);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedWorkflow?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowsDataTable;