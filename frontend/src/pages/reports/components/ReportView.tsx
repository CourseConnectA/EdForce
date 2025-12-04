import React, { useEffect, useState, useCallback } from 'react';
import { Box, Button, Paper, Typography, Stack, useMediaQuery, useTheme, IconButton, Menu, MenuItem, ListItemText, ToggleButtonGroup, ToggleButton, Card, CardContent, Divider, Chip } from '@mui/material';
import PageHeader from '@/components/common/PageHeader';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate, useParams } from 'react-router-dom';
import reportsService, { ReportConfig } from '../../../services/reportsService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface ReportDto {
  id: string;
  name: string;
  description?: string | null;
  reportType: string;
  scope: 'personal' | 'center';
  config?: ReportConfig;
}

const ReportView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table' | 'scroll'>('cards');

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportDto | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [cols, setCols] = useState<GridColDef[]>([]);
  const [chartDataList, setChartDataList] = useState<Array<Array<{ group: string; value: number }>>>([]);
  const [chartConfigs, setChartConfigs] = useState<any[]>([]);

  // Check if report is lead-related and get lead ID for navigation
  const isLeadReport = (report?.reportType || '').toLowerCase() === 'leads' || (report?.reportType || '').toLowerCase() === 'lead';
  const isLeadHistoryReport = (report?.reportType || '').toLowerCase() === 'lead_history';
  
  const getLeadIdFromRow = useCallback((row: any): string | null => {
    if (isLeadReport) {
      return row?.id || null;
    }
    if (isLeadHistoryReport) {
      return row?.leadId || null;
    }
    return null;
  }, [isLeadReport, isLeadHistoryReport]);
  
  const handleRowClick = useCallback((row: any) => {
    const leadId = getLeadIdFromRow(row);
    if (leadId) {
      navigate(`/leads/${leadId}`);
    }
  }, [getLeadIdFromRow, navigate]);
  
  const isClickable = isLeadReport || isLeadHistoryReport;

  // Function to fetch/refresh report data
  const fetchReportData = useCallback(async (showLoading = true) => {
    if (!id) return;
    if (showLoading) setLoading(true);
    try {
      const r = await reportsService.get(id);
      setReport(r);
      const cfg = r.config || { columns: [] };
      const res = await reportsService.run(r.reportType, cfg, false);
      setRows(res.rows || []);
      const gridCols: GridColDef[] = (res.columns || cfg.columns || []).map((c: string) => ({ field: c, headerName: c, flex: 1 }));
      setCols(gridCols);
      // If there are chart configs, render all
      const charts = Array.isArray((cfg as any).charts) ? (cfg as any).charts : [];
      if (charts.length) {
        try {
          const results = await Promise.all(charts.map((c: any) => reportsService.chart({ reportType: r.reportType, config: cfg, chart: c }).catch(() => [])));
          setChartDataList(results as any);
          setChartConfigs(charts);
        } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Refetch when window regains focus (user returns from lead detail page)
  useEffect(() => {
    const handleFocus = () => {
      // Only refetch if we have a report loaded (not initial load)
      if (report) {
        fetchReportData(false); // Don't show loading spinner on refetch
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [report, fetchReportData]);

  // Also refetch when component becomes visible via visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && report) {
        fetchReportData(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [report, fetchReportData]);

  const downloadCSV = () => {
    if (!report) return;
    const headers = cols.map(c => c.field);
    const lines = [headers.join(',')];
    for (const r of rows) {
      const line = headers.map(h => {
        const val = r[h];
        if (val === null || val === undefined) return '';
        const s = String(val).replace(/"/g, '""');
        if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
        return s;
      }).join(',');
      lines.push(line);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    if (!report) return;
    const headers = cols.map(c => c.field);
    const data = rows.map(r => headers.map(h => r[h] ?? ''));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${report.name || 'report'}.xlsx`);
  };

  const exportPDF = () => {
    if (!report) return;
    const headers = cols.map(c => c.field);
    const data = rows.map(r => headers.map(h => r[h] ?? ''));
    const doc = new jsPDF({ orientation: 'landscape' });
    (autoTable as any)(doc, {
      head: [headers],
      body: data,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210] },
      margin: { top: 16 },
      didDrawPage: (_d: any) => {
        doc.text(report.name || 'Report', 14, 10);
      }
    });
    doc.save(`${report.name || 'report'}.pdf`);
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (!report) return <Typography>Report not found</Typography>;

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportCSV = () => {
    downloadCSV();
    handleExportMenuClose();
  };

  const handleExportXLSX = () => {
    exportXLSX();
    handleExportMenuClose();
  };

  const handleExportPDF = () => {
    exportPDF();
    handleExportMenuClose();
  };

  return (
    <Box sx={{ pb: isMobile ? 2 : 0 }}>
      {/* Mobile Header */}
      {isMobile ? (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <IconButton onClick={() => navigate('/reports')} size="small">
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center', mx: 1 }} noWrap>
              {report.name}
            </Typography>
            <IconButton onClick={() => navigate(`/reports/builder/${report.id}`)} size="small">
              <EditIcon />
            </IconButton>
          </Stack>
          
          {/* View mode toggle and export */}
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <ToggleButtonGroup
              value={mobileViewMode}
              exclusive
              onChange={(_, v) => v && setMobileViewMode(v)}
              size="small"
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
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<DownloadIcon />}
              onClick={handleExportMenuOpen}
            >
              Export
            </Button>
          </Stack>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
            {rows.length} records
          </Typography>
          
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
          >
            <MenuItem onClick={handleExportCSV}>
              <ListItemText>CSV</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleExportXLSX}>
              <ListItemText>XLSX (Excel)</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleExportPDF}>
              <ListItemText>PDF</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      ) : (
        <PageHeader
          title={report.name}
          actions={(
            <>
              <Button onClick={()=>navigate(`/reports/builder/${report.id}`)}>Edit</Button>
              <Button variant="outlined" onClick={downloadCSV}>Export CSV</Button>
              <Button variant="outlined" onClick={exportXLSX}>Export XLSX</Button>
              <Button variant="outlined" onClick={exportPDF}>Export PDF</Button>
              <Button onClick={()=>navigate('/reports')}>Close</Button>
            </>
          )}
        />
      )}

      {/* Charts */}
      {chartDataList.length > 0 && chartDataList.map((data, idx) => (
        <Paper key={idx} sx={{ height: isMobile ? 280 : 360, mb: 2, p: 1 }} elevation={0} variant="outlined">
          <Typography variant="subtitle2" sx={{ px: 1, py: 0.5 }}>{chartConfigs[idx]?.title || `Chart ${idx + 1}`}</Typography>
          <ResponsiveContainer width="100%" height="85%">
            {(() => {
              const t = (chartConfigs[idx]?.type || 'bar') as any;
              if (t === 'line') {
                return (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="group" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#1976d2" dot={false} />
                  </LineChart>
                );
              }
              if (t === 'pie' || t === 'donut') {
                return (
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie data={data} dataKey="value" nameKey="group" innerRadius={t==='donut'?70:0} outerRadius={120} label>
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
                    <Funnel dataKey="value" nameKey="group" data={data} fill="#1976d2">
                      <LabelList dataKey="group" position="right" fill="#333333" />
                    </Funnel>
                  </FunnelChart>
                );
              }
              if (t === 'table') {
                return (
                  <Box sx={{ p: 1 }}>
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
                  <Bar dataKey="value" fill="#1976d2" name="Value" />
                </BarChart>
              );
            })()}
          </ResponsiveContainer>
          {(!data || data.length === 0) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, px: 1 }}>No data for this chart selection.</Typography>
          )}
        </Paper>
      ))}

      {/* Data Display - Mobile Views */}
      {isMobile ? (
        <>
          {/* Cards View */}
          {mobileViewMode === 'cards' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {(rows || []).map((row, idx) => {
                const fields = cols.map(c => c.field);
                const primaryField = fields[0];
                const secondaryField = fields[1];
                const leadId = getLeadIdFromRow(row);
                return (
                  <Card 
                    key={idx} 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 2,
                      cursor: isClickable && leadId ? 'pointer' : 'default',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': isClickable && leadId ? {
                        bgcolor: 'action.hover',
                        borderColor: 'primary.main',
                        transform: 'translateY(-1px)',
                        boxShadow: 1,
                      } : {},
                      '&:active': isClickable && leadId ? {
                        transform: 'translateY(0)',
                      } : {},
                    }}
                    onClick={() => isClickable && leadId && handleRowClick(row)}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {/* Primary info */}
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {row[primaryField] || `Record ${idx + 1}`}
                          </Typography>
                          {secondaryField && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {row[secondaryField] || '-'}
                            </Typography>
                          )}
                        </Box>
                        {isClickable && leadId && (
                          <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary', ml: 1, mt: 0.5 }} />
                        )}
                      </Stack>
                      
                      {/* Other fields as chips/tags */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {fields.slice(2, 6).map((field) => (
                          <Chip
                            key={field}
                            label={`${field}: ${row[field] ?? '-'}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 24 }}
                          />
                        ))}
                        {fields.length > 6 && (
                          <Chip
                            label={`+${fields.length - 6} more`}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 24, bgcolor: 'action.hover' }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
              {rows.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No data available
                </Typography>
              )}
            </Box>
          )}

          {/* Compact Table View */}
          {mobileViewMode === 'table' && (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {(rows || []).map((row, idx) => {
                const fields = cols.map(c => c.field);
                const leadId = getLeadIdFromRow(row);
                return (
                  <Box 
                    key={idx}
                    onClick={() => isClickable && leadId && handleRowClick(row)}
                    sx={{
                      cursor: isClickable && leadId ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease-in-out',
                      '&:hover': isClickable && leadId ? {
                        bgcolor: 'action.hover',
                      } : {},
                      '&:active': isClickable && leadId ? {
                        bgcolor: 'action.selected',
                      } : {},
                    }}
                  >
                    <Box sx={{ p: 1.5 }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ flex: 1 }}>
                          {fields.slice(0, 5).map((field) => (
                            <Stack key={field} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                                {field}
                              </Typography>
                              <Typography variant="body2" sx={{ textAlign: 'right', flex: 1, ml: 1 }} noWrap>
                                {row[field] ?? '-'}
                              </Typography>
                            </Stack>
                          ))}
                          {fields.length > 5 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                              +{fields.length - 5} more fields
                            </Typography>
                          )}
                        </Box>
                        {isClickable && leadId && (
                          <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary', ml: 1, mt: 0.5 }} />
                        )}
                      </Stack>
                    </Box>
                    {idx < rows.length - 1 && <Divider />}
                  </Box>
                );
              })}
              {rows.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No data available
                </Typography>
              )}
            </Paper>
          )}

          {/* Horizontal Scroll Table View */}
          {mobileViewMode === 'scroll' && (
            <Paper 
              variant="outlined" 
              sx={{ 
                borderRadius: 2, 
                overflow: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Box 
                component="table" 
                sx={{ 
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  '& th, & td': {
                    px: 1.5,
                    py: 1,
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                  '& th': {
                    bgcolor: 'action.hover',
                    fontWeight: 600,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  },
                  '& tr:last-child td': {
                    borderBottom: 'none',
                  },
                }}
              >
                <Box component="thead">
                  <Box component="tr">
                    {cols.map((col) => (
                      <Box component="th" key={col.field}>
                        {col.headerName || col.field}
                      </Box>
                    ))}
                    {isClickable && <Box component="th" sx={{ width: 40 }}></Box>}
                  </Box>
                </Box>
                <Box component="tbody">
                  {(rows || []).map((row, idx) => {
                    const leadId = getLeadIdFromRow(row);
                    return (
                      <Box 
                        component="tr" 
                        key={idx} 
                        onClick={() => isClickable && leadId && handleRowClick(row)}
                        sx={{ 
                          cursor: isClickable && leadId ? 'pointer' : 'default',
                          transition: 'background-color 0.15s ease-in-out',
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:active': isClickable && leadId ? { bgcolor: 'action.selected' } : {},
                        }}
                      >
                        {cols.map((col) => (
                          <Box component="td" key={col.field}>
                            {row[col.field] ?? '-'}
                          </Box>
                        ))}
                        {isClickable && (
                          <Box component="td" sx={{ textAlign: 'center' }}>
                            {leadId && <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
              {rows.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No data available
                </Typography>
              )}
            </Paper>
          )}
        </>
      ) : (
        /* Desktop DataGrid */
        <Paper sx={{ height: 560, overflow: 'hidden' }} elevation={0} variant="outlined">
          <DataGrid
            columns={cols}
            rows={(rows || []).map((r, i) => ({ _gridId: i, ...r }))}
            getRowId={(row) => row._gridId}
            disableRowSelectionOnClick
            density="compact"
            onRowClick={(params) => {
              if (isClickable) {
                const leadId = getLeadIdFromRow(params.row);
                if (leadId) {
                  navigate(`/leads/${leadId}`);
                }
              }
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontSize: '0.875rem',
              },
              ...(isClickable ? {
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                },
              } : {}),
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ReportView;
