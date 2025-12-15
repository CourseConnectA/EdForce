import apiService from './apiService';
import nativeDialerService from './nativeDialerService';
import { Capacitor } from '@capacitor/core';

export interface CallLog {
  id: string;
  leadId: string;
  phoneNumber: string;
  callType: 'outgoing' | 'incoming' | 'missed';
  startTime: string;
  endTime?: string;
  duration: number;
  disposition?: string;
  notes?: string;
  userName?: string;
  userId?: string;
  userRole?: string;
  userRoleLabel?: string | null;
  status?: string;
  centerName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallAnalytics {
  centerName?: string;
  userId?: string;
  userName?: string;
  totalCalls: number;
  totalDuration: number;
  avgDuration: number;
}

export interface CallDirectionStats {
  // Total counts
  totalCalls: number;
  totalInbound: number;
  totalOutbound: number;
  totalMissed: number;
  
  // Answered/Unanswered by direction
  inboundAnswered: number;
  inboundUnanswered: number;
  outboundAnswered: number;
  outboundUnanswered: number;
  
  // Total answered/unanswered
  totalAnswered: number;
  totalUnanswered: number;
  
  // Unique counts (unique lead/phone combinations)
  uniqueInboundAnswered: number;
  uniqueInboundUnanswered: number;
  uniqueOutboundAnswered: number;
  uniqueOutboundUnanswered: number;
  uniqueAnswered: number;
  uniqueUnanswered: number;
  
  // Duration stats
  totalDuration: number;
  avgDuration: number;
}

export interface CallAnalyticsResponse {
  summary: CallDirectionStats;
  breakdown: CallAnalytics[];
}

class CallsService {
  // Log a call from device
  async logCall(data: {
    leadId: string;
    phoneNumber: string;
    callType: 'outgoing' | 'incoming' | 'missed';
    startTime: Date | string;
    endTime?: Date | string;
    duration?: number;
    deviceCallLogId?: string;
    disposition?: string;
    notes?: string;
  }): Promise<CallLog> {
    const response = await apiService.post('/calls/log', data);
    return response;
  }

  // Get call logs for a specific lead
  async getCallLogsForLead(leadId: string): Promise<CallLog[]> {
    const response = await apiService.get(`/calls/lead/${leadId}`);
    return response;
  }

  // Update disposition and notes after call
  async updateDisposition(callId: string, data: { disposition?: string; notes?: string }): Promise<CallLog> {
    const response = await apiService.patch(`/calls/${callId}/disposition`, data);
    return response;
  }

  // Get analytics (daily/monthly) - returns summary with direction breakdown and user/center breakdown
  async getAnalytics(params?: { period?: 'daily' | 'monthly'; startDate?: string; endDate?: string }): Promise<CallAnalyticsResponse> {
    const response = await apiService.get('/calls/analytics', { params });
    // Handle both old format (array) and new format (object with summary + breakdown)
    if (Array.isArray(response)) {
      // Legacy format - convert to new format
      const totalCalls = response.reduce((sum, r) => sum + r.totalCalls, 0);
      const totalDuration = response.reduce((sum, r) => sum + r.totalDuration, 0);
      return {
        summary: {
          totalCalls,
          totalInbound: 0,
          totalOutbound: totalCalls,
          totalMissed: 0,
          inboundAnswered: 0,
          inboundUnanswered: 0,
          outboundAnswered: totalCalls,
          outboundUnanswered: 0,
          totalAnswered: totalCalls,
          totalUnanswered: 0,
          uniqueInboundAnswered: 0,
          uniqueInboundUnanswered: 0,
          uniqueOutboundAnswered: totalCalls,
          uniqueOutboundUnanswered: 0,
          uniqueAnswered: totalCalls,
          uniqueUnanswered: 0,
          totalDuration,
          avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        },
        breakdown: response,
      };
    }
    return response;
  }

  // Batch sync calls
  async batchSync(calls: Array<any>): Promise<Array<{ success: boolean; id?: string; error?: string }>> {
    const response = await apiService.post('/calls/batch-sync', { calls });
    return response;
  }

  // Android-specific: Initiate call via native plugin or tel: URI
  async initiateCall(phoneNumber: string, leadId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const callData = {
      phoneNumber,
      leadId,
      startTime: new Date().toISOString(),
    };

    // Store call context for later tracking
    sessionStorage.setItem('pendingCall', JSON.stringify(callData));
    console.log('📞 CALL INITIATED:', callData);
    console.log('📞 Stored in sessionStorage, launching dialer...');

    // Always attempt native service (it internally falls back to tel:)
    if (Capacitor.isNativePlatform()) {
      console.log('🚀 Using native dialer service (will fallback if plugin absent)');
      await nativeDialerService.initiateCall(phoneNumber);
      return;
    }
    // Web/browser fallback - use anchor element to avoid caching
    console.log('🌐 Using tel: URI fallback (web) via anchor element');
    const telUri = `tel:${phoneNumber}`;
    const anchor = document.createElement('a');
    anchor.href = telUri;
    anchor.style.display = 'none';
    anchor.setAttribute('data-call-timestamp', Date.now().toString());
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 100);
  }

  // Check if running on Android
  isAndroid(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /android/i.test(navigator.userAgent);
  }

  // Request Android permissions (placeholder - actual implementation via Capacitor/Cordova)
  async requestPermissions(): Promise<boolean> {
    // In a real Android app using Capacitor/Cordova:
    // - Request CALL_PHONE permission
    // - Request READ_CALL_LOG permission
    // For web version, return true
    return true;
  }
}

export default new CallsService();
