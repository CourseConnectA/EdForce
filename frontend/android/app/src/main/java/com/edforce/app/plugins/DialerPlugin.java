package com.edforce.app.plugins;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "Dialer",
    permissions = {
        @Permission(strings = { Manifest.permission.CALL_PHONE }, alias = "phone"),
        @Permission(strings = { Manifest.permission.READ_PHONE_STATE }, alias = "phoneState")
    }
)
public class DialerPlugin extends Plugin {
    private static final String TAG = "DialerPlugin";
    private CallMonitorService callMonitor;

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "DialerPlugin loaded!");

        callMonitor = CallMonitorService.getInstance(getContext());
        callMonitor.startMonitoring();

        Log.d(TAG, "Call monitoring service initialized");
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean hasPhonePermission = ActivityCompat.checkSelfPermission(getContext(),
            Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
        boolean hasPhoneStatePermission = ActivityCompat.checkSelfPermission(getContext(),
            Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("granted", hasPhonePermission && hasPhoneStatePermission);
        result.put("phonePermission", hasPhonePermission);
        result.put("phoneStatePermission", hasPhoneStatePermission);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Log.d(TAG, "requestPermission called");

        boolean hasPhonePermission = ActivityCompat.checkSelfPermission(getContext(),
            Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
        boolean hasPhoneStatePermission = ActivityCompat.checkSelfPermission(getContext(),
            Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;

        if (!hasPhonePermission || !hasPhoneStatePermission) {
            Log.d(TAG, "Requesting permissions...");
            requestPermissionForAlias("phone", call, "handlePermissionResult");
        } else {
            Log.d(TAG, "Permissions already granted");
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void handlePermissionResult(PluginCall call) {
        Log.d(TAG, "handlePermissionResult called");

        boolean hasPhonePermission = ActivityCompat.checkSelfPermission(getContext(),
            Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
        boolean hasPhoneStatePermission = ActivityCompat.checkSelfPermission(getContext(),
            Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("granted", hasPhonePermission && hasPhoneStatePermission);
        result.put("phonePermission", hasPhonePermission);
        result.put("phoneStatePermission", hasPhoneStatePermission);

        Log.d(TAG, "Permission result - Phone: " + hasPhonePermission + ", PhoneState: " + hasPhoneStatePermission);
        call.resolve(result);
    }

    @PluginMethod
    public void initiateCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        Log.d(TAG, "=== INITIATING CALL ===");
        Log.d(TAG, "Phone Number: " + phoneNumber);

        if (ActivityCompat.checkSelfPermission(getContext(),
                Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            call.reject("CALL_PHONE permission not granted");
            return;
        }

        try {
            callMonitor.setLastCalledNumber(phoneNumber);

            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            // Use flags to prevent caching on Xiaomi and other custom Android UIs
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            // Add unique extra to ensure intent is treated as new
            intent.putExtra("call_timestamp", System.currentTimeMillis());
            getContext().startActivity(intent);

            Log.d(TAG, "Call initiated successfully");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("phoneNumber", phoneNumber);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error initiating call: " + e.getMessage());
            call.reject("Failed to initiate call: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openDialer(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        Log.d(TAG, "=== OPENING DIALER ===");
        Log.d(TAG, "Phone Number: " + phoneNumber);

        try {
            callMonitor.setLastCalledNumber(phoneNumber);

            // Use ACTION_DIAL instead of ACTION_CALL - this opens dialer with number
            // but doesn't auto-call, avoiding Xiaomi caching issues
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            // Use flags to prevent caching on Xiaomi and other custom Android UIs
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NO_HISTORY);
            // Add unique extra to ensure intent is treated as new
            intent.putExtra("dial_timestamp", System.currentTimeMillis());
            getContext().startActivity(intent);

            Log.d(TAG, "Dialer opened successfully");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("phoneNumber", phoneNumber);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error opening dialer: " + e.getMessage());
            call.reject("Failed to open dialer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getLastCallDuration(PluginCall call) {
        int duration = callMonitor.getLastCallDuration();
        String number = callMonitor.getLastCalledNumber();
        boolean isActive = callMonitor.isCallActive();

        Log.d(TAG, "=== GET LAST CALL DURATION ===");
        Log.d(TAG, "Duration: " + duration + " seconds");
        Log.d(TAG, "Number: " + number);
        Log.d(TAG, "Is Active: " + isActive);

        JSObject result = new JSObject();
        result.put("duration", duration);
        result.put("phoneNumber", number);
        result.put("isActive", isActive);

        call.resolve(result);
    }

    @PluginMethod
    public void isCallActive(PluginCall call) {
        boolean isActive = callMonitor.isCallActive();

        JSObject result = new JSObject();
        result.put("isActive", isActive);

        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (callMonitor != null) {
            callMonitor.stopMonitoring();
        }
    }
}
