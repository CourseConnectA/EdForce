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
import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "NativeDialerBridge";
    private TelephonyManager telephonyManager;
    private PhoneStateListener phoneStateListener;
    private long callStartTs = 0L;
    private boolean inCall = false;
    private long lastDispatchEpoch = 0L;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        telephonyManager = (TelephonyManager) getSystemService(TELEPHONY_SERVICE);
        phoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String phoneNumber) {
                switch (state) {
                    case TelephonyManager.CALL_STATE_OFFHOOK:
                        if (!inCall) {
                            callStartTs = System.currentTimeMillis();
                            inCall = true;
                            Log.d(TAG, "Call OFFHOOK - start timestamp=" + callStartTs);
                        }
                        break;
                    case TelephonyManager.CALL_STATE_IDLE:
                        if (inCall && callStartTs > 0) {
                            long endTs = System.currentTimeMillis();
                            int durationSec = (int) ((endTs - callStartTs) / 1000);
                            Log.d(TAG, "Call IDLE - endTs=" + endTs + " durationSec=" + durationSec);
                            inCall = false;
                            callStartTs = 0L;
                            scheduleCallLogLookup();
                        }
                        break;
                    case TelephonyManager.CALL_STATE_RINGING:
                        Log.d(TAG, "Phone ringing: " + phoneNumber);
                        break;
                }
            }
        };

        ensurePermissions();
        startListening();
    }

    private void ensurePermissions() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.READ_PHONE_STATE}, 1011);
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.READ_CALL_LOG}, 1012);
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

    private void dispatchDurationToWeb(int durationSec, String source) {
        dispatchDurationToWeb(durationSec, source, null, null, null, null);
    }

    private void dispatchDurationToWeb(int durationSec, String source, Long callLogDateEpoch, String phoneNumber, Integer callLogType, Long callLogId) {
        if (durationSec < 0) return;
        long now = System.currentTimeMillis();
        if ("calllog".equals(source) && now - lastDispatchEpoch < 1500) {
            Log.d(TAG, "Skipping duplicate calllog dispatch");
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
                Log.d(TAG, "Dispatched native-call-finished event duration=" + durationSec + " source=" + source);
            } else {
                Log.w(TAG, "Bridge/WebView not ready to dispatch duration event");
            }
        } catch (JSONException e) {
            Log.e(TAG, "Failed to serialize duration payload: " + e.getMessage());
        }
    }

    private void scheduleCallLogLookup() {
        Handler handler = new Handler(getMainLooper());
        handler.postDelayed(() -> queryLatestCallLogDuration(0), 1500);
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

                    if (duration <= 0 && !isMissed) {
                        if (attempt < 4) {
                            int nextAttempt = attempt + 1;
                            long delayMs = (nextAttempt + 1) * 2000L;
                            Log.d(TAG, "Duration not yet available, retrying call log lookup in " + delayMs + "ms (attempt " + nextAttempt + ")");
                            new Handler(getMainLooper()).postDelayed(() -> queryLatestCallLogDuration(nextAttempt), delayMs);
                            cursor.close();
                            return;
                        }
                        Log.d(TAG, "Duration remained 0 after retries; dispatching as zero duration");
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

        if (attempt < 4 && !inCall) {
            int nextAttempt = attempt + 1;
            long delayMs = (nextAttempt + 1) * 2000L;
            Log.d(TAG, "Scheduling additional call log lookup in " + delayMs + "ms (attempt " + nextAttempt + ")");
            new Handler(getMainLooper()).postDelayed(() -> queryLatestCallLogDuration(nextAttempt), delayMs);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == 1011) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "READ_PHONE_STATE granted at runtime; registering listener");
                startListening();
            } else {
                Log.w(TAG, "READ_PHONE_STATE denied; call durations will not be captured");
            }
        }

        if (requestCode == 1012) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "READ_CALL_LOG granted at runtime");
            } else {
                Log.w(TAG, "READ_CALL_LOG denied; call log fallback unavailable");
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
}
