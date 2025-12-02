import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, List, ListItemButton, ListItemText, Grid, Paper, Chip, Stack, IconButton, Button, Tooltip, Divider, CircularProgress, Tab, Tabs } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon, Search as SearchIcon, CloudUpload as CloudUploadIcon, Undo as UndoIcon } from '@mui/icons-material';
import centerOptionsService, { OptionsMap } from '../../services/centerOptionsService';
import { GLOBAL_LEAD_STATUSES, LEAD_SUB_STATUS_BY_STATUS } from '../../constants/leadStatus';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const FIELDS: Array<{ key: string; label: string }> = [
  { key: 'gender', label: 'Gender' },
  { key: 'highestQualification', label: 'Highest Qualification' },
  { key: 'yearsOfExperience', label: 'Years of Experience' },
  { key: 'batch', label: 'Batch' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'motherTongue', label: 'Mother Tongue' },
  { key: 'locationState', label: 'State' },
  { key: 'locationCity', label: 'City' },
  { key: 'leadSource', label: 'Lead Source' },
  { key: 'leadSubSource', label: 'Lead Sub-source' },
  { key: 'createdFrom', label: 'Lead Created From' },
  { key: 'program', label: 'Program' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'university', label: 'University' },
  { key: 'yearOfCompletion', label: 'Year of Completion' },
  { key: 'leadStatus', label: 'Lead Status' },
  { key: 'leadSubStatus', label: 'Lead Sub-status' },
];

const SuperAdminCenterSettings: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const role = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : ''));
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'centers'|'bulk'>('centers');
  const [centers, setCenters] = useState<Array<{ centerName: string }>>([]);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optionsMap, setOptionsMap] = useState<OptionsMap>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [newValue, setNewValue] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);

  const canAccess = role === 'super-admin';

  const loadCenters = async (q?: string) => {
    setLoading(true);
    try {
      const list = await centerOptionsService.listCenters(q);
      setCenters(list);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async (center: string) => {
    setLoading(true);
    try {
      const map = await centerOptionsService.getCenterOptions(center);
      // Auto-sync leadStatus and leadSubStatus with global lists if missing or outdated
      const next: OptionsMap = { ...(map || {}) };
      // Desired lists
      const desiredStatuses = GLOBAL_LEAD_STATUSES;
      const desiredSubStatuses = Array.from(new Set(Object.values(LEAD_SUB_STATUS_BY_STATUS).flat()));
      const norm = (arr: string[] | undefined) => Array.from(new Set((arr || []).map(s => String(s)))).sort((a,b)=>a.localeCompare(b));
      let dirtyFlags: Record<string, boolean> = {};
      // Compare and update statuses
      if (JSON.stringify(norm(next['leadStatus'])) !== JSON.stringify(norm(desiredStatuses))) {
        next['leadStatus'] = [...desiredStatuses];
        dirtyFlags['leadStatus'] = true;
      }
      if (JSON.stringify(norm(next['leadSubStatus'])) !== JSON.stringify(norm(desiredSubStatuses))) {
        next['leadSubStatus'] = [...desiredSubStatuses];
        dirtyFlags['leadSubStatus'] = true;
      }
      setOptionsMap(next);
      if (Object.keys(dirtyFlags).length > 0) setDirty((prev) => ({ ...prev, ...dirtyFlags }));
      setDirty({});
      setNewValue({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCenters(); }, []);

  const addOption = (fieldKey: string) => {
    const val = (newValue[fieldKey] || '').trim();
    if (!val) return;
    // Prevent duplicates (case-insensitive)
    const existing = (optionsMap[fieldKey] || []);
    if (existing.some(v => v.toLowerCase() === val.toLowerCase())) {
      setNewValue((prev) => ({ ...prev, [fieldKey]: '' }));
      return;
    }
    setOptionsMap((prev) => ({ ...prev, [fieldKey]: [ ...(prev[fieldKey] || []), val ] }));
    setNewValue((prev) => ({ ...prev, [fieldKey]: '' }));
    setDirty((d) => ({ ...d, [fieldKey]: true }));
  };

  const deleteOption = (fieldKey: string, value: string) => {
    setOptionsMap((prev) => ({ ...prev, [fieldKey]: (prev[fieldKey] || []).filter((v) => v !== value) }));
    setDirty((d) => ({ ...d, [fieldKey]: true }));
  };

  const saveField = async (fieldKey: string) => {
    if (!selectedCenter) return;
    const list = optionsMap[fieldKey] || [];
    await centerOptionsService.updateCenterFieldOptions(selectedCenter, fieldKey, list);
    setDirty((d) => ({ ...d, [fieldKey]: false }));
  };

  const saveAllDirty = async () => {
    if (!selectedCenter) return;
    const changedKeys = Object.keys(dirty).filter(k => dirty[k]);
    if (changedKeys.length === 0) return;
    setSavingAll(true);
    try {
      for (const k of changedKeys) {
        const list = optionsMap[k] || [];
        await centerOptionsService.updateCenterFieldOptions(selectedCenter, k, list);
      }
      setDirty({});
    } finally {
      setSavingAll(false);
    }
  };

  const resetUnsaved = () => {
    if (!selectedCenter) return;
    loadOptions(selectedCenter);
  };

  if (!canAccess) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">Only Super Admin can access this section.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>Super Admin • Center Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Manage per-center dropdown option overrides used in Lead forms.</Typography>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab value="centers" label="Centers" />
        <Tab value="bulk" label="Bulk Import" />
      </Tabs>
      {activeTab === 'centers' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search centers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadCenters(search); }}
                InputProps={{ endAdornment: <IconButton aria-label="search" onClick={() => loadCenters(search)}><SearchIcon /></IconButton> }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={() => loadCenters(search)}>Refresh</Button>
                <Button size="small" variant="text" onClick={() => { setSearch(''); loadCenters(''); }}>Clear</Button>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ maxHeight: 520, overflowY: 'auto' }}>
              {loading && centers.length === 0 && (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
              )}
              <List dense>
                {centers.map((c) => (
                  <ListItemButton key={c.centerName} selected={selectedCenter === c.centerName} onClick={() => { setSelectedCenter(c.centerName); loadOptions(c.centerName); }}>
                    <ListItemText primary={c.centerName} />
                  </ListItemButton>
                ))}
                {centers.length === 0 && !loading && (
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" color="text.secondary">No centers matched.</Typography>
                  </Box>
                )}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={9}>
            {!selectedCenter ? (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">Select a center from the list to customize its options.</Typography>
              </Paper>
            ) : (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Editing: {selectedCenter}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Save all dirty fields">
                    <span>
                      <Button size="small" startIcon={<CloudUploadIcon />} disabled={savingAll || Object.keys(dirty).filter(k=>dirty[k]).length===0} onClick={saveAllDirty} variant="contained">{savingAll ? 'Saving...' : 'Save All'}</Button>
                    </span>
                  </Tooltip>
                  <Tooltip title="Discard unsaved changes">
                    <span>
                      <Button size="small" startIcon={<UndoIcon />} disabled={savingAll || Object.keys(dirty).filter(k=>dirty[k]).length===0} onClick={resetUnsaved}>Reset</Button>
                    </span>
                  </Tooltip>
                </Stack>
                <Grid container spacing={2}>
                  {FIELDS.map((f) => {
                    const values = optionsMap[f.key] || [];
                    return (
                      <Grid key={f.key} item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, position: 'relative', minHeight: 160 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>{f.label}</Typography>
                            {dirty[f.key] && (
                              <Tooltip title="Save changes to this field"><Button size="small" startIcon={<SaveIcon />} variant="contained" onClick={() => saveField(f.key)}>Save</Button></Tooltip>
                            )}
                          </Stack>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ maxHeight: 72, overflowY: 'auto', pb: 1 }}>
                            {values.map((val) => (
                              <Chip key={val} size="small" label={val} onDelete={() => deleteOption(f.key, val)} deleteIcon={<DeleteIcon />} />
                            ))}
                            {values.length === 0 && (
                              <Typography variant="caption" color="text.secondary">No options.</Typography>
                            )}
                          </Stack>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField fullWidth size="small" placeholder={`Add ${f.label} option`} value={newValue[f.key] || ''} onChange={(e) => setNewValue((p) => ({ ...p, [f.key]: e.target.value }))} onKeyDown={(e) => { if (e.key==='Enter'){ e.preventDefault(); addOption(f.key); }}} />
                            <Tooltip title="Add option"><span><IconButton aria-label="add" color="primary" onClick={() => addOption(f.key)} disabled={!newValue[f.key]?.trim()}><AddIcon /></IconButton></span></Tooltip>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>
      )}
      {activeTab === 'bulk' && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Bulk Import (Coming Soon)</Typography>
          <Typography variant="body2" color="text.secondary">You will be able to upload a CSV mapping centerName, fieldKey, optionValue to seed multiple option lists at once.</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Example columns: centerName, fieldKey, optionValue</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SuperAdminCenterSettings;
