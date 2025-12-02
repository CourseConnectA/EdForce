# CallLog Plugin Test Guide

## Fresh Build Completed

A clean rebuild has been performed with the following changes:

### Changes Made:
1. **CallLogPlugin.java**: Added CALL_PHONE permission to plugin annotation
2. **Clean Build**: Ran `gradlew clean` then `gradlew assembleDebug` to ensure proper compilation

## Testing Steps:

1. **Install the new APK**:
   ```
   Location: D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk
   ```

2. **Uninstall old version first** (important!):
   - Go to Settings → Apps → Edforce
   - Uninstall the app
   - This ensures the new plugin code is loaded

3. **Install new version**:
   - Install app-debug.apk
   - Grant all permissions when prompted

4. **Test Call Duration**:
   - Open the app
   - Go to Leads
   - Click phone icon to initiate call
   - Make a call for 30+ seconds
   - Hang up
   - Check Chrome DevTools console for these logs:
     ```
     ✅ CallLog plugin registered
     📞 Querying Android CallLog...
     ✅ Permission granted
     Found X calls in CallLog
     ```
   - The call disposition modal should show the correct duration automatically

## Expected Behavior:

If plugin works correctly, you'll see:
- No "plugin is not implemented" error
- CallLog queries returning results
- Call duration auto-filled in disposition modal
- Duration matches actual call time

## If Still Not Working:

Check these in DevTools console:
1. Is "CallLog plugin registered" appearing?
2. Is "plugin is not implemented" error still showing?
3. Are there Java errors in Android Logcat?

Run this to see Android logs:
```bash
adb logcat -s CallLogPlugin:D
```

## Key Code Locations:

- **Java Plugin**: `frontend/android/app/src/main/java/com/edforce/app/CallLogPlugin.java`
- **MainActivity**: `frontend/android/app/src/main/java/com/edforce/app/MainActivity.java`
- **JS Service**: `frontend/src/services/androidCallSyncService.ts`
