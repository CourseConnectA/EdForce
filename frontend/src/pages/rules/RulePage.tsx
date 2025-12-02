import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, RadioGroup, FormControlLabel, Radio, Stack, TextField, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Select, MenuItem, InputLabel, FormControl, Chip } from '@mui/material';
import { format, differenceInMinutes } from 'date-fns';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import routingRulesService, { ActiveRule, RuleType } from '../../services/routingRulesService';
import leadsService from '../../services/leadsService';
import { apiService } from '../../services/apiService';
import PageHeader from '@/components/common/PageHeader';

const RulePage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const rawRole = String((user as any)?.role || '').toLowerCase();
  const isCenterManager = rawRole === 'center-manager';
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveRule | null>(null);
  const [openRunningDialog, setOpenRunningDialog] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity?: 'info'|'success'|'warning'|'error' }>({ open: false, message: '' });

  // Rule form state
  const [ruleType, setRuleType] = useState<RuleType>('round_robin');
  const [maxActive, setMaxActive] = useState<number>(30);
  const [endDateTime, setEndDateTime] = useState<string>('');
  const [programOptions, setProgramOptions] = useState<string[]>([]);
  const [languageOptions, setLanguageOptions] = useState<string[]>([]);
  const [counselors, setCounselors] = useState<Array<{ id: string; firstName: string; lastName: string; userName: string }>>([]);
  const [interestToCounselors, setInterestToCounselors] = useState<Record<string, string[]>>({});
  const [languageToCounselors, setLanguageToCounselors] = useState<Record<string, string[]>>({});

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        // center options for dropdowns
        const options = await apiService.get('/centers/options');
        const data = options?.data || options || {};
        setProgramOptions(Array.isArray(data.program) ? data.program : []);
        setLanguageOptions(Array.isArray(data.motherTongue) ? data.motherTongue : []);
        // counselors in center
        const list = await leadsService.listCounselors();
        setCounselors(list || []);
        // active rule
        const ar = await routingRulesService.getActive();
        setActive(ar);
        if (ar) {
          setRuleType(ar.ruleType);
          setMaxActive(ar?.config?.maxActiveLeadsPerCounselor ?? 30);
          setInterestToCounselors(ar?.config?.interestToCounselors || {});
          setLanguageToCounselors(ar?.config?.languageToCounselors || {});
          setEndDateTime(format(new Date(ar.activeUntil), "yyyy-MM-dd'T'HH:mm"));
          setOpenRunningDialog(true);
          const rem = differenceInMinutes(new Date(ar.activeUntil), new Date());
          setToast({ open: true, message: `Rule "${labelForType(ar.ruleType)}" active — ${rem <= 0 ? 'expires soon' : `~${rem} min left`}.`, severity: 'info' });
        } else {
          // default end time: tomorrow 6pm local
          const now = new Date();
          const def = new Date(now.getTime() + 24*60*60*1000);
          def.setHours(18,0,0,0);
          setEndDateTime(format(def, "yyyy-MM-dd'T'HH:mm"));
        }
      } catch (e: any) {
        setToast({ open: true, message: e?.message || 'Failed to load rule data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const labelForType = (t: RuleType) => t === 'round_robin' ? 'Smart Round-Robin with Availability' : 'Skill / Course-Match Routing';

  const canUse = isCenterManager;
  if (!canUse) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Rule</Typography>
        <Alert severity="warning">Only Center Managers can configure routing rules.</Alert>
      </Box>
    );
  }

  const handleStart = async () => {
    try {
      const payload: any = {
        ruleType,
        activeUntil: new Date(endDateTime).toISOString(),
        config: {
          maxActiveLeadsPerCounselor: maxActive,
        },
      };
      if (ruleType === 'skill_match') {
        payload.config.interestToCounselors = interestToCounselors;
        payload.config.languageToCounselors = languageToCounselors;
      }
  const ar = await routingRulesService.startRule(payload);
      setActive(ar);
      setOpenRunningDialog(false);
  const rem = differenceInMinutes(new Date(ar.activeUntil), new Date());
      setToast({ open: true, severity: 'success', message: `Started: ${labelForType(ar.ruleType)} — ~${rem} min left.` });
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to start rule' });
    }
  };

  const handleStop = async () => {
    try {
      await routingRulesService.stopRule();
      setActive(null);
      setOpenRunningDialog(false);
      setToast({ open: true, severity: 'success', message: 'Rule stopped.' });
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to stop rule' });
    }
  };

  // helpers for mapping edits
  const setInterestMap = (interest: string, counselorIds: string[]) => {
    setInterestToCounselors(prev => ({ ...prev, [interest]: counselorIds }));
  };
  const setLanguageMap = (lang: string, counselorIds: string[]) => {
    setLanguageToCounselors(prev => ({ ...prev, [lang]: counselorIds }));
  };

  return (
    <Box>
      <PageHeader
        title="Rule"
        subtitle="Configure temporary lead routing rules for your center. Rules apply to new leads created while active."
        actions={(
          <>
            {active && (
              <Button variant="outlined" color="error" onClick={handleStop}>Stop</Button>
            )}
          </>
        )}
      />

      {loading && <Alert severity="info">Loading…</Alert>}

      {!loading && (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Choose Rule</Typography>
              <RadioGroup row value={ruleType} onChange={(e) => setRuleType(e.target.value as RuleType)}>
                <FormControlLabel value="round_robin" control={<Radio />} label="Smart Round-Robin with Availability" />
                <FormControlLabel value="skill_match" control={<Radio />} label="Skill / Course-Match Routing" />
              </RadioGroup>

              {ruleType === 'round_robin' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="Max active leads per counselor"
                    type="number"
                    size="small"
                    value={maxActive}
                    onChange={(e) => setMaxActive(Math.max(1, parseInt(e.target.value || '0', 10) || 30))}
                  />
                  <TextField
                    label="Run until"
                    type="datetime-local"
                    size="small"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Button variant="contained" onClick={handleStart}>Start</Button>
                  {active && <Button variant="outlined" color="error" onClick={handleStop}>Stop</Button>}
                </Stack>
              )}

              {ruleType === 'skill_match' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Map Interests to Counselors</Typography>
                  <Stack spacing={2}>
                    {programOptions.map((p) => (
                      <Stack key={p} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Box sx={{ minWidth: 160 }}>
                          <Typography variant="body2" fontWeight={600}>{p}</Typography>
                        </Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Counselors</InputLabel>
                          <Select
                            multiple
                            label="Counselors"
                            value={interestToCounselors[p] || []}
                            onChange={(e) => setInterestMap(p, (e.target.value as string[]))}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((val) => {
                                  const c = counselors.find(x => x.id === val);
                                  const name = c ? (`${c.firstName} ${c.lastName}`.trim() || `@${c.userName}`) : val;
                                  return <Chip key={val} label={name} size="small" />;
                                })}
                              </Box>
                            )}
                          >
                            {counselors.map(c => (
                              <MenuItem key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`.trim() || c.userName} — @{c.userName}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    ))}
                  </Stack>

                  <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Map Languages to Counselors</Typography>
                  <Stack spacing={2}>
                    {languageOptions.map((lng) => (
                      <Stack key={lng} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Box sx={{ minWidth: 160 }}>
                          <Typography variant="body2" fontWeight={600}>{lng}</Typography>
                        </Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Counselors</InputLabel>
                          <Select
                            multiple
                            label="Counselors"
                            value={languageToCounselors[lng] || []}
                            onChange={(e) => setLanguageMap(lng, (e.target.value as string[]))}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((val) => {
                                  const c = counselors.find(x => x.id === val);
                                  const name = c ? (`${c.firstName} ${c.lastName}`.trim() || `@${c.userName}`) : val;
                                  return <Chip key={val} label={name} size="small" />;
                                })}
                              </Box>
                            )}
                          >
                            {counselors.map(c => (
                              <MenuItem key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`.trim() || c.userName} — @{c.userName}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    ))}
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      label="Max active leads per counselor"
                      type="number"
                      size="small"
                      value={maxActive}
                      onChange={(e) => setMaxActive(Math.max(1, parseInt(e.target.value || '0', 10) || 30))}
                    />
                    <TextField
                      label="Run until"
                      type="datetime-local"
                      size="small"
                      value={endDateTime}
                      onChange={(e) => setEndDateTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Button variant="contained" onClick={handleStart}>Start</Button>
                    {active && <Button variant="outlined" color="error" onClick={handleStop}>Stop</Button>}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Running rule dialog */}
      <Dialog open={openRunningDialog} onClose={() => setOpenRunningDialog(false)}>
        <DialogTitle>Rule already running</DialogTitle>
        <DialogContent>
          <Typography>
            {active ? `${labelForType(active.ruleType)} is currently active for your center.` : 'A rule is currently active for your center.'}
          </Typography>
          {active && (
            <Typography variant="caption" color="text.secondary">
              Ends at: {format(new Date(active.activeUntil), 'yyyy-MM-dd HH:mm')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRunningDialog(false)}>Continue</Button>
          <Button onClick={handleStop} color="error" variant="contained">Stop</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        onClose={() => setToast(s => ({ ...s, open: false }))}
        autoHideDuration={4000}
        message={toast.message}
      />
    </Box>
  );
};

export default RulePage;
