package com.edforce.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.util.Log;
import androidx.core.app.ActivityCompat;
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

@CapacitorPlugin(name = "CallLogSync")
public class CallLogSyncPlugin extends Plugin {
    private static final String TAG = "CallLogSyncPlugin";

    @PluginMethod()
    public void getCallLogs(PluginCall call) {
        int daysBack = call.getInt("daysBack", 7);
        
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "READ_CALL_LOG permission not granted");
            JSObject result = new JSObject();
            result.put("callLogs", new JSArray());
            result.put("error", "READ_CALL_LOG permission not granted");
            call.resolve(result);
            return;
        }

        try {
            long cutoff = System.currentTimeMillis() - (long) daysBack * 24 * 60 * 60 * 1000;
            android.database.Cursor cursor = getContext().getContentResolver().query(
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

            JSArray callLogs = new JSArray();

            if (cursor != null) {
                while (cursor.moveToNext()) {
                    try {
                        JSObject callLog = new JSObject();
                        callLog.put("id", cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls._ID)));
                        callLog.put("duration", cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.DURATION)));
                        callLog.put("date", cursor.getLong(cursor.getColumnIndex(android.provider.CallLog.Calls.DATE)));
                        callLog.put("type", cursor.getInt(cursor.getColumnIndex(android.provider.CallLog.Calls.TYPE)));
                        callLog.put("number", cursor.getString(cursor.getColumnIndex(android.provider.CallLog.Calls.NUMBER)));
                        callLogs.put(callLog);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to create call log JSON: " + e.getMessage());
                    }
                }
                cursor.close();
            }

            Log.d(TAG, "Found " + callLogs.length() + " call logs from last " + daysBack + " days");
            
            JSObject result = new JSObject();
            result.put("callLogs", callLogs);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to query call logs: " + e.getMessage());
            call.reject("Failed to query call logs: " + e.getMessage());
        }
    }
}
