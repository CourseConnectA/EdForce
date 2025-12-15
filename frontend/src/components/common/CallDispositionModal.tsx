import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import callsService from '@/services/callsService';
import leadsService from '@/services/leadsService';
import { GLOBAL_LEAD_STATUSES, LEAD_SUB_STATUS_BY_STATUS, getFollowUpMaxDate } from '@/constants/leadStatus';

interface CallDispositionModalProps {
  open: boolean;
  onClose: () => void;
  callData: {
    phoneNumber: string;
    leadId: string;
    startTime: string;
    callId?: string;
    duration?: number; // Duration from CallLog in seconds
    completedAt?: string; // When the call finished, if known
    source?: string;
    // Current lead data for pre-filling
    currentLeadStatus?: string;
    currentLeadSubStatus?: string;
    currentLeadDescription?: string;
    currentComment?: string;
    currentNextFollowUpAt?: string;
  } | null;
  onSaved?: () => void;
}

const dispositionOptions = [
  'Connected',
  'Not Answered',
  'Busy',
  'Wrong Number',
  'Follow-up Scheduled',
  'Left Voicemail',
  'Call Back Later',
  'Not Interested',
];

const CallDispositionModal: React.FC<CallDispositionModalProps> = ({ open, onClose, callData, onSaved }) => {
  const [disposition, setDisposition] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);

  // Lead update fields
  const [leadStatus, setLeadStatus] = useState('');
  const [leadSubStatus, setLeadSubStatus] = useState('');
  const [leadDescription, setLeadDescription] = useState('');
  const [comment, setComment] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');

  // Get sub-status options based on selected status
  const subStatusOptions = leadStatus ? (LEAD_SUB_STATUS_BY_STATUS[leadStatus] || []) : [];

  // Get max follow-up date based on status
  const followUpMax = getFollowUpMaxDate(leadStatus);
  const followUpMaxStr = followUpMax
    ? `${followUpMax.getFullYear()}-${String(followUpMax.getMonth() + 1).padStart(2, '0')}-${String(followUpMax.getDate()).padStart(2, '0')}T${String(followUpMax.getHours()).padStart(2, '0')}:${String(followUpMax.getMinutes()).padStart(2, '0')}`
    : undefined;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const computeFallbackDuration = (startIso: string, completedIso?: string) => {
    const startMs = new Date(startIso).getTime();
    const endMs = completedIso ? new Date(completedIso).getTime() : Date.now();
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      return Math.floor((endMs - startMs) / 1000);
    }
    return 0;
  };

  useEffect(() => {
    if (open && callData) {
      console.log('📱 CallDispositionModal opened with data:', {
        phoneNumber: callData.phoneNumber,
        leadId: callData.leadId,
        startTime: callData.startTime,
        duration: callData.duration,
        completedAt: callData.completedAt,
        callId: callData.callId
      });
      
      // Reset form
      setDisposition('');
      setNotes('');
      
      // Pre-fill lead fields from current lead data
      setLeadStatus(callData.currentLeadStatus || '');
      setLeadSubStatus(callData.currentLeadSubStatus || '');
      setLeadDescription(callData.currentLeadDescription || '');
      setComment(callData.currentComment || '');
      setNextFollowUpAt(callData.currentNextFollowUpAt 
        ? new Date(callData.currentNextFollowUpAt).toISOString().slice(0, 16) 
        : '');
      
      const resolvedDuration = typeof callData.duration === 'number'
        ? Math.max(0, Math.floor(callData.duration))
        : computeFallbackDuration(callData.startTime, callData.completedAt);

      if (resolvedDuration > 0) {
        console.log(`✅ Using captured duration: ${resolvedDuration} seconds`);
      } else {
        console.log('ℹ️ Captured duration is 0 seconds (call not connected or no audio time recorded)');
      }

      setDuration(resolvedDuration);
    }
  }, [open, callData]);

  const handleSave = async () => {
    if (!callData) return;

    setSaving(true);
    try {
      // 1. Save call disposition
      if (callData.callId) {
        // Update existing call log
        await callsService.updateDisposition(callData.callId, { disposition, notes });
      } else {
        // Create new call log with disposition and notes
        const endTime = new Date();
        const startTime = new Date(callData.startTime);
        const computedDuration = duration > 0
          ? duration
          : Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));

        await callsService.logCall({
          leadId: callData.leadId,
          phoneNumber: callData.phoneNumber,
          callType: 'outgoing',
          startTime: callData.startTime,
          endTime: endTime.toISOString(),
          duration: computedDuration,
          disposition: disposition,
          notes: notes,
        });
      }

      // 2. Update lead fields if any were changed
      const leadUpdatePayload: Record<string, any> = {};
      if (leadStatus) leadUpdatePayload.leadStatus = leadStatus;
      if (leadSubStatus) leadUpdatePayload.leadSubStatus = leadSubStatus;
      if (leadDescription !== (callData.currentLeadDescription || '')) {
        leadUpdatePayload.leadDescription = leadDescription;
      }
      if (comment !== (callData.currentComment || '')) {
        leadUpdatePayload.comment = comment;
      }
      if (nextFollowUpAt) {
        // Clamp within allowed window
        let nextAt = new Date(nextFollowUpAt);
        const now = new Date();
        if (nextAt < now) nextAt = now;
        const max = getFollowUpMaxDate(leadStatus);
        if (max && nextAt > max) nextAt = max;
        leadUpdatePayload.nextFollowUpAt = nextAt.toISOString();
      }

      if (Object.keys(leadUpdatePayload).length > 0) {
        await leadsService.updateLead(callData.leadId, leadUpdatePayload as any);
        console.log('✅ Lead updated with:', leadUpdatePayload);
      }

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Failed to save call disposition:', error);
      // Error is logged, user will see it didn't close
    } finally {
      setSaving(false);
    }
  };

  if (!callData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Call Disposition</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Phone: {callData.phoneNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Time: {new Date(callData.startTime).toLocaleString()}
          </Typography>

          <TextField
            label="Call Duration (Connected Time Only) *"
            type="text"
            fullWidth
            required
            value={formatDuration(duration)}
            InputProps={{ readOnly: true }}
            margin="normal"
            helperText={duration > 0
              ? '✅ Duration auto-captured from the native dialer (read-only).'
              : 'ℹ️ Call duration recorded as 0 seconds.'}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Disposition</InputLabel>
            <Select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              label="Disposition"
            >
              {dispositionOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Call Notes"
            multiline
            rows={2}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            placeholder="Add any notes about the call..."
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Update Lead Information
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>Lead Status</InputLabel>
            <Select
              value={leadStatus}
              onChange={(e) => {
                setLeadStatus(e.target.value);
                setLeadSubStatus(''); // Reset sub-status when status changes
              }}
              label="Lead Status"
            >
              {GLOBAL_LEAD_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {subStatusOptions.length > 0 && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Lead Sub Status</InputLabel>
              <Select
                value={leadSubStatus}
                onChange={(e) => setLeadSubStatus(e.target.value)}
                label="Lead Sub Status"
              >
                {subStatusOptions.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Lead Description"
            multiline
            rows={2}
            fullWidth
            value={leadDescription}
            onChange={(e) => setLeadDescription(e.target.value)}
            margin="normal"
            placeholder="Description about the lead..."
          />

          <TextField
            label="Comments"
            multiline
            rows={2}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            margin="normal"
            placeholder="Add comments..."
          />

          <TextField
            label="Next Follow Up"
            type="datetime-local"
            fullWidth
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: new Date().toISOString().slice(0, 16),
              max: followUpMaxStr,
            }}
            helperText={followUpMax ? `Max: ${followUpMax.toLocaleDateString()}` : undefined}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !disposition}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CallDispositionModal;
