import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Switch, Paper, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Chip, Stack, Toolbar, Alert, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Settings as SettingsIcon, ViewColumn as ViewColumnIcon, FilterList as FilterListIcon, Assignment as AssignmentIcon } from '@mui/icons-material';
import leadSettingsService, { LeadFieldSetting, CenterFieldVisibility } from '../../services/leadSettingsService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const ALL_FIELDS: Array<{ key: string; label: string; lockRequired?: boolean }> = [
  // Identity & Contact
  { key: 'referenceNo', label: 'Registration / Reference No', lockRequired: true },
  { key: 'firstName', label: 'First Name', lockRequired: true },
  { key: 'lastName', label: 'Last Name', lockRequired: true },
  { key: 'email', label: 'Email ID', lockRequired: true },
  { key: 'emailVerified', label: 'Email Verified' },
  { key: 'mobileNumber', label: 'Mobile Number', lockRequired: true },
  { key: 'alternateNumber', label: 'Alternate Number' },
  { key: 'mobileVerified', label: 'Mobile Verified' },
  { key: 'whatsappNumber', label: 'WhatsApp Number' },
  { key: 'whatsappVerified', label: 'WhatsApp Verified' },

  // Location & Demographics
  { key: 'locationCity', label: 'City' },
  { key: 'locationState', label: 'State' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'motherTongue', label: 'Mother Tongue' },

  // Education & Program
  { key: 'highestQualification', label: 'Highest Qualification' },
  { key: 'yearOfCompletion', label: 'Year of Completion' },
  { key: 'yearsOfExperience', label: 'Years of Experience' },
  { key: 'university', label: 'University' },
  { key: 'program', label: 'Program' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'batch', label: 'Batch' },

  // Business
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Title' },
  { key: 'industry', label: 'Industry' },
  { key: 'website', label: 'Website' },

  // Lead Meta
  { key: 'leadSource', label: 'Lead Source' },
  { key: 'leadSubSource', label: 'Lead Sub-source' },
  { key: 'createdFrom', label: 'Lead Created By (Source Notes)' },
  { key: 'leadStatus', label: 'Lead Status' },
  { key: 'leadSubStatus', label: 'Lead Sub-status' },
  { key: 'leadDescription', label: 'Lead Description' },
  { key: 'reasonDeadInvalid', label: 'Reason for Dead/Invalid' },
  { key: 'nextFollowUpAt', label: 'Next Follow-up (Date/Time)' },
  { key: 'comment', label: 'Comment' },

  // Audit & Computed
  { key: 'leadScorePercent', label: 'Lead Score (%)' },
  { key: 'dateEntered', label: 'Lead Created Date & Time' },
  { key: 'dateModified', label: 'Lead Last Modified' },

  // Ownership
  { key: 'assignedUserId', label: 'Lead Owner (User Id)' },
  { key: 'counselorName', label: 'Counselor Name' },
  { key: 'counselorCode', label: 'Counselor Code' },
];

const GROUPS: Array<{ name: string; keys: string[] }> = [
  { name: 'Identity', keys: ['referenceNo','firstName', 'lastName'] },
  { name: 'Contact', keys: ['email', 'emailVerified','mobileNumber', 'alternateNumber', 'mobileVerified', 'whatsappNumber','whatsappVerified'] },
  { name: 'Demographics', keys: ['locationCity', 'locationState', 'nationality', 'gender', 'dateOfBirth', 'motherTongue'] },
  { name: 'Education', keys: ['highestQualification', 'university', 'yearOfCompletion'] },
  { name: 'Program', keys: ['program', 'specialization', 'batch'] },
  { name: 'Work', keys: ['company', 'title', 'industry', 'yearsOfExperience', 'website'] },
  { name: 'Lead Meta', keys: ['leadSource', 'leadSubSource', 'createdFrom', 'leadStatus', 'leadSubStatus', 'leadDescription', 'reasonDeadInvalid', 'nextFollowUpAt', 'comment'] },
  { name: 'Audit', keys: ['leadScorePercent','dateEntered','dateModified'] },
  { name: 'Ownership', keys: ['assignedUserId','counselorName','counselorCode'] },
];

// Filter fields available for center-level visibility control
// Note: counselor, createdAt, isImportant are always enabled (core filters)
const FILTER_FIELDS: Array<{ key: string; label: string; alwaysEnabled?: boolean }> = [
  { key: 'leadStatus', label: 'Status' },
  { key: 'counselor', label: 'Counselor', alwaysEnabled: true },
  { key: 'leadSource', label: 'Source' },
  { key: 'industry', label: 'Industry' },
  { key: 'locationCity', label: 'City' },
  { key: 'locationState', label: 'State' },
  { key: 'createdAt', label: 'Created Date', alwaysEnabled: true },
  { key: 'isImportant', label: 'Important Only', alwaysEnabled: true },
];

// Column fields available for center-level visibility control
const COLUMN_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'referenceNo', label: 'Reference / Reg. No' },
  { key: 'name', label: 'Name' },
  { key: 'owner', label: 'Owner' },
  { key: 'counselor', label: 'Counselor' },
  { key: 'company', label: 'Company' },
  { key: 'leadStatus', label: 'Status' },
  { key: 'estimatedValue', label: 'Est. Value' },
  { key: 'leadSource', label: 'Source' },
  { key: 'expectedCloseDate', label: 'Expected Close' },
  { key: 'nextFollowUpAt', label: 'Next Follow-up' },
  { key: 'lastCallDisposition', label: 'Last Call Disposition' },
  { key: 'lastCallNotes', label: 'Last Call Notes' },
];

const LeadFieldSettingsPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const role = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : ''));
  const canEdit = role === 'center-manager';
  const [settings, setSettings] = useState<LeadFieldSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Center-level filter/column visibility state
  const [centerVisibility, setCenterVisibility] = useState<CenterFieldVisibility[]>([]);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilitySaveSuccess, setVisibilitySaveSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await leadSettingsService.list();
        setSettings(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch center-level visibility settings
  useEffect(() => {
    if (canEdit) {
      (async () => {
        setVisibilityLoading(true);
        try {
          const vis = await leadSettingsService.getCenterFieldVisibility();
          setCenterVisibility(vis || []);
        } finally {
          setVisibilityLoading(false);
        }
      })();
    }
  }, [canEdit]);

  // Helper to get visibility setting for a field
  const getVisibility = (fieldKey: string): { filterEnabled: boolean; columnEnabled: boolean } => {
    const setting = centerVisibility.find(s => s.key === fieldKey);
    return {
      filterEnabled: setting ? setting.filterEnabled : true,
      columnEnabled: setting ? setting.columnEnabled : true,
    };
  };

  // Update local visibility state
  const setVisibilityLocal = (fieldKey: string, patch: { filterEnabled?: boolean; columnEnabled?: boolean }) => {
    setCenterVisibility(prev => {
      const existing = prev.find(s => s.key === fieldKey);
      if (existing) {
        return prev.map(s => s.key === fieldKey ? { ...s, ...patch } : s);
      } else {
        return [...prev, { key: fieldKey, filterEnabled: true, columnEnabled: true, ...patch }];
      }
    });
  };

  // Save center visibility settings
  const handleSaveVisibility = async () => {
    setVisibilityLoading(true);
    setVisibilitySaveSuccess(false);
    try {
      // Collect all fields - if not in centerVisibility, they default to enabled
      const allFilterKeys = FILTER_FIELDS.map(f => f.key);
      const allColumnKeys = COLUMN_FIELDS.map(f => f.key);
      const allKeys = Array.from(new Set([...allFilterKeys, ...allColumnKeys]));
      
      const settings = allKeys.map(key => {
        const vis = getVisibility(key);
        return {
          key: key,
          filterEnabled: vis.filterEnabled,
          columnEnabled: vis.columnEnabled,
        };
      });
      
      const saved = await leadSettingsService.saveCenterFieldVisibility(settings);
      setCenterVisibility(saved);
      setVisibilitySaveSuccess(true);
      setTimeout(() => setVisibilitySaveSuccess(false), 3000);
    } finally {
      setVisibilityLoading(false);
    }
  };

  const map = useMemo(() => {
    const m = new Map<string, LeadFieldSetting>();
    settings.forEach(s => m.set(s.key, s));
    return m;
  }, [settings]);

  const setLocal = (key: string, patch: Partial<LeadFieldSetting>) => {
    setSettings(prev => prev.map(s => {
      if (s.key !== key) return s;
      let updated: LeadFieldSetting = { ...s, ...patch };
      // If required is true, ensure visible is true
      if (patch.required === true) updated.visible = true;
      // If visible is set to false, force required to false
      if (patch.visible === false) updated.required = false;
      return updated;
    }));
  };

  const handleBulk = (action: 'showAll' | 'hideAll' | 'requireNone') => {
    setSettings(prev => prev.map(s => {
      if (action === 'showAll') return { ...s, visible: true };
      if (action === 'hideAll') return { ...s, visible: false, required: ['firstName','lastName','email','mobileNumber'].includes(s.key) ? true : false };
      if (action === 'requireNone') return { ...s, required: ['firstName','lastName','email','mobileNumber'].includes(s.key) ? true : false };
      return s;
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      await leadSettingsService.save(settings.map(({ key, visible, required }) => ({ key, visible, required })));
      const fresh = await leadSettingsService.list();
      setSettings(fresh);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const filteredKeys = (keys: string[]) => keys.filter(k => {
    if (!query.trim()) return true;
    const label = ALL_FIELDS.find(f => f.key === k)?.label || k;
    return label.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <SettingsIcon color="primary" />
          Lead Field Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize how lead data is captured and displayed across your center
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          TabIndicatorProps={{
            sx: {
              backgroundColor: '#303030',
              height: 5,
              width: '60px !important',
              marginLeft: 'calc(25% - 30px)',
              borderRadius: '10px',
            },
          }}
          sx={{
            '& .MuiTab-root': {
              py: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
            },
          }}
        >
          <Tab
            icon={<AssignmentIcon />}
            iconPosition="start"
            label="Lead Form Fields"
            sx={{ gap: 1 }}
          />
          {canEdit && (
            <Tab
              icon={<ViewColumnIcon />}
              iconPosition="start"
              label="Leads Page Display"
              sx={{ gap: 1 }}
            />
          )}
        </Tabs>
      </Paper>

      {/* Tab 0: Lead Form Fields */}
      {activeTab === 0 && (
        <Box>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Form Field Visibility & Requirements</Typography>
              <Typography variant="body2" color="text.secondary">
                Control which fields appear in the Lead form and which are required. Hidden fields are saved as null.
              </Typography>
            </CardContent>
          </Card>

          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>Lead form field settings saved successfully!</Alert>
          )}

          <Toolbar disableGutters sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <TextField size="small" placeholder="Search fields..." value={query} onChange={(e) => setQuery(e.target.value)} sx={{ maxWidth: 300 }} />
            <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
              <Button variant="outlined" size="small" onClick={() => handleBulk('showAll')} disabled={!canEdit}>Show all</Button>
              <Button variant="outlined" size="small" onClick={() => handleBulk('hideAll')} disabled={!canEdit}>Hide all</Button>
              <Button variant="outlined" size="small" onClick={() => handleBulk('requireNone')} disabled={!canEdit}>Require none</Button>
            </Stack>
          </Toolbar>

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '40%' }}>Field</TableCell>
                  <TableCell align="center">Visible</TableCell>
                  <TableCell align="center">Required</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {GROUPS.map((g) => (
                  <Fragment key={g.name}>
                    <TableRow>
                      <TableCell colSpan={3} sx={{ bgcolor: 'action.hover', fontWeight: 600 }}>{g.name}</TableCell>
                    </TableRow>
                    {filteredKeys(g.keys).map((key) => {
                      const meta = ALL_FIELDS.find(f => f.key === key)!;
                      const s = map.get(key) || { key, visible: true, required: false } as LeadFieldSetting;
                      const locked = !!meta.lockRequired;
                      return (
                        <TableRow key={key} hover>
                          <TableCell>
                            <Typography variant="body2">{meta.label}</Typography>
                            {locked && <Typography variant="caption" color="text.secondary">Always required</Typography>}
                          </TableCell>
                          <TableCell align="center">
                            <Switch checked={!!s.visible} onChange={(e) => setLocal(key, { visible: e.target.checked })} disabled={!canEdit || locked} />
                          </TableCell>
                          <TableCell align="center">
                            <Switch checked={locked ? true : !!s.required} onChange={(e) => setLocal(key, { required: e.target.checked })} disabled={!canEdit || locked} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" size="large" onClick={handleSave} disabled={!canEdit || loading}>
              Save Form Field Settings
            </Button>
          </Box>
        </Box>
      )}

      {/* Tab 1: Leads Page Display (Filter & Column Visibility) - Only for Center Manager */}
      {activeTab === 1 && canEdit && (
        <Box>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Leads Page • Filter & Column Visibility</Typography>
              <Typography variant="body2" color="text.secondary">
                Control which filters and columns are available on the Leads page. These settings apply to you and all counselors in your center.
              </Typography>
            </CardContent>
          </Card>

          {visibilitySaveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>Filter & column settings saved successfully!</Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {/* Filter Visibility */}
            <Paper variant="outlined" sx={{ flex: 1 }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Filter Fields</Typography>
                <Chip label={`${FILTER_FIELDS.filter(f => f.alwaysEnabled || getVisibility(f.key).filterEnabled).length}/${FILTER_FIELDS.length} enabled`} size="small" sx={{ ml: 'auto' }} />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Filter</TableCell>
                    <TableCell align="center" sx={{ width: 100 }}>Enabled</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {FILTER_FIELDS.map((field) => {
                    const vis = getVisibility(field.key);
                    const isAlwaysEnabled = field.alwaysEnabled === true;
                    return (
                      <TableRow key={field.key} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {field.label}
                            {isAlwaysEnabled && (
                              <Chip
                                label="Always shown"
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={isAlwaysEnabled || vis.filterEnabled}
                            onChange={(e) => setVisibilityLocal(field.key, { filterEnabled: e.target.checked })}
                            disabled={visibilityLoading || isAlwaysEnabled}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>

            {/* Column Visibility */}
            <Paper variant="outlined" sx={{ flex: 1 }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ViewColumnIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Column Fields</Typography>
                <Chip label={`${COLUMN_FIELDS.filter(f => getVisibility(f.key).columnEnabled).length}/${COLUMN_FIELDS.length} enabled`} size="small" sx={{ ml: 'auto' }} />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Column</TableCell>
                    <TableCell align="center" sx={{ width: 100 }}>Enabled</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {COLUMN_FIELDS.map((field) => {
                    const vis = getVisibility(field.key);
                    const isNameField = field.key === 'name';
                    return (
                      <TableRow key={field.key} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {field.label}
                            {isNameField && <Chip label="Always shown" size="small" variant="outlined" color="info" />}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={vis.columnEnabled}
                            onChange={(e) => setVisibilityLocal(field.key, { columnEnabled: e.target.checked })}
                            disabled={visibilityLoading || isNameField}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="contained" size="large" onClick={handleSaveVisibility} disabled={visibilityLoading}>
              Save Display Settings
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default LeadFieldSettingsPage;
