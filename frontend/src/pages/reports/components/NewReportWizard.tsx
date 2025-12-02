import React, { useMemo, useState } from 'react';
import { Box, TextField, Button, Menu, MenuItem } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';

const templates = [
  { key: 'leads', name: 'Leads', category: 'Standard', description: 'Tabular report of leads with filters.' , fields:['referenceNo','firstName','lastName','email','mobileNumber','leadStatus','program','leadSource','dateEntered']},
  { key: 'lead_history', name: 'Lead History', category: 'Standard', description: 'Audit history of lead changes.' , fields:['leadId','action','note','changedAt']},
];

const NewReportWizard: React.FC = () => {
  const navigate = useNavigate();
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
    { field: 'actions', headerName: 'Actions', width: 140, sortable:false, filterable:false,
      renderCell: (p) => <Button size="small" variant="contained" onClick={()=>startFromTemplate(p.row)}>Start Report</Button> },
  ];

  return (
    <Box>
      <PageHeader
        title="New Report"
        subtitle={`${list.length} types`}
        actions={(
          <>
            <TextField size="small" placeholder="Search report types..." value={q} onChange={(e)=>setQ(e.target.value)} />
            <Button variant="outlined" onClick={(e)=>setCatAnchor(e.currentTarget)}>Filter</Button>
            <Button variant="contained" onClick={()=>{ const name = encodeURIComponent('Untitled Report'); navigate(`/reports/builder/new?type=leads&name=${name}`); }}>Start Blank</Button>
          </>
        )}
      />

      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={list}
          getRowId={(r)=>r.key}
          columns={columns}
          disableColumnMenu
          hideFooterSelectedRowCount
          density="compact"
          onRowDoubleClick={(p)=>startFromTemplate(p.row)}
        />
      </div>

      <Menu anchorEl={catAnchor} open={!!catAnchor} onClose={()=>setCatAnchor(null)}>
        {['All','Standard'].map(c => (
          <MenuItem key={c} selected={c===category} onClick={()=>{ setCategory(c); setCatAnchor(null); }}>{c}</MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default NewReportWizard;
