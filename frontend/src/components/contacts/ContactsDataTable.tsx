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
  
  Menu,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
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
  fetchContacts,
  deleteContact,
  setPage,
  setLimit,
  clearError,
} from '../../store/slices/contactsSlice';
import { Contact } from '../../services/contactsService';

interface ContactsDataTableProps {
  onCreateContact?: () => void;
  onEditContact?: (contact: Contact) => void;
}

const ContactsDataTable: React.FC<ContactsDataTableProps> = ({
  onCreateContact,
  onEditContact,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { contacts, total, page, limit, loading, error } = useSelector(
    (state: RootState) => state.contacts
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  
  // State for actions menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Fetch contacts when component mounts or filters change
  useEffect(() => {
    const params = {
      page,
      limit,
      search: searchTerm || undefined,
  department: departmentFilter || undefined,
      sortBy: sortModel[0]?.field || undefined,
      sortOrder: sortModel[0]?.sort || undefined,
    };
    dispatch(fetchContacts(params));
  }, [dispatch, page, limit, searchTerm, departmentFilter, sortModel]);

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
  const handleDepartmentFilterChange = (value: string) => {
    setDepartmentFilter(value);
    dispatch(setPage(1));
  };

  // Handle actions menu
  const handleActionsClick = (event: React.MouseEvent<HTMLElement>, contactId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedContactId(contactId);
  };

  const handleActionsClose = () => {
    setAnchorEl(null);
    setSelectedContactId(null);
  };

  // Handle edit contact
  const handleEdit = () => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (contact && onEditContact) {
      onEditContact(contact);
    }
    handleActionsClose();
  };

  // Handle delete contact
  const handleDeleteClick = () => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (contact) {
      setContactToDelete(contact);
      setDeleteDialogOpen(true);
    }
    handleActionsClose();
  };

  const handleDeleteConfirm = async () => {
    if (contactToDelete) {
      await dispatch(deleteContact(contactToDelete.id));
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Define columns
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const contact = params.row as Contact;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                mr: 2, 
                width: 32, 
                height: 32, 
                bgcolor: 'primary.main',
                fontSize: '0.875rem'
              }}
            >
              {getInitials(contact.firstName, contact.lastName)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {`${contact.firstName} ${contact.lastName}`}
              </Typography>
              {contact.title && (
                <Typography variant="caption" color="text.secondary">
                  {contact.title}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'account',
      headerName: 'Account',
      width: 180,
      renderCell: (params) => {
        const contact = params.row as Contact;
        return contact.account ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ mr: 1, color: 'primary.main', fontSize: 16 }} />
            <Typography variant="body2">
              {contact.account.name}
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
      field: 'department',
      headerName: 'Department',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    // Removed unsupported status column for contacts
    {
      field: 'leadSource',
      headerName: 'Lead Source',
      width: 140,
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
            Contacts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your customer contacts and relationships
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size={isMobile ? 'medium' : 'large'}
          onClick={onCreateContact}
          fullWidth={isMobile}
        >
          New Contact
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
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
          fullWidth
        />

        <FormControl sx={{ minWidth: isMobile ? '100%' : 160 }} fullWidth={isMobile}>
          <InputLabel>Department</InputLabel>
          <Select
            value={departmentFilter}
            label="Department"
            onChange={(e) => handleDepartmentFilterChange(e.target.value)}
          >
            <MenuItem value="">All Departments</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="Support">Support</MenuItem>
            <MenuItem value="Operations">Operations</MenuItem>
            <MenuItem value="Finance">Finance</MenuItem>
            <MenuItem value="HR">HR</MenuItem>
            <MenuItem value="IT">IT</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: isMobile ? 'auto' : 600, width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={contacts}
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
        <DialogTitle>Delete Contact</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the contact "{contactToDelete?.firstName} {contactToDelete?.lastName}"? 
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

export default ContactsDataTable;