import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Box, Button, Divider, Grid, IconButton, MenuItem, Select, Stack, TextField, Typography, Tabs, Tab, Switch, FormControlLabel, Paper, Alert, Snackbar, useTheme, useMediaQuery, alpha, Chip, Drawer, Collapse, ToggleButtonGroup, ToggleButton, Card, CardContent } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import reportsService, { ReportConfig } from '../../../services/reportsService';
import { ArrowDownward, ArrowUpward, Save, SaveAs, Settings, Close, Build, PlayArrow, ExpandMore, ExpandLess, Add, ViewModule as ViewModuleIcon, ViewList as ViewListIcon, TableRows as TableRowsIcon } from '@mui/icons-material';
import { ResponsiveContainer, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis, Bar, LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { screenshotColors } from '@/theme/theme';

interface ReportDto {
  id: string;
  name: string;
  description?: string | null;
  reportType: string;
  scope: 'personal' | 'center';
  config?: ReportConfig;
}

const defaultOps = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in (comma separated)' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
];

const ReportBuilder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [type, setType] = useState<string>('leads');
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Array<{ field: string; op: string; value: any }>>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [previewCols, setPreviewCols] = useState<GridColDef[]>([]);
  const [debounceTimer, setDebounceTimer] = useState<any>(null);
  const [sort, setSort] = useState<{ field: string; order: 'ASC'|'DESC' }>({ field: 'dateEntered', order: 'DESC' });
  const [filterLogic, setFilterLogic] = useState<'AND'|'OR'>('AND');
  const [activeTab, setActiveTab] = useState<'outline'|'filters'>('outline');
  const [autoPreview, setAutoPreview] = useState<boolean>(true);
  const [chartsOpen, setChartsOpen] = useState<boolean>(false);
  const [charts, setCharts] = useState<Array<{ x: string; agg: 'COUNT'|'SUM'|'AVG'|'MIN'|'MAX'; y?: string; title?: string; type?: 'bar'|'line'|'pie' }>>([]);
  const [chartResults, setChartResults] = useState<Array<{ loading: boolean; error: string | null; data: Array<{ group: string; value: number }> }>>([]);
  const reportType = report?.reportType || type || 'leads';
  const [dirty, setDirty] = useState<boolean>(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(!isMobile);
  const [mobilePreviewMode, setMobilePreviewMode] = useState<'cards' | 'table' | 'scroll'>('cards');
  const chartsSectionRef = useRef<HTMLDivElement>(null);

  const scrollToCharts = () => {
    setTimeout(() => {
      chartsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const runPreview = useCallback(async () => {
    if (!reportType) return;
  const config: ReportConfig = { columns, filters, sort, ...(filterLogic ? { filterLogic } : {}) } as any;
    try {
      const res = await reportsService.run(reportType, config, true);
      setRows(res.rows || []);
      const gridCols: GridColDef[] = (res.columns || columns).map((c: string) => ({ field: c, headerName: c, flex: 1 }));
      setPreviewCols(gridCols);
    } catch (e) {
      console.error('Preview run failed', e);
    }
  }, [reportType, columns, filters, sort, filterLogic]);
  useEffect(() => {
    if (!autoPreview) return; // only auto-run when enabled
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => { runPreview(); }, 400);
    setDebounceTimer(t);
    return () => clearTimeout(t);
  }, [columns, filters, sort, filterLogic, autoPreview, runPreview]);

  // warn on page unload when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    const boot = async () => {
      try {
        if (id && id !== 'new') {
          const r = await reportsService.get(id);
          setReport(r);
          setName(r.name);
          setDescription(r.description || '');
          setType(r.reportType || 'leads');
          const cfg = r.config || { columns: [] };
          setColumns(cfg.columns || []);
          setFilters(cfg.filters || []);
          if (cfg.sort) setSort(cfg.sort as any);
          if ((cfg as any).filterLogic) setFilterLogic((cfg as any).filterLogic);
          const fields = await reportsService.getFields(r.reportType || 'leads');
          const keys = Array.isArray(fields) ? fields.map((f: any) => (typeof f === 'string' ? f : f?.key)).filter(Boolean) : [];
          setAvailableFields(keys as string[]);
          // Initialize charts if present
          const arr = Array.isArray((cfg as any).charts) ? (cfg as any).charts : [];
          if (arr.length) {
            const normalized = arr.map((c: any) => ({ x: c.x, agg: String(c.agg || 'COUNT').toUpperCase() as any, y: c.y }));
            setCharts(normalized);
            setChartResults(normalized.map(() => ({ loading: false, error: null, data: [] })));
            setChartsOpen(true);
          }
        } else {
          // Creation mode using query params
          const sp = new URLSearchParams(location.search);
          const qType = sp.get('type') || 'leads';
          const qName = sp.get('name') || 'Untitled Report';
          const qCols = (sp.get('cols') || '').split(',').filter(Boolean);
          setType(qType);
          setName(qName);
          setColumns(qCols);
          const fields = await reportsService.getFields(qType);
          const keys = Array.isArray(fields) ? fields.map((f: any) => (typeof f === 'string' ? f : f?.key)).filter(Boolean) : [];
          setAvailableFields(keys as string[]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, [id, location.search]);

  const toggleColumn = (f: string) => {
    if (columns.includes(f)) setColumns(columns.filter(c => c !== f));
    else setColumns([...columns, f]);
    setDirty(true);
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= columns.length) return;
    const copy = [...columns];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    setColumns(copy);
    setDirty(true);
  };

  const updateFilter = (i: number, patch: Partial<{ field: string; op: string; value: any }>) => {
    setFilters(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch } as any;
      return next;
    });
    setDirty(true);
  };

  const addFilter = () => { setFilters([...(filters || []), { field: availableFields[0] || '', op: 'eq', value: '' }]); setDirty(true); };
  const removeFilter = (i: number) => { setFilters(filters.filter((_, idx) => idx !== i)); setDirty(true); };

  const [saveToast, setSaveToast] = useState<{open:boolean;message:string;severity?:'success'|'error'}>({open:false,message:''});
  const onSave = async (): Promise<string | undefined> => {
    const config: ReportConfig = { columns, filters, sort, ...(filterLogic ? { filterLogic } : {}) } as any;
    if (charts && charts.length) {
      (config as any).charts = charts.map(c => ({ x: c.x, agg: c.agg, y: c.y, title: (c as any).title, type: (c as any).type }));
    }
    try {
      let newId: string | undefined = undefined;
      if (!id || id === 'new') {
        const created = await reportsService.create({ name, description: description || null, reportType, scope: 'personal', config });
        newId = (created as any)?.id || (created as any)?.data?.id;
        if (newId) navigate(`/reports/builder/${newId}`);
      } else {
        await reportsService.update(id, { name, description: description || null, config });
        newId = id;
      }
      setSaveToast({open:true,message:'Report saved',severity:'success'});
      setDirty(false);
      return newId;
    } catch (e:any) {
      setSaveToast({open:true,message:e?.message||'Failed to save report',severity:'error'});
    }
  };

  const onSaveAndRun = async () => {
    const savedId = await onSave();
    const finalId = savedId || id;
    if (finalId && finalId !== 'new') navigate(`/reports/view/${finalId}`);
  };

  // no footer chips in this layout

  if (loading) return (
    <Box sx={{ 
      minHeight: '60vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Stack alignItems="center" spacing={2}>
        <Box sx={{ 
          width: 56, 
          height: 56, 
          borderRadius: '16px', 
          background: '#303030',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 1.5s infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.5 },
          },
        }}>
          <Build sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Typography color="text.secondary">Loading Report Builder...</Typography>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      {/* Mobile Header */}
      {isMobile ? (
        <Box sx={{ mb: 2, px: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '12px', 
                background: '#303030',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Build sx={{ color: '#fff', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                  {name || 'Report Builder'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {columns.length} columns • {filters.length} filters
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton 
                onClick={() => setMobileSettingsOpen(true)} 
                size="small"
                sx={{ 
                  bgcolor: alpha('#667eea', 0.1),
                  '&:hover': { bgcolor: alpha('#667eea', 0.2) },
                }}
              >
                <Settings sx={{ fontSize: 20, color: '#667eea' }} />
              </IconButton>
              <Button 
                variant="contained" 
                size="small"
                onClick={onSave}
                sx={{
                  background: '#303030',
                  borderRadius: '10px',
                  minWidth: 'auto',
                  px: 1.5,
                }}
              >
                <Save sx={{ fontSize: 18 }} />
              </Button>
            </Stack>
          </Stack>

          {/* Mobile Name/Description */}
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <TextField 
              size="small" 
              label="Report Name" 
              value={name} 
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              fullWidth
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '12px',
                  bgcolor: 'rgba(255,255,255,0.9)',
                }
              }}
            />
            <TextField 
              size="small" 
              label="Description" 
              value={description} 
              onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
              fullWidth
              multiline
              minRows={2}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '12px',
                  bgcolor: 'rgba(255,255,255,0.9)',
                }
              }}
            />
          </Stack>

          {/* Mobile Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => {
                setChartsOpen(true);
                const def = { x: availableFields[0] || 'leadStatus', agg: 'COUNT' as const, title: 'New Chart', type: 'bar' as const };
                setCharts(prev => [...prev, def]);
                setChartResults(prev => [...prev, { loading: false, error: null, data: [] }]);
                setDirty(true);
                scrollToCharts();
              }}
              startIcon={<Add />}
              sx={{ 
                flex: 1, 
                borderRadius: '10px', 
                textTransform: 'none',
                borderColor: alpha('#667eea', 0.3),
              }}
            >
              Add Chart
            </Button>
            <Button 
              variant="outlined" 
              size="small"
              onClick={onSaveAndRun}
              startIcon={<PlayArrow />}
              sx={{ 
                flex: 1, 
                borderRadius: '10px', 
                textTransform: 'none',
                borderColor: alpha('#667eea', 0.3),
              }}
            >
              Save & Run
            </Button>
          </Stack>

          {/* Mobile Preview Toggle */}
          <Paper
            elevation={0}
            sx={{ 
              p: 1.5, 
              mb: 2, 
              borderRadius: '12px',
              bgcolor: alpha('#667eea', 0.05),
              border: '1px solid',
              borderColor: alpha('#667eea', 0.1),
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Preview Data</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <FormControlLabel 
                  control={
                    <Switch 
                      size="small" 
                      checked={autoPreview} 
                      onChange={(e) => setAutoPreview(e.target.checked)} 
                    />
                  } 
                  label={<Typography variant="caption">Auto</Typography>}
                  labelPlacement="start"
                  sx={{ mr: 0 }}
                />
                <IconButton 
                  size="small" 
                  onClick={() => setShowPreview(!showPreview)}
                  sx={{ bgcolor: alpha('#667eea', 0.1) }}
                >
                  {showPreview ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      ) : (
        /* Desktop Header */
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '14px', 
                background: '#303030',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.35)',
              }}>
                <Build sx={{ color: '#fff', fontSize: 24 }} />
              </Box>
              <TextField 
                size="small" 
                label="Report Name" 
                value={name} 
                onChange={(e) => { setName(e.target.value); setDirty(true); }} 
                sx={{ 
                  minWidth: 260,
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255,255,255,0.9)',
                  }
                }} 
              />
              <TextField 
                size="small" 
                label="Description" 
                value={description} 
                onChange={(e) => { setDescription(e.target.value); setDirty(true); }} 
                sx={{ 
                  minWidth: 340,
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255,255,255,0.9)',
                  }
                }} 
              />
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button 
                variant="outlined" 
                onClick={() => {
                  setChartsOpen(true);
                  const def = { x: availableFields[0] || 'leadStatus', agg: 'COUNT' as const, title: 'New Chart', type: 'bar' as const };
                  setCharts(prev => [...prev, def]);
                  setChartResults(prev => [...prev, { loading: false, error: null, data: [] }]);
                  setDirty(true);
                  scrollToCharts();
                }}
                startIcon={<Add />}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  borderColor: alpha('#667eea', 0.3),
                  color: '#667eea',
                }}
              >
                Add Chart
              </Button>
              <Button 
                startIcon={<Save />} 
                variant="contained" 
                onClick={onSave}
                sx={{
                  background: '#303030',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                }}
              >
                Save
              </Button>
              <Button 
                startIcon={<SaveAs />} 
                variant="outlined" 
                onClick={onSaveAndRun}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  borderColor: alpha('#667eea', 0.3),
                }}
              >
                Save & Run
              </Button>
              <Button 
                variant="text" 
                onClick={() => { if (dirty && !window.confirm('You have unsaved changes. Close without saving?')) return; navigate('/reports'); }}
                sx={{ borderRadius: '12px', textTransform: 'none' }}
              >
                Close
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<PlayArrow />}
                onClick={() => { if (!id) return; if (dirty && !window.confirm('You have unsaved changes. Run without saving?')) return; navigate(`/reports/view/${id}`); }}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                }}
              >
                Run
              </Button>
            </Stack>
          </Stack>

          <Paper 
            elevation={0}
            sx={{ 
              px: 2, 
              py: 1, 
              mb: 2, 
              display:'flex', 
              alignItems:'center', 
              justifyContent:'space-between',
              borderRadius: '12px',
              bgcolor: alpha('#667eea', 0.05),
              border: '1px solid',
              borderColor: alpha('#667eea', 0.1),
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Previewing a limited number of records. Run the report to see everything.
            </Typography>
            <FormControlLabel 
              control={<Switch size="small" checked={autoPreview} onChange={(e) => setAutoPreview(e.target.checked)} />} 
              labelPlacement="start" 
              label={<Typography variant="body2">Update Preview Automatically</Typography>}
            />
          </Paper>
        </>
      )}

      {/* Mobile Settings Drawer */}
      <Drawer 
        anchor="bottom" 
        open={mobileSettingsOpen} 
        onClose={() => setMobileSettingsOpen(false)}
        PaperProps={{ 
          sx: { 
            borderTopLeftRadius: '20px', 
            borderTopRightRadius: '20px',
            maxHeight: '85vh',
          } 
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Report Settings</Typography>
            <IconButton onClick={() => setMobileSettingsOpen(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="Columns" value="outline" sx={{ textTransform: 'none' }} />
              <Tab label={`Filters (${filters.length})`} value="filters" sx={{ textTransform: 'none' }} />
            </Tabs>
          </Box>
          
          {activeTab === 'outline' && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Add Columns</Typography>
                <Select
                  size="small"
                  displayEmpty
                  value=""
                  onChange={(e) => { const val = String(e.target.value); if (val) toggleColumn(val); }}
                  fullWidth
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value=""><em>Select a column...</em></MenuItem>
                  {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Selected Columns ({columns.length})</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {columns.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      onDelete={() => toggleColumn(c)}
                      sx={{ 
                        bgcolor: alpha('#667eea', 0.1),
                        '& .MuiChip-deleteIcon': { color: alpha('#667eea', 0.6) },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Sort</Typography>
                <Stack spacing={1}>
                  <Select
                    size="small"
                    value={sort.field}
                    onChange={(e) => setSort(s => ({ ...s, field: String(e.target.value) }))}
                    fullWidth
                    sx={{ borderRadius: '12px' }}
                  >
                    {['dateEntered', 'dateModified', ...columns].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                  <Select
                    size="small"
                    value={sort.order}
                    onChange={(e) => setSort(s => ({ ...s, order: (String(e.target.value).toUpperCase() as any) }))}
                    fullWidth
                    sx={{ borderRadius: '12px' }}
                  >
                    <MenuItem value="ASC">Ascending</MenuItem>
                    <MenuItem value="DESC">Descending</MenuItem>
                  </Select>
                </Stack>
              </Box>
            </Stack>
          )}
          
          {activeTab === 'filters' && (
            <Stack spacing={2}>
              {(filters || []).map((fl, i) => (
                <Paper key={i} elevation={0} sx={{ p: 1.5, borderRadius: '12px', bgcolor: alpha('#667eea', 0.03) }}>
                  <Stack spacing={1}>
                    <Select
                      size="small"
                      value={fl.field}
                      onChange={(e) => updateFilter(i, { field: e.target.value })}
                      fullWidth
                      sx={{ borderRadius: '12px' }}
                    >
                      {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                    </Select>
                    <Select
                      size="small"
                      value={fl.op}
                      onChange={(e) => updateFilter(i, { op: e.target.value })}
                      fullWidth
                      sx={{ borderRadius: '12px' }}
                    >
                      {defaultOps.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                    <TextField
                      size="small"
                      value={fl.value ?? ''}
                      onChange={(e) => updateFilter(i, { value: e.target.value })}
                      placeholder="Value"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <Button color="error" size="small" onClick={() => removeFilter(i)} sx={{ alignSelf: 'flex-end' }}>
                      Remove
                    </Button>
                  </Stack>
                </Paper>
              ))}
              <Button 
                onClick={addFilter} 
                startIcon={<Add />}
                sx={{ 
                  alignSelf: 'flex-start', 
                  textTransform: 'none',
                  color: '#667eea',
                }}
              >
                Add Filter
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Grid container spacing={2} sx={{ px: isMobile ? 1 : 0 }}>
        {/* Left panel: Outline / Filters - Desktop only */}
        {!isMobile && (
          <Grid item xs={12} md={4} lg={3}>
            <Paper 
              elevation={0}
              sx={{ 
                borderRadius: '16px',
                border: '1px solid',
                borderColor: alpha('#667eea', 0.15),
                overflow: 'hidden',
                bgcolor: 'rgba(255,255,255,0.9)',
              }}
            >
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} aria-label="builder-tabs">
                  <Tab label="Outline" value="outline" sx={{ textTransform: 'none', fontWeight: 500 }} />
                  <Tab label={`Filters${filters.length ? ` (${filters.length})` : ''}`} value="filters" sx={{ textTransform: 'none', fontWeight: 500 }} />
                </Tabs>
              </Box>
              <Box sx={{ p: 2 }}>
                {activeTab === 'outline' && (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Columns</Typography>
                    <Select
                      size="small"
                      displayEmpty
                      value=""
                      onChange={(e) => { const val = String(e.target.value); if (val) toggleColumn(val); }}
                      fullWidth
                      sx={{ borderRadius: '12px' }}
                    >
                      <MenuItem value=""><em>Add column...</em></MenuItem>
                      {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                    </Select>
                    <Stack spacing={1}>
                      {columns.map((c, idx) => (
                        <Paper 
                          key={c} 
                          elevation={0}
                          sx={{ 
                            px: 1.5, 
                            py: 0.75, 
                            borderRadius: '10px',
                            bgcolor: alpha('#667eea', 0.05),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{c}</Typography>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => moveColumn(idx, -1)} disabled={idx === 0}>
                              <ArrowUpward fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => moveColumn(idx, 1)} disabled={idx === columns.length - 1}>
                              <ArrowDownward fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => toggleColumn(c)}>
                              <Close fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>

                    <Divider />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Sort</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Select
                          size="small"
                          value={sort.field}
                          onChange={(e) => setSort(s => ({ ...s, field: String(e.target.value) }))}
                          fullWidth
                          sx={{ borderRadius: '12px' }}
                        >
                          {['dateEntered', 'dateModified', ...columns].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={6}>
                        <Select
                          size="small"
                          value={sort.order}
                          onChange={(e) => setSort(s => ({ ...s, order: (String(e.target.value).toUpperCase() as any) }))}
                          fullWidth
                          sx={{ borderRadius: '12px' }}
                        >
                          <MenuItem value="ASC">ASC</MenuItem>
                          <MenuItem value="DESC">DESC</MenuItem>
                        </Select>
                      </Grid>
                      <Grid item xs={6}>
                        <Select
                          size="small"
                          value={filterLogic}
                          onChange={(e) => setFilterLogic((e.target.value as any))}
                          fullWidth
                          sx={{ borderRadius: '12px' }}
                        >
                          <MenuItem value="AND">AND</MenuItem>
                          <MenuItem value="OR">OR</MenuItem>
                        </Select>
                      </Grid>
                    </Grid>
                  </Stack>
                )}

                {activeTab === 'filters' && (
                  <Stack spacing={1.5}>
                    {(filters || []).map((fl, i) => (
                      <Paper 
                        key={i} 
                        elevation={0}
                        sx={{ 
                          p: 1.5, 
                          borderRadius: '12px',
                          bgcolor: alpha('#667eea', 0.03),
                          border: '1px solid',
                          borderColor: alpha('#667eea', 0.1),
                        }}
                      >
                        <Grid container spacing={1}>
                          <Grid item xs={12}>
                            <Select
                              size="small"
                              value={fl.field}
                              onChange={(e) => updateFilter(i, { field: e.target.value })}
                              fullWidth
                              sx={{ borderRadius: '10px' }}
                            >
                              {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                            </Select>
                          </Grid>
                          <Grid item xs={12}>
                            <Select
                              size="small"
                              value={fl.op}
                              onChange={(e) => updateFilter(i, { op: e.target.value })}
                              fullWidth
                              sx={{ borderRadius: '10px' }}
                            >
                              {defaultOps.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </Select>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              size="small"
                              value={fl.value ?? ''}
                              onChange={(e) => updateFilter(i, { value: e.target.value })}
                              placeholder="Value"
                              fullWidth
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Button 
                              color="error" 
                              size="small"
                              onClick={() => removeFilter(i)} 
                              sx={{ textTransform: 'none' }}
                            >
                              Remove
                            </Button>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                    <Button 
                      onClick={addFilter} 
                      startIcon={<Add />}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none', color: '#667eea' }}
                    >
                      Add Filter
                    </Button>
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Main preview panel */}
        <Grid item xs={12} md={isMobile ? 12 : 8} lg={isMobile ? 12 : 9}>
          {/* Mobile: Collapsible Preview with 3 view modes */}
          {isMobile ? (
            <Collapse in={showPreview}>
              <Paper
                elevation={0}
                sx={{ 
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: alpha('#667eea', 0.15),
                  overflow: 'hidden',
                  bgcolor: 'rgba(255,255,255,0.9)',
                  mb: 2,
                }}
              >
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Preview ({Math.min(rows.length, 200)} rows)
                    </Typography>
                    <ToggleButtonGroup
                      value={mobilePreviewMode}
                      exclusive
                      onChange={(_, v) => v && setMobilePreviewMode(v)}
                      size="small"
                      sx={{
                        '& .MuiToggleButton-root': {
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: alpha('#667eea', 0.2),
                          px: 1,
                          py: 0.5,
                          '&.Mui-selected': {
                            bgcolor: alpha('#667eea', 0.15),
                            color: '#667eea',
                            borderColor: alpha('#667eea', 0.4),
                            '&:hover': { bgcolor: alpha('#667eea', 0.2) },
                          },
                        },
                      }}
                    >
                      <ToggleButton value="cards" aria-label="cards view">
                        <ViewModuleIcon fontSize="small" />
                      </ToggleButton>
                      <ToggleButton value="table" aria-label="table view">
                        <ViewListIcon fontSize="small" />
                      </ToggleButton>
                      <ToggleButton value="scroll" aria-label="scroll view">
                        <TableRowsIcon fontSize="small" />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                </Box>
                
                {/* Cards View */}
                {mobilePreviewMode === 'cards' && (
                  <Box sx={{ p: 1.5, maxHeight: 400, overflow: 'auto' }}>
                    <Stack spacing={1.5}>
                      {(rows || []).slice(0, 50).map((row, idx) => {
                        const fields = previewCols.map(c => c.field);
                        const primaryField = fields[0];
                        const secondaryField = fields[1];
                        return (
                          <Card 
                            key={idx} 
                            elevation={0}
                            sx={{ 
                              borderRadius: '12px',
                              border: '1px solid',
                              borderColor: alpha('#667eea', 0.15),
                              bgcolor: 'transparent',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: alpha('#667eea', 0.3),
                              },
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
                                {row[primaryField] || `Record ${idx + 1}`}
                              </Typography>
                              {secondaryField && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  {row[secondaryField] || '-'}
                                </Typography>
                              )}
                              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                {fields.slice(2, 5).map((field) => (
                                  <Chip
                                    key={field}
                                    label={`${field}: ${row[field] ?? '-'}`}
                                    size="small"
                                    sx={{ 
                                      fontSize: '0.7rem', 
                                      height: 22,
                                      bgcolor: 'transparent',
                                      border: '1px solid',
                                      borderColor: alpha('#667eea', 0.2),
                                      color: 'text.secondary',
                                    }}
                                  />
                                ))}
                                {fields.length > 5 && (
                                  <Chip
                                    label={`+${fields.length - 5} more`}
                                    size="small"
                                    sx={{ 
                                      fontSize: '0.7rem', 
                                      height: 22,
                                      bgcolor: alpha('#667eea', 0.05),
                                      color: 'text.secondary',
                                    }}
                                  />
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {rows.length === 0 && (
                        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                          No data available
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Compact Table View */}
                {mobilePreviewMode === 'table' && (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {(rows || []).slice(0, 50).map((row, idx) => {
                      const fields = previewCols.map(c => c.field);
                      return (
                        <Box 
                          key={idx}
                          sx={{ 
                            p: 1.5, 
                            borderBottom: '1px solid', 
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          {fields.slice(0, 4).map((field, fidx) => (
                            <Stack key={field} direction="row" justifyContent="space-between" sx={{ mb: fidx < 3 ? 0.5 : 0 }}>
                              <Typography variant="caption" color="text.secondary">{field}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }} noWrap>
                                {row[field] ?? '-'}
                              </Typography>
                            </Stack>
                          ))}
                          {fields.length > 4 && (
                            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                              +{fields.length - 4} more fields
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                    {rows.length === 0 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No data available
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Horizontal Scroll View (DataGrid) */}
                {mobilePreviewMode === 'scroll' && (
                  <Box sx={{ height: 300, overflow: 'auto' }}>
                    <DataGrid
                      columns={previewCols}
                      rows={(rows || []).map((r, i) => ({ id: i, ...r }))}
                      disableRowSelectionOnClick
                      density="compact"
                      hideFooter
                      sx={{ border: 'none' }}
                    />
                  </Box>
                )}
              </Paper>
            </Collapse>
          ) : (
            /* Desktop: Full Preview */
            <Paper
              elevation={0}
              sx={{ 
                borderRadius: '16px',
                border: '1px solid',
                borderColor: alpha('#667eea', 0.15),
                overflow: 'hidden',
                bgcolor: 'rgba(255,255,255,0.9)',
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Preview (first 200 rows)</Typography>
              </Box>
              <Box sx={{ height: 520 }}>
                <DataGrid
                  columns={previewCols}
                  rows={(rows || []).map((r, i) => ({ id: i, ...r }))}
                  disableRowSelectionOnClick
                  density="compact"
                  hideFooter
                  sx={{ 
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': { 
                      backgroundColor: alpha('#667eea', 0.05),
                    },
                  }}
                />
              </Box>
            </Paper>
          )}

          {chartsOpen && (
            <Paper 
              ref={chartsSectionRef}
              elevation={0}
              sx={{ 
                mt: 2, 
                p: isMobile ? 1.5 : 2,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: alpha('#667eea', 0.15),
                bgcolor: 'rgba(255,255,255,0.9)',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: '8px', 
                    background: '#303030',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Settings sx={{ color: '#fff', fontSize: 18 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Charts</Typography>
                </Stack>
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => setChartsOpen(false)}
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  Close
                </Button>
              </Stack>

              <Stack spacing={2}>
                {charts.map((cfg, idx) => (
                  <Paper 
                    key={idx} 
                    elevation={0}
                    sx={{ 
                      p: isMobile ? 1.5 : 2,
                      borderRadius: '12px',
                      bgcolor: 'transparent',
                      border: '1px solid',
                      borderColor: alpha('#667eea', 0.15),
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: alpha('#667eea', 0.35),
                        bgcolor: 'transparent',
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{cfg.title || `Chart ${idx + 1}`}</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Button 
                          size="small" 
                          variant="contained"
                          onClick={async () => {
                            setChartResults(prev => prev.map((r, i) => i === idx ? { ...r, loading: true, error: null } : r));
                            try {
                              const baseCfg: any = { columns, filters, sort, ...(filterLogic ? { filterLogic } : {}) };
                              const data = await reportsService.chart({ reportType, config: baseCfg, chart: cfg });
                              setChartResults(prev => prev.map((r, i) => i === idx ? { ...r, data: data || [] } : r));
                            } catch (e: any) {
                              setChartResults(prev => prev.map((r, i) => i === idx ? { ...r, error: e?.message || 'Failed to generate chart' } : r));
                            } finally {
                              setChartResults(prev => prev.map((r, i) => i === idx ? { ...r, loading: false } : r));
                            }
                          }}
                          sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '8px',
                            textTransform: 'none',
                            minWidth: 'auto',
                            px: 1.5,
                          }}
                        >
                          Run
                        </Button>
                        {!isMobile && (
                          <>
                            <Button size="small" disabled={idx === 0} onClick={() => {
                              if (idx === 0) return;
                              setCharts(prev => {
                                const cp = [...prev]; const [it] = cp.splice(idx, 1); cp.splice(idx - 1, 0, it); return cp;
                              });
                              setChartResults(prev => {
                                const cp = [...prev]; const [it] = cp.splice(idx, 1); cp.splice(idx - 1, 0, it); return cp;
                              });
                            }} sx={{ textTransform: 'none' }}>Up</Button>
                            <Button size="small" disabled={idx === charts.length - 1} onClick={() => {
                              if (idx === charts.length - 1) return;
                              setCharts(prev => {
                                const cp = [...prev]; const [it] = cp.splice(idx, 1); cp.splice(idx + 1, 0, it); return cp;
                              });
                              setChartResults(prev => {
                                const cp = [...prev]; const [it] = cp.splice(idx, 1); cp.splice(idx + 1, 0, it); return cp;
                              });
                            }} sx={{ textTransform: 'none' }}>Down</Button>
                          </>
                        )}
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => {
                            setCharts(prev => prev.filter((_, i) => i !== idx));
                            setChartResults(prev => prev.filter((_, i) => i !== idx));
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Stack>

                    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>Title</Typography>
                        <TextField 
                          size="small" 
                          value={cfg?.title || ''} 
                          onChange={(e) => setCharts(prev => prev.map((c, i) => i === idx ? { ...c, title: e.target.value } : c))} 
                          fullWidth 
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>Chart Type</Typography>
                        <Select 
                          size="small" 
                          value={cfg?.type || 'bar'} 
                          onChange={(e) => setCharts(prev => prev.map((c, i) => i === idx ? { ...c, type: String(e.target.value) as any } : c))} 
                          fullWidth
                          sx={{ borderRadius: '10px' }}
                        >
                          {['bar', 'line', 'pie', 'donut', 'funnel', 'table'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>X Axis</Typography>
                        <Select 
                          size="small" 
                          value={cfg?.x || ''} 
                          onChange={(e) => setCharts(prev => prev.map((c, i) => i === idx ? { ...c, x: String(e.target.value) } : c))} 
                          fullWidth
                          sx={{ borderRadius: '10px' }}
                        >
                          {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={6} sm={3} md={1.5}>
                        <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>Aggregate</Typography>
                        <Select 
                          size="small" 
                          value={cfg?.agg || 'COUNT'} 
                          onChange={(e) => setCharts(prev => prev.map((c, i) => i === idx ? { ...c, agg: String(e.target.value).toUpperCase() as any } : c))} 
                          fullWidth
                          sx={{ borderRadius: '10px' }}
                        >
                          {['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={6} sm={3} md={1.5}>
                        <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>Y Field</Typography>
                        <Select 
                          size="small" 
                          value={cfg?.y || ''} 
                          onChange={(e) => setCharts(prev => prev.map((c, i) => i === idx ? { ...c, y: String(e.target.value) } : c))} 
                          fullWidth 
                          disabled={!cfg || cfg.agg === 'COUNT'}
                          sx={{ borderRadius: '10px' }}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </Grid>
                    </Grid>

                    {chartResults[idx]?.error && (
                      <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '10px' }}>
                        {chartResults[idx]?.error || 'Chart could not be prepared. Try a different X axis or aggregation.'}
                      </Alert>
                    )}
                    {!chartResults[idx]?.error && (chartResults[idx]?.data?.length === 0) && (
                      <Alert severity="info" sx={{ mb: 1.5, borderRadius: '10px' }}>
                        No data for current selection. Click "Run" to generate chart.
                      </Alert>
                    )}
                    
                    {/* Chart with gradient styling */}
                    <Box 
                      sx={{ 
                        height: isMobile ? 240 : 280,
                        bgcolor: screenshotColors.darkBg,
                        borderRadius: '12px',
                        p: 1.5,
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          const data = chartResults[idx]?.data || [];
                          const t = (cfg.type || 'bar') as any;
                          const gradientId = `chart-gradient-${idx}`;
                          
                          if (t === 'line') {
                            return (
                              <LineChart data={data}>
                                <defs>
                                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#88d8f0" />
                                    <stop offset="50%" stopColor="#c8f0a0" />
                                    <stop offset="100%" stopColor="#f0f8a0" />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="group" stroke="rgba(255,255,255,0.6)" />
                                <YAxis stroke="rgba(255,255,255,0.6)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: 8 }} />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke={`url(#${gradientId})`}
                                  strokeWidth={3}
                                  dot={{ fill: '#88d8f0', strokeWidth: 0 }} 
                                  isAnimationActive={!chartResults[idx]?.loading} 
                                />
                              </LineChart>
                            );
                          }
                          if (t === 'pie' || t === 'donut') {
                            return (
                              <PieChart>
                                <defs>
                                  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#88d8f0" />
                                    <stop offset="50%" stopColor="#c8f0a0" />
                                    <stop offset="100%" stopColor="#f0f8a0" />
                                  </linearGradient>
                                </defs>
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: 8 }} />
                                <Legend />
                                <Pie 
                                  data={data} 
                                  dataKey="value" 
                                  nameKey="group" 
                                  innerRadius={t === 'donut' ? 50 : 0} 
                                  outerRadius={isMobile ? 80 : 100} 
                                  label
                                >
                                  {data.map((_entry: any, i: number) => (
                                    <Cell key={`cell-${i}`} fill={['#88d8f0', '#c8f0a0', '#f0f8a0', '#ff9f7f', '#87cefa'][i % 5]} />
                                  ))}
                                </Pie>
                              </PieChart>
                            );
                          }
                          if (t === 'funnel') {
                            return (
                              <FunnelChart margin={{ top: 10, right: 24, bottom: 10, left: 10 }}>
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: 8 }} />
                                <Funnel dataKey="value" nameKey="group" data={data} isAnimationActive={!chartResults[idx]?.loading}>
                                  {data.map((_entry: any, i: number) => (
                                    <Cell key={`cell-${i}`} fill={['#88d8f0', '#c8f0a0', '#f0f8a0', '#ff9f7f', '#87cefa'][i % 5]} />
                                  ))}
                                  <LabelList dataKey="group" position="right" fill="rgba(255,255,255,0.8)" />
                                </Funnel>
                              </FunnelChart>
                            );
                          }
                          if (t === 'table') {
                            return (
                              <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
                                <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'rgba(255,255,255,0.7)' }}>Top Groups</Typography>
                                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <Box component="thead">
                                    <Box component="tr">
                                      <Box component="th" sx={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)', pr: 2, color: 'rgba(255,255,255,0.9)', py: 0.5 }}>Group</Box>
                                      <Box component="th" sx={{ textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', py: 0.5 }}>Value</Box>
                                    </Box>
                                  </Box>
                                  <Box component="tbody">
                                    {data.map((r: any, i: number) => (
                                      <Box key={i} component="tr">
                                        <Box component="td" sx={{ py: 0.5, pr: 2, color: 'rgba(255,255,255,0.8)' }}>{String(r.group)}</Box>
                                        <Box component="td" sx={{ py: 0.5, textAlign: 'right', color: '#c8f0a0', fontWeight: 600 }}>{Number(r.value)}</Box>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              </Box>
                            );
                          }
                          // Default: Bar chart with gradient
                          return (
                            <BarChart data={data}>
                              <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#88d8f0" />
                                  <stop offset="50%" stopColor="#c8f0a0" />
                                  <stop offset="100%" stopColor="#f0f8a0" />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="group" stroke="rgba(255,255,255,0.6)" />
                              <YAxis stroke="rgba(255,255,255,0.6)" />
                              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: 8 }} />
                              <Legend />
                              <Bar 
                                dataKey="value" 
                                fill={`url(#${gradientId})`}
                                name="Value" 
                                isAnimationActive={!chartResults[idx]?.loading}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          );
                        })()}
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>
      <Snackbar open={saveToast.open} autoHideDuration={2500} onClose={() => setSaveToast(s => ({ ...s, open: false }))} message={saveToast.message} />
    </Box>
  );
};

export default ReportBuilder;
