import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Alert, Stepper, Step, StepLabel, TextField, Button, Stack, Paper, Divider, Checkbox, FormControlLabel, CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import leadsService, { Lead } from '../../services/leadsService';
import marketingService from '../../services/marketingService';

const MarketingPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const derivedRole = (user as any)?.role || (Array.isArray((user as any)?.roles) ? (user as any).roles[0] : undefined) || ((user as any)?.isAdmin ? 'admin' : 'agent');
  const isAdminRole = ['admin','super-admin'].includes((derivedRole || '').toLowerCase()) || !!(user as any)?.isAdmin;

  if (!isAdminRole) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You don’t have access to Marketing Automation. Please contact your administrator.</Alert>
      </Box>
    );
  }

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Campaign', 'Audience', 'Email'];

  // Campaign
  const [campaignName, setCampaignName] = useState('New Campaign');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Audience
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  useEffect(() => {
    if (activeStep === 1) {
      setLoadingLeads(true);
      leadsService
        .getLeads({ page: 1, limit: 100, search })
        .then((resp) => setLeads(resp.data || []))
        .finally(() => setLoadingLeads(false));
    }
  }, [activeStep, search]);

  const toggleLead = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  // Batch
  const [batchId, setBatchId] = useState<string | null>(null);

  const handleNext = async () => {
    if (activeStep === 0) {
      // Create campaign
      const created = await marketingService.createCampaign({ name: campaignName, description: campaignDesc });
      setCampaignId(created?.id || null);
      setActiveStep(1);
      return;
    }
    if (activeStep === 1) {
      const chosen = leads.filter((l) => selected[l.id]);
      const items = chosen.map((l) => ({ leadId: l.id, payload: { email: l.email, firstName: l.firstName, lastName: l.lastName } }));
      const batch = await marketingService.createBatch({ name: `${campaignName} - ${new Date().toLocaleString()}`, campaignId, items });
      setBatchId(batch?.id || null);
      setActiveStep(2);
      return;
    }
  };

  const handleBack = () => setActiveStep((s) => Math.max(0, s - 1));

  // Email compose
  const [fromEmail, setFromEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<p>Hello {{firstName}},</p><p>We have an update for you.</p>');
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string>('');

  const sendNow = async () => {
    if (!batchId) return;
    setSending(true);
    setSentMsg('');
    try {
      const payload = { batchId, subject, html, from: fromEmail || undefined, scheduleAt: scheduleAt || null };
      const resp = await marketingService.sendEmailBatch(payload);
      setSentMsg(`Queued ${resp?.count ?? ''} emails${payload.scheduleAt ? ` for ${new Date(payload.scheduleAt).toLocaleString()}` : ''}.`);
    } catch (e: any) {
      setSentMsg(e?.message || 'Failed to queue emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Marketing Automation</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Create outreach automations for leads via Email and WhatsApp. Track opens, clicks, replies, and lead scores. Admin-only.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField label="Campaign name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} fullWidth />
            <TextField label="Description" value={campaignDesc} onChange={(e) => setCampaignDesc(e.target.value)} fullWidth multiline rows={3} />
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleNext} disabled={!campaignName.trim()}>Create & Next</Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField label="Search leads" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
              <Typography variant="body2" color="text.secondary">Selected: {selectedCount}</Typography>
            </Stack>
            <Divider />
            {loadingLeads ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
            ) : (
              <Box sx={{ maxHeight: 360, overflowY: 'auto', pr: 1 }}>
                {leads.map((l) => (
                  <Box key={l.id} sx={{ display: 'flex', alignItems: 'center', py: 0.5, borderBottom: '1px dashed #eee' }}>
                    <FormControlLabel
                      control={<Checkbox checked={!!selected[l.id]} onChange={() => toggleLead(l.id)} />}
                      label={`${l.firstName} ${l.lastName} · ${l.email || 'no email'}`}
                    />
                  </Box>
                ))}
              </Box>
            )}
            <Stack direction="row" spacing={2}>
              <Button onClick={handleBack}>Back</Button>
              <Button variant="contained" onClick={handleNext} disabled={!selectedCount}>Create Batch & Next</Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField label="From" placeholder="Sender email (optional)" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} fullWidth />
            <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
            <TextField label="HTML" value={html} onChange={(e) => setHtml(e.target.value)} fullWidth multiline minRows={6} />
            <TextField label="Schedule at" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <Stack direction="row" spacing={2}>
              <Button onClick={handleBack}>Back</Button>
              <Button variant="contained" onClick={sendNow} disabled={!subject.trim() || !html.trim() || sending}>{sending ? 'Queuing…' : 'Queue emails'}</Button>
            </Stack>
            {!!sentMsg && <Alert severity="info">{sentMsg}</Alert>}
            <Alert severity="info">Links in your HTML will be auto-wrapped for click tracking and an invisible open pixel will be injected.</Alert>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default MarketingPage;
