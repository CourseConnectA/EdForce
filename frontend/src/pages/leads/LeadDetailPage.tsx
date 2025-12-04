import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography, Button, Grid, Paper, Chip, Stack, Divider, TextField, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, TableContainer, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Phone as PhoneIcon } from '@mui/icons-material';
import { RootState } from '../../store/store';
import leadSettingsService, { LeadFieldSetting } from '../../services/leadSettingsService';
import leadsService, { Lead } from '../../services/leadsService';
import { GLOBAL_LEAD_STATUSES, LEAD_SUB_STATUS_BY_STATUS, getFollowUpMaxDate } from '../../constants/leadStatus';
import callsService, { CallLog } from '@/services/callsService';
import webSocketService from '@/services/webSocketService';

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2">{value || '-'}</Typography>
  </Box>
);

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const titleCase = (input: string | null | undefined) => {
  if (!input) return '';
  return input
    .toString()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const deriveStatusColor = (
  status?: string | null,
): 'default' | 'success' | 'error' | 'warning' => {
  const value = String(status || '').toLowerCase();
  if (!value) return 'default';
  if (['connected', 'answered', 'completed'].includes(value)) return 'success';
  if (['missed', 'failed', 'not connected', 'no answer', 'busy'].includes(value)) return 'error';
  if (['follow-up', 'scheduled', 'retry'].includes(value)) return 'warning';
  return 'default';
};

const LeadDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const userRole = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();
  const canEditStages = userRole === 'counselor' || userRole === 'center-manager'; // Counselors and Center Managers can edit status/substatus
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<LeadFieldSetting[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  // Inline edit state for key fields
  const [editStatus, setEditStatus] = useState<string>('');
  const [editSubStatus, setEditSubStatus] = useState<string>('');
  const [editNextFollowUpAt, setEditNextFollowUpAt] = useState<string>(''); // yyyy-MM-ddThh:mm
  const [editLeadDescription, setEditLeadDescription] = useState<string>('');
  const [editComment, setEditComment] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const loadCallLogs = useCallback(async () => {
    if (!id) return;
    try {
      const logs = await callsService.getCallLogsForLead(id);
      setCallLogs(Array.isArray(logs) ? logs : []);
    } catch (error) {
      console.error('Failed to load call logs:', error);
      setCallLogs([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const s = await leadSettingsService.list();
        setSettings(s || []);
        const data = await leadsService.getLead(id);
        setLead(data);
        // Initialize edit fields
        setEditStatus(String(data?.leadStatus || ''));
        setEditSubStatus(String((data as any)?.leadSubStatus || ''));
        if (data?.nextFollowUpAt) {
          const d = new Date(data.nextFollowUpAt);
          const toLocalInput = (x: Date) => {
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
          };
          setEditNextFollowUpAt(toLocalInput(d));
        } else {
          setEditNextFollowUpAt('');
        }
        setEditLeadDescription(String((data as any)?.leadDescription || ''));
        setEditComment(String((data as any)?.comment || ''));
        const hist = await leadsService.getLeadHistory(id);
        setHistory(Array.isArray(hist) ? hist : []);
        await loadCallLogs();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, loadCallLogs]);

  useEffect(() => {
    const handleCallLogged = (payload: any) => {
      if (!payload || payload.leadId !== id) return;
      loadCallLogs();
    };

    webSocketService.on('call:logged', handleCallLogged);
    return () => {
      webSocketService.off('call:logged', handleCallLogged);
    };
  }, [id, loadCallLogs]);

  useEffect(() => {
    if (!id) return;

    const handleLeadMutation = async (payload: any) => {
      const targetId = payload?.id || payload?.leadId || payload?.lead?.id;
      if (targetId !== id) return;
      try {
        const refreshed = await leadsService.getLead(id);
        setLead(refreshed);
      } catch (error) {
        console.error('Failed to refresh lead after socket event:', error);
      }
    };

    const handleLeadDeleted = (payload: any) => {
      if (payload?.id === id) {
        navigate('/leads');
      }
    };

    webSocketService.on('lead:updated', handleLeadMutation);
    webSocketService.on('lead:assigned', handleLeadMutation);
    webSocketService.on('lead:deleted', handleLeadDeleted);

    return () => {
      webSocketService.off('lead:updated', handleLeadMutation);
      webSocketService.off('lead:assigned', handleLeadMutation);
      webSocketService.off('lead:deleted', handleLeadDeleted);
    };
  }, [id, navigate]);

  const subStatusOptions = useMemo(() => LEAD_SUB_STATUS_BY_STATUS[editStatus] || [], [editStatus]);
  const followUpMax = useMemo(() => getFollowUpMaxDate(editStatus), [editStatus]);
  const minDateTime = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }, []);
  const maxDateTime = useMemo(() => {
    if (!followUpMax) return undefined;
    const d = followUpMax;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [followUpMax]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Clamp nextFollowUpAt within allowed window
      let nextAt: Date | undefined;
      if (editNextFollowUpAt) {
        const picked = new Date(editNextFollowUpAt);
        const now = new Date();
        let clamped = picked < now ? now : picked;
        const max = getFollowUpMaxDate(editStatus);
        if (max && clamped > max) clamped = max;
        nextAt = clamped;
      }
      const updatedLead = await leadsService.updateLead(id, {
        leadStatus: editStatus || undefined,
        leadSubStatus: editSubStatus || undefined,
        nextFollowUpAt: nextAt ? nextAt.toISOString() : undefined,
        leadDescription: editLeadDescription,
        comment: editComment,
      } as any);
      // Update local state immediately
      setLead(updatedLead);
      console.log('✅ Lead updated successfully:', updatedLead);
      // Show success message
      alert('Lead updated successfully!');
      // Navigate back to leads list after successful save
      setTimeout(() => navigate('/leads'), 500);
    } finally {
      setSaving(false);
    }
  };

  if (!id) return null;

  return (
    <Box sx={{ p: 3 }}>
      {loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Loading lead…</Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Lead Details</Typography>
        {lead?.leadStatus && (
          <Chip label={lead.leadStatus} size="small" color={lead.leadStatus === 'Converted' ? 'success' : 'default'} />
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={() => navigate('/leads')}>Back to Leads</Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Field label="Reference / Registration No" value={lead?.referenceNo} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Field label="Lead Owner" value={lead?.ownerUsername || '-'} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Field label="Counselor Name" value={lead?.counselorName} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Field label="Counselor Username" value={lead?.counselorCode} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Field label="Lead Last Modified" value={lead?.dateModified ? new Date(lead.dateModified).toLocaleString() : '-'} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Field label="Lead Created" value={lead?.dateEntered ? new Date(lead.dateEntered).toLocaleString() : '-'} />
          </Grid>
        </Grid>
      </Paper>

      {/* Transfer History */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Lead Transfer History</Typography>
        {history.filter(h => h.action === 'assignment' || h.action === 'owner_change').length === 0 ? (
          <Typography variant="body2" color="text.secondary">No transfer history yet.</Typography>
        ) : (
          <Box>
            {history
              .filter(h => h.action === 'assignment' || h.action === 'owner_change')
              .map((h, idx) => {
                const when = new Date(h.changedAt || h.dateEntered || Date.now()).toLocaleString();
                const fromLabel = h?.fromUser?.label || h?.fromUser?.userName || h?.fromValue?.assignedUserId || '';
                const toLabel = h?.toUser?.label || h?.toUser?.userName || h?.toValue?.assignedUserId || '';
                return (
                  <Box key={idx} sx={{ py: 1 }}>
                    <Typography variant="body2">
                      {h.action === 'assignment' ? 'Assigned' : 'Owner changed'} → <strong>{toLabel || '-'}</strong>
                      {fromLabel ? (
                        <Typography component="span" variant="caption" color="text.secondary">{` (from ${fromLabel})`}</Typography>
                      ) : null}
                      <Typography component="span" variant="caption" color="text.secondary">{` — ${when}`}</Typography>
                    </Typography>
                    {idx < history.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                );
              })}
          </Box>
        )}
      </Paper>

      {/* Call Details / History */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <PhoneIcon fontSize="small" />
          <Typography variant="subtitle1">Call Details</Typography>
        </Stack>
        {!callLogs || callLogs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No call history yet.</Typography>
        ) : isMobile ? (
          <Stack spacing={1.5}>
            {callLogs.map((log) => {
              const roleLabel = titleCase(log.userRoleLabel || log.userRole) || '-';
              return (
                <Paper key={log.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">{new Date(log.startTime).toLocaleString()}</Typography>
                      <Chip
                        label={log.status || log.disposition || '-'}
                        size="small"
                        color={deriveStatusColor(log.status || log.disposition)}
                      />
                    </Stack>
                    <Typography variant="body2"><strong>Phone:</strong> {log.phoneNumber}</Typography>
                    <Typography variant="body2"><strong>Duration:</strong> {formatDuration(log.duration)}</Typography>
                    <Typography variant="body2"><strong>Team Member:</strong> {log.userName || '-'}</Typography>
                    <Typography variant="body2"><strong>Role:</strong> {roleLabel}</Typography>
                    {log.notes ? (
                      <Typography variant="body2" color="text.secondary">Notes: {log.notes}</Typography>
                    ) : null}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Team Member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {callLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.startTime).toLocaleString()}</TableCell>
                    <TableCell>{log.phoneNumber}</TableCell>
                    <TableCell>{formatDuration(log.duration)}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.status || log.disposition || '-'}
                        size="small"
                        color={deriveStatusColor(log.status || log.disposition)}
                      />
                    </TableCell>
                    <TableCell>{log.userName || '-'}</TableCell>
                    <TableCell>{titleCase(log.userRoleLabel || log.userRole) || '-'}</TableCell>
                    <TableCell>
                      {log.notes ? (
                        <Tooltip title={log.notes} arrow>
                          <Typography
                            variant="body2"
                            sx={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {log.notes}
                          </Typography>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Lead Stages</Typography>
        {!canEditStages && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Status and sub-status can only be changed by counselors
          </Typography>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField 
              select={canEditStages} 
              label="Status" 
              fullWidth 
              value={editStatus} 
              onChange={(e) => { setEditStatus(String(e.target.value)); setEditSubStatus(''); }}
              disabled={!canEditStages}
              InputProps={{ readOnly: !canEditStages }}
            >
              <MenuItem value="">Select</MenuItem>
              {GLOBAL_LEAD_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField 
              select={canEditStages} 
              label="Sub-status" 
              fullWidth 
              value={editSubStatus} 
              onChange={(e) => setEditSubStatus(String(e.target.value))} 
              disabled={!canEditStages || !editStatus}
              InputProps={{ readOnly: !canEditStages }}
            >
              <MenuItem value="">Select</MenuItem>
              {subStatusOptions.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Next Follow-up"
              type="datetime-local"
              fullWidth
              value={editNextFollowUpAt}
              onChange={(e) => setEditNextFollowUpAt(e.target.value)}
              placeholder=""
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: minDateTime, ...(maxDateTime ? { max: maxDateTime } : {}) }}
              helperText={followUpMax ? `Allowed until ${new Date(followUpMax).toLocaleString()} for status "${editStatus}"` : undefined}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Lead Description" value={editLeadDescription} onChange={(e) => setEditLeadDescription(e.target.value)} fullWidth multiline minRows={2} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Comment" value={editComment} onChange={(e) => setEditComment(e.target.value)} fullWidth multiline minRows={2} />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>Save Changes</Button>
              <Button variant="text" onClick={() => navigate('/leads')}>Back</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>All Enabled Fields</Typography>
        <Grid container spacing={2}>
          {settings
            .filter((s) => s.visible)
            .filter((s) => ![
              'referenceNo',
              'dateEntered',
              'dateModified',
              'counselorName',
              'counselorCode',
              'leadStatus',
              'leadSubStatus',
              'nextFollowUpAt',
              'assignedUserId',
            ].includes(s.key))
            .map((s) => {
              const labels: Record<string,string> = {
                referenceNo: 'Reference / Registration No',
                firstName: 'First Name',
                lastName: 'Last Name',
                email: 'Email',
                mobileNumber: 'Mobile Number',
                alternateNumber: 'Alternate Number',
                whatsappNumber: 'WhatsApp Number',
                locationCity: 'City',
                locationState: 'State',
                nationality: 'Nationality',
                gender: 'Gender',
                dateOfBirth: 'Date of Birth',
                motherTongue: 'Mother Tongue',
                highestQualification: 'Highest Qualification',
                yearOfCompletion: 'Year of Completion',
                yearsOfExperience: 'Years of Experience',
                university: 'University',
                program: 'Program',
                specialization: 'Specialization',
                batch: 'Batch',
                company: 'Company',
                title: 'Title',
                industry: 'Industry',
                website: 'Website',
                leadSource: 'Lead Source',
                leadSubSource: 'Lead Sub-source',
                createdFrom: 'Created From',
                leadStatus: 'Status',
                leadSubStatus: 'Sub-status',
                leadDescription: 'Lead Description',
                reasonDeadInvalid: 'Reason Dead / Invalid',
                nextFollowUpAt: 'Next Follow-up',
                comment: 'Comment',
                leadScorePercent: 'Lead Score (%)',
                assignedUserId: 'Lead Owner (User Id)',
              };
              const key = s.key as keyof Lead;
              let value: any = lead ? (lead as any)[key] : undefined;
              if (key === 'dateOfBirth' && value) value = new Date(value).toLocaleDateString();
              if (key === 'nextFollowUpAt' && value) value = new Date(value).toLocaleString();
              if (typeof value === 'boolean') value = value ? 'Yes' : 'No';
              return (
                <Grid key={s.key} item xs={12} sm={6} md={4}>
                  <Field label={labels[s.key] || s.key} value={value} />
                </Grid>
              );
            })}
        </Grid>
      </Paper>
    </Box>
  );
};

export default LeadDetailPage;
