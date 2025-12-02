// Android Call Log Sync Service
// This service monitors Android's native call log and syncs completed calls to the CRM

import callsService from '@/services/callsService';
import { Capacitor } from '@capacitor/core';

interface PendingCall {
  phoneNumber: string;
  leadId: string;
  startTime: string;
}

interface CallLogPlugin {
  checkPermission(): Promise<void>;
  requestPermission(): Promise<void>;
  getRecentCalls(options: { phoneNumber: string; sinceTimestamp: number }): Promise<{ calls: Array<{
    id: string;
    number: string;
    type: string;
    date: number;
    duration: number;
    name?: string;
  }> }>;
}

class AndroidCallSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncedCallId: string | null = null;
  private isRunning = false;
  private callLogPlugin: CallLogPlugin | null = null;

  // Start monitoring call log
  async start(): Promise<void> {
    if (this.isRunning) return;
    if (!callsService.isAndroid()) {
      console.log('Call sync service: Not Android, skipping');
      return;
    }

    this.isRunning = true;
    console.log('Android call sync service started');

    // This service is deprecated - using nativeDialerService instead
    console.log('⚠️ androidCallSyncService is deprecated, use nativeDialerService');

    // Listen for app visibility changes (user returning from phone app)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Check for completed calls every 5 seconds
    this.syncInterval = setInterval(() => {
      this.checkAndSyncCalls();
    }, 5000);

    // Also check immediately
    this.checkAndSyncCalls();
  }

  // Request CallLog permission
  async requestCallLogPermission(): Promise<boolean> {
    if (!this.callLogPlugin) {
      console.warn('❌ CallLog plugin not available');
      return false;
    }

    try {
      console.log('🔐 Requesting CallLog permission...');
      const result = await this.callLogPlugin.requestPermission();
      console.log('✅ CallLog permission granted:', result);
      
      // Show success message
      setTimeout(() => {
        alert('✅ Call log permission granted! Call durations will now be tracked automatically.');
      }, 500);
      
      return true;
    } catch (error) {
      console.error('❌ CallLog permission denied:', error);
      alert('⚠️ Call log permission was denied. Automatic call duration tracking will not work.\n\nTo enable: Settings > Apps > Edforce > Permissions > Phone > Allow');
      return false;
    }
  }

  // Handle visibility change (user returning to app)
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      console.log('App became visible, checking for completed calls');
      this.checkAndSyncCalls();
    }
  };

  // Stop monitoring
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.isRunning = false;
    console.log('Android call sync service stopped');
  }

  // Check for new completed calls and sync
  private async checkAndSyncCalls(): Promise<void> {
    try {
      // Get pending call context from session storage
      const pendingStr = sessionStorage.getItem('pendingCall');
      if (!pendingStr) return;

      const pending: PendingCall = JSON.parse(pendingStr);
      const elapsedSeconds = Math.floor((Date.now() - new Date(pending.startTime).getTime()) / 1000);
      
      console.log(`🔍 [${elapsedSeconds}s] Checking for completed call to ${pending.phoneNumber}`);

      // Only check if on native Android platform
      if (!this.callLogPlugin || !Capacitor.isNativePlatform()) {
        console.log('⚠️ Not on native Android platform, waiting for visibility change...');
        // Web fallback: wait for user to return
        if (document.visibilityState === 'visible' && elapsedSeconds > 15) {
          console.log('📝 Web mode: Showing manual entry modal');
          this.promptForCallOutcome(pending, 0);
          sessionStorage.removeItem('pendingCall');
        }
        return;
      }

      // Must wait at least 15 seconds before checking (call needs to complete and sync)
      if (elapsedSeconds < 15) {
        return;
      }

      try {
        // Step 1: Check permission
        console.log('🔐 Step 1: Checking READ_CALL_LOG permission...');
        try {
          await this.callLogPlugin.checkPermission();
          console.log('✅ Permission granted');
        } catch (permError: any) {
          console.error('❌ Permission denied:', permError);
          console.log('📝 Showing manual entry modal (no permission)');
          this.promptForCallOutcome(pending, 0);
          sessionStorage.removeItem('pendingCall');
          alert('⚠️ Call log permission denied.\n\nTo get automatic call duration:\n1. Open Settings\n2. Go to Apps > Edforce\n3. Tap Permissions > Phone\n4. Enable "Allow"');
          return;
        }

        // Step 2: Query CallLog
        const sinceTimestamp = new Date(pending.startTime).getTime();
        console.log(`🔍 Step 2: Querying CallLog for calls since ${new Date(sinceTimestamp).toISOString()}`);
        console.log(`   Looking for number: ${pending.phoneNumber}`);
        
        const result = await this.callLogPlugin.getRecentCalls({
          phoneNumber: pending.phoneNumber,
          sinceTimestamp: sinceTimestamp
        });

        console.log('✅ CallLog query succeeded, parsing results...');
        
        // Step 3: Parse results
        const calls = typeof result.calls === 'string' ? JSON.parse(result.calls) : result.calls;
        console.log(`📞 Found ${calls?.length || 0} call(s) in CallLog`);
        
        if (!calls || calls.length === 0) {
          console.log('⚠️ No calls found yet, will retry in 5 seconds...');
          return; // Keep checking
        }

        // Step 4: Process the most recent call
        const latestCall = calls[0];
        console.log('📞 Latest call details:', {
          id: latestCall.id,
          number: latestCall.number,
          type: latestCall.type,
          duration: latestCall.duration,
          date: new Date(latestCall.date).toISOString()
        });

        // Step 5: Verify call has duration
        if (latestCall.duration > 0) {
          console.log(`✅ Call connected! Duration: ${latestCall.duration} seconds`);
          
          // Auto-log the call
          await this.autoLogCall({
            phoneNumber: pending.phoneNumber,
            leadId: pending.leadId,
            callType: latestCall.type as 'outgoing' | 'incoming' | 'missed',
            startTime: new Date(latestCall.date).toISOString(),
            endTime: new Date(latestCall.date + latestCall.duration * 1000).toISOString(),
            duration: latestCall.duration,
            deviceCallLogId: latestCall.id,
          });
          
          console.log('📝 Showing disposition modal with actual duration:', latestCall.duration);
          this.promptForCallOutcome(pending, latestCall.duration);
          sessionStorage.removeItem('pendingCall');
        } else if (latestCall.type === 'missed') {
          console.log('🚫 Call was missed (not answered)');
          await this.autoLogCall({
            phoneNumber: pending.phoneNumber,
            leadId: pending.leadId,
            callType: 'missed',
            startTime: new Date(latestCall.date).toISOString(),
            duration: 0,
            deviceCallLogId: latestCall.id,
          });
          sessionStorage.removeItem('pendingCall');
        } else {
          console.log('⚠️ Call found but duration is 0 (might still be ringing or just ended)');
          // Keep checking
        }
      } catch (error: any) {
        console.error('❌ CallLog query failed:', error);
        console.log('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // After 30 seconds of trying, give up and show manual entry
        if (elapsedSeconds > 30) {
          console.log('⏱️ Timeout: Showing manual entry modal');
          this.promptForCallOutcome(pending, 0);
          sessionStorage.removeItem('pendingCall');
        }
      }
    } catch (error) {
      console.error('❌ Error in checkAndSyncCalls:', error);
    }
  }

  // Prompt user for call outcome
  private promptForCallOutcome(pending: PendingCall, actualDuration?: number): void {
    console.log('📋 Opening call disposition modal:', {
      phoneNumber: pending.phoneNumber,
      leadId: pending.leadId,
      duration: actualDuration ? `${actualDuration}s` : 'not provided (manual entry required)'
    });
    
    // Dispatch custom event to show disposition modal
    const event = new CustomEvent('call-completed', {
      detail: {
        phoneNumber: pending.phoneNumber,
        leadId: pending.leadId,
        startTime: pending.startTime,
        duration: actualDuration, // Pass actual duration from CallLog
      },
    });
    window.dispatchEvent(event);
  }

  // Native Android call log query (pseudo-code for Capacitor plugin)
  /*
  private async queryAndroidCallLog(phoneNumber: string, since: Date): Promise<any[]> {
    // This would use a Capacitor plugin like:
    // import { CallLog } from '@capacitor-community/call-log';
    
    const calls = await CallLog.query({
      phoneNumber: phoneNumber,
      fromDate: since.getTime(),
      limit: 10,
    });
    
    return calls.filter(call => {
      return call.duration > 0 && // Completed calls only
             !this.processedCallIds.has(call.id); // Not already synced
    });
  }
  */

  // Auto-log call from Android CallLog data
  async autoLogCall(callData: {
    phoneNumber: string;
    leadId: string;
    callType: 'outgoing' | 'incoming' | 'missed';
    startTime: string;
    endTime?: string;
    duration: number;
    deviceCallLogId: string;
  }): Promise<void> {
    try {
      // Skip if already processed
      if (this.lastSyncedCallId === callData.deviceCallLogId) {
        console.log('Call already logged, skipping:', callData.deviceCallLogId);
        return;
      }

      await callsService.logCall(callData);
      console.log('Call auto-logged:', callData.deviceCallLogId);
      this.lastSyncedCallId = callData.deviceCallLogId;
    } catch (error) {
      console.error('Failed to auto-log call:', error);
    }
  }
}

export default new AndroidCallSyncService();
