import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Divider, Grid, IconButton, MenuItem, Select, Stack, TextField, Typography, Tabs, Tab, Switch, FormControlLabel, Paper, Alert, Snackbar } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import reportsService, { ReportConfig } from '../../../services/reportsService';
import { ArrowDownward, ArrowUpward, Save, SaveAs } from '@mui/icons-material';
import { ResponsiveContainer, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis, Bar, LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from 'recharts';

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

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      {/* Top toolbar matching screenshot style */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap:'wrap', rowGap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 2 }}>REPORT</Typography>
          <TextField size="small" label="Report name" value={name} onChange={(e)=>{ setName(e.target.value); setDirty(true); }} sx={{ minWidth: 240 }} />
          <TextField size="small" label="Description" value={description} onChange={(e)=>{ setDescription(e.target.value); setDirty(true); }} sx={{ minWidth: 320 }} />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={() => {
            setChartsOpen(true);
            const def = { x: availableFields[0] || 'leadStatus', agg: 'COUNT' as const, title: 'New Chart', type: 'bar' as const };
            setCharts(prev => [...prev, def]);
            setChartResults(prev => [...prev, { loading: false, error: null, data: [] }]);
            setDirty(true);
          }}>Add Chart</Button>
          <Button startIcon={<Save />} variant="contained" onClick={onSave}>Save</Button>
          <Button startIcon={<SaveAs />} variant="outlined" onClick={onSaveAndRun}>Save & Run</Button>
          <Button variant="text" onClick={()=>{ if (dirty && !window.confirm('You have unsaved changes. Close without saving?')) return; navigate('/reports'); }}>Close</Button>
          <Button variant="contained" color="primary" onClick={()=>{ if (!id) return; if (dirty && !window.confirm('You have unsaved changes. Run without saving?')) return; navigate(`/reports/view/${id}`); }}>Run</Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, mb: 1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Typography variant="body2">Previewing a limited number of records. Run the report to see everything.</Typography>
        <FormControlLabel control={<Switch size="small" checked={autoPreview} onChange={(e)=>setAutoPreview(e.target.checked)} />} labelPlacement="start" label="Update Preview Automatically" />
      </Paper>

  <Grid container spacing={2}>
        {/* Left panel: Outline / Filters */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper variant="outlined">
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(_,v)=>setActiveTab(v)} aria-label="builder-tabs">
                <Tab label="Outline" value="outline" />
                <Tab label={`Filters${filters.length?` (${filters.length})`:''}`} value="filters" />
              </Tabs>
            </Box>
            <Box sx={{ p: 1.5 }}>
              {activeTab === 'outline' && (
                <Stack spacing={1.5}>
                  <Typography variant="subtitle1">Columns</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Select
                      size="small"
                      displayEmpty
                      value=""
                      onChange={(e)=>{ const val = String(e.target.value); if(val) toggleColumn(val); }}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, borderRadius: 20 }}
                    >
                      <MenuItem value=""><em>Add column...</em></MenuItem>
                      {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                    </Select>
                  </Stack>
                  <Stack spacing={1}>
                    {columns.map((c, idx) => (
                      <Stack key={c} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ px: 1.25, py: 0.5, bgcolor: 'action.hover', borderRadius: 20, fontSize: 13, color: 'text.primary' }}>{c}</Box>
                        <IconButton size="small" onClick={()=>moveColumn(idx, -1)} aria-label="move up"><ArrowUpward fontSize="inherit"/></IconButton>
                        <IconButton size="small" onClick={()=>moveColumn(idx, 1)} aria-label="move down"><ArrowDownward fontSize="inherit"/></IconButton>
                        <Button size="small" color="primary" sx={{ ml: 1, textTransform: 'none' }} onClick={()=>toggleColumn(c)}>Remove</Button>
                      </Stack>
                    ))}
                  </Stack>

                  <Divider />
                  <Typography variant="subtitle1">Sort</Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <Select
                        size="small"
                        value={sort.field}
                        onChange={(e)=>setSort(s=>({ ...s, field: String(e.target.value) }))}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, borderRadius: 20 }}
                      >
                        {['dateEntered','dateModified', ...columns].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                      </Select>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Select
                        size="small"
                        value={sort.order}
                        onChange={(e)=>setSort(s=>({ ...s, order: (String(e.target.value).toUpperCase() as any) }))}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, borderRadius: 20 }}
                      >
                        <MenuItem value="ASC">ASC</MenuItem>
                        <MenuItem value="DESC">DESC</MenuItem>
                      </Select>
                    </Grid>
                    <Grid item xs={12}>
                      <Select
                        size="small"
                        value={filterLogic}
                        onChange={(e)=>setFilterLogic((e.target.value as any))}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, borderRadius: 20 }}
                      >
                        <MenuItem value="AND">Match all filters (AND)</MenuItem>
                        <MenuItem value="OR">Match any filter (OR)</MenuItem>
                      </Select>
                    </Grid>
                  </Grid>
                </Stack>
              )}

              {activeTab === 'filters' && (
                <Stack spacing={1}>
                  {(filters || []).map((fl, i) => (
                    <Grid key={i} container spacing={1} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <Select
                          size="small"
                          value={fl.field}
                          onChange={(e)=>updateFilter(i,{ field: e.target.value })}
                          fullWidth
                          sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, borderRadius: 20 }}
                        >
                          {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Select
                          size="small"
                          value={fl.op}
                          onChange={(e)=>updateFilter(i,{ op: e.target.value })}
                          fullWidth
                          sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, borderRadius: 20 }}
                        >
                          {defaultOps.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          value={fl.value ?? ''}
                          onChange={(e)=>updateFilter(i,{ value: e.target.value })}
                          placeholder="Value"
                          fullWidth
                          sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, borderRadius: 20 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button color="error" onClick={()=>removeFilter(i)} sx={{ textTransform: 'none' }}>Remove</Button>
                      </Grid>
                    </Grid>
                  ))}
                  <Button onClick={addFilter} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>Add Filter</Button>
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Main preview panel */}
        <Grid item xs={12} md={8} lg={9}>
          <Typography variant="h6" sx={{ mb: 1 }}>Preview (first 200 rows)</Typography>
          <Box sx={{ height: 520 }}>
            <DataGrid
              columns={previewCols}
              rows={(rows || []).map((r, i) => ({ id: i, ...r }))}
              disableRowSelectionOnClick
              density="compact"
              hideFooter
            />
          </Box>

          {chartsOpen && (
            <Paper variant="outlined" sx={{ mt: 2, p: 1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">Charts</Typography>
                <Button size="small" color="error" onClick={()=> setChartsOpen(false)}>Close</Button>
              </Stack>

              <Stack spacing={2}>
                {charts.map((cfg, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">{cfg.title || `Chart ${idx + 1}`}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={async()=>{
                          setChartResults(prev => prev.map((r,i)=> i===idx ? { ...r, loading: true, error: null } : r));
                          try {
                            const baseCfg: any = { columns, filters, sort, ...(filterLogic ? { filterLogic } : {}) };
                            const data = await reportsService.chart({ reportType, config: baseCfg, chart: cfg });
                            setChartResults(prev => prev.map((r,i)=> i===idx ? { ...r, data: data || [] } : r));
                          } catch (e: any) {
                            setChartResults(prev => prev.map((r,i)=> i===idx ? { ...r, error: e?.message || 'Failed to generate chart' } : r));
                          } finally {
                            setChartResults(prev => prev.map((r,i)=> i===idx ? { ...r, loading: false } : r));
                          }
                        }}>Run</Button>
                        <Button size="small" disabled={idx===0} onClick={()=>{
                          if (idx===0) return;
                          setCharts(prev => {
                            const cp = [...prev]; const [it] = cp.splice(idx,1); cp.splice(idx-1,0,it); return cp;
                          });
                          setChartResults(prev => {
                            const cp = [...prev]; const [it] = cp.splice(idx,1); cp.splice(idx-1,0,it); return cp;
                          });
                        }}>Up</Button>
                        <Button size="small" disabled={idx===charts.length-1} onClick={()=>{
                          if (idx===charts.length-1) return;
                          setCharts(prev => {
                            const cp = [...prev]; const [it] = cp.splice(idx,1); cp.splice(idx+1,0,it); return cp;
                          });
                          setChartResults(prev => {
                            const cp = [...prev]; const [it] = cp.splice(idx,1); cp.splice(idx+1,0,it); return cp;
                          });
                        }}>Down</Button>
                        <Button size="small" color="error" onClick={()=>{
                          setCharts(prev => prev.filter((_,i)=>i!==idx));
                          setChartResults(prev => prev.filter((_,i)=>i!==idx));
                        }}>Remove</Button>
                      </Stack>
                    </Stack>

                    <Grid container spacing={1} sx={{ mb: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">Title</Typography>
                        <TextField size="small" value={cfg?.title || ''} onChange={(e)=>setCharts(prev => prev.map((c,i)=> i===idx ? { ...c, title: e.target.value } : c))} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">Chart Type</Typography>
                        <Select size="small" value={cfg?.type || 'bar'} onChange={(e)=>setCharts(prev => prev.map((c,i)=> i===idx ? { ...c, type: String(e.target.value) as any } : c))} fullWidth>
                          {['bar','line','pie','donut','funnel','table'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">X Axis</Typography>
                        <Select size="small" value={cfg?.x || ''} onChange={(e)=>setCharts(prev => prev.map((c,i)=> i===idx ? { ...c, x: String(e.target.value) } : c))} fullWidth>
                          {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">Aggregate</Typography>
                        <Select size="small" value={cfg?.agg || 'COUNT'} onChange={(e)=>setCharts(prev => prev.map((c,i)=> i===idx ? { ...c, agg: String(e.target.value).toUpperCase() as any } : c))} fullWidth>
                          {['COUNT','SUM','AVG','MIN','MAX'].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">Y Field (for SUM/AVG/MIN/MAX)</Typography>
                        <Select size="small" value={cfg?.y || ''} onChange={(e)=>setCharts(prev => prev.map((c,i)=> i===idx ? { ...c, y: String(e.target.value) } : c))} fullWidth disabled={!cfg || cfg.agg === 'COUNT'}>
                          <MenuItem value=""><em>None</em></MenuItem>
                          {availableFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </Grid>
                    </Grid>

                    {chartResults[idx]?.error && <Alert severity="warning" sx={{ mb: 1 }}>{chartResults[idx]?.error || 'Chart could not be prepared. Try a different X axis or aggregation.'}</Alert>}
                    {!chartResults[idx]?.error && (chartResults[idx]?.data?.length === 0) && (
                      <Alert severity="info" sx={{ mb: 1 }}>No data for current selection.</Alert>
                    )}
                    <Box sx={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          const data = chartResults[idx]?.data || [];
                          const t = (cfg.type || 'bar') as any;
                          if (t === 'line') {
                            return (
                              <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="group" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke="#1976d2" dot={false} isAnimationActive={!chartResults[idx]?.loading} />
                              </LineChart>
                            );
                          }
                          if (t === 'pie' || t === 'donut') {
                            return (
                              <PieChart>
                                <Tooltip />
                                <Legend />
                                <Pie data={data} dataKey="value" nameKey="group" innerRadius={t==='donut'?60:0} outerRadius={110} label>
                                  {data.map((_entry: any, i: number) => (
                                    <Cell key={`cell-${i}`} fill={['#1976d2','#9c27b0','#ff9800','#4caf50','#f44336'][i % 5]} />
                                  ))}
                                </Pie>
                              </PieChart>
                            );
                          }
                          if (t === 'funnel') {
                            return (
                              <FunnelChart margin={{ top: 10, right: 24, bottom: 10, left: 10 }}>
                                <Tooltip />
                                <Legend />
                                <Funnel dataKey="value" nameKey="group" data={data} isAnimationActive={!chartResults[idx]?.loading} fill="#1976d2">
                                  <LabelList dataKey="group" position="right" fill="#333333" />
                                </Funnel>
                              </FunnelChart>
                            );
                          }
                          if (t === 'table') {
                            // Render a minimal table-like view using a simple list
                            return (
                              <Box sx={{ p: 1 }}>
                                <Typography variant="caption" sx={{ mb: 1, display:'block' }}>Top Groups</Typography>
                                <Box component="table" sx={{ width:'100%', borderCollapse:'collapse' }}>
                                  <Box component="thead">
                                    <Box component="tr">
                                      <Box component="th" sx={{ textAlign:'left', borderBottom: '1px solid', borderColor:'divider', pr:2 }}>Group</Box>
                                      <Box component="th" sx={{ textAlign:'right', borderBottom: '1px solid', borderColor:'divider' }}>Value</Box>
                                    </Box>
                                  </Box>
                                  <Box component="tbody">
                                    {data.map((r:any, i:number) => (
                                      <Box key={i} component="tr">
                                        <Box component="td" sx={{ py:0.5, pr:2 }}>{String(r.group)}</Box>
                                        <Box component="td" sx={{ py:0.5, textAlign:'right' }}>{Number(r.value)}</Box>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              </Box>
                            );
                          }
                          return (
                            <BarChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="group" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="value" fill="#1976d2" name="Value" isAnimationActive={!chartResults[idx]?.loading} />
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
        <Snackbar open={saveToast.open} autoHideDuration={2500} onClose={()=>setSaveToast(s=>({...s,open:false}))} message={saveToast.message} />
    </Box>
  );
};

export default ReportBuilder;
// Snackbar outside main return to avoid clutter
// (Already included within component above)
