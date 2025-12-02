import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Switch, Paper, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Chip, Stack, Toolbar } from '@mui/material';
import leadSettingsService, { LeadFieldSetting } from '../../services/leadSettingsService';
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

const LeadFieldSettingsPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const role = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : ''));
  const canEdit = role === 'center-manager';
  const [settings, setSettings] = useState<LeadFieldSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

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
    try {
      await leadSettingsService.save(settings.map(({ key, visible, required }) => ({ key, visible, required })));
      const fresh = await leadSettingsService.list();
      setSettings(fresh);
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
      <Typography variant="h5" sx={{ mb: 1 }}>Settings • Lead Fields</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Control which fields appear in the Lead form and which are required. Hidden fields are saved as null.
      </Typography>

      <Toolbar disableGutters sx={{ display: 'flex', gap: 2, mb: 1 }}>
        <TextField size="small" placeholder="Search fields" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ maxWidth: 300 }} />
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          <Button onClick={() => handleBulk('showAll')} disabled={!canEdit}>Show all</Button>
          <Button onClick={() => handleBulk('hideAll')} disabled={!canEdit}>Hide all</Button>
          <Button onClick={() => handleBulk('requireNone')} disabled={!canEdit}>Require none</Button>
          <Chip label="First/Last/Email/Mobile always required" size="small" color="info" variant="outlined" />
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
              <>
                <TableRow key={`h-${g.name}`}>
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
              </>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button variant="contained" onClick={handleSave} disabled={!canEdit || loading}>Save Changes</Button>
      </Box>
    </Box>
  );
};

export default LeadFieldSettingsPage;
