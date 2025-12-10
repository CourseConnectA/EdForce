import { Capacitor } from '@capacitor/core';
import CallLogSyncPlugin, { CallLogEntry } from '../plugins/CallLogSyncPlugin';
import apiService from './apiService';

/**
 * Android CallLog.Calls.TYPE values:
 * 1 = INCOMING_TYPE - Answered incoming call
 * 2 = OUTGOING_TYPE - Outgoing call
 * 3 = MISSED_TYPE - Missed incoming call
 * 5 = REJECTED_TYPE - Rejected incoming call
 */
const mapCallLogTypeToCallType = (
  callLogType: number,
  duration: number,
): 'outgoing' | 'incoming' | 'missed' => {
  switch (callLogType) {
    case 1: // INCOMING_TYPE - answered incoming call
      return 'incoming';
    case 2: // OUTGOING_TYPE
      return 'outgoing';
    case 3: // MISSED_TYPE
    case 5: // REJECTED_TYPE
      return 'missed';
    default:
      return duration > 0 ? 'incoming' : 'missed';
  }
};

export interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
}

class CallLogSyncService {
  private isSyncing = false;

  async syncCallLogs(daysBack: number = 7): Promise<SyncResult> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Call log sync only works on native platform');
      return { total: 0, synced: 0, skipped: 0, failed: 0, errors: ['Not on native platform'] };
    }

    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { total: 0, synced: 0, skipped: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    const result: SyncResult = { total: 0, synced: 0, skipped: 0, failed: 0, errors: [] };

    try {
      console.log(`📲 Starting call log sync for last ${daysBack} days...`);
      
      // Get call logs from native plugin
      const { callLogs, error } = await CallLogSyncPlugin.getCallLogs({ daysBack });
      
      if (error) {
        console.error('Plugin error:', error);
        result.errors.push(error);
        return result;
      }

      result.total = callLogs.length;
      console.log(`📋 Found ${callLogs.length} call logs to process`);

      // Process each call log
      for (const log of callLogs) {
        try {
          const syncResult = await this.syncSingleCall(log);
          if (syncResult === 'synced') {
            result.synced++;
          } else if (syncResult === 'skipped') {
            result.skipped++;
          } else {
            result.failed++;
          }
        } catch (err) {
          result.failed++;
          result.errors.push(`Failed to sync call ${log.id}: ${err}`);
        }
      }

      console.log(`✅ Sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed`);
      
      return result;
    } catch (err) {
      console.error('Call log sync failed:', err);
      result.errors.push(`Sync failed: ${err}`);
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncSingleCall(log: CallLogEntry): Promise<'synced' | 'skipped' | 'failed'> {
    if (!log.number) {
      console.log(`Skipping call ${log.id}: no phone number`);
      return 'skipped';
    }

    const callType = mapCallLogTypeToCallType(log.type, log.duration);
    const startTime = new Date(log.date).toISOString();
    const endTime = new Date(log.date + log.duration * 1000).toISOString();

    const payload = {
      phoneNumber: log.number,
      callType,
      startTime,
      endTime,
      duration: log.duration,
      deviceCallLogId: String(log.id),
    };

    try {
      const response = await apiService.post('/calls/log', payload);
      if (response === null) {
        // No lead found for this number
        return 'skipped';
      }
      return 'synced';
    } catch (err: any) {
      // Check if it's a duplicate (already synced)
      if (err?.response?.status === 409 || err?.message?.includes('duplicate')) {
        return 'skipped';
      }
      throw err;
    }
  }

  get isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }
}

const callLogSyncService = new CallLogSyncService();
export default callLogSyncService;
