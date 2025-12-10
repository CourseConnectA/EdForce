import React, { useMemo, useState } from 'react';
import { Box, TextField, Button, Menu, MenuItem, Paper, Stack, Typography, alpha, useMediaQuery, useTheme, InputAdornment, Grid, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { Assessment, Search as SearchIcon, FilterList as FilterIcon, Add as AddIcon, PlayArrow, Description, TableChart } from '@mui/icons-material';
import { screenshotColors } from '@/theme/theme';

const templates = [
  { key: 'leads', name: 'Leads', category: 'Standard', description: 'Tabular report of leads with filters.', icon: 'table', fields:['referenceNo','firstName','lastName','email','mobileNumber','leadStatus','program','leadSource','dateEntered']},
  { key: 'lead_history', name: 'Lead History', category: 'Standard', description: 'Audit history of lead changes.', icon: 'history', fields:['leadId','action','note','changedAt']},
];

const NewReportWizard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [q, setQ] = useState('');
  const [catAnchor, setCatAnchor] = useState<null | HTMLElement>(null);
  const [category, setCategory] = useState<string>('All');

  const list = useMemo(()=> templates
    .filter(t => t.name.toLowerCase().includes(q.toLowerCase()))
    .filter(t => category==='All' ? true : t.category === category)
  , [q, category]);

  const startFromTemplate = async (tpl: any) => {
    const name = encodeURIComponent(`${tpl.name} Report`);
    const cols = encodeURIComponent((tpl.fields || []).join(','));
    navigate(`/reports/builder/new?type=${encodeURIComponent(tpl.key)}&name=${name}&cols=${cols}`);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Report Type', flex: 1, minWidth: 200 },
    { field: 'category', headerName: 'Category', width: 140 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 280 },
    { field: 'fields', headerName: 'Fields', width: 100, valueGetter: (p)=> (p.row.fields?.length || 0) },
    { field: 'actions', headerName: 'Actions', width: 160, sortable:false, filterable:false,
      renderCell: (p) => (
        <Button 
          size="small" 
          variant="contained" 
          startIcon={<PlayArrow />}
          onClick={()=>startFromTemplate(p.row)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Start Report
        </Button>
      )
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3, px: isMobile ? 1 : 0 }}>
        <Stack 
          direction={isMobile ? 'column' : 'row'} 
          justifyContent="space-between" 
          alignItems={isMobile ? 'stretch' : 'center'}
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ 
              width: isMobile ? 48 : 56, 
              height: isMobile ? 48 : 56, 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35)',
            }}>
              <Assessment sx={{ color: '#fff', fontSize: isMobile ? 24 : 28 }} />
            </Box>
            <Box>
              <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: screenshotColors.darkText }}>
                New Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {list.length} report types available
              </Typography>
            </Box>
          </Stack>

          <Stack 
            direction={isMobile ? 'column' : 'row'} 
            spacing={1.5} 
            alignItems={isMobile ? 'stretch' : 'center'}
          >
            <TextField 
              size="small" 
              placeholder="Search report types..." 
              value={q} 
              onChange={(e)=>setQ(e.target.value)}
              sx={{ 
                minWidth: isMobile ? '100%' : 260,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                },
              }}
              InputProps={{ 
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={1}>
              <Button 
                variant="outlined" 
                onClick={(e)=>setCatAnchor(e.currentTarget)}
                startIcon={<FilterIcon />}
                sx={{ 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  borderColor: alpha('#667eea', 0.3),
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#667eea',
                    backgroundColor: alpha('#667eea', 0.05),
                  },
                }}
              >
                {category}
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={()=>{ const name = encodeURIComponent('Untitled Report'); navigate(`/reports/builder/new?type=leads&name=${name}`); }}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                  },
                }}
              >
                Start Blank
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {/* Mobile: Card-based template selection */}
      {isMobile ? (
        <Box sx={{ px: 1 }}>
          <Grid container spacing={2}>
            {list.map((tpl) => (
              <Grid item xs={12} key={tpl.key}>
                <Paper
                  elevation={0}
                  onClick={() => startFromTemplate(tpl)}
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: alpha('#667eea', 0.15),
                    bgcolor: 'rgba(255,255,255,0.95)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:active': { 
                      transform: 'scale(0.98)',
                      bgcolor: alpha('#667eea', 0.05),
                    },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={2}>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <TableChart sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{tpl.name}</Typography>
                        <Chip 
                          label={tpl.category} 
                          size="small" 
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            bgcolor: alpha('#667eea', 0.1),
                            color: '#667eea',
                          }} 
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {tpl.description}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Description sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {tpl.fields.length} fields included
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                  <Button 
                    variant="contained" 
                    fullWidth
                    startIcon={<PlayArrow />}
                    sx={{
                      mt: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Start This Report
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {list.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: alpha('#667eea', 0.15),
                bgcolor: 'rgba(255,255,255,0.9)',
              }}
            >
              <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No report types match your search</Typography>
            </Paper>
          )}
        </Box>
      ) : (
        /* Desktop: Enhanced DataGrid view */
        <Paper
          elevation={0}
          sx={{ 
            height: 520, 
            width:'100%',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: alpha('#667eea', 0.15),
            overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.9)',
          }}
        >
          <DataGrid
            rows={list}
            getRowId={(r)=>r.key}
            columns={columns}
            disableColumnMenu
            hideFooterSelectedRowCount
            density="compact"
            onRowDoubleClick={(p)=>startFromTemplate(p.row)}
            sx={{ 
              border: 'none',
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-columnHeaders': { 
                backgroundColor: alpha('#667eea', 0.05),
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: alpha('#667eea', 0.04),
              },
            }}
          />
        </Paper>
      )}

      <Menu anchorEl={catAnchor} open={!!catAnchor} onClose={()=>setCatAnchor(null)}>
        {['All','Standard'].map(c => (
          <MenuItem key={c} selected={c===category} onClick={()=>{ setCategory(c); setCatAnchor(null); }}>{c}</MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default NewReportWizard;
