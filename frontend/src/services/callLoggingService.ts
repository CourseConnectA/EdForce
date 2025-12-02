import apiService from './apiService';

const mapCallLogTypeToCallType = (
  callLogType?: number,
  duration?: number,
): 'outgoing' | 'incoming' | 'missed' => {
  if (typeof callLogType === 'number') {
    switch (callLogType) {
      case 1:
        return 'incoming';
      case 2:
        return duration && duration > 0 ? 'outgoing' : 'missed';
      case 3:
      case 5:
      case 7:
        return 'missed';
      case 4:
      case 6:
      case 8:
        return duration && duration > 0 ? 'incoming' : 'missed';
      default:
        break;
    }
  }

  if (duration && duration > 0) {
    return 'outgoing';
  }

  return 'missed';
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
  if (!detail.leadId || !detail.phoneNumber) {
    return null;
  }

  const duration = Number.isFinite(detail.duration) ? Math.max(0, Math.floor(detail.duration)) : 0;
  const callType = mapCallLogTypeToCallType(detail.callLogType, duration);

  const payload = {
    leadId: detail.leadId,
    phoneNumber: detail.phoneNumber,
    callType,
    startTime: detail.startTime,
    endTime: detail.completedAt,
    duration,
    deviceCallLogId: detail.callLogId !== undefined && detail.callLogId !== null
      ? String(detail.callLogId)
      : undefined,
  };

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
