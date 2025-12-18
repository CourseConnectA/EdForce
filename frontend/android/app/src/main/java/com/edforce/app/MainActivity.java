package com.edforce.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import com.edforce.app.plugins.DialerPlugin;
import com.edforce.app.plugins.WhatsAppChooserPlugin;
import com.edforce.app.plugins.WhatsAppPlugin;
import com.edforce.app.plugins.EdforceWhatsAppPlugin;
import com.edforce.app.plugins.CallLogPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "NativeDialerBridge";
    private static final int PERMISSION_REQUEST_CODE = 1010;
    private TelephonyManager telephonyManager;
    private PhoneStateListener phoneStateListener;
    private long callStartTs = 0L;
    private boolean inCall = false;
    private boolean wasRinging = false;
    private String lastRingingNumber = null;
    private long lastDispatchEpoch = 0L;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register our custom plugins
        registerPlugin(CallLogPlugin.class);
        registerPlugin(DialerPlugin.class);
        registerPlugin(WhatsAppChooserPlugin.class);
        registerPlugin(WhatsAppPlugin.class);
        registerPlugin(EdforceWhatsAppPlugin.class);

        telephonyManager = (TelephonyManager) getSystemService(TELEPHONY_SERVICE);
        phoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String phoneNumber) {
                switch (state) {
                    case TelephonyManager.CALL_STATE_RINGING:
                        // Incoming call detected
                        wasRinging = true;
                        lastRingingNumber = phoneNumber;
                        Log.d(TAG, "Phone RINGING - incoming call from: " + phoneNumber);
                        break;
                    case TelephonyManager.CALL_STATE_OFFHOOK:
                        if (!inCall) {
                            callStartTs = System.currentTimeMillis();
                            inCall = true;
                            if (wasRinging) {
                                Log.d(TAG, "Call OFFHOOK (answered incoming) - start timestamp=" + callStartTs);
                            } else {
                                Log.d(TAG, "Call OFFHOOK (outgoing) - start timestamp=" + callStartTs);
                            }
                        }
                        break;
                    case TelephonyManager.CALL_STATE_IDLE:
                        if (wasRinging && !inCall) {
                            // Missed incoming call - never went OFFHOOK
                            Log.d(TAG, "Missed incoming call from: " + lastRingingNumber);
                            scheduleCallLogLookup(500); // Faster lookup for missed calls
                        } else if (inCall && callStartTs > 0) {
                            long endTs = System.currentTimeMillis();
                            int durationSec = (int) ((endTs - callStartTs) / 1000);
                            Log.d(TAG, "Call IDLE - endTs=" + endTs + " durationSec=" + durationSec);
                            inCall = false;
                            callStartTs = 0L;
                            // Faster lookup - 500ms for better UX
                            scheduleCallLogLookup(500);
                        }
                        // Reset ringing state
                        wasRinging = false;
                        lastRingingNumber = null;
                        break;
                }
            }
        };

        // Request all permissions together on app start
        requestAllPermissions();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Ensure listeners are active after resume (or after changing permissions in Settings)
        try {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                startListening();
            }
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                startIncomingCallMonitor();
            }
        } catch (Exception e) {
            Log.e(TAG, "onResume listener init failed: " + e.getMessage());
        }
    }

    private void requestAllPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();
        
        // Check each permission
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_PHONE_STATE);
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_CALL_LOG);
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CALL_PHONE);
        }
        
        if (!permissionsNeeded.isEmpty()) {
            // Request all permissions at once
            String[] permissionsArray = permissionsNeeded.toArray(new String[0]);
            Log.d(TAG, "Requesting permissions: " + permissionsNeeded.toString());
            ActivityCompat.requestPermissions(this, permissionsArray, PERMISSION_REQUEST_CODE);
        } else {
            // All permissions already granted
            Log.d(TAG, "All permissions already granted");
            startListening();
            // Start incoming call monitor
            startIncomingCallMonitor();
        }
    }

    private void startListening() {
        if (telephonyManager == null) {
            Log.w(TAG, "TelephonyManager unavailable; cannot listen for call state");
            return;
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "READ_PHONE_STATE not granted; deferring PhoneStateListener registration");
            return;
        }

        try {
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
            Log.d(TAG, "PhoneStateListener registered");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register PhoneStateListener: " + e.getMessage());
        }
    }

    private void startIncomingCallMonitor() {
        // Query recent incoming calls that might have been missed while app was closed
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        
        // Sync all calls from the last 7 days on app start
        new Handler(getMainLooper()).postDelayed(() -> {
            syncAllRecentCalls(7);
        }, 2000);
    }

    private void syncAllRecentCalls(int daysBack) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "READ_CALL_LOG permission not granted for sync");
            return;
        }
        
        try {
            long cutoff = System.currentTimeMillis() - (long) daysBack * 24 * 60 * 60 * 1000;
            android.database.Cursor cursor = getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[]{
                            android.provider.CallLog.Calls._ID,
                            android.provider.CallLog.Calls.DURATION,
                            android.provider.CallLog.Calls.DATE,
                            android.provider.CallLog.Calls.TYPE,
                            android.provider.CallLog.Calls.NUMBER
                    },
                    android.provider.CallLog.Calls.DATE + ">?",
                    new String[]{String.valueOf(cutoff)},
                    android.provider.CallLog.Calls.DATE + " DESC"
            );
            
            int count = 0;
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    long callId = cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls._ID));
                    int duration = cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.DURATION));
                    long callDate = cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls.DATE));
                    int type = cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.TYPE));
                    String phoneNumber = cursor.getString(cursor.getColumnIndex(android.provider.CallLog.Calls.NUMBER));
                    
                    // Dispatch each call to the web app for syncing
                    dispatchCallLogForSync(duration, callDate, phoneNumber, type, callId);
                    count++;
                }
                cursor.close();
            }
            Log.d(TAG, "Synced " + count + " call logs from last " + daysBack + " days");
        } catch (Exception e) {
            Log.e(TAG, "Failed to sync call logs: " + e.getMessage());
        }
    }

    private void dispatchCallLogForSync(int durationSec, long callLogDateEpoch, String phoneNumber, int callLogType, long callLogId) {
        try {
            JSONObject detail = new JSONObject();
            detail.put("duration", durationSec);
            detail.put("source", "bulk-sync");
            detail.put("callLogDate", callLogDateEpoch);
            detail.put("phoneNumber", phoneNumber);
            detail.put("callLogType", callLogType);
            detail.put("callLogId", callLogId);

            JSONObject payload = new JSONObject();
            payload.put("detail", detail);
            final String js = "window.dispatchEvent(new CustomEvent('native-call-finished', " + payload.toString() + "));";

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
            }
        } catch (JSONException e) {
            Log.e(TAG, "Failed to dispatch call log for sync: " + e.getMessage());
        }
    }

    private void queryRecentIncomingCalls() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        
        try {
            // Look for calls in the last 5 minutes
            long cutoff = System.currentTimeMillis() - 5 * 60 * 1000;
            android.database.Cursor cursor = getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[]{
                            android.provider.CallLog.Calls._ID,
                            android.provider.CallLog.Calls.DURATION,
                            android.provider.CallLog.Calls.DATE,
                            android.provider.CallLog.Calls.TYPE,
                            android.provider.CallLog.Calls.NUMBER
                    },
                    android.provider.CallLog.Calls.DATE + ">? AND (" +
                            android.provider.CallLog.Calls.TYPE + "=? OR " +
                            android.provider.CallLog.Calls.TYPE + "=? OR " +
                            android.provider.CallLog.Calls.TYPE + "=?)",
                    new String[]{
                            String.valueOf(cutoff),
                            String.valueOf(android.provider.CallLog.Calls.INCOMING_TYPE),
                            String.valueOf(android.provider.CallLog.Calls.MISSED_TYPE),
                            String.valueOf(android.provider.CallLog.Calls.REJECTED_TYPE)
                    },
                    android.provider.CallLog.Calls.DATE + " DESC"
            );
            
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    long callId = cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls._ID));
                    int duration = cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.DURATION));
                    long callDate = cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls.DATE));
                    int type = cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.TYPE));
                    String phoneNumber = cursor.getString(cursor.getColumnIndex(android.provider.CallLog.Calls.NUMBER));
                    
                    Log.d(TAG, "Found recent incoming/missed call: type=" + type + " duration=" + duration + " number=" + phoneNumber);
                    
                    // Dispatch this incoming call to the web app
                    dispatchDurationToWeb(duration, "incoming-sync", callDate, phoneNumber, type, callId);
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to query recent incoming calls: " + e.getMessage());
        }
    }

    private void dispatchDurationToWeb(int durationSec, String source) {
        dispatchDurationToWeb(durationSec, source, null, null, null, null);
    }

    private void dispatchDurationToWeb(int durationSec, String source, Long callLogDateEpoch, String phoneNumber, Integer callLogType, Long callLogId) {
        if (durationSec < 0) return;
        long now = System.currentTimeMillis();
        // Reduce debounce time for faster response
        if (("calllog".equals(source) || "incoming-sync".equals(source)) && now - lastDispatchEpoch < 500) {
            Log.d(TAG, "Skipping duplicate dispatch within 500ms");
            return;
        }
        lastDispatchEpoch = now;

        try {
            JSONObject detail = new JSONObject();
            detail.put("duration", durationSec);
            detail.put("source", source);
            if (callLogDateEpoch != null && callLogDateEpoch > 0) {
                detail.put("callLogDate", callLogDateEpoch);
            }
            if (phoneNumber != null) {
                detail.put("phoneNumber", phoneNumber);
            }
            if (callLogType != null && callLogType >= 0) {
                detail.put("callLogType", callLogType);
            }
            if (callLogId != null && callLogId > 0) {
                detail.put("callLogId", callLogId);
            }

            JSONObject payload = new JSONObject();
            payload.put("detail", detail);
            final String js = "window.dispatchEvent(new CustomEvent('native-call-finished', " + payload.toString() + "));";

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
                Log.d(TAG, "Dispatched native-call-finished event duration=" + durationSec + " source=" + source + " type=" + callLogType);
            } else {
                Log.w(TAG, "Bridge/WebView not ready to dispatch duration event");
            }
        } catch (JSONException e) {
            Log.e(TAG, "Failed to serialize duration payload: " + e.getMessage());
        }
    }

    private void scheduleCallLogLookup(int delayMs) {
        Handler handler = new Handler(getMainLooper());
        handler.postDelayed(() -> queryLatestCallLogDuration(0), delayMs);
    }

    private void queryLatestCallLogDuration(int attempt) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            Log.d(TAG, "READ_CALL_LOG not granted; skipping calllog lookup");
            return;
        }
        try {
            long cutoff = System.currentTimeMillis() - 5 * 60 * 1000;
            android.database.Cursor cursor = getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[]{
                            android.provider.CallLog.Calls._ID,
                            android.provider.CallLog.Calls.DURATION,
                            android.provider.CallLog.Calls.DATE,
                            android.provider.CallLog.Calls.TYPE,
                            android.provider.CallLog.Calls.NUMBER
                    },
                    android.provider.CallLog.Calls.DATE + ">?",
                    new String[]{String.valueOf(cutoff)},
                    android.provider.CallLog.Calls.DATE + " DESC"
            );
            if (cursor != null) {
                if (cursor.moveToFirst()) {
                    int durationIdx = cursor.getColumnIndex(android.provider.CallLog.Calls.DURATION);
                    int dateIdx = cursor.getColumnIndex(android.provider.CallLog.Calls.DATE);
                    int typeIdx = cursor.getColumnIndex(android.provider.CallLog.Calls.TYPE);
                    int numberIdx = cursor.getColumnIndex(android.provider.CallLog.Calls.NUMBER);

                    long callId = cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls._ID));
                    int duration = cursor.getInt(durationIdx);
                    long callDate = cursor.getLong(dateIdx);
                    int type = cursor.getInt(typeIdx);
                    String dialedNumber = numberIdx >= 0 ? cursor.getString(numberIdx) : null;

                    Log.d(TAG, "CallLog lookup duration=" + duration + " type=" + type + " number=" + dialedNumber);

                    boolean isMissed = type == android.provider.CallLog.Calls.MISSED_TYPE
                            || type == android.provider.CallLog.Calls.REJECTED_TYPE
                            || type == android.provider.CallLog.Calls.BLOCKED_TYPE;
                    
                    boolean isIncoming = type == android.provider.CallLog.Calls.INCOMING_TYPE;

                    // For missed/rejected calls, dispatch immediately even with 0 duration
                    if (isMissed) {
                        Log.d(TAG, "Missed/rejected call detected, dispatching immediately");
                        dispatchDurationToWeb(0, "calllog", callDate, dialedNumber, type, callId);
                        cursor.close();
                        return;
                    }

                    // For incoming answered calls, dispatch with duration
                    if (isIncoming && duration > 0) {
                        Log.d(TAG, "Incoming answered call detected, dispatching");
                        dispatchDurationToWeb(duration, "calllog", callDate, dialedNumber, type, callId);
                        cursor.close();
                        return;
                    }

                    // For outgoing calls, check if duration is ready
                    if (duration <= 0 && !isMissed) {
                        // Retry with shorter delays for faster feedback
                        if (attempt < 3) {
                            int nextAttempt = attempt + 1;
                            long delayMs = nextAttempt * 500L; // 500ms, 1000ms, 1500ms
                            Log.d(TAG, "Duration not yet available, retrying in " + delayMs + "ms (attempt " + nextAttempt + ")");
                            new Handler(getMainLooper()).postDelayed(() -> queryLatestCallLogDuration(nextAttempt), delayMs);
                            cursor.close();
                            return;
                        }
                        Log.d(TAG, "Duration remained 0 after retries; dispatching as unanswered call");
                    }

                    dispatchDurationToWeb(duration, "calllog", callDate, dialedNumber, type, callId);
                    cursor.close();
                    return;
                }
                cursor.close();
            } else {
                Log.d(TAG, "CallLog query returned null cursor");
            }
        } catch (Exception e) {
            Log.e(TAG, "CallLog query failed: " + e.getMessage());
        }

        // Retry if no result found yet
        if (attempt < 3 && !inCall) {
            int nextAttempt = attempt + 1;
            long delayMs = nextAttempt * 500L;
            Log.d(TAG, "Scheduling additional call log lookup in " + delayMs + "ms (attempt " + nextAttempt + ")");
            new Handler(getMainLooper()).postDelayed(() -> queryLatestCallLogDuration(nextAttempt), delayMs);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            StringBuilder grantedPerms = new StringBuilder();
            StringBuilder deniedPerms = new StringBuilder();
            
            for (int i = 0; i < permissions.length; i++) {
                String perm = permissions[i];
                boolean granted = grantResults[i] == PackageManager.PERMISSION_GRANTED;
                
                if (granted) {
                    grantedPerms.append(perm).append(", ");
                } else {
                    deniedPerms.append(perm).append(", ");
                    allGranted = false;
                }
            }
            
            if (grantedPerms.length() > 0) {
                Log.d(TAG, "Permissions GRANTED: " + grantedPerms.toString());
            }
            if (deniedPerms.length() > 0) {
                Log.w(TAG, "Permissions DENIED: " + deniedPerms.toString());
            }
            
            // Start listening if READ_PHONE_STATE was granted
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                startListening();
            }
            
            // Start incoming call monitor if READ_CALL_LOG was granted
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                startIncomingCallMonitor();
            }
            
            if (allGranted) {
                Log.d(TAG, "All permissions granted - call logging fully enabled");
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (telephonyManager != null && phoneStateListener != null) {
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
            Log.d(TAG, "PhoneStateListener unregistered");
        }
    }

    // Method to get all call logs for syncing - called from web
    public void getAllCallLogs(int daysBack) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "READ_CALL_LOG permission not granted for getAllCallLogs");
            dispatchCallLogsToWeb(new ArrayList<>());
            return;
        }

        try {
            long cutoff = System.currentTimeMillis() - (long) daysBack * 24 * 60 * 60 * 1000;
            android.database.Cursor cursor = getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[]{
                            android.provider.CallLog.Calls._ID,
                            android.provider.CallLog.Calls.DURATION,
                            android.provider.CallLog.Calls.DATE,
                            android.provider.CallLog.Calls.TYPE,
                            android.provider.CallLog.Calls.NUMBER
                    },
                    android.provider.CallLog.Calls.DATE + ">?",
                    new String[]{String.valueOf(cutoff)},
                    android.provider.CallLog.Calls.DATE + " DESC"
            );

            List<JSONObject> callLogs = new ArrayList<>();

            if (cursor != null) {
                while (cursor.moveToNext()) {
                    try {
                        JSONObject callLog = new JSONObject();
                        callLog.put("id", cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls._ID)));
                        callLog.put("duration", cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.DURATION)));
                        callLog.put("date", cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls.DATE)));
                        callLog.put("type", cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.TYPE)));
                        callLog.put("number", cursor.getString(cursor.getColumnIndex(android.provider.CallLog.Calls.NUMBER)));
                        callLogs.add(callLog);
                    } catch (JSONException e) {
                        Log.e(TAG, "Failed to create call log JSON: " + e.getMessage());
                    }
                }
                cursor.close();
            }

            Log.d(TAG, "Found " + callLogs.size() + " call logs from last " + daysBack + " days");
            dispatchCallLogsToWeb(callLogs);
        } catch (Exception e) {
            Log.e(TAG, "Failed to query call logs: " + e.getMessage());
            dispatchCallLogsToWeb(new ArrayList<>());
        }
    }

    private void dispatchCallLogsToWeb(List<JSONObject> callLogs) {
        try {
            JSONObject payload = new JSONObject();
            org.json.JSONArray logsArray = new org.json.JSONArray();
            for (JSONObject log : callLogs) {
                logsArray.put(log);
            }
            payload.put("callLogs", logsArray);

            final String js = "window.dispatchEvent(new CustomEvent('call-logs-sync', { detail: " + payload.toString() + " }));";

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
                Log.d(TAG, "Dispatched call-logs-sync event with " + callLogs.size() + " logs");
            } else {
                Log.w(TAG, "Bridge/WebView not ready to dispatch call logs");
            }
        } catch (JSONException e) {
            Log.e(TAG, "Failed to serialize call logs payload: " + e.getMessage());
        }
    }

    // Expose method to JavaScript
    public void triggerCallLogSync(int daysBack) {
        new Handler(getMainLooper()).post(() -> getAllCallLogs(daysBack));
    }
}
