import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Campaign, CampaignType, CampaignStatus, CreateCampaignDto } from '../../types/campaign.types';
import { campaignService } from '../../services/campaignService';

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
  mode: 'create' | 'edit';
}

const campaignTypes = [
  { value: CampaignType.EMAIL, label: 'Email Marketing' },
  { value: CampaignType.SMS, label: 'SMS Campaign' },
  { value: CampaignType.SOCIAL_MEDIA, label: 'Social Media' },
  { value: CampaignType.WEBINAR, label: 'Webinar' },
  { value: CampaignType.EVENT, label: 'Event' },
  { value: CampaignType.CONTENT, label: 'Content Marketing' },
  { value: CampaignType.ADVERTISING, label: 'Advertising' },
];

const campaignStatuses = [
  { value: CampaignStatus.DRAFT, label: 'Draft' },
  { value: CampaignStatus.SCHEDULED, label: 'Scheduled' },
  { value: CampaignStatus.ACTIVE, label: 'Active' },
  { value: CampaignStatus.PAUSED, label: 'Paused' },
  { value: CampaignStatus.COMPLETED, label: 'Completed' },
  { value: CampaignStatus.CANCELLED, label: 'Cancelled' },
];

const leadStatusOptions = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const accountTypeOptions = ['Enterprise', 'SMB', 'Startup', 'Government', 'Non-Profit'];
const locationOptions = ['India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France'];
const interestOptions = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing'];

const CampaignForm: React.FC<CampaignFormProps> = ({ open, onClose, campaign, mode }) => {
  const [formData, setFormData] = useState<CreateCampaignDto>({
    name: '',
    description: '',
    type: CampaignType.EMAIL,
    status: CampaignStatus.DRAFT,
    budget: undefined,
    spent: 0,
    startDate: '',
    endDate: '',
    targetAudience: {
      leadStatus: [],
      accountType: [],
      location: [],
      ageRange: { min: 18, max: 65 },
      interests: [],
    },
    content: {
      subject: '',
      body: '',
      attachments: [],
      landingPageUrl: '',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        type: campaign.type,
        status: campaign.status,
        budget: campaign.budget,
        spent: campaign.spent,
        startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
        targetAudience: campaign.targetAudience || {
          leadStatus: [],
          accountType: [],
          location: [],
          ageRange: { min: 18, max: 65 },
          interests: [],
        },
        content: campaign.content || {
          subject: '',
          body: '',
          attachments: [],
          landingPageUrl: '',
        },
      });
    }
  }, [campaign]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof CreateCampaignDto] as any,
        [field]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (formData.budget && formData.budget < 0) {
      newErrors.budget = 'Budget must be positive';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      if (mode === 'edit' && campaign) {
        await campaignService.updateCampaign(campaign.id, formData);
      } else {
        await campaignService.createCampaign(formData);
      }

      onClose();
    } catch (err) {
      setError(mode === 'edit' ? 'Failed to update campaign' : 'Failed to create campaign');
      console.error('Error saving campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 1300
      }}
    >
      <DialogTitle>
        {mode === 'edit' ? 'Edit Campaign' : 'Create New Campaign'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </Box>
        )}
        <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Campaign Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Campaign Type</InputLabel>
            <Select
              value={formData.type}
              label="Campaign Type"
              onChange={(e) => handleInputChange('type', e.target.value)}
            >
              {campaignTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            multiline
            rows={3}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              {campaignStatuses.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Budget"
            type="number"
            value={formData.budget || ''}
            onChange={(e) => handleInputChange('budget', e.target.value ? parseFloat(e.target.value) : undefined)}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
            error={!!errors.budget}
            helperText={errors.budget}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={!!errors.endDate}
            helperText={errors.endDate}
          />
        </Grid>

        {/* Target Audience */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Target Audience</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={leadStatusOptions}
                    value={formData.targetAudience?.leadStatus || []}
                    onChange={(_, value) => handleNestedChange('targetAudience', 'leadStatus', value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Lead Status" placeholder="Select lead statuses" />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={accountTypeOptions}
                    value={formData.targetAudience?.accountType || []}
                    onChange={(_, value) => handleNestedChange('targetAudience', 'accountType', value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Account Type" placeholder="Select account types" />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={locationOptions}
                    value={formData.targetAudience?.location || []}
                    onChange={(_, value) => handleNestedChange('targetAudience', 'location', value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Location" placeholder="Select locations" />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={interestOptions}
                    value={formData.targetAudience?.interests || []}
                    onChange={(_, value) => handleNestedChange('targetAudience', 'interests', value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Interests" placeholder="Select interests" />
                    )}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Min Age"
                    type="number"
                    value={formData.targetAudience?.ageRange?.min || 18}
                    onChange={(e) => handleNestedChange('targetAudience', 'ageRange', {
                      ...formData.targetAudience?.ageRange,
                      min: parseInt(e.target.value) || 18
                    })}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Max Age"
                    type="number"
                    value={formData.targetAudience?.ageRange?.max || 65}
                    onChange={(e) => handleNestedChange('targetAudience', 'ageRange', {
                      ...formData.targetAudience?.ageRange,
                      max: parseInt(e.target.value) || 65
                    })}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Content */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Campaign Content</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Subject/Title"
                    value={formData.content?.subject || ''}
                    onChange={(e) => handleNestedChange('content', 'subject', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Content Body"
                    value={formData.content?.body || ''}
                    onChange={(e) => handleNestedChange('content', 'body', e.target.value)}
                    multiline
                    rows={4}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Landing Page URL"
                    value={formData.content?.landingPageUrl || ''}
                    onChange={(e) => handleNestedChange('content', 'landingPageUrl', e.target.value)}
                    placeholder="https://example.com/landing-page"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? 'Saving...' : (mode === 'edit' ? 'Update Campaign' : 'Create Campaign')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignForm;