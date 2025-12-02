import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Menu,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridActionsCellItem,
  GridRowParams,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchOpportunities,
  deleteOpportunity,
  setPage,
  setLimit,
  clearError,
} from '../../store/slices/opportunitiesSlice';
import { Opportunity } from '../../services/opportunitiesService';

interface OpportunitiesDataTableProps {
  onCreateOpportunity?: () => void;
  onEditOpportunity?: (opportunity: Opportunity) => void;
}

const OpportunitiesDataTable: React.FC<OpportunitiesDataTableProps> = ({
  onCreateOpportunity,
  onEditOpportunity,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { opportunities, total, page, limit, loading, error } = useSelector(
    (state: RootState) => state.opportunities
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [salesStageFilter, setSalesStageFilter] = useState('');
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  
  // State for actions menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<Opportunity | null>(null);

  // Fetch opportunities when component mounts or filters change
  useEffect(() => {
    const params = {
      page,
      limit,
      search: searchTerm || undefined,
  salesStage: salesStageFilter || undefined,
      sortBy: sortModel[0]?.field || undefined,
      sortOrder: sortModel[0]?.sort || undefined,
    };
    dispatch(fetchOpportunities(params));
  }, [dispatch, page, limit, searchTerm, salesStageFilter, sortModel]);

  // Handle pagination change
  const handlePaginationChange = (model: GridPaginationModel) => {
    dispatch(setPage(model.page + 1));
    dispatch(setLimit(model.pageSize));
  };

  // Handle sort change
  const handleSortChange = (model: GridSortModel) => {
    setSortModel(model);
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    dispatch(setPage(1));
  };

  // Handle filter changes
  const handleStageFilterChange = (value: string) => {
    setSalesStageFilter(value);
    dispatch(setPage(1));
  };

  // Handle actions menu
  const handleActionsClick = (event: React.MouseEvent<HTMLElement>, opportunityId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedOpportunityId(opportunityId);
  };

  const handleActionsClose = () => {
    setAnchorEl(null);
    setSelectedOpportunityId(null);
  };

  // Handle edit opportunity
  const handleEdit = () => {
    const opportunity = opportunities.find(o => o.id === selectedOpportunityId);
    if (opportunity && onEditOpportunity) {
      onEditOpportunity(opportunity);
    }
    handleActionsClose();
  };

  // Handle delete opportunity
  const handleDeleteClick = () => {
    const opportunity = opportunities.find(o => o.id === selectedOpportunityId);
    if (opportunity) {
      setOpportunityToDelete(opportunity);
      setDeleteDialogOpen(true);
    }
    handleActionsClose();
  };

  const handleDeleteConfirm = async () => {
    if (opportunityToDelete) {
      await dispatch(deleteOpportunity(opportunityToDelete.id));
      setDeleteDialogOpen(false);
      setOpportunityToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setOpportunityToDelete(null);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get stage color from sales stage name
  const getStageColor = (salesStage?: string) => {
    switch (salesStage) {
      case 'Prospecting': return 'info';
      case 'Qualification': return 'warning';
      case 'Needs Analysis': return 'warning';
      case 'Value Proposition': return 'warning';
      case 'Id. Decision Makers': return 'warning';
      case 'Proposal/Price Quote': return 'success';
      case 'Negotiation/Review': return 'success';
      case 'Closed Won': return 'success';
      case 'Closed Lost': return 'error';
      default: return 'default';
    }
  };

  // Define columns
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Opportunity',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => {
        const opportunity = params.row as Opportunity;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {opportunity.name}
              </Typography>
              {opportunity.nextStep && (
                <Typography variant="caption" color="text.secondary">
                  Next: {opportunity.nextStep}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'account',
      headerName: 'Account',
      width: 180,
      renderCell: (params) => {
        const opportunity = params.row as Opportunity;
        return opportunity.account ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ mr: 1, color: 'primary.main', fontSize: 16 }} />
            <Typography variant="body2">
              {opportunity.account.name}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        );
      },
    },
    {
      field: 'contact',
      headerName: 'Contact',
      width: 150,
      renderCell: (params) => {
        const opportunity = params.row as Opportunity;
        return opportunity.contact ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, color: 'secondary.main', fontSize: 16 }} />
            <Typography variant="body2">
              {`${opportunity.contact.firstName} ${opportunity.contact.lastName}`}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        );
      },
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'salesStage',
      headerName: 'Stage',
      width: 170,
      renderCell: (params) => {
        const value = params.value as string | undefined;
        if (!value) {
          return <Typography variant="body2" color="text.secondary">-</Typography>;
        }
        return (
          <Chip
            label={value}
            size="small"
            color={getStageColor(value) as any}
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'probability',
      headerName: 'Probability',
      width: 130,
      renderCell: (params) => (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">{params.value}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={params.value} 
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      ),
    },
    {
      field: 'dateClosedExpected',
      headerName: 'Expected Close',
      width: 140,
      renderCell: (params) => {
        const v = params.value as string | undefined;
        if (!v) return <Typography variant="body2" color="text.secondary">-</Typography>;
        const d = new Date(v);
        const text = isNaN(d.getTime()) ? v : d.toLocaleDateString();
        return (
          <Typography variant="body2" color="text.secondary">{text}</Typography>
        );
      },
    },
    {
      field: 'leadSource',
      headerName: 'Source',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 80,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={<MoreVertIcon />}
          label="More actions"
          onClick={(event) => handleActionsClick(event, params.id as string)}
        />,
      ],
    },
  ], []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', mb: 3, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 2 : 0 }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Opportunities
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your sales opportunities and deals
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size={isMobile ? 'medium' : 'large'}
          onClick={onCreateOpportunity}
          fullWidth={isMobile}
        >
          New Opportunity
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => dispatch(clearError())}
        >
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(250px, 1fr) 200px',
        gap: 2,
        mb: 3,
      }}>
        <TextField
          placeholder="Search opportunities..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
          fullWidth
        />

        <FormControl sx={{ minWidth: isMobile ? '100%' : 150 }} fullWidth={isMobile}>
          <InputLabel>Stage</InputLabel>
          <Select
            value={salesStageFilter}
            label="Stage"
            onChange={(e) => handleStageFilterChange(e.target.value)}
          >
            <MenuItem value="">All Stages</MenuItem>
            <MenuItem value="Prospecting">Prospecting</MenuItem>
            <MenuItem value="Qualification">Qualification</MenuItem>
            <MenuItem value="Needs Analysis">Needs Analysis</MenuItem>
            <MenuItem value="Value Proposition">Value Proposition</MenuItem>
            <MenuItem value="Id. Decision Makers">ID Decision Makers</MenuItem>
            <MenuItem value="Perception Analysis">Perception Analysis</MenuItem>
            <MenuItem value="Proposal/Price Quote">Proposal/Price Quote</MenuItem>
            <MenuItem value="Negotiation/Review">Negotiation/Review</MenuItem>
            <MenuItem value="Closed Won">Closed Won</MenuItem>
            <MenuItem value="Closed Lost">Closed Lost</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: isMobile ? 'auto' : 600, width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={opportunities}
          columns={columns}
          paginationModel={{
            page: page - 1,
            pageSize: limit,
          }}
          onPaginationModelChange={handlePaginationChange}
          sortModel={sortModel}
          onSortModelChange={handleSortChange}
          rowCount={total}
          loading={loading}
          paginationMode="server"
          sortingMode="server"
          pageSizeOptions={isMobile ? [5, 10] : [5, 10, 25, 50]}
          disableRowSelectionOnClick
          density={isMobile ? 'compact' : 'standard'}
          autoHeight={isMobile}
          hideFooterSelectedRowCount
          sx={{
            scrollbarGutter: 'stable both-edges',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionsClose}
      >
        <MenuItemComponent onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItemComponent>
        <MenuItemComponent onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItemComponent>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} fullScreen={isMobile}>
        <DialogTitle>Delete Opportunity</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the opportunity "{opportunityToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OpportunitiesDataTable;