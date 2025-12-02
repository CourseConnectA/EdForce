package com.edforce.app.plugins;

import android.content.Context;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;
import android.util.Log;

/**
 * Service to monitor phone call state and track call duration.
 * Runs in the background and listens to phone state changes.
 */
public class CallMonitorService {
    private static final String TAG = "CallMonitorService";
    private static CallMonitorService instance;

    private Context context;
    private TelephonyManager telephonyManager;
    private CallStateListener phoneStateListener;

    private long callStartTime = 0;
    private long callEndTime = 0;
    private int lastCallDuration = 0;
    private String lastCalledNumber = null;
    private boolean isCallActive = false;

    private CallMonitorService(Context context) {
        this.context = context;
        this.telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        this.phoneStateListener = new CallStateListener();
    }

    public static synchronized CallMonitorService getInstance(Context context) {
        if (instance == null) {
            instance = new CallMonitorService(context.getApplicationContext());
        }
        return instance;
    }

    public void startMonitoring() {
        try {
            if (telephonyManager != null) {
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
                Log.d(TAG, "Call monitoring started");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting call monitoring: " + e.getMessage());
        }
    }

    public void stopMonitoring() {
        try {
            if (telephonyManager != null && phoneStateListener != null) {
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
                Log.d(TAG, "Call monitoring stopped");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping call monitoring: " + e.getMessage());
        }
    }

    public int getLastCallDuration() {
        return lastCallDuration;
    }

    public String getLastCalledNumber() {
        return lastCalledNumber;
    }

    public void setLastCalledNumber(String number) {
        this.lastCalledNumber = number;
        Log.d(TAG, "Set last called number: " + number);
    }

    public boolean isCallActive() {
        return isCallActive;
    }

    private class CallStateListener extends PhoneStateListener {
        @Override
        public void onCallStateChanged(int state, String phoneNumber) {
            super.onCallStateChanged(state, phoneNumber);

            switch (state) {
                case TelephonyManager.CALL_STATE_IDLE:
                    if (isCallActive && callStartTime > 0) {
                        callEndTime = System.currentTimeMillis();
                        lastCallDuration = (int) ((callEndTime - callStartTime) / 1000);

                        Log.d(TAG, "=== CALL ENDED ===");
                        Log.d(TAG, "Call Duration: " + lastCallDuration + " seconds");
                        Log.d(TAG, "Called Number: " + lastCalledNumber);
                        Log.d(TAG, "Start Time: " + callStartTime);
                        Log.d(TAG, "End Time: " + callEndTime);

                        isCallActive = false;
                        notifyCallEnded();
                    }
                    break;

                case TelephonyManager.CALL_STATE_OFFHOOK:
                    if (!isCallActive) {
                        callStartTime = System.currentTimeMillis();
                        callEndTime = 0;
                        lastCallDuration = 0;
                        isCallActive = true;

                        Log.d(TAG, "=== CALL STARTED ===");
                        Log.d(TAG, "Start Time: " + callStartTime);
                        if (lastCalledNumber != null) {
                            Log.d(TAG, "Calling: " + lastCalledNumber);
                        }
                    }
                    break;

                case TelephonyManager.CALL_STATE_RINGING:
                    Log.d(TAG, "Phone is ringing from: " + phoneNumber);
                    break;
            }
        }
    }

    private void notifyCallEnded() {
        Log.d(TAG, "Call ended notification ready for plugin");
    }
}
