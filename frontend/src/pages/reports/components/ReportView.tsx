import React, { useEffect, useState, useCallback } from 'react';
import { Box, Button, Paper, Typography, Stack, useMediaQuery, useTheme, IconButton, Menu, MenuItem, ListItemText, ToggleButtonGroup, ToggleButton, Card, CardContent, Divider, Chip, alpha } from '@mui/material';
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
import AssessmentIcon from '@mui/icons-material/Assessment';
import { screenshotColors } from '@/theme/theme';

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
          <AssessmentIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Typography color="text.secondary">Loading Report...</Typography>
      </Stack>
    </Box>
  );
  if (!report) return (
    <Box sx={{ 
      minHeight: '60vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Stack alignItems="center" spacing={2}>
        <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
        <Typography color="text.secondary">Report not found</Typography>
        <Button 
          variant="contained"
          onClick={() => navigate('/reports')}
          sx={{
            background: '#303030',
            borderRadius: '12px',
          }}
        >
          Back to Reports
        </Button>
      </Stack>
    </Box>
  );

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
    <Box sx={{ pb: isMobile ? 2 : 0, minHeight: '100vh' }}>
      {/* Mobile Header */}
      {isMobile ? (
        <Box sx={{ mb: 2, px: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <IconButton 
              onClick={() => navigate('/reports')} 
              size="small"
              sx={{ 
                bgcolor: alpha('#667eea', 0.1),
                '&:hover': { bgcolor: alpha('#667eea', 0.2) },
              }}
            >
              <CloseIcon sx={{ color: '#667eea' }} />
            </IconButton>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, mx: 1.5, minWidth: 0 }}>
              <Box sx={{ 
                width: 36, 
                height: 36, 
                borderRadius: '10px', 
                background: '#303030',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AssessmentIcon sx={{ color: '#fff', fontSize: 18 }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                {report.name}
              </Typography>
            </Stack>
            <IconButton 
              onClick={() => navigate(`/reports/builder/${report.id}`)} 
              size="small"
              sx={{ 
                bgcolor: alpha('#667eea', 0.1),
                '&:hover': { bgcolor: alpha('#667eea', 0.2) },
              }}
            >
              <EditIcon sx={{ color: '#667eea', fontSize: 20 }} />
            </IconButton>
          </Stack>
          
          {/* View mode toggle and export */}
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <ToggleButtonGroup
              value={mobileViewMode}
              exclusive
              onChange={(_, v) => v && setMobileViewMode(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: alpha('#667eea', 0.2),
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
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<DownloadIcon />}
              onClick={handleExportMenuOpen}
              sx={{ 
                borderRadius: '10px',
                borderColor: alpha('#667eea', 0.3),
                color: '#667eea',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#667eea',
                  bgcolor: alpha('#667eea', 0.05),
                },
              }}
            >
              Export
            </Button>
          </Stack>
          
          <Paper
            elevation={0}
            sx={{ 
              p: 1, 
              mb: 1.5, 
              borderRadius: '10px',
              bgcolor: alpha('#667eea', 0.05),
              border: '1px solid',
              borderColor: alpha('#667eea', 0.1),
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {rows.length} records
            </Typography>
          </Paper>
          
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
        /* Desktop Header */
        <Box sx={{ mb: 3, px: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ 
                width: 56, 
                height: 56, 
                borderRadius: '16px', 
                background: '#303030',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35)',
              }}>
                <AssessmentIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: screenshotColors.darkText }}>{report.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {rows.length} records • {report.reportType}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button 
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/reports/builder/${report.id}`)}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  borderColor: alpha('#667eea', 0.3),
                  color: '#667eea',
                }}
              >
                Edit
              </Button>
              <Button 
                variant="outlined" 
                onClick={downloadCSV}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  borderColor: alpha('#667eea', 0.3),
                }}
              >
                CSV
              </Button>
              <Button 
                variant="outlined" 
                onClick={exportXLSX}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  borderColor: alpha('#667eea', 0.3),
                }}
              >
                XLSX
              </Button>
              <Button 
                variant="outlined" 
                onClick={exportPDF}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  borderColor: alpha('#667eea', 0.3),
                }}
              >
                PDF
              </Button>
              <Button 
                variant="contained"
                onClick={() => navigate('/reports')}
                sx={{
                  background: '#303030',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                }}
              >
                Close
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Charts */}
      {chartDataList.length > 0 && chartDataList.map((data, idx) => (
        <Paper 
          key={idx} 
          elevation={0}
          sx={{ 
            mb: 2, 
            borderRadius: '16px',
            border: '1px solid',
            borderColor: alpha('#667eea', 0.15),
            overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.9)',
            mx: isMobile ? 1 : 0,
          }}
        >
          <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {chartConfigs[idx]?.title || `Chart ${idx + 1}`}
            </Typography>
          </Box>
          <Box 
            sx={{ 
              height: isMobile ? 280 : 340,
              bgcolor: screenshotColors.darkBg,
              p: isMobile ? 1.5 : 2,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const t = (chartConfigs[idx]?.type || 'bar') as any;
                const gradientId = `report-chart-gradient-${idx}`;
                
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
                        innerRadius={t === 'donut' ? (isMobile ? 50 : 70) : 0} 
                        outerRadius={isMobile ? 90 : 120} 
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
                      <Funnel dataKey="value" nameKey="group" data={data}>
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
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                );
              })()}
            </ResponsiveContainer>
          </Box>
          {(!data || data.length === 0) && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No data for this chart selection.</Typography>
            </Box>
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
