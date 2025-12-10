import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Chip,
  Menu,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  Stack,
  IconButton,
  ListItemIcon,
  Badge,
  Drawer,
  Divider,
  Tooltip,
  Autocomplete,
  Paper,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridActionsCellItem,
  GridRowParams,
  GridColumnVisibilityModel,
} from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Transform as ConvertIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Tune as TuneIcon,
  Download as DownloadIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
  WhatsApp as WhatsAppIcon,
  ViewColumn as ViewColumnIcon,
  ArrowForwardIosOutlined as ArrowForwardIosOutlinedIcon,
  ArrowBackIosOutlined as ArrowBackIosOutlinedIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchLeads,
  deleteLead,
  convertLead,
  updateLead,
  setPage,
  setLimit,
  clearError,
  LeadsState,
} from '../../store/slices/leadsSlice';
import { Lead, LeadView } from '../../services/leadsService';
import leadsService from '../../services/leadsService';
import leadSettingsService, { CenterFieldVisibility } from '../../services/leadSettingsService';
import { GLOBAL_LEAD_STATUSES } from '../../constants/leadStatus';
import callsService from '@/services/callsService';
import webSocketService from '@/services/webSocketService';
import CallDispositionModal from '@/components/common/CallDispositionModal';
import { Capacitor } from '@capacitor/core';

const mapCallLogTypeToCallType = (callLogType?: number, duration?: number): 'outgoing' | 'incoming' | 'missed' => {
  if (typeof callLogType === 'number') {
    switch (callLogType) {
      case 1:
        return 'incoming';
      case 2:
        return duration && duration > 0 ? 'outgoing' : 'missed';
      case 3:
      case 5:
      case 7:
        return 'missed';
      case 4:
      case 6:
      case 8:
        return duration && duration > 0 ? 'incoming' : 'missed';
      default:
        break;
    }
  }
  if (duration && duration > 0) {
    return 'outgoing';
  }
  return 'missed';
};

interface LeadsDataTableProps {
  onCreateLead?: () => void;
}

const LeadsDataTable: React.FC<LeadsDataTableProps> = ({
  onCreateLead,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { leads, total, page, limit, loading, error } = useSelector(
    (state: RootState) => state.leads as LeadsState
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useSelector((s: RootState) => s.auth);
  const rawRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = !!(user as any)?.isAdmin || rawRole === 'super-admin' || rawRole === 'admin';
  const role = isSuperAdmin ? 'super-admin' : (rawRole || 'counselor');
  const canCreate = role === 'center-manager' || role === 'counselor';
  const isNativePlatform = useMemo(() => {
    try {
      if (typeof Capacitor === 'undefined') {
        return false;
      }
      if (typeof Capacitor.isNativePlatform === 'function') {
        return Capacitor.isNativePlatform();
      }
      const platform = typeof Capacitor.getPlatform === 'function' ? Capacitor.getPlatform() : 'web';
      return platform !== 'web';
    } catch {
      return false;
    }
  }, []);

  const autoPersistCallLog = useCallback(async (detail: any) => {
    if (!detail || detail.source !== 'calllog') {
      return null;
    }

    const leadId = typeof detail.leadId === 'string' ? detail.leadId : null;
    const phoneNumber = typeof detail.phoneNumber === 'string' ? detail.phoneNumber : null;
    if (!leadId || !phoneNumber) {
      return null;
    }

    const duration = typeof detail.duration === 'number' && Number.isFinite(detail.duration)
      ? Math.max(0, Math.floor(detail.duration))
      : 0;

    const startTime = typeof detail.startTime === 'string' ? detail.startTime : new Date().toISOString();
    const completedAt = typeof detail.completedAt === 'string' ? detail.completedAt : new Date().toISOString();

    const callType = mapCallLogTypeToCallType(
      typeof detail.callLogType === 'number' ? detail.callLogType : undefined,
      duration,
    );

    const deviceCallLogId = detail.callLogId !== undefined && detail.callLogId !== null
      ? String(detail.callLogId)
      : undefined;

    try {
      const saved = await callsService.logCall({
        leadId,
        phoneNumber,
        callType,
        startTime,
        endTime: completedAt,
        duration,
        deviceCallLogId,
      });
      return saved;
    } catch (err) {
      console.error('Failed to auto-log call:', err);
      return null;
    }
  }, []);

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('');
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [importantOnly, setImportantOnly] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [createdAfter, setCreatedAfter] = useState<string>(''); // yyyy-mm-dd
  const [createdBefore, setCreatedBefore] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('');
  const [filtersRestored, setFiltersRestored] = useState(false);
  
  // State for actions menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  // State for dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);

  // Lead Views state
  const [views, setViews] = useState<LeadView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string>('');
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const DEFAULT_COLUMNS_CM_CN = ['name','company','leadStatus','leadSource','lastCallDisposition','lastCallNotes','actions'];
  const DEFAULT_COLUMNS_ADMIN = ['referenceNo','name','owner','counselor','leadStatus','lastCallDisposition','lastCallNotes','nextFollowUpAt','actions'];
  const DEFAULT_COLUMNS = isSuperAdmin ? DEFAULT_COLUMNS_ADMIN : DEFAULT_COLUMNS_CM_CN;
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [viewsMenuAnchor, setViewsMenuAnchor] = useState<null | HTMLElement>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [shareWithCenter, setShareWithCenter] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({});

  // Center-level field visibility settings (for center-manager and counselor)
  const [centerFieldVisibility, setCenterFieldVisibility] = useState<CenterFieldVisibility[]>([]);

  // CSV Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningBulk, setAssigningBulk] = useState(false);
  const [assignTargetLeadIds, setAssignTargetLeadIds] = useState<string[]>([]);
  const [counselors, setCounselors] = useState<Array<{ id: string; firstName: string; lastName: string; userName: string }>>([]);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');

  // Call disposition state
  const [callDispositionOpen, setCallDispositionOpen] = useState(false);
  const [callDispositionData, setCallDispositionData] = useState<{
    phoneNumber: string;
    leadId: string;
    startTime: string;
    callId?: string;
    duration?: number; // Duration from CallLog in seconds
    completedAt?: string;
    source?: string;
  } | null>(null);
  const [callGuardOpen, setCallGuardOpen] = useState(false);

  // Track if pagination is ready for fetching (initialization complete)
  const [paginationReady, setPaginationReady] = useState(false);

  // Initialize pagination from localStorage and handle mobile limit adjustment
  useEffect(() => {
    // Only run once on mount
    let targetLimit = limit;
    
    try {
      const saved = JSON.parse(localStorage.getItem('leads.pagination') || 'null');
      if (saved && typeof saved === 'object') {
        if (typeof saved.page === 'number') dispatch(setPage(saved.page));
        if (typeof saved.limit === 'number') targetLimit = saved.limit;
      }
    } catch {}
    
    // If mobile and limit would be > 6, set to 6
    if (isMobile && targetLimit > 6) {
      dispatch(setLimit(6));
    } else if (targetLimit !== limit) {
      dispatch(setLimit(targetLimit));
    }
    
    // Mark pagination as ready after a microtask to ensure state updates are applied
    Promise.resolve().then(() => {
      setPaginationReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist pagination to localStorage (only after ready)
  useEffect(() => {
    if (!paginationReady) return;
    try {
      localStorage.setItem('leads.pagination', JSON.stringify({ page, limit }));
    } catch {}
  }, [page, limit, paginationReady]);

  // Handle mobile limit adjustment when switching between mobile/desktop
  useEffect(() => {
    if (!paginationReady) return;
    if (isMobile && limit > 6) {
      dispatch(setLimit(6));
    }
  }, [isMobile, paginationReady, limit, dispatch]);

  // Listen for call-completed events from native dialer service (started in App.tsx)
  useEffect(() => {
    const processEvent = async (detail: any) => {
      const phoneNumber = typeof detail?.phoneNumber === 'string' ? detail.phoneNumber : undefined;
      const leadId = typeof detail?.leadId === 'string' ? detail.leadId : undefined;
      const startTime = typeof detail?.startTime === 'string' ? detail.startTime : new Date().toISOString();
      const durationRaw = typeof detail?.duration === 'number' && Number.isFinite(detail.duration)
        ? Math.max(0, detail.duration)
        : 0;
      const completedAt = typeof detail?.completedAt === 'string' ? detail.completedAt : new Date().toISOString();
      const source = typeof detail?.source === 'string' ? detail.source : 'unknown';

      console.log('🎯 LeadsDataTable received call-completed event:', {
        phoneNumber,
        leadId,
        startTime,
        duration: `${durationRaw}s`,
        completedAt,
        source,
      });

      if (!phoneNumber || !leadId) {
        console.warn('Call-completed event missing phoneNumber or leadId; skipping modal open.');
        return;
      }

      let callId: string | undefined = typeof detail?.callId === 'string' ? detail.callId : undefined;
      if (!callId) {
        const savedLog = await autoPersistCallLog(detail);
        if (savedLog?.id) {
          callId = savedLog.id;
        }
      }

      setCallDispositionData({
        phoneNumber,
        leadId,
        startTime,
        duration: durationRaw,
        completedAt,
        source,
        callId,
      });
      setCallDispositionOpen(true);
    };

    const handleCallCompleted = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      void processEvent(detail);
    };

    window.addEventListener('call-completed' as any, handleCallCompleted as any);
    return () => {
      window.removeEventListener('call-completed' as any, handleCallCompleted as any);
    };
  }, [autoPersistCallLog]);

  // Debounce search input updates -> searchTerm
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
      dispatch(setPage(1));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Fetch leads when component mounts or filters change
  useEffect(() => {
    // Skip fetch until pagination is ready (initialization complete)
    if (!paginationReady) {
      return;
    }
    const params = {
      page,
      limit,
      search: searchTerm || undefined,
      leadStatus: statusFilter || undefined,
      assignedUserId: role === 'center-manager' && counselorFilter ? counselorFilter : undefined,
      isImportant: importantOnly ? true : undefined,
      leadSource: leadSourceFilter || undefined,
      industry: industryFilter || undefined,
      locationCity: cityFilter || undefined,
      locationState: stateFilter || undefined,
      createdAfter: createdAfter || undefined,
      createdBefore: createdBefore || undefined,
      sortBy: sortModel[0]?.field || undefined,
      sortOrder: sortModel[0]?.sort || undefined,
    };
    dispatch(fetchLeads(params));
  }, [dispatch, page, limit, searchTerm, statusFilter, counselorFilter, importantOnly, leadSourceFilter, industryFilter, cityFilter, stateFilter, createdAfter, createdBefore, sortModel, paginationReady]);

  // Listen for real-time lead/call updates via WebSocket
  useEffect(() => {
    if (!paginationReady) return;

    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const debouncedRefresh = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        const params = {
          page,
          limit,
          search: searchTerm || undefined,
          leadStatus: statusFilter || undefined,
          assignedUserId: role === 'center-manager' && counselorFilter ? counselorFilter : undefined,
          isImportant: importantOnly ? true : undefined,
          leadSource: leadSourceFilter || undefined,
          industry: industryFilter || undefined,
          locationCity: cityFilter || undefined,
          locationState: stateFilter || undefined,
          createdAfter: createdAfter || undefined,
          createdBefore: createdBefore || undefined,
          sortBy: sortModel[0]?.field || undefined,
          sortOrder: sortModel[0]?.sort || undefined,
        };
        dispatch(fetchLeads(params));
        debounceTimeout = null;
      }, 500);
    };

    const handleLeadEvent = (payload: any) => {
      console.log('📡 Lead WebSocket event received:', payload?.id || payload);
      debouncedRefresh();
    };

    const handleCallEvent = (payload: any) => {
      console.log('📞 Call WebSocket event received:', payload?.id || payload);
      debouncedRefresh();
    };

    webSocketService.on('lead:created', handleLeadEvent);
    webSocketService.on('lead:updated', handleLeadEvent);
    webSocketService.on('lead:assigned', handleLeadEvent);
    webSocketService.on('lead:deleted', handleLeadEvent);
    webSocketService.on('call:logged', handleCallEvent);

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      webSocketService.off('lead:created', handleLeadEvent);
      webSocketService.off('lead:updated', handleLeadEvent);
      webSocketService.off('lead:assigned', handleLeadEvent);
      webSocketService.off('lead:deleted', handleLeadEvent);
      webSocketService.off('call:logged', handleCallEvent);
    };
  }, [dispatch, page, limit, searchTerm, statusFilter, counselorFilter, importantOnly, leadSourceFilter, industryFilter, cityFilter, stateFilter, createdAfter, createdBefore, sortModel, paginationReady, role]);

  // Load counselors list for center manager (for filter dropdown)
  useEffect(() => {
    if (role === 'center-manager') {
      (async () => {
        try {
          const list = await leadsService.listCounselors();
          setCounselors(list || []);
        } catch {}
      })();
    }
  }, [role]);

  // Load center field visibility settings (for center-manager and counselor)
  useEffect(() => {
    if (role === 'center-manager' || role === 'counselor') {
      (async () => {
        try {
          const vis = await leadSettingsService.getCenterFieldVisibility();
          setCenterFieldVisibility(vis || []);
        } catch {}
      })();
    }
  }, [role]);

  // Load lead views once
  useEffect(() => {
    (async () => {
      try {
        const data = await leadsService.listViews();
        setViews(data || []);
        // Apply stored selected view if available
        const storedId = localStorage.getItem('leads.selectedViewId') || '';
        const pick = (data || []).find(v => v.id === storedId) || (data || []).find(v => v.isDefault);
        if (pick) {
          applyView(pick);
        }
      } catch (e) {
        // ignore silently
      }
    })();
  }, []);

  // Restore filters from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('leads.filters');
      if (raw) {
        const f = JSON.parse(raw);
        if (f && typeof f === 'object') {
          setSearchInput(f.search || '');
          setSearchTerm(f.search || '');
          setStatusFilter(f.leadStatus || '');
          setCounselorFilter(f.counselorFilter || '');
          setImportantOnly(!!f.importantOnly);
          setLeadSourceFilter(f.leadSource || '');
          setIndustryFilter(f.industry || '');
          setCityFilter(f.city || '');
          setStateFilter(f.state || '');
          setCreatedAfter(f.createdAfter || '');
          setCreatedBefore(f.createdBefore || '');
          setDatePreset(f.datePreset || '');
        }
      }
    } catch {}
    setFiltersRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters to localStorage
  useEffect(() => {
    if (!filtersRestored) return;
    const payload = {
      search: searchTerm,
      leadStatus: statusFilter,
      counselorFilter,
      importantOnly,
      leadSource: leadSourceFilter,
      industry: industryFilter,
      city: cityFilter,
      state: stateFilter,
      createdAfter,
      createdBefore,
      datePreset,
    } as any;
    try { localStorage.setItem('leads.filters', JSON.stringify(payload)); } catch {}
  }, [filtersRestored, searchTerm, statusFilter, counselorFilter, importantOnly, leadSourceFilter, industryFilter, cityFilter, stateFilter, createdAfter, createdBefore, datePreset]);

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
    setSearchInput(event.target.value);
  };

  // Filter handlers moved into Drawer; status updates call setStatusFilter directly.

  // Apply a saved view
  const applyView = (view: LeadView) => {
    // Filters: map known keys
    const filters = view.filters || {};
    setSearchTerm(filters.search || '');
  setStatusFilter(filters.leadStatus || '');
  setCounselorFilter(filters.assignedUserId || filters.assignedToId || '');
    setImportantOnly(!!filters.isImportant);
  setLeadSourceFilter(filters.leadSource || '');
  setIndustryFilter(filters.industry || '');
  setCityFilter(filters.locationCity || '');
  setStateFilter(filters.locationState || '');
  setCreatedAfter(filters.createdAfter || '');
  setCreatedBefore(filters.createdBefore || '');
    if (view.sortBy) {
      const sort = String(view.sortOrder || 'asc').toLowerCase() as 'asc' | 'desc';
      setSortModel([{ field: view.sortBy, sort }]);
    }
    setSelectedViewId(view.id);
    const cols = (view.selectedFields && view.selectedFields.length) ? view.selectedFields : DEFAULT_COLUMNS;
    // Always include actions and name for usability
    const withRequired = Array.from(new Set([ ...cols, 'name', 'actions' ]));
    setSelectedColumns(withRequired);
    try { localStorage.setItem('leads.selectedViewId', view.id); } catch {}
    // Sync DataGrid column visibility with selected columns
    try {
      const nextVis: GridColumnVisibilityModel = {};
      const all = ['isImportant','referenceNo','name','owner','counselor','company','leadStatus','estimatedValue','leadSource','expectedCloseDate','nextFollowUpAt','actions'];
      all.forEach((f) => {
        nextVis[f] = withRequired.includes(f) || f === 'isImportant';
      });
      setColumnVisibilityModel(nextVis);
    } catch {}
    // Proactively fetch using this view's filters/sort so effect is immediate
    const params = {
      page: 1,
      limit,
      search: filters.search || undefined,
      leadStatus: filters.leadStatus || undefined,
      isImportant: filters.isImportant || undefined,
      leadSource: filters.leadSource || undefined,
      industry: filters.industry || undefined,
      locationCity: filters.locationCity || undefined,
      locationState: filters.locationState || undefined,
      createdAfter: filters.createdAfter || undefined,
      createdBefore: filters.createdBefore || undefined,
      sortBy: view.sortBy || undefined,
      sortOrder: (view.sortOrder as any) || undefined,
    } as any;
    dispatch(setPage(1));
    dispatch(fetchLeads(params));
  };

  const handleViewChange = (id: string) => {
    setSelectedViewId(id);
    const v = views.find(x => x.id === id);
    if (v) applyView(v);
    try { localStorage.setItem('leads.selectedViewId', id); } catch {}
  };

  const handleSaveView = async () => {
    try {
      // Derive selected fields from current column visibility model to respect user changes
      const visibleFields = Object.entries(columnVisibilityModel)
        .filter(([, v]) => !!v)
        .map(([k]) => k);
      const selectedFields = (visibleFields.length ? visibleFields : selectedColumns)
        .filter((c) => c !== 'actions');

      const view: Omit<LeadView, 'id'> = {
        name: newViewName || 'My View',
        selectedFields,
        filters: {
          search: searchTerm || undefined,
          leadStatus: statusFilter || undefined,
          isImportant: importantOnly || undefined,
          leadSource: leadSourceFilter || undefined,
          industry: industryFilter || undefined,
          locationCity: cityFilter || undefined,
          locationState: stateFilter || undefined,
          createdAfter: createdAfter || undefined,
          createdBefore: createdBefore || undefined,
          assignedUserId: role === 'center-manager' ? (counselorFilter || undefined) : undefined,
        },
        sortBy: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort as any,
        isDefault: false,
        scope: shareWithCenter && role === 'center-manager' ? 'center' : 'personal',
      };
  const created = await leadsService.createView(view);
      setViews(prev => [...prev, created]);
      setSaveViewDialogOpen(false);
      setNewViewName('');
      setSelectedViewId(created.id);
      try { localStorage.setItem('leads.selectedViewId', created.id); } catch {}
    } catch (e: any) {
      setImportError(e?.message || 'Failed to save view');
    }
  };

  // Views dropdown menu (set default / rename / delete)
  const openViewsMenu = (e: React.MouseEvent<HTMLElement>) => setViewsMenuAnchor(e.currentTarget);
  const closeViewsMenu = () => setViewsMenuAnchor(null);
  const selectedView = views.find(v => v.id === selectedViewId) || null;
  const handleSetDefault = async () => {
    if (!selectedView) return;
    try {
      const updated = await leadsService.updateView(selectedView.id, { isDefault: true });
      // ensure only one default locally
      setViews(prev => prev.map(v => ({ ...v, isDefault: v.id === updated.id })));
    } catch (e: any) {
      setViewError('You do not have permission to set this view as default.');
    } finally {
      closeViewsMenu();
    }
  };
  const handleOpenRename = () => {
    if (!selectedView) return;
    setRenameValue(selectedView.name);
    setRenameDialogOpen(true);
    closeViewsMenu();
  };
  const handleRename = async () => {
    if (!selectedView) return;
    try {
      const updated = await leadsService.updateView(selectedView.id, { name: renameValue });
      setViews(prev => prev.map(v => v.id === updated.id ? updated : v));
    } catch (e: any) {
      setViewError('You do not have permission to rename this view.');
    } finally {
      setRenameDialogOpen(false);
    }
  };
  const handleDeleteView = async () => {
    if (!selectedView) return;
    try {
      await leadsService.deleteView(selectedView.id);
      setViews(prev => prev.filter(v => v.id !== selectedView.id));
      setSelectedViewId('');
      try { localStorage.removeItem('leads.selectedViewId'); } catch {}
    } catch (e: any) {
      setViewError('You do not have permission to delete this view.');
    } finally {
      closeViewsMenu();
    }
  };

  // CSV Import handlers
  const handleImportCsv = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await leadsService.importCsv(file);
      setImportResult(result);
      // Refresh list after import
      dispatch(fetchLeads({ page, limit, search: searchTerm || undefined, leadStatus: statusFilter || undefined, sortBy: sortModel[0]?.field || undefined, sortOrder: sortModel[0]?.sort as any }));
    } catch (e: any) {
      setImportError(e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Sample CSV download (headers only)
  const FULL_HEADERS = [
    'firstName','lastName','email','mobileNumber',
    'emailVerified','alternateNumber','mobileVerified','whatsappNumber','whatsappVerified','isImportant',
    'locationCity','locationState','nationality','gender','dateOfBirth','motherTongue','highestQualification','yearOfCompletion','yearsOfExperience','university','program','specialization','batch',
    'leadSource','leadSubSource','createdFrom','leadStatus','leadSubStatus','nextFollowUpAt','leadDescription','reasonDeadInvalid','comment',
    'company','title','industry','website','actionsScore'
  ];
  const handleDownloadFullSampleCsv = () => {
    try {
      const headerLine = FULL_HEADERS.join(',');
      const blob = new Blob([headerLine + '\n'], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads-full-sample.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setImportError('Failed to generate full sample CSV');
    }
  };

  // Removed rating filter; not supported by backend for leads

  // Handle call icon click
  const handleCallClick = (leadId: string, phoneNumber: string) => {
    if (!phoneNumber || isSuperAdmin) return;

    if (!isNativePlatform) {
      setCallGuardOpen(true);
      return;
    }

    void callsService.initiateCall(phoneNumber, leadId);
  };

  // Handle WhatsApp icon click
  const handleWhatsAppClick = (phoneNumber: string) => {
    if (!phoneNumber) return;
    // Clean phone number - remove spaces, dashes, parentheses
    let cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    // Remove leading + if present, wa.me handles it
    if (cleanNumber.startsWith('+')) {
      cleanNumber = cleanNumber.substring(1);
    }
    // If number doesn't start with country code, assume India (+91)
    if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  // Handle actions menu
  const handleActionsClick = (event: React.MouseEvent<HTMLElement>, leadId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedLeadId(leadId);
  };

  const handleActionsClose = () => {
    setAnchorEl(null);
    setSelectedLeadId(null);
  };

  // Edit from list removed — editing happens on the lead detail page

  // Handle convert lead
  const handleConvertClick = () => {
    const lead = leads.find((l: Lead) => l.id === selectedLeadId);
    if (lead) {
      setLeadToConvert(lead);
      setConvertDialogOpen(true);
    }
    handleActionsClose();
  };

  const handleConvertConfirm = async () => {
    if (leadToConvert) {
      // If this conversion removes the last row on the current page,
      // adjust pagination and refetch so we don't end up on an empty page.
      const wasLastItemOnPage = (leads || []).length === 1;
      const nextPage = wasLastItemOnPage && page > 1 ? page - 1 : page;

      await dispatch(convertLead(leadToConvert.id));

      setConvertDialogOpen(false);
      setLeadToConvert(null);

      // Always refresh after conversion to ensure correct re-pagination
      try {
        if (nextPage !== page) dispatch(setPage(nextPage));
        await dispatch(fetchLeads({
          page: nextPage,
          limit,
          search: searchTerm || undefined,
          leadStatus: statusFilter || undefined,
          assignedUserId: role === 'center-manager' && counselorFilter ? counselorFilter : undefined,
          isImportant: importantOnly ? true : undefined,
          leadSource: leadSourceFilter || undefined,
          industry: industryFilter || undefined,
          locationCity: cityFilter || undefined,
          locationState: stateFilter || undefined,
          createdAfter: createdAfter || undefined,
          createdBefore: createdBefore || undefined,
          sortBy: sortModel[0]?.field || undefined,
          sortOrder: sortModel[0]?.sort || undefined,
        } as any));
      } catch {}
    }
  };

  const handleConvertCancel = () => {
    setConvertDialogOpen(false);
    setLeadToConvert(null);
  };

  // Handle delete lead
  const handleDeleteClick = () => {
    const lead = leads.find((l: Lead) => l.id === selectedLeadId);
    if (lead) {
      setLeadToDelete(lead);
      setDeleteDialogOpen(true);
    }
    handleActionsClose();
  };

  const handleDeleteConfirm = async () => {
    if (leadToDelete) {
      // Determine if this is the last item on the current page before deletion
      const wasLastItemOnPage = (leads || []).length === 1;
      const nextPage = wasLastItemOnPage && page > 1 ? page - 1 : page;

      await dispatch(deleteLead(leadToDelete.id));

      setDeleteDialogOpen(false);
      setLeadToDelete(null);

      // Refetch to fill the current page (or move to previous page) after deletion
      try {
        if (nextPage !== page) dispatch(setPage(nextPage));
        await dispatch(fetchLeads({
          page: nextPage,
          limit,
          search: searchTerm || undefined,
          leadStatus: statusFilter || undefined,
          assignedUserId: role === 'center-manager' && counselorFilter ? counselorFilter : undefined,
          isImportant: importantOnly ? true : undefined,
          leadSource: leadSourceFilter || undefined,
          industry: industryFilter || undefined,
          locationCity: cityFilter || undefined,
          locationState: stateFilter || undefined,
          createdAfter: createdAfter || undefined,
          createdBefore: createdBefore || undefined,
          sortBy: sortModel[0]?.field || undefined,
          sortOrder: sortModel[0]?.sort || undefined,
        } as any));
      } catch {}
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setLeadToDelete(null);
  };

  const handleHistoryClick = async () => {
    const lead = leads.find((l: Lead) => l.id === selectedLeadId) || null;
    if (lead) {
      try {
        const items = await leadsService.getLeadHistory(lead.id);
        setHistoryItems(items || []);
        setHistoryLead(lead);
        setHistoryDialogOpen(true);
      } catch (e) {
        // ignore
      }
    }
    handleActionsClose();
  };

  const openAssignDialog = async (ids: string[], bulk: boolean = false) => {
    try {
      setAssigningBulk(bulk);
      setAssignTargetLeadIds(ids);
      setSelectedCounselorId('');
  const list = await leadsService.listCounselors();
  setCounselors(list || []);
      setAssignDialogOpen(true);
    } catch (e) {}
  };

  const handleAssignSingleClick = async () => {
    if (!selectedLeadId) return;
    await openAssignDialog([selectedLeadId], false);
    handleActionsClose();
  };

  const [rowSelectionModel, setRowSelectionModel] = useState<string[]>([]);
  const anySelected = rowSelectionModel.length > 0;
  const handleBulkAssignClick = async () => {
    if (!anySelected) return;
    await openAssignDialog(rowSelectionModel as string[], true);
  };

  const handleBulkDeleteClick = async () => {
    if (!anySelected) return;
    if (!window.confirm(`Are you sure you want to delete ${rowSelectionModel.length} selected lead(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await leadsService.deleteLeadsBulk(rowSelectionModel as string[]);
      if (result.errors && result.errors.length > 0) {
        console.error('Bulk delete errors:', result.errors);
        console.log(`Deleted ${result.deleted} lead(s). ${result.errors.length} failed.`);
      } else {
        console.log(`Successfully deleted ${result.deleted} lead(s)`);
      }
      setRowSelectionModel([]);
      // Refresh data
      const params: any = { page, limit };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.leadStatus = statusFilter;
      if (sortModel.length) {
        params.sortBy = sortModel[0].field;
        params.sortOrder = sortModel[0].sort;
      }
      dispatch(fetchLeads(params));
    } catch (error: any) {
      console.error('Bulk delete failed:', error);
      alert(error?.message || 'Failed to delete leads');
    }
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

  // Get initials for avatar
 const getInitials = (firstName: string | null | undefined, lastName: string | null | undefined) => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
};

  // Helper: Check if a field is enabled in filters (for center-manager/counselor)
  // If no settings exist, default to enabled
  const isFilterFieldEnabled = useCallback((fieldKey: string): boolean => {
    if (isSuperAdmin) return true; // Super admin always sees all
    if (centerFieldVisibility.length === 0) return true; // No settings = all enabled
    const setting = centerFieldVisibility.find((s) => s.key === fieldKey);
    return setting ? setting.filterEnabled : true;
  }, [isSuperAdmin, centerFieldVisibility]);

  // Helper: Check if a field is enabled in columns (for center-manager/counselor)
  const isColumnFieldEnabled = useCallback((fieldKey: string): boolean => {
    if (isSuperAdmin) return true;
    if (centerFieldVisibility.length === 0) return true;
    const setting = centerFieldVisibility.find((s) => s.key === fieldKey);
    return setting ? setting.columnEnabled : true;
  }, [isSuperAdmin, centerFieldVisibility]);

  // Define columns
  const navigate = useNavigate();
  const baseColumns: GridColDef[] = useMemo(() => [
    {
      field: 'isImportant',
      headerName: '',
      width: 50,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const lead = params.row as Lead;
        const starred = !!lead.isImportant;
        const toggle = async (e: React.MouseEvent) => {
          e.stopPropagation();
          try {
            await dispatch(updateLead({ id: lead.id, data: { isImportant: !starred } }));
          } catch {}
        };
        return (
          <IconButton size="small" onClick={toggle} aria-label={starred ? 'Unmark important' : 'Mark important'}>
            {starred ? <StarIcon sx={{ color: 'warning.main' }} fontSize="small" /> : <StarBorderIcon fontSize="small" />}
          </IconButton>
        );
      },
    },
    {
      field: 'referenceNo',
      headerName: 'Reference / Reg. No',
      minWidth: 160,
      flex: 0.8,
      renderCell: (params) => (
        <Typography variant="body2" color="text.primary">{params.value || '-'}</Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const lead = params.row as Lead;
        const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                mr: 1, 
                width: 32, 
                height: 32, 
                bgcolor: '#7EB1FD',
                fontSize: '0.875rem'
              }}
            >
              {getInitials(lead.firstName, lead.lastName)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {fullName || '-'}
              </Typography>
              {lead.title && (
                <Typography variant="caption" color="text.secondary">
                  {lead.title}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'owner',
      headerName: 'Owner',
      minWidth: 160,
      flex: 0.8,
      valueGetter: (params) => {
        const lead = params.row as Lead & { ownerName?: string; ownerUsername?: string };
        return (lead as any).ownerName || (lead as any).ownerUsername || '-';
      },
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">{params.value || '-'}</Typography>
      ),
    },
    {
      field: 'counselor',
      headerName: 'Counselor',
      minWidth: 180,
      flex: 0.9,
      valueGetter: (params) => {
        const lead = params.row as Lead & { counselorName?: string; counselorCode?: string };
        const name = (lead as any).counselorName;
        const code = (lead as any).counselorCode;
        return name || (code ? `@${code}` : '-');
      },
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">{params.value || '-'}</Typography>
      ),
    },
    {
      field: 'company',
      headerName: 'Company',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    // Email and Mobile removed from list per requirement; present on detail page
    {
      field: 'leadStatus',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const v = String(params.value || '');
        const success = new Set([
          'Closed - Won',
          'Registration Fee Paid',
          'Reg Fee Paid & Documents Uploaded',
          'Documents Approved',
          'Semester fee paid',
          'Yearly fee paid',
          'Full fee paid - Lumpsum',
          'Full fee paid - Loan',
          'Admission Fee Paid',
        ]);
        const warning = new Set([
          'Hot',
          'Warm',
          'Needs Follow Up',
          'Ask to Call back',
          'University Form filled',
        ]);
        const error = new Set([
          'Closed - Lost',
          'Documents Rejected',
          'Not interested',
          'Dead On Arrival',
          'DND',
          'Invalid No/Wrong No',
          'Phone Switched Off/Ringing/No Response',
        ]);
        const color = success.has(v) ? 'success' : warning.has(v) ? 'warning' : error.has(v) ? 'error' : 'info';
        return (
          <Chip label={params.value} size="small" color={color as any} variant="outlined" />
        );
      },
    },
    // Removed rating column; leads do not have a rating field in backend
    {
      field: 'estimatedValue',
      headerName: 'Est. Value',
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2">
          {formatCurrency(params.value)}
        </Typography>
      ),
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
      field: 'expectedCloseDate',
      headerName: 'Expected Close',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value ? new Date(params.value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'nextFollowUpAt',
      headerName: 'Next Follow-up',
      width: 160,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value ? new Date(params.value as string).toLocaleString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'lastCallDisposition',
      headerName: 'Last Call Disposition',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'lastCallNotes',
      headerName: 'Last Call Notes',
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {params.value || '-'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 140,
      getActions: (params: GridRowParams) => {
        const lead = params.row as Lead;
        const phoneNumber = lead.mobileNumber || lead.alternateNumber || '';
        const whatsappNumber = lead.whatsappNumber || lead.mobileNumber || '';
        const showCallAction = !!phoneNumber && !isSuperAdmin;
        const showWhatsAppAction = !!whatsappNumber;
        return [
          showCallAction ? (
            <GridActionsCellItem
              icon={<PhoneIcon sx={{ color: 'text.secondary' }} />}
              label="Call"
              onClick={() => handleCallClick(params.id as string, phoneNumber)}
              showInMenu={false}
            />
          ) : null,
          showWhatsAppAction ? (
            <GridActionsCellItem
              icon={<WhatsAppIcon sx={{ color: '#25D366' }} />}
              label="WhatsApp"
              onClick={() => handleWhatsAppClick(whatsappNumber)}
              showInMenu={false}
            />
          ) : null,
          <GridActionsCellItem
            icon={<MoreVertIcon />}
            label="More actions"
            onClick={(event) => handleActionsClick(event, params.id as string)}
            showInMenu={false}
          />,
        ].filter(Boolean);
      },
    },
  ], []);

  const columns: GridColDef[] = useMemo(() => {
    const map = new Map<string, GridColDef>(baseColumns.map(c => [c.field, c]));
    const toShow: GridColDef[] = [];
    selectedColumns.forEach(f => {
      const c = map.get(f);
      if (c) toShow.push(c);
    });
    // Fallback ensure we have at least name + actions
    if (!toShow.find(c => c.field === 'name')) {
      const c = map.get('name'); if (c) toShow.unshift(c);
    }
    if (!toShow.find(c => c.field === 'actions')) {
      const c = map.get('actions'); if (c) toShow.push(c);
    }
    // Always include important star as the first column
    const imp = map.get('isImportant');
    if (imp && !toShow.find(c => c.field === 'isImportant')) {
      toShow.unshift(imp);
    }
    return toShow;
  }, [baseColumns, selectedColumns]);

  // Empty-state overlay
  const NoLeadsOverlay: React.FC = () => (
    <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>No leads found</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>Try adjusting filters or create a new lead.</Typography>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => setImportDialogOpen(true)} disabled={!canCreate}>Import CSV</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateLead} disabled={!canCreate}>New Lead</Button>
      </Stack>
    </Box>
  );

  // If API returns placeholder rows (all key identity fields empty), treat as no rows
  const isPseudoEmpty = useMemo(() => {
    if (!Array.isArray(leads) || leads.length === 0) return false;
    return leads.every((l: any) => !l?.firstName && !l?.lastName && !l?.email && !l?.mobileNumber);
  }, [leads]);

  // Active filters helper (for chips + badge)
  const activeFilterCount = useMemo(() => {
    return [
      !!statusFilter,
      !!leadSourceFilter,
      !!industryFilter,
      !!cityFilter,
      !!stateFilter,
      !!createdAfter || !!createdBefore,
      !!importantOnly,
    ].filter(Boolean).length;
  }, [statusFilter, leadSourceFilter, industryFilter, cityFilter, stateFilter, createdAfter, createdBefore, importantOnly]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (statusFilter) chips.push({ key: 'status', label: `Status: ${statusFilter}` , clear: () => setStatusFilter('') });
    if (role === 'center-manager' && counselorFilter) {
      const c = counselors.find(x => x.id === counselorFilter);
      const label = c ? `${c.firstName} ${c.lastName}`.trim() || `@${c.userName}` : counselorFilter;
      chips.push({ key: 'counselor', label: `Counselor: ${label}`, clear: () => setCounselorFilter('') });
    }
    if (leadSourceFilter) chips.push({ key: 'source', label: `Source: ${leadSourceFilter}` , clear: () => setLeadSourceFilter('') });
    if (industryFilter) chips.push({ key: 'industry', label: `Industry: ${industryFilter}` , clear: () => setIndustryFilter('') });
    if (cityFilter) chips.push({ key: 'city', label: `City: ${cityFilter}` , clear: () => setCityFilter('') });
    if (stateFilter) chips.push({ key: 'state', label: `State: ${stateFilter}` , clear: () => setStateFilter('') });
    if (createdAfter || createdBefore) chips.push({ key: 'date', label: `Created: ${createdAfter || '…'} → ${createdBefore || '…'}` , clear: () => { setCreatedAfter(''); setCreatedBefore(''); setDatePreset(''); } });
    if (importantOnly) chips.push({ key: 'important', label: 'Important only' , clear: () => setImportantOnly(false) });
    return chips;
  }, [statusFilter, leadSourceFilter, industryFilter, cityFilter, stateFilter, createdAfter, createdBefore, importantOnly]);

  // Suggestions for Autocomplete based on current leads
  const sourceOptions = useMemo(() => Array.from(new Set((leads || []).map((l: any) => l.leadSource).filter(Boolean))).sort(), [leads]);
  const industryOptions = useMemo(() => Array.from(new Set((leads || []).map((l: any) => l.industry).filter(Boolean))).sort(), [leads]);
  const cityOptions = useMemo(() => Array.from(new Set((leads || []).map((l: any) => l.locationCity).filter(Boolean))).sort(), [leads]);
  const stateOptions = useMemo(() => Array.from(new Set((leads || []).map((l: any) => l.locationState).filter(Boolean))).sort(), [leads]);

  const applyDatePreset = (v: string) => {
    setDatePreset(v);
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    let a = '';
    let b = '';
    if (v === 'last7') {
      const end = startOfDay(now);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      a = fmt(start); b = fmt(end);
    } else if (v === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = startOfDay(now);
      a = fmt(start); b = fmt(end);
    } else if (v === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      a = fmt(start); b = fmt(end);
    } else if (v === 'thisQuarter') {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      const end = startOfDay(now);
      a = fmt(start); b = fmt(end);
    } else if (v === 'today') {
      const d0 = startOfDay(now);
      a = fmt(d0); b = fmt(d0);
    } else if (v === '' || v === 'custom') {
      a = createdAfter; b = createdBefore; // no-op
    }
    if (v !== 'custom') {
      setCreatedAfter(a);
      setCreatedBefore(b);
      dispatch(setPage(1));
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 1 }}>
        {viewError && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setViewError(null)}>
            {viewError}
          </Alert>
        )}
        
        {/* Mobile-optimized header */}
        {isMobile ? (
          <Box sx={{ mb: 2 }}>
            {/* Title row with Views dropdown and Filters */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.1, color: '#111827', letterSpacing: '-0.02em' }}>Leads</Typography>
                <Typography sx={{ fontSize: '0.9rem', color: '#6b7280', mt: 0.5 }}>{isPseudoEmpty ? 0 : total} Items</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <FormControl size="small">
                  <Select 
                    value={selectedViewId} 
                    onChange={(e) => handleViewChange(String(e.target.value))}
                    displayEmpty
                    sx={{ 
                      '& .MuiSelect-select': { 
                        py: 0.875, 
                        px: 1.5,
                        fontSize: '0.875rem',
                        color: '#374151',
                        fontWeight: 500,
                      },
                      borderRadius: '8px',
                      bgcolor: 'transparent',
                      minWidth: 85,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9ca3af',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9ca3af',
                      },
                    }}
                  >
                    <MenuItem value="">Views</MenuItem>
                    {views.map(v => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Badge color="primary" badgeContent={activeFilterCount || 0} overlap="circular">
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<TuneIcon sx={{ fontSize: '1rem' }} />}
                    onClick={() => setFilterDrawerOpen(true)} 
                    sx={{ 
                      borderColor: '#9ca3af',
                      bgcolor: 'transparent',
                      color: '#374151',
                      minWidth: 'auto',
                      px: 1.5,
                      py: 0.875,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '8px',
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        bgcolor: 'rgba(0,0,0,0.02)',
                      },
                    }}
                  >
                    Filters
                  </Button>
                </Badge>
              </Stack>
            </Stack>
          </Box>
        ) : (
          /* Desktop header - matching screenshot layout */
          <Box>
            {/* Title Row */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '2.5rem', mb: 0, lineHeight: 1.1, letterSpacing: '-0.5px' }}>Leads</Typography>
                <Typography sx={{ fontSize: '0.9rem', mt: 0 }} color="text.secondary">{isPseudoEmpty ? 0 : total} Items</Typography>
              </Box>
            </Stack>
            
            {/* Controls Row */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              {/* Left side controls */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Badge color="primary" badgeContent={activeFilterCount || 0} overlap="circular">
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<TuneIcon />} 
                    onClick={() => setFilterDrawerOpen(true)}
                    sx={{ 
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                  >
                    Filters
                  </Button>
                </Badge>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select 
                    value={selectedViewId} 
                    onChange={(e) => handleViewChange(String(e.target.value))}
                    displayEmpty
                    sx={{ 
                      '& .MuiSelect-select': { py: 0.75 },
                      borderColor: 'divider',
                    }}
                  >
                    <MenuItem value="">Views</MenuItem>
                    {views.map(v => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.name} {v.isDefault ? ' (Default)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Tooltip title="View options">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={openViewsMenu} 
                      disabled={!selectedViewId}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Tooltip title="Save current view">
                  <IconButton 
                    size="small" 
                    onClick={() => setSaveViewDialogOpen(true)}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <SaveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setStatusFilter('');
                    setCounselorFilter('');
                    setImportantOnly(false);
                    setLeadSourceFilter('');
                    setIndustryFilter('');
                    setCityFilter('');
                    setStateFilter('');
                    setCreatedAfter('');
                    setCreatedBefore('');
                    setDatePreset('');
                    dispatch(setPage(1));
                  }}
                  sx={{ color: 'text.secondary' }}
                >
                  Reset
                </Button>
              </Stack>
              
              {/* Right side controls */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<ViewColumnIcon />}
                  onClick={() => setColumnsDialogOpen(true)}
                  sx={{ 
                    borderColor: 'divider',
                    color: 'text.primary',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                >
                  Manage Column
                </Button>
                
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<DownloadIcon />} 
                  onClick={() => setImportDialogOpen(true)} 
                  disabled={!canCreate}
                  sx={{ 
                    borderColor: 'divider',
                    color: 'text.primary',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                >
                  Import
                </Button>
                
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={onCreateLead} 
                  disabled={!canCreate}
                  sx={{ 
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  New Lead
                </Button>
              </Stack>
            </Stack>
            
            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
                {activeFilterChips.map(ch => (
                  <Chip key={ch.key} label={ch.label} size="small" onDelete={ch.clear} />
                ))}
                <Button size="small" onClick={() => {
                  activeFilterChips.forEach(c => c.clear());
                  dispatch(setPage(1));
                }}>Clear all</Button>
              </Stack>
            )}
          </Box>
        )}
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

      {/* Data Grid - Desktop / Cards - Mobile */}
      {isMobile ? (
        /* Mobile Card View - Pixel Perfect Match to Screenshot */
        <Box sx={{ bgcolor: '#fff', borderRadius: '20px', mx: -0.5, px: 1.5, pt: 1.5, pb: 2, minHeight: 'calc(100vh - 180px)' }}>
          {/* Search bar */}
          <Box 
            sx={{ 
              mb: 2,
              borderRadius: '12px',
              overflow: 'hidden',
              bgcolor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              py: 0.75,
            }}
          >
            <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </Box>
            <TextField 
              size="small" 
              placeholder="Search Lead" 
              value={searchInput} 
              onChange={handleSearch}
              fullWidth
              variant="standard"
              InputProps={{
                disableUnderline: true,
              }}
              sx={{ 
                '& .MuiInputBase-input': {
                  py: 0.25,
                  fontSize: '0.9rem',
                  color: '#6b7280',
                  '&::placeholder': {
                    color: '#9ca3af',
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>

          {/* Lead Cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Loading...</Typography>
              </Box>
            ) : isPseudoEmpty || leads.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No leads found</Typography>
              </Box>
            ) : (
              leads.map((lead: Lead) => {
                const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() || '-';
                const phoneNumber = lead.mobileNumber || lead.whatsappNumber || lead.alternateNumber || '';
                const lastCallDisposition = lead.lastCallDisposition || '-';
                const lastCallNotes = lead.lastCallNotes || '-';
                
                return (
                  <Box
                    key={lead.id}
                    sx={{
                      borderRadius: '14px',
                      overflow: 'hidden',
                      bgcolor: 'transparent',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {/* Card Content */}
                    <Box sx={{ px: 2, py: 2 }}>
                      {/* Top Row: Star, Name, Status Badge, Source */}
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
                        <Stack direction="row" alignItems="flex-start" spacing={0.75}>
                          <IconButton 
                            size="small" 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await dispatch(updateLead({ id: lead.id, data: { isImportant: !lead.isImportant } }));
                              } catch {}
                            }}
                            sx={{ p: 0, mt: 0.25 }}
                          >
                            {lead.isImportant ? (
                              <StarIcon sx={{ color: '#fbbf24', fontSize: '1.15rem' }} />
                            ) : (
                              <StarBorderIcon sx={{ fontSize: '1.15rem', color: '#d1d5db' }} />
                            )}
                          </IconButton>
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827' }}>{fullName}</Typography>
                              <Chip
                                label={lead.leadStatus || 'New'}
                                size="small"
                                sx={{
                                  height: 20,
                                  maxWidth: 90,
                                  fontSize: '0.65rem',
                                  fontWeight: 500,
                                  bgcolor: '#e0f2fe',
                                  color: '#0369a1',
                                  borderRadius: '5px',
                                  border: '1px solid #bae6fd',
                                  '& .MuiChip-label': {
                                    px: 0.75,
                                    py: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  },
                                }}
                              />
                            </Stack>
                            <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {lead.company || '-'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
                          <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500, mb: 0.125 }}>Source</Typography>
                          <Typography sx={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>{lead.leadSource || 'Website'}</Typography>
                        </Box>
                      </Stack>

                      {/* Middle Row: Last Call Disposition & Notes */}
                      <Stack direction="row" spacing={2.5} sx={{ mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '0.7rem', color: '#374151', fontWeight: 600, mb: 0.25 }}>
                            Last Call Disposition
                          </Typography>
                          <Typography sx={{ fontSize: '0.8rem', color: '#111827' }}>{lastCallDisposition}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '0.7rem', color: '#374151', fontWeight: 600, mb: 0.25 }}>
                            Last Call Notes
                          </Typography>
                          <Typography sx={{ fontSize: '0.8rem', color: '#111827' }}>{lastCallNotes}</Typography>
                        </Box>
                      </Stack>

                      {/* Divider */}
                      <Divider sx={{ mb: 1.5, borderColor: '#e5e7eb' }} />

                      {/* Bottom Row: View Details Button & Actions */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            px: 4,
                            py: 0.75,
                            borderColor: '#d1d5db',
                            color: '#374151',
                            bgcolor: 'transparent',
                            minWidth: 120,
                            '&:hover': {
                              borderColor: '#9ca3af',
                              bgcolor: 'rgba(0,0,0,0.02)',
                            },
                          }}
                        >
                          View Details
                        </Button>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCallClick(lead.id, phoneNumber);
                            }}
                            disabled={!phoneNumber || isSuperAdmin}
                            sx={{ 
                              color: '#6b7280',
                              p: 0.75,
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              bgcolor: 'transparent',
                              '&:hover': { 
                                color: '#374151', 
                                bgcolor: 'rgba(0,0,0,0.02)',
                                borderColor: '#9ca3af',
                              },
                            }}
                          >
                            <PhoneIcon sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppClick(phoneNumber);
                            }}
                            disabled={!phoneNumber}
                            sx={{ 
                              color: '#22c55e',
                              p: 0.75,
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              bgcolor: 'transparent',
                              '&:hover': { 
                                color: '#16a34a', 
                                bgcolor: 'rgba(34, 197, 94, 0.05)',
                                borderColor: '#9ca3af',
                              },
                            }}
                          >
                            <WhatsAppIcon sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionsClick(e, lead.id)}
                            sx={{ 
                              color: '#6b7280',
                              p: 0.75,
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              bgcolor: 'transparent',
                              '&:hover': { 
                                color: '#374151', 
                                bgcolor: 'rgba(0,0,0,0.02)',
                                borderColor: '#9ca3af',
                              },
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {/* Mobile Pagination */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2.5,
              mt: 1,
            }}
          >
            {/* Prev Button */}
            <IconButton
              onClick={() => dispatch(setPage(Math.max(1, page - 1)))}
              disabled={page <= 1 || loading}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                width: 40,
                height: 40,
                bgcolor: '#fff',
                '&:hover': {
                  bgcolor: '#f9fafb',
                  borderColor: '#d1d5db',
                },
                '&.Mui-disabled': {
                  bgcolor: '#f9fafb',
                  borderColor: '#e5e7eb',
                  opacity: 0.5,
                },
              }}
            >
              <ArrowBackIosOutlinedIcon sx={{ fontSize: 16, color: '#374151' }} />
            </IconButton>

            {/* Page Numbers */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              {(() => {
                const totalPages = Math.ceil((isPseudoEmpty ? 0 : total) / limit) || 1;
                const pages: (number | string)[] = [];
                
                // Simplified pagination for mobile matching screenshot: 1 2 ... 67 68
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1, 2);
                  pages.push('...');
                  pages.push(totalPages - 1, totalPages);
                }
                
                return pages.map((p, idx) => (
                  p === '...' ? (
                    <Typography key={`ellipsis-${idx}`} sx={{ px: 1, color: '#6b7280', fontSize: '0.9rem', fontWeight: 500 }}>...</Typography>
                  ) : (
                    <Button
                      key={p}
                      size="small"
                      disabled={loading}
                      onClick={() => dispatch(setPage(p as number))}
                      sx={{
                        minWidth: 32,
                        height: 32,
                        borderRadius: '8px',
                        fontWeight: page === p ? 600 : 500,
                        bgcolor: page === p ? 'grey.800' : 'transparent',
                        color: page === p ? '#fff' : '#374151',
                        fontSize: '0.9rem',
                        p: 0,
                        '&:hover': {
                          bgcolor: page === p ? 'grey.900' : '#e5e7eb',
                        },
                      }}
                    >
                      {p}
                    </Button>
                  )
                ));
              })()}
            </Stack>

            {/* Next Button */}
            <IconButton
              onClick={() => dispatch(setPage(page + 1))}
              disabled={page >= Math.ceil((isPseudoEmpty ? 0 : total) / limit) || loading}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                width: 40,
                height: 40,
                bgcolor: '#fff',
                '&:hover': {
                  bgcolor: '#f9fafb',
                  borderColor: '#d1d5db',
                },
                '&.Mui-disabled': {
                  bgcolor: '#f9fafb',
                  borderColor: '#e5e7eb',
                  opacity: 0.5,
                },
              }}
            >
              <ArrowForwardIosOutlinedIcon sx={{ fontSize: 16, color: '#374151' }} />
            </IconButton>
          </Box>
        </Box>
      ) : (
        /* Desktop Data Grid */
        <Box>
        <Paper sx={{ width: '100%', overflow: 'hidden' }} elevation={0} variant="outlined">
          {/* Search bar inside table container */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField 
              size="small" 
              placeholder="Search Lead" 
              value={searchInput} 
              onChange={handleSearch}
              sx={{ 
                width: isMobile ? '100%' : 400,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                }
              }}
            />
            <Box sx={{ float: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing
              </Typography>
              <FormControl size="small" sx={{ minWidth: 60 }}>
                <Select
                  value={limit}
                  onChange={(e) => {
                    dispatch(setLimit(Number(e.target.value)));
                    dispatch(setPage(1));
                  }}
                  sx={{ '& .MuiSelect-select': { py: 1 } }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                of {isPseudoEmpty ? 0 : total} results
              </Typography>
            </Box>
          </Box>
          
        <DataGrid
          rows={isPseudoEmpty ? [] : leads}
          columns={columns}
          slots={{
            noRowsOverlay: NoLeadsOverlay,
            noResultsOverlay: NoLeadsOverlay,
          }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(m) => {
            setColumnVisibilityModel(m);
            // sync selectedColumns with visible columns
            const visible = Object.entries(m).filter(([,v]) => !!v).map(([k]) => k);
            // Ensure name/actions always present
            const withRequired = Array.from(new Set([ ...visible, 'name', 'actions' ]));
            setSelectedColumns(withRequired);
          }}
          checkboxSelection
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(m) => setRowSelectionModel(m as string[])}
          onRowClick={(params) => navigate(`/leads/${params.id}`)}
          paginationModel={{
            page: page - 1,
            pageSize: limit,
          }}
          onPaginationModelChange={handlePaginationChange}
          sortModel={sortModel}
          onSortModelChange={handleSortChange}
          rowCount={isPseudoEmpty ? 0 : total}
          loading={loading}
          paginationMode="server"
          sortingMode="server"
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          density="standard"
          autoHeight
          hideFooter
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'grey.50',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid',
              borderColor: 'divider',
              py: 1,
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            },
          }}
        />
        
        {/* Custom Pagination */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
            px: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {/* Prev Button */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => dispatch(setPage(Math.max(1, page - 1)))}
            disabled={page <= 1 || loading}
            startIcon={<ArrowBackIosOutlinedIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              fontWeight: 500,
              px: 2,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'text.secondary',
                bgcolor: 'action.hover',
              },
              '&.Mui-disabled': {
                borderColor: 'divider',
                color: 'text.disabled',
              },
            }}
          >
            Prev
          </Button>

          {/* Page Numbers */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {(() => {
              const totalPages = Math.ceil((isPseudoEmpty ? 0 : total) / limit) || 1;
              const pages: (number | string)[] = [];
              
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                // Always show first 3 pages
                pages.push(1, 2, 3);
                
                if (page > 4) {
                  pages.push('...');
                }
                
                // Show current page area if in middle
                if (page > 3 && page < totalPages - 2) {
                  if (!pages.includes(page - 1) && page - 1 > 3) pages.push(page - 1);
                  if (!pages.includes(page)) pages.push(page);
                  if (!pages.includes(page + 1) && page + 1 < totalPages - 1) pages.push(page + 1);
                }
                
                if (page < totalPages - 3) {
                  if (pages[pages.length - 1] !== '...') pages.push('...');
                }
                
                // Always show last 2 pages
                if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1);
                if (!pages.includes(totalPages)) pages.push(totalPages);
              }
              
              return pages.map((p, idx) => (
                p === '...' ? (
                  <Typography key={`ellipsis-${idx}`} sx={{ px: 1, color: 'text.secondary' }}>...</Typography>
                ) : (
                  <Button
                    key={p}
                    size="small"
                    disabled={loading}
                    onClick={() => dispatch(setPage(p as number))}
                    sx={{
                      minWidth: 36,
                      height: 36,
                      borderRadius: '8px',
                      fontWeight: page === p ? 600 : 400,
                      bgcolor: page === p ? 'grey.800' : 'transparent',
                      color: page === p ? 'white' : 'text.primary',
                      '&:hover': {
                        bgcolor: page === p ? 'grey.800' : 'action.hover',
                      },
                    }}
                  >
                    {p}
                  </Button>
                )
              ));
            })()}
          </Stack>

          {/* Next Button */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => dispatch(setPage(page + 1))}
            disabled={page >= Math.ceil((isPseudoEmpty ? 0 : total) / limit) || loading}
            endIcon={<ArrowForwardIosOutlinedIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              fontWeight: 500,
              px: 2,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'text.secondary',
                bgcolor: 'action.hover',
              },
              '&.Mui-disabled': {
                borderColor: 'divider',
                color: 'text.disabled',
              },
            }}
          >
            Next
          </Button>
        </Box>

        {anySelected && (
          <Box sx={{ position: 'sticky', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2">{rowSelectionModel.length} selected</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setRowSelectionModel([])}>Clear</Button>
              <Button size="small" variant="outlined" color="error" onClick={handleBulkDeleteClick}>Delete</Button>
              {(role === 'center-manager' || isSuperAdmin) && (
                <Button size="small" variant="contained" startIcon={<MoreVertIcon />} onClick={handleBulkAssignClick}>Assign to counselor</Button>
              )}
            </Stack>
          </Box>
        )}
        </Paper>
      </Box>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionsClose}
      >
        {role === 'center-manager' && (
          <MenuItemComponent onClick={handleAssignSingleClick}>
            Assign / Reassign
          </MenuItemComponent>
        )}
        {/* Edit action removed: open lead by clicking the row to edit on detail page */}
        <MenuItemComponent onClick={handleHistoryClick}>
          <HistoryIcon sx={{ mr: 1 }} />
          History
        </MenuItemComponent>
        <MenuItemComponent onClick={handleConvertClick}>
          <ConvertIcon sx={{ mr: 1 }} />
          Convert to Account
        </MenuItemComponent>
        <MenuItemComponent onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItemComponent>
      </Menu>

      {/* Views Menu (Set default / Rename / Delete) */}
      <Menu anchorEl={viewsMenuAnchor} open={Boolean(viewsMenuAnchor)} onClose={closeViewsMenu}>
        <MenuItemComponent onClick={handleSetDefault} disabled={!selectedView || selectedView?.isDefault || (selectedView?.scope === 'center' && role !== 'center-manager')}>
          <ListItemIcon><StarIcon fontSize="small" /></ListItemIcon>
          Set as default
        </MenuItemComponent>
        <MenuItemComponent onClick={handleOpenRename} disabled={!selectedView || (selectedView?.scope === 'center' && role !== 'center-manager')}>Rename</MenuItemComponent>
        <MenuItemComponent onClick={handleDeleteView} sx={{ color: 'error.main' }} disabled={!selectedView || (selectedView?.scope === 'center' && role !== 'center-manager')}>Delete</MenuItemComponent>
      </Menu>

      {/* Convert Confirmation Dialog */}
      <Dialog open={convertDialogOpen} onClose={handleConvertCancel} fullScreen={isMobile}>
        <DialogTitle>Convert Lead</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to convert the lead "{leadToConvert?.firstName} {leadToConvert?.lastName}"? 
            This will create a new Account and Contact, and optionally an Opportunity.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConvertCancel}>Cancel</Button>
          <Button onClick={handleConvertConfirm} color="primary" variant="contained">
            Convert
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} fullScreen={isMobile}>
        <DialogTitle>Lead History{historyLead ? ` — ${historyLead.firstName} ${historyLead.lastName}` : ''}</DialogTitle>
        <DialogContent>
          {historyItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No history yet.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {historyItems.map((it, idx) => (
                <Box key={idx} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2">
                    <strong>{it.action}</strong> — {new Date(it.changedAt || it.dateEntered || Date.now()).toLocaleString()}
                  </Typography>
                  {it.note && (
                    <Typography variant="caption" color="text.secondary">{it.note}</Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} fullScreen={isMobile}>
        <DialogTitle>Delete Lead</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the lead "{leadToDelete?.firstName} {leadToDelete?.lastName}"? 
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

      {/* Save View Dialog */}
      <Dialog open={saveViewDialogOpen} onClose={() => setSaveViewDialogOpen(false)} fullScreen={isMobile}>
        <DialogTitle>Save Current View</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="View Name"
            fullWidth
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
          />
          {role === 'center-manager' && (
            <FormControlLabel
              control={<Checkbox checked={shareWithCenter} onChange={(e) => setShareWithCenter(e.target.checked)} />}
              label="Share with my center"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveViewDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveView} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Filter Drawer */}
      <Drawer anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: isMobile ? '100vw' : 360, p: 2 }} role="presentation">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)} size="small" aria-label="close">
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <TextField
              label="Search"
              placeholder="Search leads..."
              value={searchInput}
              onChange={handleSearch}
              fullWidth
              size="small"
            />
            {isFilterFieldEnabled('leadStatus') && (
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(String(e.target.value))}>
                  <MenuItem value="">All Statuses</MenuItem>
                  {GLOBAL_LEAD_STATUSES.map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {role === 'center-manager' && isFilterFieldEnabled('counselor') && (
              <FormControl fullWidth size="small">
                <InputLabel>Counselor</InputLabel>
                <Select value={counselorFilter} label="Counselor" onChange={(e) => { setCounselorFilter(String(e.target.value)); dispatch(setPage(1)); }}>
                  <MenuItem value="">All Counselors</MenuItem>
                  {counselors.map(c => (
                    <MenuItem key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`.trim() || c.userName} — @{c.userName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {isFilterFieldEnabled('leadSource') && (
              <Autocomplete
                freeSolo
                options={sourceOptions}
                value={leadSourceFilter}
                onInputChange={(_, v) => setLeadSourceFilter(v)}
                renderInput={(params) => <TextField {...params} label="Lead Source" size="small" />}
              />
            )}
            {isFilterFieldEnabled('industry') && (
              <Autocomplete
                freeSolo
                options={industryOptions}
                value={industryFilter}
                onInputChange={(_, v) => setIndustryFilter(v)}
                renderInput={(params) => <TextField {...params} label="Industry" size="small" />}
              />
            )}
            {isFilterFieldEnabled('locationCity') && (
              <Autocomplete
                freeSolo
                options={cityOptions}
                value={cityFilter}
                onInputChange={(_, v) => setCityFilter(v)}
                renderInput={(params) => <TextField {...params} label="City" size="small" />}
              />
            )}
            {isFilterFieldEnabled('locationState') && (
              <Autocomplete
                freeSolo
                options={stateOptions}
                value={stateFilter}
                onInputChange={(_, v) => setStateFilter(v)}
                renderInput={(params) => <TextField {...params} label="State" size="small" />}
              />
            )}

            {isFilterFieldEnabled('createdAt') && (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>Date Preset</InputLabel>
                  <Select value={datePreset} label="Date Preset" onChange={(e) => applyDatePreset(String(e.target.value))}>
                    <MenuItem value="">Any time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="last7">Last 7 days</MenuItem>
                    <MenuItem value="thisMonth">This month</MenuItem>
                    <MenuItem value="lastMonth">Last month</MenuItem>
                    <MenuItem value="thisQuarter">This quarter</MenuItem>
                    <MenuItem value="custom">Custom range</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1}>
                  <TextField label="Created After" type="date" size="small" InputLabelProps={{ shrink: true }} value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
                  <TextField label="Created Before" type="date" size="small" InputLabelProps={{ shrink: true }} value={createdBefore} onChange={(e) => setCreatedBefore(e.target.value)} />
                </Stack>
              </>
            )}

            {isFilterFieldEnabled('isImportant') && (
              <FormControlLabel control={<Checkbox checked={importantOnly} onChange={(e) => setImportantOnly(e.target.checked)} />} label="Important only" />
            )}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="text" onClick={() => {
              setStatusFilter('');
              setLeadSourceFilter('');
              setIndustryFilter('');
              setCityFilter('');
              setStateFilter('');
              setCreatedAfter('');
              setCreatedBefore('');
              setDatePreset('');
              setImportantOnly(false);
              dispatch(setPage(1));
            }}>Clear</Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" onClick={() => setFilterDrawerOpen(false)}>Apply</Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullScreen={isMobile}>
        <DialogTitle>{assigningBulk ? 'Assign selected leads' : 'Assign lead'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Counselor</InputLabel>
            <Select
              label="Counselor"
              value={selectedCounselorId}
              onChange={(e) => setSelectedCounselorId(String(e.target.value))}
            >
              {counselors.map(c => (
                <MenuItem key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`} — @{c.userName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedCounselorId}
            onClick={async () => {
              try {
                if (assigningBulk) {
                  await leadsService.assignLeadsBulk(assignTargetLeadIds, selectedCounselorId);
                } else {
                  await leadsService.assignLead(assignTargetLeadIds[0], selectedCounselorId);
                }
                setAssignDialogOpen(false);
                setRowSelectionModel([]);
                // refresh list
                dispatch(fetchLeads({
                  page,
                  limit,
                  search: searchTerm || undefined,
                  leadStatus: statusFilter || undefined,
                  isImportant: importantOnly || undefined,
                  leadSource: leadSourceFilter || undefined,
                  industry: industryFilter || undefined,
                  locationCity: cityFilter || undefined,
                  locationState: stateFilter || undefined,
                  createdAfter: createdAfter || undefined,
                  createdBefore: createdBefore || undefined,
                  sortBy: sortModel[0]?.field || undefined,
                  sortOrder: sortModel[0]?.sort || undefined,
                }));
              } catch (e) {}
            }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename View Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} fullScreen={isMobile}>
        <DialogTitle>Rename View</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRename} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Choose Columns Dialog */}
      <Dialog open={columnsDialogOpen} onClose={() => setColumnsDialogOpen(false)} fullScreen={isMobile}>
        <DialogTitle>Choose Columns</DialogTitle>
        <DialogContent>
          <FormGroup>
            {(() => {
              // All available columns (excluding always-present 'isImportant' and 'actions')
              const allColumnKeys = ['referenceNo','name','owner','counselor','company','leadStatus','estimatedValue','leadSource','expectedCloseDate','nextFollowUpAt','lastCallDisposition','lastCallNotes'];
              // Filter by center field visibility settings
              const visibleColumnKeys = allColumnKeys.filter(c => isColumnFieldEnabled(c));
              const getLabel = (field: string) => {
                const labels: Record<string, string> = {
                  referenceNo: 'Reference / Reg. No',
                  name: 'Name',
                  owner: 'Owner',
                  counselor: 'Counselor',
                  company: 'Company',
                  leadStatus: 'Status',
                  estimatedValue: 'Est. Value',
                  leadSource: 'Source',
                  expectedCloseDate: 'Expected Close',
                  nextFollowUpAt: 'Next Follow-up',
                  lastCallDisposition: 'Last Call Disposition',
                  lastCallNotes: 'Last Call Notes',
                };
                return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
              };
              return visibleColumnKeys.map((field) => (
                <FormControlLabel
                  key={field}
                  control={<Checkbox checked={selectedColumns.includes(field)} onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedColumns(prev => {
                      const base = new Set(prev);
                      if (checked) base.add(field); else base.delete(field);
                      // always keep name and actions
                      base.add('name'); base.add('actions');
                      return Array.from(base);
                    });
                  }} />}
                  label={getLabel(field)}
                />
              ));
            })()}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedColumns(DEFAULT_COLUMNS)}>Default</Button>
          <Button onClick={() => {
            const allColumnKeys = ['referenceNo','name','owner','counselor','company','leadStatus','estimatedValue','leadSource','expectedCloseDate','nextFollowUpAt','lastCallDisposition','lastCallNotes','actions'];
            const enabledCols = allColumnKeys.filter(c => c === 'actions' || isColumnFieldEnabled(c));
            setSelectedColumns(enabledCols);
          }}>Select all</Button>
          <Button onClick={() => setSelectedColumns(['name','actions'])}>Clear</Button>
          <Button onClick={() => setColumnsDialogOpen(false)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onClose={() => { setImportDialogOpen(false); setImportResult(null); setImportError(''); }} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon color="primary" />
          Import Leads from CSV
        </DialogTitle>
        <DialogContent>
          {/* Success/Error Result Display */}
          {importResult && (
            <Alert 
              severity={importResult.errors?.length > 0 ? 'warning' : 'success'} 
              sx={{ mb: 2, borderRadius: 2 }}
              onClose={() => setImportResult(null)}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {importResult.errors?.length > 0 ? 'Import Completed with Issues' : 'Import Successful!'}
              </Typography>
              <Typography variant="body2">
                {importResult.created > 0 && (
                  <span style={{ color: '#2e7d32' }}>✓ {importResult.created} lead{importResult.created !== 1 ? 's' : ''} imported successfully</span>
                )}
                {importResult.errors?.length > 0 && (
                  <span style={{ display: 'block', color: '#d32f2f' }}>✗ {importResult.errors.length} failed to import</span>
                )}
              </Typography>
            </Alert>
          )}
          
          {importError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{importError}</Alert>}
          
          {!importResult && (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
                <Button variant="contained" color="primary" onClick={handleDownloadFullSampleCsv} disabled={importing} sx={{ borderRadius: 2 }}>
                  Download Sample CSV
                </Button>
                <Button variant="outlined" component="label" disabled={importing} sx={{ borderRadius: 2 }}>
                  {importing ? 'Importing...' : 'Choose File'}
                  <input type="file" hidden accept=".csv,text/csv" onChange={(e) => handleImportCsv(e.target.files?.[0] || undefined)} />
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                The sample file contains only the header row. Add one lead per line. Enclose values containing commas in double quotes. To include a literal double quote inside a field, escape it by doubling (e.g. "A ""quoted"" value").
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportDialogOpen(false); setImportResult(null); setImportError(''); }} sx={{ borderRadius: 2 }}>
            {importResult ? 'Done' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Call Disposition Modal */}
      <Dialog open={callGuardOpen} onClose={() => setCallGuardOpen(false)}>
        <DialogTitle>Calling Not Available on Web</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please login through our mobile app to place calls and capture dispositions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCallGuardOpen(false)} autoFocus variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <CallDispositionModal
        open={callDispositionOpen}
        onClose={() => {
          setCallDispositionOpen(false);
          setCallDispositionData(null);
        }}
        callData={callDispositionData}
        onSaved={() => {
          // Optionally refresh call logs or show success message
          console.log('Call disposition saved');
        }}
      />
    </Box>
  );
};

export default LeadsDataTable;