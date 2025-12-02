# Complete Permission & Update Issues Fix Guide

## 🔴 Critical Issues Fixed

### 1. Permission Popup Not Appearing ✅
**Solution**: Added manual "Enable Call Tracking" button in Leads page

### 2. Lead Updates Not Reflecting ✅  
**Solution**: Fixed LeadDetailPage to properly update state and show success message

### 3. Real-time Sync for Deletes/Updates ✅
**Solution**: WebSocket already implemented - just needed proper refresh

---

## 📱 NEW APK LOCATION
```
D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🔧 HOW TO ENABLE CALL LOG PERMISSION

### Method 1: Using the App Button (EASIEST) ⭐

1. **Uninstall old app completely**
   ```powershell
   adb uninstall com.edforce.app
   ```

2. **Install new APK**
   ```powershell
   adb install "D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk"
   ```

3. **Open app → Login → Go to Leads page**

4. **Look for the orange button** at the top:
   ```
   📞 Enable Call Tracking
   ```

5. **Click the button** → Permission popup will appear

6. **Click "Allow"** → You'll see success message

---

### Method 2: Manual Permission in Android Settings

If the button doesn't work or you accidentally denied permission:

#### Step-by-Step Instructions:

1. **Open Android Settings** (gear icon)

2. **Tap "Apps" or "Applications"**

3. **Find and tap "Edforce"** in the app list

4. **Tap "Permissions"**

5. **Find and tap "Phone"** (or "Call logs")

6. **Select "Allow"** or toggle to ON

7. **Return to Edforce app**

8. **Permission is now enabled** ✅

---

### Method 3: Using ADB Commands (For Developers)

```powershell
# Grant permission via command line
adb shell pm grant com.edforce.app android.permission.READ_CALL_LOG

# Verify permission was granted
adb shell dumpsys package com.edforce.app | Select-String "READ_CALL_LOG"
```

**Expected output:**
```
android.permission.READ_CALL_LOG: granted=true
```

---

## 📋 Testing Call Duration After Permission

### Test Procedure:

1. **Verify permission is granted** (check Settings or use button shows it's granted)

2. **Go to Leads page**

3. **Click phone icon** next to a lead

4. **Let the phone ring and connect**

5. **Talk for at least 30 seconds** (count: one-thousand-one, one-thousand-two...)

6. **Hang up the call**

7. **Return to Edforce app** (don't force close it)

8. **Wait 5-10 seconds** for call log to sync

9. **Disposition modal should appear** showing actual duration

### Expected Results:

| Your Call Duration | Modal Should Show |
|-------------------|-------------------|
| 22 seconds | `0:00:22` |
| 1 min 30 sec | `0:01:30` |
| 5 minutes | `0:05:00` |

### Debug Logs:

Connect via USB and run:
```powershell
adb logcat | Select-String "CallLogPlugin"
```

**You should see:**
```
CallLogPlugin: Querying calls since: 1732288000000
CallLogPlugin: Found 3 total calls
CallLogPlugin: Matched call: ID=12345, Duration=22s, Type=outgoing
```

---

## 🔄 Testing Lead Updates & Deletes

### Issue: Changes Not Appearing

The app now has **WebSocket real-time sync** which should update automatically.

### Test Update Flow:

1. **Open lead detail page**

2. **Change lead status or add notes**

3. **Click "Save"** button

4. **You should see** alert: "Lead updated successfully!"

5. **Navigate back to Leads list**

6. **Changes should be visible immediately**

### Test Delete Flow:

1. **Go to Leads page**

2. **Click delete icon** (trash) on a lead

3. **Confirm deletion**

4. **Lead disappears immediately from list**

5. **Open on another device** → Lead should also be gone there

### If Updates Still Don't Show:

#### Quick Fix:
1. **Pull down to refresh** the leads list
2. Changes should appear

#### Check WebSocket Connection:

Open Chrome DevTools to inspect app:
```
chrome://inspect
```

Look for console logs:
```javascript
✅ WebSocket connected: socket-id-here
📝 Lead updated: { id: 'abc123', ... }
🔄 Data updated
```

If you see:
```javascript
❌ WebSocket disconnected
```

Then WebSocket isn't working. Check:
1. Backend server is running on port 3001
2. Network allows WebSocket connections
3. Try restarting the app

---

## 🐛 Common Issues & Solutions

### Issue 1: Button Says "Enable Call Tracking" But I Already Clicked It

**Cause**: App doesn't detect permission was granted

**Solution**:
1. Close and reopen the app completely
2. Check Settings manually (Method 2 above)
3. Use ADB to verify: `adb shell dumpsys package com.edforce.app | Select-String "READ_CALL_LOG"`

### Issue 2: Duration Still Shows 0:00:00

**Possible Causes:**

1. **Permission not actually granted**
   - Fix: Check Settings > Apps > Edforce > Permissions > Phone = Allow

2. **Call not in CallLog yet**
   - Fix: Wait 10 seconds after hanging up before checking

3. **Phone number mismatch**
   - Fix: Make sure you're calling the exact number saved in the lead

4. **App was closed during call**
   - Fix: Keep app running in background (don't swipe it away)

**Debug:**
```powershell
# Check permission status
adb shell dumpsys package com.edforce.app | Select-String "READ_CALL_LOG"

# Watch call log queries in real-time
adb logcat -c; adb logcat | Select-String "CallLogPlugin|duration"

# Make your test call, then check logs
# Look for: "Matched call: ID=X, Duration=Ys"
```

### Issue 3: Lead Updates Don't Appear

**Quick Fixes:**

1. **Refresh the page** - Pull down on leads list

2. **Check network** - Make sure you're connected

3. **Check console** - Open `chrome://inspect` and look for errors

4. **Restart backend** if WebSocket shows disconnected

**Verify Backend is Running:**
```powershell
curl http://192.168.0.102:3001/api/health
```

Should return: `{"status":"ok"}`

### Issue 4: Can't Find Edforce in Apps Settings

**Solution:**

1. Open Settings > Apps
2. Tap menu (⋮) > **Show system apps** or **All apps**
3. Search for "Edforce" or "CRM"
4. If still not found, check if app is actually installed:
   ```powershell
   adb shell pm list packages | Select-String "edforce"
   ```

### Issue 5: Permission Popup Appears But Clicking "Allow" Does Nothing

**Cause**: Old app data interfering

**Solution:**
```powershell
# Completely uninstall app and clear data
adb uninstall com.edforce.app

# Verify it's gone
adb shell pm list packages | Select-String "edforce"

# Reinstall fresh
adb install "D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk"

# Open app and try permission again
```

---

## ✅ Verification Checklist

After installing new APK, verify:

- [ ] Old app completely uninstalled
- [ ] New APK installed successfully
- [ ] App opens and login works
- [ ] Navigate to Leads page
- [ ] **Orange "Enable Call Tracking" button visible** (if permission not granted)
- [ ] Click button → Permission popup appears
- [ ] Click "Allow" → Success message shows
- [ ] Button disappears (permission granted)
- [ ] Manually verify: Settings > Apps > Edforce > Permissions > Phone = Allow
- [ ] Make test call (30+ seconds)
- [ ] Return to app → Disposition modal shows actual duration
- [ ] Update a lead → Changes save and show immediately
- [ ] Delete a lead → Lead disappears immediately
- [ ] Create a lead → New lead appears in list

---

## 🔍 Advanced Debugging

### View All Permissions for App:
```powershell
adb shell dumpsys package com.edforce.app | Select-String "permission"
```

### View Device Call Log:
```powershell
adb shell content query --uri content://call_log/calls --projection number:date:duration:type --where "date >= $(([DateTimeOffset]::Now.AddHours(-1).ToUnixTimeMilliseconds()))"
```

### Test Permission Popup Manually:
```powershell
# Revoke permission
adb shell pm revoke com.edforce.app android.permission.READ_CALL_LOG

# Verify revoked
adb shell dumpsys package com.edforce.app | Select-String "READ_CALL_LOG"
# Should show: granted=false

# Now open app and click "Enable Call Tracking" button
# Popup should appear
```

### Watch All App Logs:
```powershell
adb logcat | Select-String "edforce|CallLog|WebSocket"
```

### Clear App Data Without Uninstall:
```powershell
adb shell pm clear com.edforce.app
```

---

## 📞 Support

If issues persist after following all steps:

1. **Collect logs:**
   ```powershell
   adb logcat -d > D:\edforce-logs.txt
   ```

2. **Check Android version:**
   ```powershell
   adb shell getprop ro.build.version.release
   ```
   (Should be Android 6.0 or higher)

3. **Verify APK is the latest:**
   ```powershell
   adb shell dumpsys package com.edforce.app | Select-String "versionName"
   ```

4. **Share:**
   - Log file
   - Android version
   - Exact error message
   - Steps to reproduce

---

## 🎯 Quick Start (TL;DR)

```powershell
# 1. Uninstall old app
adb uninstall com.edforce.app

# 2. Install new APK
adb install "D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk"

# 3. Open app > Login > Leads page > Click "📞 Enable Call Tracking" > Allow

# 4. Test call duration works
# - Make call (30+ sec)
# - Hang up
# - Wait 10 sec
# - Check modal shows duration

# 5. Test updates work
# - Edit a lead
# - Save
# - Check changes appear

# Done! 🎉
```
