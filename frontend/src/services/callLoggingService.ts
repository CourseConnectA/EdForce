import apiService from './apiService';

/**
 * Android CallLog.Calls.TYPE values:
 * 1 = INCOMING_TYPE - Answered incoming call (Lead called Counselor, Counselor picked up)
 * 2 = OUTGOING_TYPE - Outgoing call (Counselor called Lead)
 * 3 = MISSED_TYPE - Missed incoming call (Lead called Counselor, Counselor didn't pick up)
 * 4 = VOICEMAIL_TYPE
 * 5 = REJECTED_TYPE - Rejected incoming call
 * 6 = BLOCKED_TYPE
 * 7 = ANSWERED_EXTERNALLY_TYPE
 */
const mapCallLogTypeToCallType = (
  callLogType?: number,
  duration?: number,
): 'outgoing' | 'incoming' | 'missed' => {
  if (typeof callLogType === 'number') {
    switch (callLogType) {
      case 1: // INCOMING_TYPE - Lead called Counselor, Counselor answered
        return 'incoming';
      case 2: // OUTGOING_TYPE - Counselor called Lead
        // Outgoing call - answered if duration > 0, otherwise not answered
        return 'outgoing';
      case 3: // MISSED_TYPE - Lead called Counselor, Counselor didn't answer
      case 5: // REJECTED_TYPE - Lead called Counselor, Counselor rejected
        return 'missed'; // This is a missed INCOMING call
      case 4: // VOICEMAIL_TYPE
      case 6: // BLOCKED_TYPE
      case 7: // ANSWERED_EXTERNALLY_TYPE
        return duration && duration > 0 ? 'incoming' : 'missed';
      default:
        break;
    }
  }

  // Fallback: if initiated from app (has pendingCall), it's outgoing
  // Otherwise, assume outgoing if duration > 0
  if (duration && duration > 0) {
    return 'outgoing';
  }

  return 'outgoing'; // Default to outgoing with 0 duration (unanswered outbound)
};

export interface NativeCallDetail {
  leadId?: string;
  phoneNumber?: string;
  startTime: string;
  completedAt: string;
  duration: number;
  callLogType?: number;
  callLogId?: number;
  source: string;
}

export interface LoggedCallResponse {
  id: string;
}

async function logNativeCall(detail: NativeCallDetail): Promise<LoggedCallResponse | null> {
  // For incoming calls, we may not have a leadId - backend will resolve by phone number
  if (!detail.phoneNumber) {
    console.log('No phone number provided for call log, skipping');
    return null;
  }

  const duration = Number.isFinite(detail.duration) ? Math.max(0, Math.floor(detail.duration)) : 0;
  const callType = mapCallLogTypeToCallType(detail.callLogType, duration);

  const payload: any = {
    phoneNumber: detail.phoneNumber,
    callType,
    startTime: detail.startTime,
    endTime: detail.completedAt,
    duration,
    deviceCallLogId: detail.callLogId !== undefined && detail.callLogId !== null
      ? String(detail.callLogId)
      : undefined,
  };

  // Only include leadId if provided
  if (detail.leadId) {
    payload.leadId = detail.leadId;
  }

  try {
    const response = await apiService.post('/calls/log', payload);
    return response as LoggedCallResponse;
  } catch (error) {
    console.error('Failed to persist call log:', error);
    return null;
  }
}

export const callLoggingService = {
  logNativeCall,
};

export default callLoggingService;
