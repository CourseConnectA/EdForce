# Android APK Installation Guide

## Overview
The Edforce Android app has been successfully built with native CallLog integration. This guide explains how to install and test the app on your Android device.

## APK Location
The debug APK is located at:
```
D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

**File size:** ~10.8 MB  
**Build date:** 22-11-2025 10:28:58

## Installation Steps

### Method 1: Direct Transfer (Recommended)
1. **Connect your Android device** to your computer via USB cable
2. **Enable USB file transfer** on your phone (notification should appear)
3. **Copy the APK** to your phone's Downloads folder
4. **On your phone:**
   - Open the **Files** or **My Files** app
   - Navigate to **Downloads**
   - Tap on `app-debug.apk`
   - Tap **Install** (you may need to allow installation from unknown sources)
   - Wait for installation to complete
   - Tap **Open** to launch the app

### Method 2: Cloud Transfer
1. **Upload APK** to Google Drive, Dropbox, or similar
2. **On your phone:**
   - Download the APK from your cloud storage
   - Open the downloaded file from notifications
   - Follow installation prompts

### Method 3: ADB (Advanced)
If you have Android SDK/ADB installed:
```powershell
cd D:\Edforce\frontend\android
adb install app\build\outputs\apk\debug\app-debug.apk
```

## First Launch

### 1. Permission Popup
When you first open the app, it will request **READ_CALL_LOG** permission:
- Tap **Allow** to enable automatic call duration tracking
- This permission is essential for accurate call logging

### 2. Phone Permission
When you make your first call from the app:
- The app will request **CALL_PHONE** permission
- Tap **Allow** to enable click-to-call functionality

### 3. Backend Connection
Make sure your backend server is running and accessible on your network:
```powershell
# In backend directory
npm run start:dev
```

The app is configured to connect to:
- Backend: `http://192.168.0.102:3001/api`
- Frontend dev server: `http://192.168.0.102:5173` (not needed for APK)

**Update the API URL if needed:**
- Edit `frontend/capacitor.config.ts`
- Change `server.url` to match your computer's IP address
- Rebuild APK: `npx vite build && npx cap sync android && cd android && ./gradlew assembleDebug`

## Testing CallLog Integration

### Test 1: Permission Request
1. Open the app
2. Verify permission popup appears for READ_CALL_LOG
3. Grant the permission
4. Check console/logcat for "CallLog permission granted"

### Test 2: Click-to-Call
1. Login to the app
2. Navigate to Leads list
3. Click the phone icon next to a lead
4. Verify native phone dialer opens with correct number
5. Make a test call (call yourself or a friend)

### Test 3: Automatic Duration Capture
1. After ending the call, return to the app
2. **Call disposition modal should appear automatically**
3. **Duration field should be pre-filled** with actual call time from CallLog
4. Verify the duration matches your phone's call log
5. Select disposition and add notes
6. Save the call log

### Test 4: Verify in Leads List
1. Navigate back to Leads list
2. Check the "Last Call Disposition" and "Last Call Notes" columns
3. Verify saved data appears correctly

### Test 5: View Call History
1. Open any lead detail page
2. Scroll to "Call Details" section
3. Verify call appears with correct:
   - Date/Time
   - Duration (in HH:MM:SS format)
   - Type (outgoing/incoming/missed)
   - Disposition
   - Notes

## Troubleshooting

### APK Won't Install
- **Enable "Install from Unknown Sources"**:
  - Settings → Security → Unknown Sources (or Install Unknown Apps)
  - Enable for your browser/file manager app

### Permission Denied
- **Manually grant permissions**:
   - Settings → Apps → Edforce → Permissions
  - Enable "Phone" and "Call logs"

### Backend Connection Failed
- Verify backend is running on port 3001
- Check your computer's IP address: `ipconfig` (look for 192.168.x.x)
- Ensure both devices are on the same WiFi network
- Update `capacitor.config.ts` with correct IP if needed

### Duration Not Auto-Filled
- Verify READ_CALL_LOG permission was granted
- Check if call appears in phone's native call log
- Look for errors in browser console (use Chrome DevTools via USB debugging)
- Verify CallLog plugin is working: check logcat for plugin errors

### No Disposition Modal After Call
- Check if call was actually answered (not just ringing)
- Verify app returned to foreground after call ended
- Check browser console for "call-completed" event
- Ensure androidCallSyncService is running (check console logs)

## Development Tools

### USB Debugging (Chrome DevTools)
1. **Enable Developer Options** on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. **Enable USB Debugging**:
   - Settings → Developer Options → USB Debugging → ON
3. **Connect via Chrome**:
   - Connect phone to computer via USB
   - Open Chrome on computer
   - Go to `chrome://inspect`
   - Find your device and click "Inspect"
   - View console logs, network requests, etc.

### View Android Logs (Logcat)
```powershell
adb logcat | Select-String "Capacitor|CallLog"
```

## Rebuilding APK

If you make changes to the code:

```powershell
# Navigate to frontend directory
cd D:\Edforce\frontend

# Build web assets
npx vite build

# Sync with Android project
npx cap sync android

# Build APK
cd android
.\gradlew.bat assembleDebug

# APK will be at: app\build\outputs\apk\debug\app-debug.apk
```

## Native CallLog Plugin

The app includes a custom Capacitor plugin (`CallLogPlugin`) that:
- Requests READ_CALL_LOG permission at runtime
- Queries Android's CallLog.Calls content provider
- Returns call data with accurate **connected duration** (excludes ring time)
- Normalizes phone numbers for matching
- Handles all Android call types (incoming/outgoing/missed/rejected/voicemail)

**Plugin location:** `frontend/android/app/src/main/java/com/cccrm/app/CallLogPlugin.java`

## Key Features

✅ **Click-to-call**: Tap phone icon to dial from leads list  
✅ **Native dialer integration**: Uses Android's phone app  
✅ **Automatic duration tracking**: Captures actual call time from device  
✅ **Call disposition modal**: Auto-appears after call with pre-filled duration  
✅ **Call history**: View all calls in lead detail page  
✅ **Analytics**: Dashboard widget shows calling metrics  
✅ **Role-based access**: Counselors see own calls, managers see team calls  
✅ **Offline-first**: Works without network connection (syncs when online)

## Next Steps

1. **Install APK** on your Android device
2. **Grant permissions** when prompted
3. **Make test calls** from leads list
4. **Verify duration** auto-fills correctly
5. **Check call logs** appear in leads list and detail page
6. **Test analytics** dashboard widget

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review console logs via Chrome DevTools
3. Check logcat for native Android errors
4. Verify backend is running and accessible
5. Ensure permissions are granted in phone settings

---

**App Version:** 1.0.0 (Debug)  
**Build Date:** November 22, 2025  
**Capacitor Version:** Latest  
**Target Android:** API 21+ (Android 5.0+)
