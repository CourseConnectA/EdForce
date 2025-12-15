import { Capacitor } from '@capacitor/core';
import callLoggingService from './callLoggingService';

class NativeDialerService {
  // No plugin usage; native PhoneStateListener in MainActivity dispatches events
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private provisionalTimer: NodeJS.Timeout | null = null;
  private hasFinalDispatch = false;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private visibilityHandlerRegistered = false;
  private nativeEventHandler: ((e: any) => void) | null = null;

  async start() {
    if (this.isRunning) {
      console.log('Dialer service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Native Dialer service started');

    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Not running on native platform');
      return;
    }

    console.log('📱 Platform:', Capacitor.getPlatform());
    console.log('ℹ️ Using default Android dialer (tel:) and native-call-finished events');

    // Start monitoring & native listener events regardless (MainActivity handles duration)
    this.startMonitoring();
    this.registerVisibilityHandler();
    
    // The native side will auto-sync call logs and dispatch events
    // We just need to handle them here
    
    // Store the handler so we can remove it on stop
    this.nativeEventHandler = (e: any) => {
      const detail = e?.detail ?? {};
      const source = typeof detail.source === 'string' ? detail.source : 'unknown';
      const rawDuration = detail.duration;
      const duration = typeof rawDuration === 'number' && Number.isFinite(rawDuration)
        ? Math.max(0, rawDuration)
        : NaN;

      if (Number.isNaN(duration)) {
        console.log('Ignoring native-call-finished event without numeric duration:', detail);
        return;
      }

      // Handle incoming-sync events (incoming calls detected on app resume)
      if (source === 'incoming-sync' || source === 'bulk-sync') {
        console.log('📥 Incoming call sync event received:', detail);
        this.handleIncomingCallSync(detail, duration);
        return;
      }

      if (this.hasFinalDispatch && source !== 'incoming-sync') {
        console.log('Call already finalized, ignoring subsequent native event from source:', source);
        return;
      }

      console.log('🛰️ Native call finished event received. Duration:', duration, 'seconds', 'source:', source);

      if (source === 'calllog') {
        this.handleCallLogDetail(detail, duration);
        return;
      }

      // Ignore any non-calllog events
      console.log('Ignoring non-calllog native event');
    };
    
    window.addEventListener('native-call-finished', this.nativeEventHandler);
  }

  private async handleIncomingCallSync(detail: any, duration: number) {
    // Handle incoming calls from leads - try to match by phone number
    const phoneNumber = detail.phoneNumber;
    const callLogType = detail.callLogType;
    const callLogId = detail.callLogId;
    const callLogDate = detail.callLogDate;

    if (!phoneNumber) {
      console.log('No phone number in incoming sync event');
      return;
    }

    // Determine call type based on Android call log type
    // Type 1 = INCOMING, Type 3 = MISSED, Type 5 = REJECTED
    const isIncoming = callLogType === 1;
    const isMissed = callLogType === 3 || callLogType === 5 || callLogType === 7;

    console.log('📥 Processing incoming call:', { phoneNumber, callLogType, duration, isIncoming, isMissed });

    const startTimeIso = callLogDate ? new Date(callLogDate).toISOString() : new Date().toISOString();
    const completedAtIso = callLogDate ? new Date(callLogDate + duration * 1000).toISOString() : new Date().toISOString();

    try {
      // Log this incoming call to the backend
      // The backend will need to find the lead by phone number
      await callLoggingService.logNativeCall({
        leadId: undefined, // Will be resolved by backend via phone number lookup
        phoneNumber,
        startTime: startTimeIso,
        completedAt: completedAtIso,
        duration,
        callLogType,
        callLogId,
        source: 'incoming-sync',
      });
      console.log('✅ Incoming call logged successfully');
    } catch (err) {
      console.error('Failed to log incoming call:', err);
    }
  }

  private startMonitoring() {
    // Check for completed calls every 3 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkForCompletedCall();
    }, 3000);

    console.log('👀 Monitoring for completed calls...');
  }

  private async checkForCompletedCall() {
    // No polling of plugin; duration comes via native events. Keep interval for possible future extensions.
  }

  async initiateCall(phoneNumber: string): Promise<boolean> {
    console.log('📞 Initiating call request for', phoneNumber);
    this.resetProvisionalState();
    // Reduced fallback time from 20s to 8s for faster missed call detection
    this.scheduleFallbackPrompt(8000);

    // Use default dialer (tel:). Native listener will capture duration.
    // Use dynamic anchor element approach to avoid WebView caching issues
    try {
      console.log('🔁 Using tel: via anchor element (avoids cache)');
      const telUri = `tel:${phoneNumber}`;
      const anchor = document.createElement('a');
      anchor.href = telUri;
      anchor.style.display = 'none';
      // Add unique attribute to prevent any caching
      anchor.setAttribute('data-call-timestamp', Date.now().toString());
      document.body.appendChild(anchor);
      anchor.click();
      // Clean up after a short delay
      setTimeout(() => {
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
      }, 100);
      return true;
    } catch (err) {
      console.error('❌ tel: launch failed', err);
      // Fallback to location.href as last resort
      try {
        window.location.href = `tel:${phoneNumber}`;
        return true;
      } catch (e2) {
        console.error('❌ Fallback location.href also failed', e2);
        return false;
      }
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.resetProvisionalState();
    this.unregisterVisibilityHandler();
    
    // Remove native event listener
    if (this.nativeEventHandler) {
      window.removeEventListener('native-call-finished', this.nativeEventHandler);
      this.nativeEventHandler = null;
    }
    
    this.isRunning = false;
    console.log('⏹️ Dialer service stopped');
  }

  private resetProvisionalState() {
    if (this.provisionalTimer) {
      clearTimeout(this.provisionalTimer);
      this.provisionalTimer = null;
    }
    this.hasFinalDispatch = false;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private handleCallLogDetail(detail: any, duration: number) {
    if (this.provisionalTimer) {
      clearTimeout(this.provisionalTimer);
      this.provisionalTimer = null;
    }

    const callLogDate = typeof detail.callLogDate === 'number' ? detail.callLogDate : undefined;
    const callLogType = typeof detail.callLogType === 'number' ? detail.callLogType : undefined;
    const phoneNumberFromLog = typeof detail.phoneNumber === 'string' ? detail.phoneNumber : undefined;
    const callLogId = typeof detail.callLogId === 'number' ? detail.callLogId : undefined;

    // Check if this is an incoming call (Type 1 = INCOMING, Type 3 = MISSED, Type 5 = REJECTED)
    const isIncomingCall = callLogType === 1 || callLogType === 3 || callLogType === 5;
    
    // Check if we have a pending outgoing call
    let hasPendingCall = false;
    try {
      const pendingRaw = sessionStorage.getItem('pendingCall');
      hasPendingCall = !!pendingRaw;
    } catch {
      // ignore
    }

    // If this is an incoming call and we don't have a pending outgoing call,
    // treat it as an incoming call from a lead
    if (isIncomingCall && !hasPendingCall) {
      console.log('📥 Detected incoming call from call log:', { callLogType, duration, phoneNumber: phoneNumberFromLog });
      this.handleIncomingCallFromLog(detail, duration);
      return;
    }

    // Otherwise, it's an outgoing call - process normally
    void this.finalizeCall(duration, 'calllog', {
      callLogDate,
      callLogType,
      phoneNumberFromLog,
      callLogId,
    });
  }

  private async handleIncomingCallFromLog(detail: any, duration: number) {
    const phoneNumber = detail.phoneNumber;
    const callLogType = detail.callLogType;
    const callLogId = detail.callLogId;
    const callLogDate = detail.callLogDate;

    if (!phoneNumber) {
      console.log('No phone number in incoming call log event');
      return;
    }

    console.log('📥 Processing incoming call from log:', { phoneNumber, callLogType, duration });

    const startTimeIso = callLogDate ? new Date(callLogDate).toISOString() : new Date().toISOString();
    const completedAtIso = callLogDate ? new Date(callLogDate + duration * 1000).toISOString() : new Date().toISOString();

    try {
      // Log this incoming call to the backend
      // The backend will find the lead by phone number
      const result = await callLoggingService.logNativeCall({
        leadId: undefined, // Will be resolved by backend via phone number lookup
        phoneNumber,
        startTime: startTimeIso,
        completedAt: completedAtIso,
        duration,
        callLogType,
        callLogId,
        source: 'calllog-incoming',
      });
      
      if (result) {
        console.log('✅ Incoming call logged successfully:', result);
        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('call-completed', { 
          detail: {
            phoneNumber,
            duration,
            startTime: startTimeIso,
            completedAt: completedAtIso,
            callLogType,
            callId: result.id,
            source: 'calllog-incoming',
          }
        }));
      }
    } catch (err) {
      console.error('Failed to log incoming call:', err);
    }
  }

  private async finalizeCall(
    duration: number,
    source: string,
    extra?: { callLogDate?: number; callLogType?: number; phoneNumberFromLog?: string; callLogId?: number }
  ) {
    if (this.hasFinalDispatch) {
      return;
    }

    let phoneNumber: string | undefined;
    let leadId: string | undefined;
    let startTimeIso: string | undefined;

    try {
      const pendingRaw = sessionStorage.getItem('pendingCall');
      if (pendingRaw) {
        const parsed = JSON.parse(pendingRaw);
        phoneNumber = parsed.phoneNumber;
        leadId = parsed.leadId;
        startTimeIso = parsed.startTime;
      }
    } catch (err) {
      console.warn('Failed to parse pendingCall payload:', err);
    }

    if (!phoneNumber && extra?.phoneNumberFromLog) {
      phoneNumber = extra.phoneNumberFromLog;
    }

    const callLogDate = extra?.callLogDate;
    if (!startTimeIso && typeof callLogDate === 'number' && callLogDate > 0) {
      startTimeIso = new Date(callLogDate).toISOString();
    }
    if (!startTimeIso) {
      startTimeIso = new Date(Date.now() - duration * 1000).toISOString();
    }

    const completedAtIso = (() => {
      if (typeof callLogDate === 'number' && callLogDate > 0) {
        return new Date(callLogDate + duration * 1000).toISOString();
      }
      return new Date().toISOString();
    })();

    const detail: any = {
      phoneNumber,
      leadId,
      duration,
      startTime: startTimeIso,
      completedAt: completedAtIso,
      source,
    };

    if (extra?.callLogType !== undefined) {
      detail.callLogType = extra.callLogType;
    }
    if (extra?.callLogId !== undefined) {
      detail.callLogId = extra.callLogId;
    }

    if (source === 'calllog') {
      try {
        const persisted = await callLoggingService.logNativeCall({
          leadId,
          phoneNumber,
          startTime: startTimeIso,
          completedAt: completedAtIso,
          duration,
          callLogType: extra?.callLogType,
          callLogId: extra?.callLogId,
          source,
        });
        if (persisted?.id) {
          detail.callId = persisted.id;
        }
      } catch (err) {
        console.error('Automatic call log persistence failed:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('call-completed', { detail }));
    sessionStorage.removeItem('pendingCall');

    console.log('✅ Dispatched call-completed event from source:', source, 'duration:', duration);

    this.hasFinalDispatch = true;

    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private scheduleFallbackPrompt(delayMs: number = 8000) {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }

    if (this.hasFinalDispatch) {
      return;
    }

    try {
      const pendingRaw = sessionStorage.getItem('pendingCall');
      if (!pendingRaw) {
        return;
      }
    } catch {
      return;
    }

    this.fallbackTimer = setTimeout(() => {
      if (this.hasFinalDispatch) {
        return;
      }

      console.warn('⚠️ No native call-finished event received within fallback window. Triggering manual disposition prompt.');

      let fallbackDetail: any | null = null;
      try {
        const pendingRaw = sessionStorage.getItem('pendingCall');
        if (pendingRaw) {
          const parsed = JSON.parse(pendingRaw);
          fallbackDetail = {
            phoneNumber: parsed.phoneNumber,
            leadId: parsed.leadId,
            startTime: parsed.startTime,
          };
        }
      } catch (err) {
        console.warn('Failed to parse pendingCall during fallback prompt:', err);
      }

      if (!fallbackDetail) {
        console.warn('No pending call context when fallback triggered.');
        return;
      }

      const detail = {
        ...fallbackDetail,
        duration: 0,
        completedAt: new Date().toISOString(),
        source: 'fallback',
      };

      window.dispatchEvent(new CustomEvent('call-completed', { detail }));
      console.log('✅ Dispatched fallback call-completed event (duration 0).');
      this.hasFinalDispatch = true;
      sessionStorage.removeItem('pendingCall');
    }, delayMs);
  }

  private registerVisibilityHandler() {
    if (typeof document === 'undefined' || this.visibilityHandlerRegistered) {
      return;
    }

    const handler = () => {
      if (document.visibilityState === 'visible') {
        // Reduced from 24s to 8s for faster response
        this.scheduleFallbackPrompt(8000);
      } else {
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handler);
    (this as any)._visibilityHandler = handler;
    this.visibilityHandlerRegistered = true;
  }

  private unregisterVisibilityHandler() {
    if (!this.visibilityHandlerRegistered || typeof document === 'undefined') {
      return;
    }

    const handler = (this as any)._visibilityHandler;
    if (handler) {
      document.removeEventListener('visibilitychange', handler);
    }
    delete (this as any)._visibilityHandler;
    this.visibilityHandlerRegistered = false;
  }
}

// Create and export singleton instance
const nativeDialerService = new NativeDialerService();
export default nativeDialerService;
