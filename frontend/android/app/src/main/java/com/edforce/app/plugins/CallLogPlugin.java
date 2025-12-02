package com.edforce.app.plugins;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CallLog;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
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
        @Permission(strings = { Manifest.permission.READ_CALL_LOG }, alias = "callLog"),
        @Permission(strings = { Manifest.permission.CALL_PHONE }, alias = "phone")
    }
)
public class CallLogPlugin extends Plugin {
    private static final String TAG = "CallLogPlugin";

    public CallLogPlugin() {
        super();
        android.util.Log.d(TAG, "CallLogPlugin constructor called - plugin is being loaded!");
    }

    @Override
    public void load() {
        super.load();
        android.util.Log.d(TAG, "CallLogPlugin loaded successfully!");
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(),
                Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
            call.resolve();
        } else {
            call.reject("Permission not granted");
        }
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        android.util.Log.d("CallLogPlugin", "requestPermission called");

        if (ActivityCompat.checkSelfPermission(getContext(),
                Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            android.util.Log.d("CallLogPlugin", "Requesting READ_CALL_LOG permission...");
            requestPermissionForAlias("callLog", call, "handlePermissionResult");
        } else {
            android.util.Log.d("CallLogPlugin", "READ_CALL_LOG permission already granted");
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void handlePermissionResult(PluginCall call) {
        android.util.Log.d("CallLogPlugin", "handlePermissionResult callback triggered");

        if (ActivityCompat.checkSelfPermission(getContext(),
                Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
            android.util.Log.d("CallLogPlugin", "Permission GRANTED by user");
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        } else {
            android.util.Log.d("CallLogPlugin", "Permission DENIED by user");
            call.reject("Permission denied by user");
        }
    }

    @PluginMethod
    public void getRecentCalls(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        Long sinceTimestamp = call.getLong("sinceTimestamp");

        if (phoneNumber == null || sinceTimestamp == null) {
            call.reject("Missing required parameters: phoneNumber and sinceTimestamp");
            return;
        }

        if (ActivityCompat.checkSelfPermission(getContext(),
                Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permission denied. Call requestPermission first.");
            return;
        }

        try {
            JSONArray callsArray = new JSONArray();
            String normalizedNumber = phoneNumber.replaceAll("[^0-9+]", "");
            String[] projection = new String[] {
                CallLog.Calls._ID,
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION,
                CallLog.Calls.CACHED_NAME
            };

            String selection = CallLog.Calls.DATE + " >= ?";
            String[] selectionArgs = new String[] {
                String.valueOf(sinceTimestamp)
            };

            Cursor cursor = getContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                CallLog.Calls.DATE + " DESC LIMIT 10"
            );

            android.util.Log.d("CallLogPlugin", "Querying calls since: " + sinceTimestamp + " for number: " + phoneNumber);

            if (cursor != null) {
                android.util.Log.d("CallLogPlugin", "Found " + cursor.getCount() + " total calls");

                while (cursor.moveToNext()) {
                    String number = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER));
                    String normalizedCallNumber = number != null ? number.replaceAll("[^0-9+]", "") : "";

                    if (normalizedCallNumber.contains(normalizedNumber) ||
                        normalizedNumber.contains(normalizedCallNumber)) {

                        JSONObject callObj = new JSONObject();

                        String id = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls._ID));
                        int type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE));
                        long date = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DATE));
                        int duration = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION));
                        String name = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME));

                        callObj.put("id", id);
                        callObj.put("number", number);
                        callObj.put("type", getCallTypeString(type));
                        callObj.put("date", date);
                        callObj.put("duration", duration);
                        callObj.put("name", name);

                        android.util.Log.d("CallLogPlugin", "Matched call: ID=" + id + ", Duration=" + duration + "s, Type=" + getCallTypeString(type));

                        callsArray.put(callObj);
                    }
                }
                cursor.close();
            }

            JSObject result = new JSObject();
            result.put("calls", callsArray.toString());
            call.resolve(result);

        } catch (JSONException e) {
            call.reject("Error reading call log", e);
        } catch (Exception e) {
            call.reject("Unexpected error", e);
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
