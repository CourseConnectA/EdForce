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
    public void openWhatsApp(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber", "");
        String type = call.getString("type", "normal");

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", "Phone number is required");
            call.resolve(res);
            return;
        }

        String clean = phoneNumber.replaceAll("[^0-9]", "");
        // If 10-digit local number, default to India country code 91 (matches frontend behavior)
        if (clean.length() == 10 && !clean.startsWith("91")) {
            clean = "91" + clean;
        }

        String pkg = "business".equals(type) ? "com.whatsapp.w4b" : "com.whatsapp";

        Log.d(TAG, "openWhatsApp: target pkg=" + pkg + ", number=" + clean);

        try {
            // 1) Verify package is installed
            PackageManager pm = getContext().getPackageManager();
            try {
                pm.getApplicationInfo(pkg, 0);
                Log.d(TAG, "Package installed: " + pkg);
            } catch (Exception notInstalled) {
                Log.w(TAG, "Package NOT installed: " + pkg + ", falling back to wa.me");
                try {
                    Uri wa = Uri.parse("https://wa.me/" + clean);
                    Intent intent = new Intent(Intent.ACTION_VIEW, wa);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getActivity().startActivity(intent);
                } catch (Exception e0) {
                    Log.e(TAG, "wa.me fallback failed when package missing: " + e0.getMessage());
                }
                JSObject res = new JSObject();
                res.put("success", false);
                res.put("error", "Package not installed");
                call.resolve(res);
                return;
            }

            // 2) Try ACTION_SENDTO with smsto: (opens chat composer)
            try {
                Uri smsto = Uri.parse("smsto:" + clean);
                Intent intent = new Intent(Intent.ACTION_SENDTO, smsto);
                intent.setPackage(pkg);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                getActivity().startActivity(intent);
                Log.d(TAG, "Opened via ACTION_SENDTO smsto:");
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("phoneNumber", clean);
                call.resolve(res);
                return;
            } catch (Exception e0) {
                Log.w(TAG, "ACTION_SENDTO smsto failed: " + e0.getMessage());
            }

            // 3) Try whatsapp scheme next
            try {
                Uri scheme = Uri.parse("whatsapp://send?phone=" + clean);
                Intent intent = new Intent(Intent.ACTION_VIEW, scheme);
                intent.setPackage(pkg);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                getActivity().startActivity(intent);
                Log.d(TAG, "Opened via whatsapp:// scheme");
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("phoneNumber", clean);
                call.resolve(res);
                return;
            } catch (Exception e1) {
                Log.w(TAG, "whatsapp:// scheme failed: " + e1.getMessage());
            }

            // 4) Fallback to api.whatsapp.com URL with package set
            try {
                Uri api = Uri.parse("https://api.whatsapp.com/send?phone=" + clean);
                Intent intent = new Intent(Intent.ACTION_VIEW, api);
                intent.setPackage(pkg);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                getActivity().startActivity(intent);
                Log.d(TAG, "Opened via api.whatsapp.com URL");
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("phoneNumber", clean);
                call.resolve(res);
                return;
            } catch (Exception e2) {
                Log.w(TAG, "api.whatsapp.com URL failed: " + e2.getMessage());
            }

            // 5) Try launching app as a last native attempt
            try {
                Intent launch = pm.getLaunchIntentForPackage(pkg);
                if (launch != null) {
                    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getActivity().startActivity(launch);
                    Log.w(TAG, "Launched app via getLaunchIntentForPackage (no deep link)");
                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("phoneNumber", clean);
                    call.resolve(res);
                    return;
                } else {
                    Log.w(TAG, "getLaunchIntentForPackage returned null");
                }
            } catch (Exception eL) {
                Log.w(TAG, "Launching app via getLaunchIntentForPackage failed: " + eL.getMessage());
            }

            // 6) Final fallback: open wa.me without forcing package
            try {
                Uri wa = Uri.parse("https://wa.me/" + clean);
                Intent intent = new Intent(Intent.ACTION_VIEW, wa);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(intent);
                Log.w(TAG, "Fell back to wa.me");
            } catch (Exception e3) {
                Log.e(TAG, "wa.me fallback failed: " + e3.getMessage());
            }

            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", "All open attempts failed");
            call.resolve(res);

        } catch (Exception e) {
            Log.e(TAG, "openWhatsApp unexpected error: " + e.getMessage());
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", e.getMessage());
            call.resolve(res);
        }
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
