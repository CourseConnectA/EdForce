# COMPLETE FIX GUIDE

## What Was Fixed

### 1. ✅ Permission Request (READ_CALL_LOG)
**Issue**: Permission popup not appearing
**Fix**: 
- Updated `CallLogPlugin.java` to use proper Android permission callback flow
- Added explicit permission check and alert in frontend
- Permission will now be requested when app starts

**How to Test**:
1. Uninstall old app
2. Install new APK
3. Open app → Permission popup should appear
4. Grant permission
5. Check app logs for "CallLog permission granted"

### 2. ✅ Call Duration Showing 0:00:00
**Issue**: CallLog plugin not capturing actual duration
**Fix**:
- Added extensive debug logging to track call queries
- Fixed JSON parsing of CallLog results
- Added alert if permission denied
- Plugin now logs: "Matched call: ID=X, Duration=Xs"

**How to Test**:
1. Make a call from the app
2. After call ends, check Android Logcat:
   ```
   adb logcat | Select-String "CallLogPlugin"
   ```
3. Should see: "Matched call: ID=123, Duration=45s"
4. Disposition modal should pre-fill with actual duration

**Troubleshooting**:
- If duration still 0:00:00:
  - Check Logcat for "Found X total calls"
  - Verify call appears in phone's native call log
  - Ensure phone number matches (normalizes automatically)

### 3. ✅ Real-Time Data Sync
**Issue**: Changes only appear after reload
**Fix**: Implemented WebSocket for live updates

**Backend Changes**:
- Created `DataSyncGateway` WebSocket gateway
- Emits events: `lead:created`, `lead:updated`, `lead:deleted`, `lead:assigned`, `call:logged`
- Integrated into LeadsService and CallsService

**Frontend Changes**:
- Created `webSocketService.ts`
- Auto-connects when user logs in
- Listens for data changes and auto-refreshes leads list
- No reload needed!

**How to Test**:
1. Open app on 2 devices
2. Create/update a lead on device 1
3. Device 2 should auto-update within 1-2 seconds
4. Check browser console for: "🔄 Data updated"

## Installation Steps

### 1. Transfer New APK to Phone
```
Location: D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

### 2. Uninstall Old App (Important!)
```
Settings → Apps → Edforce → Uninstall
```

### 3. Install New APK
```
Open file → Install → Grant install permission if needed
```

### 4. Start Backend (if not running)
```powershell
cd D:\Edforce\backend
npm run start:dev
```

### 5. Open App and Grant Permissions
- **READ_CALL_LOG**: Required for automatic duration tracking
- **CALL_PHONE**: Required for click-to-call

## Testing Checklist

### Permission Test
- [ ] Permission popup appears on first launch
- [ ] Can grant READ_CALL_LOG permission
- [ ] Console shows "CallLog permission granted"
- [ ] If denied, alert appears with instructions

### Call Duration Test
- [ ] Click phone icon in leads list
- [ ] Native dialer opens
- [ ] Make a test call (call yourself or a friend)
- [ ] Answer and talk for 30+ seconds
- [ ] End call
- [ ] Return to app
- [ ] Disposition modal appears automatically
- [ ] Duration field shows correct time (e.g., "0:00:35")
- [ ] NOT 0:00:00
- [ ] Save call log
- [ ] Duration appears in leads list columns

### Real-Time Sync Test
- [ ] Open app on 2 devices (or device + laptop browser)
- [ ] Create a new lead on device 1
- [ ] Device 2 shows new lead within 2 seconds (no refresh!)
- [ ] Update a lead on device 1
- [ ] Device 2 updates automatically
- [ ] Delete a lead on device 1
- [ ] Device 2 removes it automatically
- [ ] Assign a lead on device 1
- [ ] Device 2 shows new assignment
- [ ] Log a call on device 1
- [ ] Device 2 updates last call info

### Console Logs to Check
```javascript
// Permission granted
"CallLog permission granted"

// WebSocket connected
"✅ WebSocket connected: <socket-id>"

// Call query
"CallLogPlugin: Querying calls since: <timestamp> for number: <phone>"
"CallLogPlugin: Found X total calls"
"CallLogPlugin: Matched call: ID=123, Duration=45s"

// Real-time updates
"🆕 New lead created: <data>"
"📝 Lead updated: <data>"
"🗑️ Lead deleted: <data>"
"📞 Call logged: <data>"
"🔄 Data updated: <entity>"
```

## Advanced Debugging

### View Android Logs (USB Debugging)
```powershell
# Enable USB debugging on phone
Settings → Developer Options → USB Debugging → ON

# Connect to computer
adb logcat | Select-String "CallLogPlugin|Capacitor"
```

### View Browser Console (Chrome DevTools)
```
1. Enable USB debugging
2. Connect phone to computer
3. Open Chrome: chrome://inspect
4. Find your device
5. Click "Inspect"
6. View console logs
```

### Check WebSocket Connection
```javascript
// In browser console
console.log('WebSocket connected:', webSocketService.isConnected());
```

### Manually Test Permission
```javascript
// In browser console (after USB debugging connected)
const { Capacitor } = window;
const plugin = Capacitor.Plugins.CallLog;

// Check permission
await plugin.checkPermission();

// Request permission
await plugin.requestPermission();

// Get recent calls
await plugin.getRecentCalls({
  phoneNumber: "+1234567890",
  sinceTimestamp: Date.now() - 3600000 // last hour
});
```

## Common Issues & Solutions

### 1. Permission Popup Not Appearing
**Solution**: 
- Check Logcat for errors
- Verify AndroidManifest.xml has READ_CALL_LOG permission
- Try: Settings → Apps → Edforce → Permissions → Manually enable

### 2. Duration Still 0:00:00
**Causes**:
- Permission not granted → Grant in Settings
- Call not in device log → Wait 5-10 seconds after call ends
- Phone number mismatch → Plugin normalizes, should work

**Debug Steps**:
```powershell
# View CallLog queries
adb logcat | Select-String "CallLogPlugin"

# Should see:
# "Querying calls since: <timestamp>"
# "Found X total calls"
# "Matched call: ID=123, Duration=45s"
```

### 3. Real-Time Sync Not Working
**Causes**:
- Backend not running → Start with `npm run start:dev`
- WebSocket not connected → Check console for "WebSocket connected"
- Network issue → Verify phone and computer on same WiFi

**Debug Steps**:
```javascript
// Check connection status
webSocketService.isConnected() // Should return true

// Check console for events
// Should see: "🔄 Data updated" when changes happen
```

### 4. App Shows Old Data
**Solution**:
- Uninstall old app completely
- Clear browser cache (if using dev server)
- Reinstall new APK
- Force stop app and reopen

## Technical Details

### CallLog Plugin Flow
```
1. User clicks phone icon
2. Native dialer opens (tel: URI)
3. User makes call
4. Call ends, user returns to app
5. androidCallSyncService polls every 5 seconds
6. Queries CallLog plugin with phone number + timestamp
7. Plugin queries Android's CallLog.Calls content provider
8. Returns matched call with DURATION (connected time in seconds)
9. Service parses JSON response
10. Dispatches 'call-completed' event with duration
11. CallDispositionModal opens with duration pre-filled
```

### WebSocket Real-Time Sync Flow
```
1. User logs in
2. Frontend connects WebSocket to backend
3. Backend emits events on data changes:
   - lead:created
   - lead:updated
   - lead:deleted
   - lead:assigned
   - call:logged
4. Frontend listens for events
5. On event received, dispatches Redux action to refetch leads
6. UI updates automatically
7. No reload needed!
```

### Permissions Required
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Performance Notes

- **WebSocket**: Efficient, minimal data transfer
- **Polling**: CallLog checked every 5 seconds (only when pending call)
- **Real-time updates**: Instant for all connected clients
- **Battery**: Minimal impact, WebSocket uses keep-alive

## Next Steps

1. **Install new APK** on your phone
2. **Test permission** request
3. **Make test call** and verify duration
4. **Test real-time sync** with 2 devices
5. **Monitor logs** via USB debugging for any issues

## Success Criteria

✅ Permission popup appears on first launch  
✅ Call duration shows actual connected time (not 0:00:00)  
✅ Changes appear instantly on all devices  
✅ No reload needed for updates  
✅ Logcat shows "Matched call: ID=X, Duration=Xs"  
✅ Console shows "🔄 Data updated" on changes  

---

**Build Date**: November 22, 2025  
**APK Location**: `D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk`  
**Status**: Ready for testing! 🚀
