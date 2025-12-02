# Network Configuration Fix - APK Updated

## Issue
Getting "network error" when trying to login from mobile app.

## Root Cause
The APK was built without proper network configuration to allow HTTP connections to your local backend server.

## What Was Fixed

### 1. Environment Configuration
Created `.env.production` with explicit API URL:
```
VITE_APP_API_URL=http://192.168.0.102:3001/api
```

### 2. Capacitor Configuration
Updated `capacitor.config.ts` to allow cleartext HTTP traffic:
```typescript
server: {
  androidScheme: 'http',
  cleartext: true,
}
```

### 3. Android Manifest
Added `usesCleartextTraffic="true"` to allow HTTP connections (required for Android 9+).

### 4. Network Security Config
Created `network_security_config.xml` to explicitly allow HTTP traffic to local network IPs:
- localhost
- 127.0.0.1
- 192.168.0.102 (your computer's IP)
- Local network ranges

## New APK Details
**Location:** `D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk`  
**Size:** 13.4 MB  
**Build Time:** 22-11-2025 10:42:47

## Installation Steps

1. **Uninstall old app** from your phone (if installed)
2. **Transfer new APK** to your phone
3. **Install** the new APK
4. **Grant permissions** when prompted
5. **Test login** - should now work!

## Verification Checklist

Before testing:
- [ ] Backend is running: `npm run start:dev` in backend directory
- [ ] Backend listening on port 3001 (check with: `Get-NetTCPConnection -LocalPort 3001`)
- [ ] Computer and phone on same WiFi network
- [ ] Computer's IP is still 192.168.0.102 (check with: `ipconfig`)

Testing:
- [ ] Open app on phone
- [ ] Grant CallLog and Phone permissions
- [ ] Enter login credentials
- [ ] Click "Sign In"
- [ ] **Should successfully login** (no network error)
- [ ] Navigate to leads list
- [ ] Data should load

## If Still Not Working

### Check Computer's IP Address
Your IP might have changed. Check current IP:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" }
```

If IP changed (e.g., to 192.168.0.150):
1. Update `.env.production`: `VITE_APP_API_URL=http://192.168.0.150:3001/api`
2. Update `network_security_config.xml`: Add new IP to domains
3. Rebuild: `npx vite build && npx cap sync android && cd android && .\gradlew.bat assembleDebug`

### Check Backend CORS
The backend already allows local network IPs, but verify it's running:
```powershell
# Should show "Listen" status
Get-NetTCPConnection -LocalPort 3001 -State Listen
```

### Test API from Phone's Browser
Open phone's browser and visit:
```
http://192.168.0.102:3001/api/auth/health
```

If this doesn't work, the issue is network connectivity, not the app.

### Enable USB Debugging
To see detailed logs:
1. Enable Developer Options on phone
2. Enable USB Debugging
3. Connect to computer
4. Open Chrome: `chrome://inspect`
5. Find your device
6. Click "Inspect"
7. View console logs when logging in

### View Android Logs
```powershell
adb logcat | Select-String "Capacitor|CallLog|API"
```

## Network Requirements

### Firewall
Ensure Windows Firewall allows connections on port 3001:
```powershell
# Check firewall rule
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*3001*" }

# If not exists, add rule:
New-NetFirewallRule -DisplayName "NestJS Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Backend Binding
Backend must listen on `0.0.0.0` (all interfaces), not just `localhost`. This is already configured in `backend/src/main.ts`:
```typescript
await app.listen(port, '0.0.0.0');
```

## Quick Test Commands

```powershell
# Check if backend is accessible from network
Invoke-WebRequest -Uri "http://192.168.0.102:3001/api/auth/health" -UseBasicParsing

# Check CORS
$headers = @{ "Origin" = "capacitor://localhost" }
Invoke-WebRequest -Uri "http://192.168.0.102:3001/api/auth/health" -Headers $headers -UseBasicParsing

# Test from another computer/phone on same network
# Use phone's browser: http://192.168.0.102:3001/api/auth/health
```

## Understanding the Error

**"Network Error" in mobile app usually means:**
1. ✅ **Can't reach backend** - Fixed with network configuration
2. ❌ Backend not running - Check `Get-NetTCPConnection -LocalPort 3001`
3. ❌ Wrong IP address - Update .env.production and rebuild
4. ❌ Firewall blocking - Add firewall rule
5. ❌ Different WiFi networks - Connect both devices to same network
6. ❌ Backend CORS blocking - Already configured to allow

## Success Indicators

When working correctly, you should see in console (via USB debugging):
```
API Service Init: { isDev: false, explicit: "http://192.168.0.102:3001/api", isNative: true, platform: "android" }
Using explicit API URL: http://192.168.0.102:3001/api
Final baseURL: http://192.168.0.102:3001/api
Axios instance created with baseURL: http://192.168.0.102:3001/api
```

And login request should succeed with status 200.

## Production Deployment

For production (when deploying to app store):
1. Update `.env.production` with production API URL (HTTPS)
2. Remove `usesCleartextTraffic="true"` from AndroidManifest
3. Update `network_security_config.xml` to only allow your production domain
4. Build release APK: `.\gradlew.bat assembleRelease`
5. Sign APK with your keystore

---

**Next Step:** Install the new APK on your phone and test login!
