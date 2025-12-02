import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
} from '@mui/material';
import whatsappService from '../../services/whatsappService';
import PhonePreview from '../../components/whatsapp/PhonePreview';
import { WHATSAPP_TEMPLATES, getTemplateByName, extractPlaceholderIndexes } from '../../templates/whatsappTemplates';
import leadsService, { Lead } from '../../services/leadsService';
import contactsService, { Contact } from '../../services/contactsService';
import opportunitiesService, { Opportunity } from '../../services/opportunitiesService';

type ModuleType = 'Leads' | 'Contacts' | 'Opportunities';

type SegmentKey =
  | 'all'
  | 'hot_leads'
  | 'new_leads'
  | 'recent_contacts'
  | 'with_mobile'
  | 'open_opps';

type VariableMapping = Record<number, { field: string; fallback?: string }>;

const fieldOptions: Record<ModuleType, { value: string; label: string }[]> = {
  Leads: [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'company', label: 'Company' },
    { value: 'phoneMobile', label: 'Phone Mobile' },
  ],
  Contacts: [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'account.name', label: 'Account Name' },
    { value: 'phoneMobile', label: 'Phone Mobile' },
  ],
  Opportunities: [
    { value: 'contact.firstName', label: 'Contact First Name' },
    { value: 'contact.lastName', label: 'Contact Last Name' },
    { value: 'name', label: 'Opportunity Name' },
    { value: 'account.name', label: 'Account Name' },
  ],
};

function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
}

const steps = ['Provide a campaign name', 'Who will receive this campaign', 'Choose a template', 'Schedule your campaign'];

const WhatsAppPage: React.FC = () => {
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // Step 1
  const [campaignName, setCampaignName] = useState('');

  // Step 2
  const [moduleType, setModuleType] = useState<ModuleType>('Leads');
  const [segment, setSegment] = useState<SegmentKey>('all');
  const [recipientsNumbers, setRecipientsNumbers] = useState<string[]>([]);

  // Step 3
  const [templateName, setTemplateName] = useState<string>('welcome_message_image');
  const [language, setLanguage] = useState('en_US');
  const selectedTemplate = useMemo(() => getTemplateByName(templateName), [templateName]);
  const placeholderIndexes = useMemo(() => extractPlaceholderIndexes(selectedTemplate?.body || ''), [selectedTemplate]);
  const [variableMapping, setVariableMapping] = useState<VariableMapping>({});
  const [headerImageUrl, setHeaderImageUrl] = useState(''); // for sending
  const [headerPreview, setHeaderPreview] = useState<string | undefined>(selectedTemplate?.header?.sampleImageUrl);

  // Step 4
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleAt, setScheduleAt] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audience fetching based on module/segment
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let numbers: string[] = [];
        if (moduleType === 'Leads') {
          const { data } = await leadsService.getLeads({ limit: 1000 });
          let items = data;
          if (segment === 'hot_leads') items = items.filter(l => ['Assigned', 'In Process'].includes(l.leadStatus || ''));
          if (segment === 'new_leads') items = items.filter(l => (l.leadStatus || '') === 'New');
          // choose best phone: mobile > alternate
          numbers = items
            .map(l => l.mobileNumber || l.alternateNumber || '')
            .filter(Boolean)
            .map(n => n.replace(/\D/g, ''));
        } else if (moduleType === 'Contacts') {
          const { data } = await contactsService.getContacts({ limit: 1000 });
          let items = data;
          if (segment === 'recent_contacts') {
            const thirty = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            items = items.filter(c => now - new Date(c.dateEntered).getTime() <= thirty);
          }
          if (segment === 'with_mobile') {
            items = items.filter(c => !!c.phoneMobile);
          }
          numbers = items
            .map(c => c.phoneMobile || c.phoneWork || c.phoneHome || '')
            .filter(Boolean)
            .map(n => n.replace(/\D/g, ''));
        } else if (moduleType === 'Opportunities') {
          const { data } = await opportunitiesService.getOpportunities({ limit: 500 });
          let items = data;
          if (segment === 'open_opps') {
            const closed = new Set(['Closed Won', 'Closed Lost']);
            items = items.filter(o => !closed.has(o.salesStage));
          }
          // fetch contact phone per opportunity if missing on object (we only have names here)
          const contactsMap = new Map<string, Contact>();
          numbers = [];
          for (const o of items) {
            const cid = o.contact?.id;
            if (!cid) continue;
            if (!contactsMap.has(cid)) {
              try {
                const c = await contactsService.getContact(cid);
                contactsMap.set(cid, c as any);
              } catch {
                // ignore fetch errors per contact
              }
            }
            const c = contactsMap.get(cid);
            if (c) {
              const n = (c.phoneMobile || c.phoneWork || c.phoneHome || '').replace(/\D/g, '');
              if (n) numbers.push(n);
            }
          }
        }
        // de-duplicate
        numbers = Array.from(new Set(numbers));
        setRecipientsNumbers(numbers);
      } catch (e: any) {
        setError(e?.message || 'Failed to load audience');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [moduleType, segment]);

  useEffect(() => {
    // reset header preview to template default when template changes
    setHeaderPreview(selectedTemplate?.header?.sampleImageUrl);
    setLanguage(selectedTemplate?.language || 'en_US');
    setVariableMapping({});
  }, [selectedTemplate]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setHeaderPreview(url);
  };

  const mappedBodyForPreview = useMemo(() => {
    let text = selectedTemplate?.body || '';
    // Build a fake sample object for preview
    const sample: any =
      moduleType === 'Leads'
        ? ({ firstName: 'John', lastName: 'Doe', company: 'Acme Inc.' } as Partial<Lead>)
        : moduleType === 'Contacts'
        ? ({ firstName: 'Jane', lastName: 'Smith', account: { name: 'Acme Inc.' } } as Partial<Contact>)
        : ({ name: 'Deal ABC', contact: { firstName: 'Priya', lastName: 'K' }, account: { name: 'Acme Inc.' } } as Partial<Opportunity>);

    for (const idx of placeholderIndexes) {
      const mapping = variableMapping[idx];
      const value = mapping ? getValueByPath(sample, mapping.field) : undefined;
      text = text.replace(new RegExp(`\\{\\{${idx}\\}\\}`, 'g'), String(value || mapping?.fallback || ''));
    }
    return text;
  }, [selectedTemplate, variableMapping, placeholderIndexes, moduleType]);

  const onSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      if (!selectedTemplate) throw new Error('Select a template');
      // For demo: we send same variables for all recipients using fallback/mapping unavailable at runtime.
      // If you want per-recipient personalization, extend backend to accept mapping and resolve server-side.
      const orderedVars = placeholderIndexes.map(i => variableMapping[i]?.fallback || '');
      const res = await whatsappService.send({
        templateName: selectedTemplate.name,
        language,
        variables: orderedVars,
        recipients: recipientsNumbers,
        mediaUrl: headerImageUrl || undefined,
        scheduleAt: scheduleMode === 'later' ? scheduleAt : undefined,
      });
      setResult(`Queued ${res?.queued || 0} messages`);
      setActiveStep(0);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        WhatsApp Campaign
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Send approved WhatsApp template messages. Pick a module, choose a segment, select a template, and schedule.
      </Typography>
      {result && <Alert severity="success" sx={{ mb: 2 }}>{result}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map(label => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* Step 1 */}
      {activeStep === 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField fullWidth label="Campaign Name" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => setActiveStep(1)} disabled={!campaignName.trim()}>Next</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {activeStep === 1 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="module-label">Choose a Module</InputLabel>
                  <Select labelId="module-label" label="Choose a Module" value={moduleType} onChange={(e) => setModuleType(e.target.value as ModuleType)}>
                    <MenuItem value={'Leads'}>Leads</MenuItem>
                    <MenuItem value={'Contacts'}>Contacts</MenuItem>
                    <MenuItem value={'Opportunities'}>Opportunities</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="segment-label">Recipients Segment</InputLabel>
                  <Select labelId="segment-label" label="Recipients Segment" value={segment} onChange={(e) => setSegment(e.target.value as SegmentKey)}>
                    <MenuItem value={'all'}>All</MenuItem>
                    {moduleType === 'Leads' && [
                      <MenuItem key="hot" value={'hot_leads'}>Hot Leads</MenuItem>,
                      <MenuItem key="new" value={'new_leads'}>New Leads</MenuItem>,
                    ]}
                    {moduleType === 'Contacts' && [
                      <MenuItem key="recent" value={'recent_contacts'}>Recent Contacts</MenuItem>,
                      <MenuItem key="with_mobile" value={'with_mobile'}>With Mobile Number</MenuItem>,
                    ]}
                    {moduleType === 'Opportunities' && [
                      <MenuItem key="open" value={'open_opps'}>Open Opportunities</MenuItem>,
                    ]}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Alert severity={recipientsNumbers.length ? 'info' : 'warning'}>
                  {recipientsNumbers.length ? `${recipientsNumbers.length} recipients selected` : 'No recipients found for this segment. Adjust filters.'}
                </Alert>
              </Grid>
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)}>Back</Button>
              <Button variant="contained" onClick={() => setActiveStep(2)} disabled={!recipientsNumbers.length}>Next</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {activeStep === 2 && selectedTemplate && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="tpl-label">Templates</InputLabel>
                      <Select labelId="tpl-label" label="Templates" value={templateName} onChange={(e) => setTemplateName(e.target.value)}>
                        {WHATSAPP_TEMPLATES.map(t => (
                          <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {selectedTemplate.header?.type === 'IMAGE' && (
                    <>
                      <Grid item xs={12} md={8}>
                        <TextField fullWidth label="Header Image URL (for sending)" value={headerImageUrl} onChange={e => setHeaderImageUrl(e.target.value)} placeholder="https://..." />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Button component="label" variant="outlined" fullWidth>
                          Choose JPG or PNG File
                          <input hidden accept="image/*" type="file" onChange={handleFileChange} />
                        </Button>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Body</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>{selectedTemplate.body}</Typography>
                  </Grid>

                  {placeholderIndexes.map((idx) => (
                    <Grid key={idx} item xs={12} container spacing={1} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField value={`{{ ${idx} }}`} label={`Variable ${idx}`} InputProps={{ readOnly: true }} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <FormControl fullWidth>
                          <InputLabel id={`map-${idx}`}>Map to</InputLabel>
                          <Select
                            labelId={`map-${idx}`}
                            label="Map to"
                            value={variableMapping[idx]?.field || ''}
                            onChange={(e) =>
                              setVariableMapping(prev => ({ ...prev, [idx]: { field: String(e.target.value), fallback: prev[idx]?.fallback } }))
                            }
                          >
                            {fieldOptions[moduleType].map(o => (
                              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField fullWidth label="Fallback Value" value={variableMapping[idx]?.fallback || ''} onChange={(e) => setVariableMapping(prev => ({ ...prev, [idx]: { field: prev[idx]?.field || '', fallback: e.target.value } }))} />
                      </Grid>
                    </Grid>
                  ))}

                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Footer" value={selectedTemplate.footer || ''} InputProps={{ readOnly: true }} />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Language Code" value={language} onChange={e => setLanguage(e.target.value)} helperText="e.g., en_US" />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button variant="outlined" onClick={() => setActiveStep(1)}>Back</Button>
                  <Button variant="contained" onClick={() => setActiveStep(3)}>Next</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Preview</Typography>
            <PhonePreview
              headerType={selectedTemplate.header?.type === 'IMAGE' ? 'IMAGE' : 'NONE'}
              headerImageUrl={headerPreview}
              body={mappedBodyForPreview}
              footer={selectedTemplate.footer}
              buttons={(selectedTemplate.buttons || []).map(b => ({ text: b.text }))}
            />
          </Grid>
        </Grid>
      )}

      {/* Step 4 */}
      {activeStep === 3 && (
        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl>
                  <RadioGroup row value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as any)}>
                    <FormControlLabel value="now" control={<Radio />} label="Send Immediately" />
                    <FormControlLabel value="later" control={<Radio />} label="Schedule Date/ Time" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              {scheduleMode === 'later' && (
                <Grid item xs={12} md={6}>
                  <TextField fullWidth type="datetime-local" label="Schedule At" InputLabelProps={{ shrink: true }} value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} />
                </Grid>
              )}
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(2)}>Back</Button>
              <Button variant="contained" onClick={onSubmit} disabled={loading || !selectedTemplate || !recipientsNumbers.length}>
                {loading ? 'Submitting…' : 'Queue Messages'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default WhatsAppPage;
