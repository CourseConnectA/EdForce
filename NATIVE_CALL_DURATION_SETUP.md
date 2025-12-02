# Native Android Call Duration Implementation Guide

## Problem
The current web-based implementation cannot accurately detect:
- When a call is actually **connected** (answered)
- The exact **duration of the connected call** (excluding ring time)
- Call outcome (answered, missed, rejected, voicemail)

Web browsers can only:
- Open the phone dialer with `tel:` URI
- Detect when user returns to the app
- Calculate elapsed time (which includes ring time + call time + post-call time)

## Solution: Native Android CallLog API

Android provides the CallLog API that tracks ALL calls made/received on the device with accurate data.

### Step 1: Create Capacitor Plugin

Create a Capacitor plugin to access Android CallLog:

**File: `android/app/src/main/java/com/yourapp/plugins/CallLogPlugin.java`**

```java
package com.yourapp.plugins;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CallLog;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_CALL_LOG })
    }
)
public class CallLogPlugin extends Plugin {

    @PluginMethod
    public void getRecentCalls(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        Long sinceTimestamp = call.getLong("sinceTimestamp");
        
        if (phoneNumber == null || sinceTimestamp == null) {
            call.reject("Missing required parameters");
            return;
        }

        // Check permission
        if (ActivityCompat.checkSelfPermission(getContext(), 
                Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permission denied");
            return;
        }

        try {
            JSONArray callsArray = new JSONArray();
            
            // Query CallLog for calls to this number after the timestamp
            String[] projection = new String[] {
                CallLog.Calls._ID,
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION,  // THIS IS THE CONNECTED CALL TIME IN SECONDS
                CallLog.Calls.CACHED_NAME
            };
            
            String selection = CallLog.Calls.NUMBER + " = ? AND " + 
                             CallLog.Calls.DATE + " >= ?";
            String[] selectionArgs = new String[] { 
                phoneNumber, 
                String.valueOf(sinceTimestamp) 
            };
            
            Cursor cursor = getContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                CallLog.Calls.DATE + " DESC"
            );

            if (cursor != null) {
                while (cursor.moveToNext()) {
                    JSONObject callObj = new JSONObject();
                    
                    String id = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls._ID));
                    String number = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER));
                    int type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE));
                    long date = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DATE));
                    int duration = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION));
                    String name = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME));
                    
                    callObj.put("id", id);
                    callObj.put("number", number);
                    callObj.put("type", getCallTypeString(type));
                    callObj.put("date", date);
                    callObj.put("duration", duration);  // CONNECTED TIME IN SECONDS
                    callObj.put("name", name);
                    
                    callsArray.put(callObj);
                }
                cursor.close();
            }

            JSONObject result = new JSONObject();
            result.put("calls", callsArray);
            call.resolve(result);
            
        } catch (JSONException e) {
            call.reject("Error reading call log", e);
        }
    }
    
    private String getCallTypeString(int type) {
        switch (type) {
            case CallLog.Calls.INCOMING_TYPE:
                return "incoming";
            case CallLog.Calls.OUTGOING_TYPE:
                return "outgoing";
            case CallLog.Calls.MISSED_TYPE:
                return "missed";
            case CallLog.Calls.VOICEMAIL_TYPE:
                return "voicemail";
            case CallLog.Calls.REJECTED_TYPE:
                return "rejected";
            default:
                return "unknown";
        }
    }
}
```

### Step 2: Register Plugin

**File: `android/app/src/main/java/com/yourapp/MainActivity.java`**

```java
import com.yourapp.plugins.CallLogPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register plugins
        registerPlugin(CallLogPlugin.class);
    }
}
```

### Step 3: Request Permission

**File: `android/app/src/main/AndroidManifest.xml`**

```xml
<uses-permission android:name="android.permission.READ_CALL_LOG" />
```

### Step 4: Update Frontend Service

**File: `frontend/src/services/androidCallSyncService.ts`**

```typescript
import { Plugins } from '@capacitor/core';
const { CallLog } = Plugins;

private async checkAndSyncCalls(): Promise<void> {
  try {
    const pendingStr = sessionStorage.getItem('pendingCall');
    if (!pendingStr) return;

    const pending: PendingCall = JSON.parse(pendingStr);

    // Query Android CallLog for calls made after initiating this call
    const result = await CallLog.getRecentCalls({
      phoneNumber: pending.phoneNumber,
      sinceTimestamp: new Date(pending.startTime).getTime()
    });

    if (result.calls && result.calls.length > 0) {
      const latestCall = result.calls[0];
      
      // Only log if call was connected (duration > 0)
      if (latestCall.duration > 0) {
        await this.autoLogCall({
          phoneNumber: pending.phoneNumber,
          leadId: pending.leadId,
          callType: latestCall.type,
          startTime: new Date(latestCall.date).toISOString(),
          endTime: new Date(latestCall.date + latestCall.duration * 1000).toISOString(),
          duration: latestCall.duration,  // ACCURATE CONNECTED TIME
          deviceCallLogId: latestCall.id,
        });
        
        // Show disposition modal with accurate duration
        this.promptForCallOutcome(pending, latestCall.duration);
        sessionStorage.removeItem('pendingCall');
      } else if (latestCall.type === 'missed') {
        // Call was not answered
        await this.autoLogCall({
          phoneNumber: pending.phoneNumber,
          leadId: pending.leadId,
          callType: 'missed',
          startTime: new Date(latestCall.date).toISOString(),
          duration: 0,
          deviceCallLogId: latestCall.id,
        });
        sessionStorage.removeItem('pendingCall');
      }
    }
  } catch (error) {
    console.error('Error syncing calls:', error);
  }
}
```

### Step 5: Update Disposition Modal

**File: `frontend/src/services/androidCallSyncService.ts`**

```typescript
private promptForCallOutcome(pending: PendingCall, actualDuration?: number): void {
  const event = new CustomEvent('call-completed', {
    detail: {
      phoneNumber: pending.phoneNumber,
      leadId: pending.leadId,
      startTime: pending.startTime,
      duration: actualDuration || 0,  // Pass actual duration from CallLog
    },
  });
  window.dispatchEvent(event);
}
```

**File: `frontend/src/components/common/CallDispositionModal.tsx`**

```typescript
interface CallDispositionModalProps {
  callData: {
    phoneNumber: string;
    leadId: string;
    startTime: string;
    callId?: string;
    duration?: number;  // Add this - will be populated from CallLog
  } | null;
}

useEffect(() => {
  if (open && callData) {
    setDisposition('');
    setNotes('');
    
    // Use actual duration from Android CallLog if available
    if (callData.duration !== undefined && callData.duration > 0) {
      setDuration(callData.duration);
    } else {
      setDuration(0);  // User must enter manually
    }
  }
}, [open, callData]);
```

## Key Benefits

✅ **Accurate Duration**: Only counts time when call was **connected**
✅ **No Ring Time**: Excludes dialing and ringing time
✅ **Call Outcome**: Knows if call was answered, missed, or rejected
✅ **Automatic**: No manual entry needed
✅ **Reliable**: Uses Android's official call tracking system

## Deployment Steps

1. Build the Capacitor Android app with the plugin
2. Request READ_CALL_LOG permission at runtime
3. Test with actual calls to verify accuracy
4. Deploy to production

## Current Web Version

Until you implement native Android:
- Users must manually check their phone's call log
- Enter only the connected call time (shown in phone's recent calls)
- Skip if call was not answered (duration = 0)

This ensures data accuracy even without native integration!
