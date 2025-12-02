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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { Campaign, CampaignStatus, CampaignType } from '../../types/campaign.types';
import { campaignService } from '../../services/campaignService';
// import CampaignForm from './CampaignForm';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const getStatusColor = (status: CampaignStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case CampaignStatus.ACTIVE:
      return 'success';
    case CampaignStatus.PAUSED:
      return 'warning';
    case CampaignStatus.COMPLETED:
      return 'primary';
    case CampaignStatus.CANCELLED:
      return 'error';
    case CampaignStatus.SCHEDULED:
      return 'info';
    default:
      return 'default';
  }
};

const getTypeColor = (type: CampaignType): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (type) {
    case CampaignType.EMAIL:
      return 'primary';
    case CampaignType.SMS:
      return 'secondary';
    case CampaignType.SOCIAL_MEDIA:
      return 'info';
    case CampaignType.WEBINAR:
      return 'warning';
    case CampaignType.EVENT:
      return 'success';
    default:
      return 'default';
  }
};

interface CampaignsDataTableProps {
  onCreateCampaign?: () => void;
  onEditCampaign?: (campaign: Campaign) => void;
}

const CampaignsDataTable: React.FC<CampaignsDataTableProps> = ({ 
  onCreateCampaign, 
  onEditCampaign 
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCampaignId, setMenuCampaignId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.getCampaigns({
        page: page + 1,
        limit: rowsPerPage,
      });
      setCampaigns(response.campaigns);
      setTotal(response.total);
    } catch (err) {
      setError('Failed to fetch campaigns');
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [page, rowsPerPage]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaignId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuCampaignId(campaignId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuCampaignId(null);
  };

  const handleEdit = (campaign: Campaign) => {
    onEditCampaign?.(campaign);
    handleMenuClose();
  };

  const handleDelete = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedCampaign) {
      try {
        await campaignService.deleteCampaign(selectedCampaign.id);
        setDeleteDialogOpen(false);
        setSelectedCampaign(null);
        fetchCampaigns();
      } catch (err) {
        setError('Failed to delete campaign');
        console.error('Error deleting campaign:', err);
      }
    }
  };

  const handleNewCampaign = () => {
    onCreateCampaign?.();
  };

  if (loading && campaigns.length === 0) {
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
          Marketing Campaigns
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewCampaign}
          sx={{
            zIndex: 1,
            position: 'relative'
          }}
        >
          New Campaign
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
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Budget</TableCell>
                <TableCell>Spent</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {campaign.name}
                      </Typography>
                      {campaign.description && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {campaign.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.type.replace('_', ' ').toUpperCase()}
                      color={getTypeColor(campaign.type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.status.toUpperCase()}
                      color={getStatusColor(campaign.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {campaign.budget ? formatCurrency(campaign.budget) : '-'}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(campaign.spent)}
                  </TableCell>
                  <TableCell>
                    {campaign.startDate
                      ? new Date(campaign.startDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {campaign.endDate
                      ? new Date(campaign.endDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {campaign.owner
                      ? `${campaign.owner.firstName} ${campaign.owner.lastName}`
                      : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, campaign.id)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No campaigns found
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
            const campaign = campaigns.find(c => c.id === menuCampaignId);
            if (campaign) handleEdit(campaign);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            const campaign = campaigns.find(c => c.id === menuCampaignId);
            if (campaign) handleDelete(campaign);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Campaign</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedCampaign?.name}"? This action cannot be undone.
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

export default CampaignsDataTable;