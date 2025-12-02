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

  // Get analytics (daily/monthly)
  async getAnalytics(params?: { period?: 'daily' | 'monthly'; startDate?: string; endDate?: string }): Promise<CallAnalytics[]> {
    const response = await apiService.get('/calls/analytics', { params });
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
    // Web/browser fallback
    console.log('🌐 Using tel: URI fallback (web)');
    window.location.href = `tel:${phoneNumber}`;
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
