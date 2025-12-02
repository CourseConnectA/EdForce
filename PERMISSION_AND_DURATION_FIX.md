# Permission & Call Duration Fix Guide

## What Was Fixed

### 1. **Permission Callback Issue** ✅
**Problem**: The permission callback method was `private`, so Capacitor couldn't call it.
**Fix**: Made `handlePermissionResult()` a public `@PluginMethod` with detailed logging.

### 2. **Enhanced Logging** ✅
Added comprehensive logging throughout the permission flow and call tracking:
- Permission request/grant/deny events
- CallLog query results
- Call duration tracking
- Disposition modal data

## Updated APK Location
```
D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

## Installation Steps

### Step 1: Uninstall Old App
**CRITICAL**: You MUST completely uninstall the old app first, or the new permission flow won't work.

```powershell
# Check if app is installed
adb shell pm list packages | Select-String "edforce"

# Uninstall old app
adb uninstall com.edforce.app

# Verify it's gone
adb shell pm list packages | Select-String "edforce"
```

### Step 2: Install New APK
```powershell
# Install new APK
adb install "D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk"
```

Or transfer the file to your phone and install manually:
1. Copy `app-debug.apk` to phone
2. Tap to install (you may need to enable "Install from Unknown Sources")
3. Uninstall old app when prompted, then install new one

## Testing Permission Popup

### Expected Flow:
1. **Open the app** → Login
2. **Navigate to Leads page** → This triggers `androidCallSyncService.start()`
3. **Permission popup should appear** → "Allow Edforce to access your call logs?"
4. **Click "Allow"**

Connect phone via USB and run:
```powershell
adb logcat | Select-String "CallLogPlugin"
```

**Expected Log Output:**
```
CallLogPlugin: requestPermission called
CallLogPlugin: Requesting READ_CALL_LOG permission...
CallLogPlugin: handlePermissionResult callback triggered
CallLogPlugin: Permission GRANTED by user
```

**If Permission Denied:**
```
CallLogPlugin: handlePermissionResult callback triggered
CallLogPlugin: Permission DENIED by user
```

### Manual Permission Check
If popup doesn't appear, check permission status:
```powershell
adb shell dumpsys package com.edforce.app | Select-String "READ_CALL_LOG"
```

Expected output if granted:
```
android.permission.READ_CALL_LOG: granted=true
```

## Testing Call Duration

### Test Scenario:
1. Open app → Navigate to Leads
2. Click phone icon next to a lead
3. **Make a call** (let it ring and connect)
4. **Talk for at least 20-30 seconds**
5. **Hang up the call**
6. Return to the app
7. **Disposition modal should appear within 5 seconds**

### Expected Duration Display:
- If call was 22 seconds → Should show `0:00:22`
- If call was 1 minute 30 seconds → Should show `0:01:30`
- If call was 5 minutes → Should show `0:05:00`

### Debugging Call Duration

Run logcat while making a call:
```powershell
adb logcat | Select-String "CallLogPlugin|AndroidCallSync"
```

**1. When you click the call button:**
```
📞 Initiating call to: +1234567890
```

**2. While calling (every 5 seconds):**
```
CallLogPlugin: Querying calls since: 1732288000000 for number: +1234567890
CallLogPlugin: Found 5 total calls
CallLogPlugin: Matched call: ID=12345, Duration=22s, Type=outgoing
```

**3. After hanging up:**
```
✅ Found call in CallLog: {id: 12345, duration: 22, type: outgoing, date: ...}
📞 Call was connected, duration: 22 seconds
✅ Auto-logged call, showing disposition modal with duration: 22
```

**4. In browser console (Chrome DevTools):**
```
📱 CallDispositionModal opened with data: {
  phoneNumber: "+1234567890",
  leadId: "abc123",
  startTime: "2024-11-22T10:30:00Z",
  duration: 22
}
✅ Using CallLog duration: 22 seconds
```

## Common Issues & Solutions

### Issue 1: Permission Popup Not Appearing

**Possible Causes:**
1. Old app not fully uninstalled
2. Permission already granted/denied from previous install

**Solution:**
```powershell
# Completely remove app and data
adb uninstall com.edforce.app

# Clear any cached permissions
adb shell pm clear com.edforce.app 2>$null

# Reinstall
adb install "D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk"
```

### Issue 2: Duration Still Shows 0:00:00

**Possible Causes:**
1. Permission not granted → CallLog can't be read
2. Phone number format mismatch
3. Call not in CallLog yet (takes 1-2 seconds to appear)

**Debug Steps:**

1. **Check permission status:**
```powershell
adb shell dumpsys package com.edforce.app | Select-String "READ_CALL_LOG"
```
Should show: `granted=true`

2. **Watch CallLog query in real-time:**
```powershell
adb logcat -c  # Clear log
# Make your test call
adb logcat | Select-String "CallLogPlugin"
```

Look for:
```
✅ Matched call: ID=12345, Duration=22s
```

If you see:
```
Found 0 total calls
```
→ Permission issue or phone number mismatch

3. **Check phone number format:**
The app normalizes numbers by removing spaces/dashes, so these should all match:
- `+1 (555) 123-4567`
- `+15551234567`
- `5551234567`

4. **Wait longer after call:**
The service checks every 5 seconds. After hanging up, wait 5-10 seconds before checking.

### Issue 3: Modal Shows 0:00:00 Even Though Logs Show Duration

**Cause:** Duration not being passed to the modal properly.

**Debug:**
Open Chrome DevTools (inspect app):
```
chrome://inspect
```

Look for console logs:
```javascript
📱 CallDispositionModal opened with data: { duration: 22 }
✅ Using CallLog duration: 22 seconds
```

If you see `duration: undefined` or `duration: 0`, the issue is in the event handling.

## Verification Checklist

- [ ] Old app completely uninstalled
- [ ] New APK installed successfully
- [ ] App opens and login works
- [ ] Navigate to Leads page
- [ ] Permission popup appears
- [ ] Click "Allow" on permission popup
- [ ] Success message appears
- [ ] adb logcat shows "Permission GRANTED"
- [ ] Make a test call (20+ seconds)
- [ ] Hang up and return to app
- [ ] Disposition modal appears within 5-10 seconds
- [ ] Duration field shows actual call time (NOT 0:00:00)
- [ ] adb logcat shows "Matched call: Duration=XXs"
- [ ] Save disposition successfully

## Advanced Debugging

### View All Call Logs on Device:
```powershell
adb shell content query --uri content://call_log/calls --projection _id:number:date:duration:type
```

### Test Permission Manually:
```powershell
# Revoke permission
adb shell pm revoke com.edforce.app android.permission.READ_CALL_LOG

# Grant permission
adb shell pm grant com.edforce.app android.permission.READ_CALL_LOG
```

### View Real-Time Logs (Filtered):
```powershell
# Terminal 1: Watch Java logs
adb logcat CallLogPlugin:D *:S

# Terminal 2: Watch JS logs
adb logcat chromium:D *:S | Select-String "CallLog|duration"
```

## Success Criteria

✅ **Permission Flow Works:**
- Popup appears on first app launch
- User can grant/deny permission
- Success/error message shows accordingly

✅ **Call Duration Tracking Works:**
- After call ends, duration is captured from device CallLog
- Disposition modal shows accurate duration in HH:MM:SS format
- Duration is NOT 0:00:00 for connected calls

✅ **Logs Show Correct Flow:**
- Permission logs show callback triggered
- CallLog query logs show matched calls with duration
- Frontend logs show duration passed to modal

## Next Steps After Testing

If everything works:
1. Test with multiple calls of different durations
2. Test with different phone number formats
3. Test permission denial → manual re-enable flow

If issues persist:
1. Share the exact logcat output
2. Share browser console logs
3. Check if call appears in phone's native call log app
4. Verify Android version (should be 6.0+)
