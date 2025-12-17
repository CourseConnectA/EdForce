import { registerPlugin } from '@capacitor/core';

export interface DialerResult {
  success: boolean;
  phoneNumber?: string;
  error?: string;
}

export interface DialerPluginInterface {
  /**
   * Open the dialer with the phone number pre-filled (ACTION_DIAL)
   * User must press call button to initiate the call.
   * This avoids caching issues on Xiaomi and other custom Android UIs.
   */
  openDialer(options: { phoneNumber: string }): Promise<DialerResult>;
  
  /**
   * Initiate a call directly (ACTION_CALL)
   * Requires CALL_PHONE permission.
   */
  initiateCall(options: { phoneNumber: string }): Promise<DialerResult>;
  
  /**
   * Check if required permissions are granted
   */
  checkPermission(): Promise<{ granted: boolean; phonePermission: boolean; phoneStatePermission: boolean }>;
  
  /**
   * Request required permissions
   */
  requestPermission(): Promise<{ granted: boolean; phonePermission: boolean; phoneStatePermission: boolean }>;
  
  /**
   * Get the duration of the last call
   */
  getLastCallDuration(): Promise<{ duration: number; number: string; isActive: boolean }>;
}

const DialerPlugin = registerPlugin<DialerPluginInterface>('Dialer');

export default DialerPlugin;
