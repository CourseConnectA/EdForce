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
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchAccounts,
  deleteAccount,
  setPage,
  setLimit,
  clearError,
} from '../../store/slices/accountsSlice';
import { Account } from '../../services/accountsService';

interface AccountsDataTableProps {
  onCreateAccount?: () => void;
  onEditAccount?: (account: Account) => void;
}

const AccountsDataTable: React.FC<AccountsDataTableProps> = ({
  onCreateAccount,
  onEditAccount,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, total, page, limit, loading, error } = useSelector(
    (state: RootState) => state.accounts
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  
  // State for actions menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Fetch accounts when component mounts or filters change
  useEffect(() => {
    const params = {
      page,
      limit,
      search: searchTerm || undefined,
      accountType: typeFilter ? (typeFilter as any) : undefined,
      sortBy: sortModel[0]?.field || undefined,
      sortOrder: sortModel[0]?.sort ? (sortModel[0].sort.toUpperCase() as 'ASC' | 'DESC') : undefined,
    };
    dispatch(fetchAccounts(params));
  }, [dispatch, page, limit, searchTerm, typeFilter, sortModel]);

  // Handle pagination change
  const handlePaginationChange = (model: GridPaginationModel) => {
    dispatch(setPage(model.page + 1)); // DataGrid uses 0-based indexing
    dispatch(setLimit(model.pageSize));
  };

  // Handle sort change
  const handleSortChange = (model: GridSortModel) => {
    setSortModel(model);
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    dispatch(setPage(1)); // Reset to first page when searching
  };

  // Handle filter changes
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    dispatch(setPage(1));
  };

  // Note: status filter removed as backend does not support it

  // Handle actions menu
  const handleActionsClick = (event: React.MouseEvent<HTMLElement>, accountId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedAccountId(accountId);
  };

  const handleActionsClose = () => {
    setAnchorEl(null);
    setSelectedAccountId(null);
  };

  // Handle edit account
  const handleEdit = () => {
    const account = accounts.find(a => a.id === selectedAccountId);
    if (account && onEditAccount) {
      onEditAccount(account);
    }
    handleActionsClose();
  };

  // Handle delete account
  const handleDeleteClick = () => {
    const account = accounts.find(a => a.id === selectedAccountId);
    if (account) {
      setAccountToDelete(account);
      setDeleteDialogOpen(true);
    }
    handleActionsClose();
  };

  const handleDeleteConfirm = async () => {
    if (accountToDelete) {
      await dispatch(deleteAccount(accountToDelete.id));
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  // Format currency
  const formatCurrency = (value: number | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Define columns
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Account Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BusinessIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'industry',
      headerName: 'Industry',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'accountType',
      headerName: 'Type',
      width: 140,
      renderCell: (params) => {
        const val = params.value as string | undefined;
        const color = val === 'Customer' ? 'success'
          : val === 'Prospect' ? 'info'
          : val === 'Partner' ? 'warning'
          : val === 'Reseller' ? 'secondary'
          : val === 'Competitor' ? 'error'
          : 'default';
        return (
          <Chip
            label={val || '-'}
            size="small"
            variant="outlined"
            color={color as any}
          />
        );
      },
    },
    {
      field: 'annualRevenue',
      headerName: 'Annual Revenue',
      width: 150,
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'employees',
      headerName: 'Employees',
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value ? Number(params.value).toLocaleString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'phoneOffice',
      headerName: 'Phone',
      width: 150,
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
            Accounts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your customer accounts and organizations
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size={isMobile ? 'medium' : 'large'}
          onClick={onCreateAccount}
          fullWidth={isMobile}
        >
          New Account
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
          placeholder="Search accounts..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
          fullWidth
        />
        
        <FormControl sx={{ minWidth: isMobile ? '100%' : 120 }} fullWidth={isMobile}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => handleTypeFilterChange(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="Prospect">Prospect</MenuItem>
            <MenuItem value="Customer">Customer</MenuItem>
            <MenuItem value="Partner">Partner</MenuItem>
            <MenuItem value="Reseller">Reseller</MenuItem>
            <MenuItem value="Competitor">Competitor</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>

      </Box>

      {/* Data Grid */}
      <Box sx={{ height: isMobile ? 'auto' : 600, width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={accounts}
          columns={columns}
          paginationModel={{
            page: page - 1, // DataGrid uses 0-based indexing
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
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the account "{accountToDelete?.name}"? 
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

export default AccountsDataTable;