// Global lead statuses, dependent sub-status options, and follow-up constraints

// Status list aligned to the CSV provided
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

// Dependent sub-status options per status. Keep this minimal and practical; extend as needed.
export const LEAD_SUB_STATUS_BY_STATUS: Record<string, string[]> = {
  'Not Contacted/New Lead': ['-None-'],
  Hot: [
    '-None-',
    'Needs time to arrange the docs',
    'Arranging funds within a week',
    'Discount options/Negotiation on',
    'Will registered within a week',
    'Reasons other than above (compulsory comments)'
  ],
  Warm: [
    '-None-',
    'Discount options',
    'Financial issues',
    'Needs time to arrange the docs',
    'Travelling outstation/abroad-needs time',
    'Reasons other than above (compulsory comments)'
  ],
  Cold: [
    '--None-',
    'Needs time to arrange the docs',
    'Financial issues',
    'Job change- Next drive',
    'No time to Study at present',
    'Professional commitment - will enrol in this drive',
    'Under graduate-Awaiting results',
    'Reasons other than above (compulsory comments)'
  ],
  'Frozen (next drive)': [
    '-None-',
    'Needs time to arrange the docs',
    'Family responsibilities',
    'Financial issues',
    'Getting married',
    'Health issues',
    'Job change',
    'No time to Study',
    'Preparing for other exams',
    'Professional comittment',
    'Reasons other than above (compulsory comments)'
  ],
  'University Form filled': ['Payment pending', 'Payment struck'],
  'Registration Fee Paid': ['Arranging Documents', 'Arrnging Balance Payment', 'Applied for loan'],
  'Reg Fee Paid & Documents Uploaded': ['-None-'],
  'Documents Rejected': ['Arranging Documents', "Don't have sufficient documents", 'Need time to arrange documents'],
  'Documents Approved': ['Arrnging Balance Payment', 'Applied for loan'],
  'Semester fee paid': ['-None-'],
  'Yearly fee paid': ['-None-'],
  'Full fee paid - Lumpsum': ['-None-'],
  'Full fee paid - Loan': ['-None-'],
  'Closed - Won': ['Admission Number Generated'],
  'Closed - Lost': [
    'Joined with Compititor',
    'Going for regular course',
    "Couldn't arrange the funds",
    "Couldn't arrange the documents",
    'Cancelled the plan due to Personal reason',
    'Cancelled the plan due to Job',
    'Stopped responding to calls/msgs'
  ],
  'Needs Follow Up': [
    '--None-',
    'Needs time to arrange the docs',
    'Checking for other brands',
    'Company sponsored, waiting for approvals',
    'Decision pending with family but wants to enrol',
    'Financial issues',
    'Issue with Loan Eligibility',
    'Need time to decide',
    'Out of station/ On trip',
    'Result awaited',
    'Will enrol before drive ends',
    'Reasons other than above (compulsory comments)'
  ],
  Reborn: ['-None-'],
  'Admission Fee Paid': ['-None-'],
  'Ask to Call back': [
    '--None-',
    'Busy at present, call back later',
    'Call after office hours',
    'In a meeting',
    'Network issues',
    'Travelling',
    'Reasons other than above (compulsory comments)'
  ],
  'Not interested': [
    '-None-',
    'Abroad for further studies',
    'UGC or Other Accreditation issue',
    'Already an MBA',
    'Stopped responding to calls/msgs',
    'Company will not accept this degree',
    'Did not enquire',
    'Documents not available',
    'Family not allowing for Online program',
    'Fees too high',
    'Financial issues',
    'Friends joining elsewhere',
    'Incomplete set of documentation',
    'Job change',
    'Language barrier',
    'Looking for job',
    'Looking for other courses- Compulsory comments',
    'Looking for regular / fulltime/in-campus programs',
    "Looking for specialisations we don't offer",
    'Looking for UG program',
    'No exam center in city or state',
    'No face to face lectures',
    'No placement service',
    'Not eligible',
    'Not eligible for our programs',
    'Not happy with course content',
    'No time to Study',
    'Not Eligible - Less than 50% in graduation',
    'Reasons other than above (compulsory comments)',
    'Relocation',
    'Taken admission to other universities'
  ],
  'Ask for Information': [
    'Brochure',
    'Curriculum',
    'Elgibility and required documents',
    'Examination details',
    'Fee structure details',
    'Program details',
    'Reasons other than above (compulsory comments)'
  ],
  'Invalid No/Wrong No': [
    '-None-',
    'Incomplete number',
    'Number not Recharged',
    'International number',
    'Reasons other than above (compulsory comments)',
    "Number doesn't Exist",
    'Wrong number'
  ],
  'Phone Switched Off/Ringing/No Response': ['-None-'],
  'Dead On Arrival': [
    '-None-',
    'Abroad for further studies',
    'AIU/UGC issue',
    'Already an MBA',
    'Company will not accept this degree',
    'Did not enquire',
    'Documents not available',
    'Family responsibilities',
    'Financial issues',
    'Getting married',
    'Going abroad, not possible to study onsite',
    'Health issues',
    'Language barrier',
    'Looking for job',
    'Looking for PG courses',
    'Looking for regular/fulltime/in-campus programs',
    'Looking for some other specialisations - Compulsory Comment',
    'Looking for under graduate degree courses',
    'Not eligible',
    'Not eligible for our programs',
    'Not happy with course content',
    'Not Eligible - Less than 50% in graduation',
    'Professional commitment - will enrol in this drive',
    'Program details',
    'Reasons other than above (compulsory comments)',
    'Taken admission to other universities'
  ],
  DND: ['-None-'],
};

// Follow-up window in days by status. If undefined, no special limit beyond standard validation.
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
  const max = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return max;
}
