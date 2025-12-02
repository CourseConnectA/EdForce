// Global lead statuses and dependent rules for follow-up windows

export const GLOBAL_LEAD_STATUSES: string[] = [
  'Not Contacted/New Lead',
  'Hot',
  'Warm',
  'Cold',
  'Frozen (next drive)',
  'University Form filled',
  'Registration Fee Paid',
  'Reg Fee Paid & Documents Uploaded',
  'Documents Rejected',
  'Documents Approved',
  'Semester fee paid',
  'Yearly fee paid',
  'Full fee paid - Lumpsum',
  'Full fee paid - Loan',
  'Closed - Won',
  'Closed - Lost',
  'Needs Follow Up',
  'Reborn',
  'Admission Fee Paid',
  'Ask to Call back',
  'Not interested',
  'Ask for Information',
  'Invalid No/Wrong No',
  'Phone Switched Off/Ringing/No Response',
  'Dead On Arrival',
  'DND',
];

export const FOLLOW_UP_WINDOW_DAYS: Record<string, number> = {
  Hot: 3,
  Warm: 15,
  Cold: 60,
  'Frozen (next drive)': 180, // ~6 months
  'University Form filled': 3,
  'Registration Fee Paid': 7,
  'Reg Fee Paid & Documents Uploaded': 7,
  'Documents Approved': 3,
  'Documents Rejected': 7,
  'Ask to Call back': 3,
};

export function getFollowUpMaxDate(status?: string): Date | undefined {
  if (!status) return undefined;
  const days = FOLLOW_UP_WINDOW_DAYS[status];
  if (!days) return undefined;
  const now = new Date();
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
