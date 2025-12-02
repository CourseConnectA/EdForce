import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton, TextField, Grid, MenuItem, FormControlLabel, Switch, Checkbox } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { createLead, updateLead, LeadsState } from '../../store/slices/leadsSlice';
import { Lead, CreateLeadDto, UpdateLeadDto } from '../../services/leadsService';
import leadSettingsService, { LeadFieldSetting } from '../../services/leadSettingsService';
import centerOptionsService, { OptionsMap } from '../../services/centerOptionsService';
import { GLOBAL_LEAD_STATUSES, LEAD_SUB_STATUS_BY_STATUS, getFollowUpMaxDate } from '../../constants/leadStatus';
// Dynamic custom fields removed; using static schema-defined fields only

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
  mode: 'create' | 'edit';
}

// Build validation schema dynamically based on field settings
const buildValidationSchema = (settings: LeadFieldSetting[]) => {
  const schema: Record<string, any> = {
    // Core fields: always required (also enforced server-side)
    firstName: Yup.string().required('First Name is required'),
    lastName: Yup.string().required('Last Name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    mobileNumber: Yup.string().required('Mobile Number is required'),
  };

  const map = new Map<string, LeadFieldSetting>();
  settings?.forEach((s) => map.set(s.key, s));

  const addOptionalOrRequired = (key: string, base: any) => {
    const s = map.get(key);
    if (s?.required) {
      schema[key] = base.required(`${key} is required`);
    } else {
      schema[key] = base.notRequired();
    }
  };

  addOptionalOrRequired('alternateNumber', Yup.string());
  addOptionalOrRequired('leadStatus', Yup.string());
  addOptionalOrRequired('leadSource', Yup.string());
  addOptionalOrRequired('createdFrom', Yup.string());
  addOptionalOrRequired('reasonDeadInvalid', Yup.string());
  addOptionalOrRequired('leadSubStatus', Yup.string());
  addOptionalOrRequired('leadSubSource', Yup.string());
  addOptionalOrRequired('program', Yup.string());
  addOptionalOrRequired('specialization', Yup.string());
  addOptionalOrRequired('yearOfCompletion', Yup.mixed());
  addOptionalOrRequired('yearsOfExperience', Yup.string());
  addOptionalOrRequired('leadDescription', Yup.string());
  addOptionalOrRequired('nextFollowUpAt', Yup.date().nullable());
  addOptionalOrRequired('comment', Yup.string());
  addOptionalOrRequired('company', Yup.string());
  addOptionalOrRequired('title', Yup.string());
  addOptionalOrRequired('industry', Yup.string());
  addOptionalOrRequired('website', Yup.string());
  addOptionalOrRequired('emailVerified', Yup.boolean());
  addOptionalOrRequired('mobileVerified', Yup.boolean());
  addOptionalOrRequired('whatsappNumber', Yup.string());
  addOptionalOrRequired('whatsappVerified', Yup.boolean());
  addOptionalOrRequired('locationCity', Yup.string());
  addOptionalOrRequired('locationState', Yup.string());
  addOptionalOrRequired('nationality', Yup.string());
  addOptionalOrRequired('gender', Yup.string());
  addOptionalOrRequired('dateOfBirth', Yup.date().nullable());
  addOptionalOrRequired('motherTongue', Yup.string());
  addOptionalOrRequired('highestQualification', Yup.string());
  addOptionalOrRequired('university', Yup.string());
  addOptionalOrRequired('batch', Yup.string());

  return Yup.object(schema);
};
const LeadForm: React.FC<LeadFormProps> = ({ open, onClose, lead, mode }) => {
  // Center-specific dropdown overrides (fallback to global defaults if not provided)
  const [centerOptionsMap, setCenterOptionsMap] = React.useState<OptionsMap | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const map = await centerOptionsService.getMyCenterOptions();
        setCenterOptionsMap(map);
      } catch {
        setCenterOptionsMap({} as any); // fallback: empty map => use defaults
      }
    })();
  }, []);

  const genderOptions = centerOptionsMap?.gender?.length ? centerOptionsMap.gender : ['Male','Female','Other'];
  const qualificationOptions = centerOptionsMap?.highestQualification?.length ? centerOptionsMap.highestQualification : ['12th','Bachelor Degree','Master Degree','Doctorate'];
  const expOptions = centerOptionsMap?.yearsOfExperience?.length ? centerOptionsMap.yearsOfExperience : ['Still a student','Fresh Graduate','0-2 years','3-5 years','5-10 years','10+ years'];
  const batchOptions = centerOptionsMap?.batch?.length ? centerOptionsMap.batch : ['Jan 2026','July 2026'];
  const nationalityOptions = centerOptionsMap?.nationality?.length ? centerOptionsMap.nationality : ['India','Bangladesh','Nepal','Sri Lanka','Other'];
  const motherTongueOptions = centerOptionsMap?.motherTongue?.length ? centerOptionsMap.motherTongue : ['Hindi','English','Bengali','Tamil','Telugu','Marathi','Gujarati','Kannada','Malayalam','Odia','Punjabi','Urdu','Other'];
  const stateOptions = centerOptionsMap?.locationState?.length ? centerOptionsMap.locationState : ['Andhra Pradesh','Delhi','Gujarat','Karnataka','Maharashtra','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal','Other'];
  const cityOptions = centerOptionsMap?.locationCity?.length ? centerOptionsMap.locationCity : ['Bengaluru','Chennai','Delhi','Hyderabad','Kolkata','Mumbai','Pune','Ahmedabad','Lucknow','Jaipur','Other'];
  const leadSourceOptions = centerOptionsMap?.leadSource?.length ? centerOptionsMap.leadSource : ['Website','Referral','Walk-in','Call','Email','Social Media','Advertisement','Other'];
  const leadSubSourceOptions = centerOptionsMap?.leadSubSource?.length ? centerOptionsMap.leadSubSource : ['Google Ads','Facebook','Instagram','LinkedIn','Partner','Alumni','Event','Other'];
  const createdFromOptions = centerOptionsMap?.createdFrom?.length ? centerOptionsMap.createdFrom : ['Web','Mobile App','Import','API','Other'];
  const programOptions = centerOptionsMap?.program?.length ? centerOptionsMap.program : ['MBA','BBA','M.Tech','B.Tech','Other'];
  const specializationOptions = centerOptionsMap?.specialization?.length ? centerOptionsMap.specialization : ['Finance','Marketing','HR','IT','Operations','Other'];
  const universityOptions = centerOptionsMap?.university?.length ? centerOptionsMap.university : ['IIM','IIT','AIIMS','VTU','Anna University','Other'];
  const yearOfCompletionOptions = centerOptionsMap?.yearOfCompletion?.length
    ? centerOptionsMap.yearOfCompletion
    : Array.from({length: 50}).map((_, i) => String(new Date().getFullYear() - i));
  // Global status list (center-level overrides are ignored for status to ensure standardization)
  const leadStatusOptions = GLOBAL_LEAD_STATUSES;
  const [fieldSettings, setFieldSettings] = React.useState<LeadFieldSetting[]>([]);
  const settingsMap = React.useMemo(() => {
    const m = new Map<string, LeadFieldSetting>();
    fieldSettings.forEach((s) => m.set(s.key, s));
    return m;
  }, [fieldSettings]);

  const isVisible = React.useCallback(
    (key: string) => {
      // default true to avoid flicker before settings load
      const s = settingsMap.get(key);
      return s ? s.visible !== false : true;
    },
    [settingsMap]
  );

  const [initialValues, setInitialValues] = React.useState<Record<string, any>>({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    alternateNumber: '',
    leadStatus: 'New',
    leadSource: '',
    leadSubSource: '',
    createdFrom: '',
    program: '',
    specialization: '',
    yearOfCompletion: '' as any,
    yearsOfExperience: '',
    leadDescription: '',
  leadSubStatus: '',
  reasonDeadInvalid: '',
  nextFollowUpAt: null as any,
    comment: '',
    company: '',
    title: '',
    industry: '',
    website: '',
    emailVerified: false,
    mobileVerified: false,
    whatsappNumber: '',
    whatsappVerified: false,
    locationCity: '',
    locationState: '',
    nationality: '',
    gender: '',
  dateOfBirth: null as any,
    motherTongue: '',
    highestQualification: '',
    university: '',
    batch: '',
  });
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.leads as LeadsState);
  const { user } = useSelector((state: RootState) => state.auth);
  const role = String(((user as any)?.role) || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();
  const isCounselor = role === 'counselor';
  const isEdit = mode === 'edit';
  const counselorEditable = isCounselor && isEdit;
  const canEdit = (key: string) => {
    if (!counselorEditable) return true;
    return ['leadStatus', 'leadSubStatus', 'leadDescription', 'nextFollowUpAt'].includes(key);
  };

  React.useEffect(() => {
    // fetch settings on mount
    (async () => {
      try {
        const s = await leadSettingsService.list();
        setFieldSettings(s);
      } catch (e) {
        // ignore; UI will fallback to default-visible
      }
    })();
  }, []);

  // Re-fetch settings each time the dialog is opened to reflect latest toggles
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const s = await leadSettingsService.list();
        setFieldSettings(s);
      } catch {}
    })();
  }, [open]);

  const parseDate = (val: any) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };
  React.useEffect(() => {
    const init: Record<string, any> = {
      firstName: lead?.firstName || '',
      lastName: lead?.lastName || '',
      email: (lead as any)?.email || '',
      mobileNumber: (lead as any)?.mobileNumber || '',
      alternateNumber: (lead as any)?.alternateNumber || '',
      leadStatus: (lead as any)?.leadStatus || 'New',
      leadSource: (lead as any)?.leadSource || '',
      leadSubSource: (lead as any)?.leadSubSource || '',
  createdFrom: (lead as any)?.createdFrom || '',
      program: (lead as any)?.program || '',
      specialization: (lead as any)?.specialization || '',
      yearOfCompletion: (lead as any)?.yearOfCompletion || ('' as any),
      yearsOfExperience: (lead as any)?.yearsOfExperience || '',
      leadDescription: (lead as any)?.leadDescription || '',
  leadSubStatus: (lead as any)?.leadSubStatus || '',
  reasonDeadInvalid: (lead as any)?.reasonDeadInvalid || '',
  nextFollowUpAt: parseDate((lead as any)?.nextFollowUpAt) || null,
      comment: (lead as any)?.comment || '',
      company: (lead as any)?.company || '',
      title: (lead as any)?.title || '',
      industry: (lead as any)?.industry || '',
      website: (lead as any)?.website || '',
      emailVerified: (lead as any)?.emailVerified || false,
      mobileVerified: (lead as any)?.mobileVerified || false,
      whatsappNumber: (lead as any)?.whatsappNumber || '',
      whatsappVerified: (lead as any)?.whatsappVerified || false,
      locationCity: (lead as any)?.locationCity || '',
      locationState: (lead as any)?.locationState || '',
      nationality: (lead as any)?.nationality || '',
      gender: (lead as any)?.gender || '',
  dateOfBirth: parseDate((lead as any)?.dateOfBirth) || null,
      motherTongue: (lead as any)?.motherTongue || '',
      highestQualification: (lead as any)?.highestQualification || '',
      university: (lead as any)?.university || '',
      batch: (lead as any)?.batch || '',
    };
    setInitialValues(init);
  }, [lead]);

  const handleSubmit = async (values: any) => {
    try {
      // Client-side validation for follow-up window based on status
      const maxFollow = getFollowUpMaxDate(values.leadStatus);
      if (values.nextFollowUpAt && maxFollow && new Date(values.nextFollowUpAt) > maxFollow) {
        throw new Error(`Next Follow-up exceeds allowed window for status "${values.leadStatus}"`);
      }
      const formData = {
        ...values,
        email: values.email || undefined,
        mobileNumber: values.mobileNumber || undefined,
        leadStatus: values.leadStatus || undefined,
        company: values.company || undefined,
        title: values.title || undefined,
        industry: values.industry || undefined,
        website: values.website || undefined,
        leadSource: values.leadSource || undefined,
        leadSubSource: values.leadSubSource || undefined,
  createdFrom: values.createdFrom || undefined,
  nextFollowUpAt: values.nextFollowUpAt ? new Date(values.nextFollowUpAt).toISOString() : undefined,
        comment: values.comment || undefined,
        emailVerified: !!values.emailVerified,
        mobileVerified: !!values.mobileVerified,
        whatsappNumber: values.whatsappNumber || undefined,
        whatsappVerified: !!values.whatsappVerified,
        locationCity: values.locationCity || undefined,
        locationState: values.locationState || undefined,
        nationality: values.nationality || undefined,
        gender: values.gender || undefined,
        // Send date only (YYYY-MM-DD) for dateOfBirth
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString().slice(0, 10) : undefined,
        motherTongue: values.motherTongue || undefined,
        highestQualification: values.highestQualification || undefined,
        university: values.university || undefined,
        batch: values.batch || undefined,
  leadSubStatus: values.leadSubStatus || undefined,
  reasonDeadInvalid: values.reasonDeadInvalid || undefined,
      } as any;

      if (mode === 'create') {
        await dispatch(createLead(formData as CreateLeadDto)).unwrap();
      } else if (mode === 'edit' && lead) {
        await dispatch(updateLead({ id: lead.id, data: formData as UpdateLeadDto })).unwrap();
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting lead form:', error);
    }
  };

  const [whatsappSame, setWhatsappSame] = React.useState(false);
  React.useEffect(() => {
    // When opening/editing, default the toggle based on equality
    setWhatsappSame(Boolean(initialValues.whatsappNumber) && initialValues.whatsappNumber === initialValues.mobileNumber);
  }, [open]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {mode === 'create' ? 'Create New Lead' : 'Edit Lead'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <Formik
          initialValues={initialValues}
          validationSchema={buildValidationSchema(fieldSettings)}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, handleChange, handleBlur, errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent dividers>
                <Grid container spacing={2}>
                    {/** Compute dependent sub-status options and follow-up window based on selected status */}
                    {(() => {
                      return null; // no-op IIFE to keep block-scoped helpers near usage
                    })()}
                    {isVisible('firstName') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="First Name"
                        name="firstName"
                        value={values.firstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.firstName && Boolean(errors.firstName)}
                        helperText={touched.firstName && (errors.firstName as any)}
                        fullWidth
                        required
                        disabled={!canEdit('firstName')}
                      />
                    </Grid>
                    )}
                    {isVisible('lastName') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Last Name"
                        name="lastName"
                        value={values.lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.lastName && Boolean(errors.lastName)}
                        helperText={touched.lastName && (errors.lastName as any)}
                        fullWidth
                        required
                        disabled={!canEdit('lastName')}
                      />
                    </Grid>
                    )}
                    {isVisible('email') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Email"
                        name="email"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.email && Boolean(errors.email)}
                        helperText={touched.email && (errors.email as any)}
                        fullWidth
                        required
                        disabled={!canEdit('email')}
                      />
                    </Grid>
                    )}
                    {isVisible('mobileNumber') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Mobile Number"
                        name="mobileNumber"
                        value={values.mobileNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.mobileNumber && Boolean(errors.mobileNumber)}
                        helperText={touched.mobileNumber && (errors.mobileNumber as any)}
                        fullWidth
                        required
                        disabled={!canEdit('mobileNumber')}
                      />
                    </Grid>
                    )}
                    {isVisible('alternateNumber') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Alternate Number"
                        name="alternateNumber"
                        value={values.alternateNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.alternateNumber && Boolean(errors.alternateNumber)}
                        helperText={touched.alternateNumber && (errors.alternateNumber as any)}
                        fullWidth
                        disabled={!canEdit('alternateNumber')}
                      />
                    </Grid>
                    )}
                    {isVisible('leadStatus') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Status"
                        name="leadStatus"
                        value={values.leadStatus || 'New'}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleChange(e);
                          // Reset dependent sub-status when status changes
                          setFieldValue('leadSubStatus', '');
                          // Adjust follow-up if it violates new max window
                          const max = getFollowUpMaxDate(val);
                          if (values.nextFollowUpAt && max && new Date(values.nextFollowUpAt) > max) {
                            setFieldValue('nextFollowUpAt', null);
                          }
                        }}
                        disabled={!canEdit('leadStatus')}
                        fullWidth
                      >
                        {(() => {
                          const curr = values.leadStatus;
                          const opts = curr && !leadStatusOptions.includes(curr)
                            ? [curr, ...leadStatusOptions]
                            : leadStatusOptions;
                          return opts.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>));
                        })()}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('leadSource') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Lead Source" name="leadSource" value={values.leadSource} onChange={handleChange} fullWidth disabled={!canEdit('leadSource')}>
                        <MenuItem value="">Select</MenuItem>
                        {leadSourceOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('createdFrom') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Lead Created From" name="createdFrom" value={values.createdFrom} onChange={handleChange} fullWidth disabled={!canEdit('createdFrom')}>
                        <MenuItem value="">Select</MenuItem>
                        {createdFromOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('leadSubSource') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Lead Sub-source" name="leadSubSource" value={values.leadSubSource} onChange={handleChange} fullWidth disabled={!canEdit('leadSubSource')}>
                        <MenuItem value="">Select</MenuItem>
                        {leadSubSourceOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('program') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Program" name="program" value={values.program} onChange={handleChange} fullWidth disabled={!canEdit('program')}>
                        <MenuItem value="">Select</MenuItem>
                        {programOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('specialization') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Specialization" name="specialization" value={values.specialization} onChange={handleChange} fullWidth disabled={!canEdit('specialization')}>
                        <MenuItem value="">Select</MenuItem>
                        {specializationOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('yearOfCompletion') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Year of Completion" name="yearOfCompletion" value={values.yearOfCompletion as any} onChange={handleChange} fullWidth disabled={!canEdit('yearOfCompletion')}>
                        <MenuItem value="">Select</MenuItem>
                        {yearOfCompletionOptions.map(y => (<MenuItem key={y} value={y}>{y}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('yearsOfExperience') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Years of Experience" name="yearsOfExperience" value={values.yearsOfExperience} onChange={handleChange} fullWidth disabled={!canEdit('yearsOfExperience')}>
                        <MenuItem value="">Select</MenuItem>
                        {expOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('company') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Company"
                        name="company"
                        value={values.company}
                        onChange={handleChange}
                        fullWidth
                        disabled={!canEdit('company')}
                      />
                    </Grid>
                    )}
                    {isVisible('title') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Title"
                        name="title"
                        value={values.title}
                        onChange={handleChange}
                        fullWidth
                        disabled={!canEdit('title')}
                      />
                    </Grid>
                    )}
                    {isVisible('leadSubStatus') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Lead Sub-status"
                        name="leadSubStatus"
                        value={values.leadSubStatus}
                        onChange={handleChange}
                        disabled={!canEdit('leadSubStatus')}
                        fullWidth
                      >
                        <MenuItem value="">Select</MenuItem>
                        {(LEAD_SUB_STATUS_BY_STATUS[values.leadStatus] || []).map(o => (
                          <MenuItem key={o} value={o}>{o}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('reasonDeadInvalid') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Reason Dead / Invalid"
                        name="reasonDeadInvalid"
                        value={values.reasonDeadInvalid}
                        onChange={handleChange}
                        fullWidth
                        disabled={!canEdit('reasonDeadInvalid')}
                      />
                    </Grid>
                    )}
                    {isVisible('leadDescription') && (
                    <Grid item xs={12}>
                      <TextField
                        label="Lead Description"
                        name="leadDescription"
                        value={values.leadDescription}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        minRows={3}
                        disabled={!canEdit('leadDescription')}
                      />
                    </Grid>
                    )}
                    {isVisible('nextFollowUpAt') && (
                    <Grid item xs={12} sm={6}>
                      <DateTimePicker
                        label="Next Follow-up"
                        value={values.nextFollowUpAt}
                        onChange={(date) => {
                          const now = new Date();
                          const max = getFollowUpMaxDate(values.leadStatus);
                          let d = date as any;
                          if (d) {
                            if (d < now) d = now;
                            if (max && d > max) d = max;
                          }
                          setFieldValue('nextFollowUpAt', d);
                        }}
                        disabled={!canEdit('nextFollowUpAt')}
                        disablePast
                        minDateTime={new Date()}
                        maxDateTime={getFollowUpMaxDate(values.leadStatus)}
                        shouldDisableDate={(d) => {
                          const day = d as Date;
                          const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
                          const today = startOf(new Date());
                          const max = getFollowUpMaxDate(values.leadStatus);
                          const maxDay = max ? startOf(max) : null;
                          if (day < today) return true;
                          if (maxDay && day > maxDay) return true;
                          return false;
                        }}
                        slotProps={{ textField: { fullWidth: true, error: (() => {
                          const now = new Date();
                          const max = getFollowUpMaxDate(values.leadStatus);
                          const v = values.nextFollowUpAt ? new Date(values.nextFollowUpAt) : null;
                          if (!v) return false;
                          if (v < now) return true;
                          if (max && v > max) return true;
                          return false;
                        })(), helperText: (() => {
                          const max = getFollowUpMaxDate(values.leadStatus);
                          if (!max) return undefined;
                          const days = Math.ceil((max.getTime() - Date.now()) / (24*60*60*1000));
                          return `Allowed within next ${days} day(s) for status "${values.leadStatus}"`;
                        })() } }}
                      />
                    </Grid>
                    )}
                    {isVisible('comment') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Comment"
                        name="comment"
                        value={values.comment}
                        onChange={handleChange}
                        fullWidth
                        disabled={!canEdit('comment')}
                      />
                    </Grid>
                    )}
                    {isVisible('industry') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Industry"
                        name="industry"
                        value={values.industry}
                        onChange={handleChange}
                        fullWidth
                        disabled={!canEdit('industry')}
                      />
                    </Grid>
                    )}
                    {isVisible('website') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Website"
                        name="website"
                        value={values.website}
                        onChange={handleChange}
                        fullWidth
                        disabled={!canEdit('website')}
                      />
                    </Grid>
                    )}
                    {isVisible('emailVerified') && (
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel control={<Switch name="emailVerified" checked={!!values.emailVerified} onChange={handleChange} disabled={!canEdit('emailVerified')} />} label="Email Verified" />
                    </Grid>
                    )}
                    {isVisible('mobileVerified') && (
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel control={<Switch name="mobileVerified" checked={!!values.mobileVerified} onChange={handleChange} disabled={!canEdit('mobileVerified')} />} label="Mobile Verified" />
                    </Grid>
                    )}
                    {isVisible('whatsappNumber') && (
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <TextField label="WhatsApp Number" name="whatsappNumber" value={whatsappSame ? values.mobileNumber : values.whatsappNumber} onChange={handleChange} fullWidth disabled={whatsappSame || !canEdit('whatsappNumber')} />
                        <FormControlLabel
                          sx={{ mt: 0.5 }}
                          control={<Checkbox checked={whatsappSame} onChange={(e) => {
                            const checked = e.target.checked;
                            setWhatsappSame(checked);
                            if (checked) {
                              // mirror mobile
                              (setFieldValue as any)('whatsappNumber', values.mobileNumber);
                            }
                          }} />}
                          label="Same as Mobile Number"
                        />
                      </Box>
                    </Grid>
                    )}
                    {isVisible('whatsappVerified') && (
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel control={<Switch name="whatsappVerified" checked={!!values.whatsappVerified} onChange={handleChange} disabled={!canEdit('whatsappVerified')} />} label="WhatsApp Verified" />
                    </Grid>
                    )}
                    {isVisible('locationCity') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="City" name="locationCity" value={values.locationCity} onChange={handleChange} fullWidth disabled={!canEdit('locationCity')}>
                        <MenuItem value="">Select</MenuItem>
                        {cityOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('locationState') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="State" name="locationState" value={values.locationState} onChange={handleChange} fullWidth disabled={!canEdit('locationState')}>
                        <MenuItem value="">Select</MenuItem>
                        {stateOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('nationality') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Nationality" name="nationality" value={values.nationality} onChange={handleChange} fullWidth disabled={!canEdit('nationality')}>
                        <MenuItem value="">Select</MenuItem>
                        {nationalityOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('gender') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Gender" name="gender" value={values.gender} onChange={handleChange} fullWidth disabled={!canEdit('gender')}>
                        <MenuItem value="">Select</MenuItem>
                        {genderOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('dateOfBirth') && (
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Date of Birth"
                        value={values.dateOfBirth}
                        onChange={(date) => setFieldValue('dateOfBirth', date)}
                        disabled={!canEdit('dateOfBirth')}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Grid>
                    )}
                    {isVisible('motherTongue') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Mother Tongue" name="motherTongue" value={values.motherTongue} onChange={handleChange} fullWidth disabled={!canEdit('motherTongue')}>
                        <MenuItem value="">Select</MenuItem>
                        {motherTongueOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('highestQualification') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Highest Qualification" name="highestQualification" value={values.highestQualification} onChange={handleChange} fullWidth disabled={!canEdit('highestQualification')}>
                        <MenuItem value="">Select</MenuItem>
                        {qualificationOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('university') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="University" name="university" value={values.university} onChange={handleChange} fullWidth disabled={!canEdit('university')}>
                        <MenuItem value="">Select</MenuItem>
                        {universityOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                    {isVisible('batch') && (
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Batch" name="batch" value={values.batch} onChange={handleChange} fullWidth disabled={!canEdit('batch')}>
                        <MenuItem value="">Select</MenuItem>
                        {batchOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                      </TextField>
                    </Grid>
                    )}
                </Grid>
              </DialogContent>

              <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} disabled={loading || isSubmitting}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loading || isSubmitting}
                >
                  {mode === 'create' ? 'Create Lead' : 'Update Lead'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </LocalizationProvider>
  );
};

export default LeadForm;