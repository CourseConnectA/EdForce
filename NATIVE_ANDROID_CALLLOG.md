# Native Android CallLog Integration Guide

## Overview
This guide explains how to implement automatic call logging using Android's native CallLog API with Capacitor.

## Current Implementation
The current implementation in `androidCallSyncService.ts` uses:
- Timer-based polling (every 5 seconds)
- Visibility change detection (when user returns to app)
- Session storage to track pending calls
- Manual call disposition entry via modal

## Native Android Implementation

### Prerequisites
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor-community/call-number
```

### Step 1: Create Capacitor Plugin for CallLog Access

Create `android/app/src/main/java/com/yourapp/CallLogPlugin.java`:

```java
package com.yourapp.plugins;

import android.Manifest;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CallLog;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import org.json.JSONException;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_CALL_LOG },
            alias = "callLog"
        )
    }
)
public class CallLogPlugin extends Plugin {

    @PluginMethod
    public void checkPermission(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(
            getContext(), 
            Manifest.permission.READ_CALL_LOG
        ) == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(
            getContext(), 
            Manifest.permission.READ_CALL_LOG
        ) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("callLog", call, "callLogPermissionCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void queryCallLog(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        Long fromDate = call.getLong("fromDate");
        Integer limit = call.getInt("limit", 10);

        if (ActivityCompat.checkSelfPermission(
            getContext(), 
            Manifest.permission.READ_CALL_LOG
        ) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permission not granted");
            return;
        }

        try {
            List<JSObject> calls = getRecentCalls(phoneNumber, fromDate, limit);
            JSArray callsArray = new JSArray();
            for (JSObject callObj : calls) {
                callsArray.put(callObj);
            }
            JSObject ret = new JSObject();
            ret.put("calls", callsArray);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error querying call log", e);
        }
    }

    private List<JSObject> getRecentCalls(String phoneNumber, Long fromDate, int limit) {
        List<JSObject> callsList = new ArrayList<>();
        ContentResolver cr = getContext().getContentResolver();
        
        String[] projection = new String[] {
            CallLog.Calls._ID,
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION,
            CallLog.Calls.CACHED_NAME
        };

        String selection = null;
        String[] selectionArgs = null;

        if (phoneNumber != null && !phoneNumber.isEmpty()) {
            selection = CallLog.Calls.NUMBER + " = ?";
            selectionArgs = new String[] { phoneNumber };
            
            if (fromDate != null) {
                selection += " AND " + CallLog.Calls.DATE + " >= ?";
                selectionArgs = new String[] { phoneNumber, fromDate.toString() };
            }
        } else if (fromDate != null) {
            selection = CallLog.Calls.DATE + " >= ?";
            selectionArgs = new String[] { fromDate.toString() };
        }

        String sortOrder = CallLog.Calls.DATE + " DESC LIMIT " + limit;

        Cursor cursor = cr.query(
            CallLog.Calls.CONTENT_URI,
            projection,
            selection,
            selectionArgs,
            sortOrder
        );

        if (cursor != null) {
            while (cursor.moveToNext()) {
                JSObject callObj = new JSObject();
                callObj.put("id", cursor.getString(0));
                callObj.put("number", cursor.getString(1));
                callObj.put("type", cursor.getInt(2)); // 1=INCOMING, 2=OUTGOING, 3=MISSED
                callObj.put("date", cursor.getLong(3));
                callObj.put("duration", cursor.getInt(4));
                callObj.put("name", cursor.getString(5));
                callsList.add(callObj);
            }
            cursor.close();
        }

        return callsList;
    }
}
```

### Step 2: Register Plugin in MainActivity

Edit `android/app/src/main/java/com/yourapp/MainActivity.java`:

```java
import com.yourapp.plugins.CallLogPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(CallLogPlugin.class);
    }
}
```

### Step 3: Update AndroidManifest.xml

Add permission to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_CALL_LOG" />
```

### Step 4: Create TypeScript Definitions

Create `src/plugins/callLog.ts`:

```typescript
import { registerPlugin } from '@capacitor/core';

export interface CallLogPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  queryCallLog(options: {
    phoneNumber?: string;
    fromDate?: number;
    limit?: number;
  }): Promise<{
    calls: Array<{
      id: string;
      number: string;
      type: number; // 1=INCOMING, 2=OUTGOING, 3=MISSED
      date: number; // Unix timestamp in milliseconds
      duration: number; // Duration in seconds
      name: string | null;
    }>;
  }>;
}

const CallLog = registerPlugin<CallLogPlugin>('CallLog');

export default CallLog;
```

### Step 5: Update androidCallSyncService.ts

Replace the commented pseudo-code with actual implementation:

```typescript
import CallLog from '@/plugins/callLog';

class AndroidCallSyncService {
  // ... existing code ...

  // Query Android CallLog for recent calls
  private async queryAndroidCallLog(
    phoneNumber: string, 
    since: Date
  ): Promise<any[]> {
    try {
      // Check permission first
      const { granted } = await CallLog.checkPermission();
      if (!granted) {
        const result = await CallLog.requestPermission();
        if (!result.granted) {
          console.warn('CallLog permission not granted');
          return [];
        }
      }

      // Query call log
      const { calls } = await CallLog.queryCallLog({
        phoneNumber: phoneNumber,
        fromDate: since.getTime(),
        limit: 10,
      });

      // Filter completed calls only (duration > 0)
      return calls.filter(call => call.duration > 0);
    } catch (error) {
      console.error('Error querying Android CallLog:', error);
      return [];
    }
  }

  // Updated checkAndSyncCalls with native integration
  private async checkAndSyncCalls(): Promise<void> {
    try {
      const pendingStr = sessionStorage.getItem('pendingCall');
      if (!pendingStr) return;

      const pending: PendingCall = JSON.parse(pendingStr);

      // Query native Android CallLog
      const recentCalls = await this.queryAndroidCallLog(
        pending.phoneNumber, 
        new Date(pending.startTime)
      );

      if (recentCalls.length > 0) {
        const call = recentCalls[0];
        
        // Determine call type
        let callType: 'outgoing' | 'incoming' | 'missed';
        if (call.type === 1) callType = 'incoming';
        else if (call.type === 2) callType = 'outgoing';
        else callType = 'missed';

        // Calculate end time
        const endTime = new Date(call.date + call.duration * 1000);

        // Auto-log the call
        await this.autoLogCall({
          phoneNumber: pending.phoneNumber,
          leadId: pending.leadId,
          callType,
          startTime: new Date(call.date).toISOString(),
          endTime: endTime.toISOString(),
          duration: call.duration,
          deviceCallLogId: call.id,
        });

        // Clear pending call
        sessionStorage.removeItem('pendingCall');
        console.log('Call automatically logged:', call.id);
      }
    } catch (error) {
      console.error('Error syncing calls:', error);
    }
  }
}
```

## Testing

### 1. Test in Android Emulator
```bash
npm run build
npx cap sync android
npx cap open android
```

### 2. Test Permission Flow
- First call should request READ_CALL_LOG permission
- Subsequent calls should automatically log

### 3. Test Call Detection
- Make a test call from leads list
- Switch to phone app and complete call
- Return to CRM app
- Call should be automatically logged within 5 seconds

## Troubleshooting

### Permission Denied
- Check AndroidManifest.xml has READ_CALL_LOG permission
- Verify permission request code in CallLogPlugin
- Test on physical device (emulator may have issues)

### Calls Not Detected
- Verify phone number format matches CallLog entries
- Check if CallLog.Calls.NUMBER uses E.164 format
- Increase polling interval if needed

### Duplicate Calls
- Implement deviceCallLogId deduplication in backend
- Track last synced call ID in service
- Check backend unique constraint on device_call_log_id

## Production Considerations

1. **Battery Optimization**: Consider using WorkManager for background sync instead of intervals
2. **Performance**: Query CallLog only when app is visible to save battery
3. **Privacy**: Request permission with clear explanation to users
4. **Data Usage**: Batch sync calls to reduce API requests
5. **Offline Support**: Queue calls locally if network is unavailable

## Alternative: Using PhoneStateListener (Real-time)

For real-time call detection without polling, implement PhoneStateListener:

```java
@PluginMethod
public void startCallMonitoring(PluginCall call) {
    TelephonyManager telephonyManager = (TelephonyManager) 
        getContext().getSystemService(Context.TELEPHONY_SERVICE);
    
    PhoneStateListener callStateListener = new PhoneStateListener() {
        @Override
        public void onCallStateChanged(int state, String phoneNumber) {
            if (state == TelephonyManager.CALL_STATE_IDLE) {
                // Call ended, notify JavaScript
                JSObject ret = new JSObject();
                ret.put("event", "call_ended");
                ret.put("phoneNumber", phoneNumber);
                notifyListeners("callStateChanged", ret);
            }
        }
    };
    
    telephonyManager.listen(callStateListener, PhoneStateListener.LISTEN_CALL_STATE);
    call.resolve();
}
```

This approach provides immediate detection when call ends without polling.
