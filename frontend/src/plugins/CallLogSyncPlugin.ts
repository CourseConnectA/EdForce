import { registerPlugin } from '@capacitor/core';

export interface CallLogEntry {
  id: number;
  duration: number;
  date: number; // Unix timestamp in ms
  type: number; // 1=INCOMING, 2=OUTGOING, 3=MISSED, 5=REJECTED
  number: string;
}

export interface CallLogSyncResult {
  callLogs: CallLogEntry[];
  error?: string;
}

export interface CallLogSyncPluginInterface {
  getCallLogs(options: { daysBack: number }): Promise<CallLogSyncResult>;
}

const CallLogSyncPlugin = registerPlugin<CallLogSyncPluginInterface>('CallLogSync');

export default CallLogSyncPlugin;
