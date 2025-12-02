# Network Troubleshooting Guide

## Understanding the Setup

### Two Different Ways to Access the App:

#### 1. **Installed APK (Recommended for Mobile)**
- Location: Installed on your phone
- How it works: Contains all HTML/JS/CSS files built-in
- API Connection: Directly to `http://192.168.0.102:3001/api`
- **This is what you should use for mobile testing**

#### 2. **Dev Server via Browser (For Development)**
- URL: `http://192.168.0.102:5173`
- How it works: Vite dev server serves files live
- API Connection: Through Vite proxy (`/api` → `http://localhost:3001/api`)
- **This works on laptop but NOT on mobile browser** (because proxy uses localhost)

## Your Current Issue

When you open `http://192.168.0.102:5173/dashboard` in mobile Chrome:
- ❌ You get "network error"
- **Why**: The Vite proxy configuration uses `localhost:3001` which is only accessible from the same machine

## Solution: Use the Installed APK

### Step 1: Install the APK
```
Location: D:\Edforce\frontend\android\app\build\outputs\apk\debug\app-debug.apk
Transfer to phone → Install → Open
```

### Step 2: Verify Backend is Running
```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen

# Test from network
Invoke-WebRequest -Uri "http://192.168.0.102:3001/api/leads" -UseBasicParsing
# Should return 401 Unauthorized (expected without auth)
```

### Step 3: Test the APK
1. Open installed app on phone
2. Login with your credentials
3. Should work perfectly!

## Alternative: Fix Dev Server for Mobile Browser

If you REALLY want to use mobile Chrome browser (not recommended):

### Update Vite Config to Use Network IP in Proxy:

```typescript
// frontend/vite.config.ts
server: {
  host: '0.0.0.0',
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://192.168.0.102:3001',  // Changed from localhost
      changeOrigin: true,
    },
  },
}
```
cd D:\Edforce\frontend
Then restart Vite dev server:
```powershell
cd D:\CC-CRM-Demo\frontend
npm run dev
```

## Quick Test

### Test 1: Backend Accessible
```powershell
# From your computer
Invoke-WebRequest -Uri "http://192.168.0.102:3001/api/leads"
```
**Expected**: 401 Unauthorized

### Test 2: Dev Server Accessible (if using browser)
From mobile browser:
```
http://192.168.0.102:5173
```
**Expected**: Should load login page

### Test 3: APK Works
1. Install APK on phone
2. Open app
3. Login
**Expected**: Should work without network errors

## Common Issues

### "Network Error" in APK
**Causes:**
1. Backend not running → Run `npm run start:dev` in backend folder
2. Wrong IP address → Check with `ipconfig`, update `.env.production` if changed
3. Firewall blocking → Add rule for port 3001

### "Network Error" in Mobile Chrome
**Causes:**
1. Dev server not running → Run `npm run dev` in frontend folder
2. Vite proxy using localhost → Update vite.config.ts to use network IP
3. Not on same WiFi → Connect both devices to same network

### APK Shows Blank/White Screen
**Causes:**
1. Old APK cached → Uninstall and reinstall
2. JavaScript errors → Use USB debugging to check console

## Recommended Workflow

### For Development on Laptop:
```
1. Backend: npm run start:dev (in backend/)
2. Frontend: npm run dev (in frontend/)
3. Browser: http://localhost:5173
```

### For Testing on Mobile:
```
1. Backend: npm run start:dev (in backend/)
2. Build APK: See build commands below
cd D:\Edforce\frontend
4. Test app
```

### APK Build Commands:
```powershell
cd D:\CC-CRM-Demo\frontend
npx vite build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

## Port Reference

- **3001**: Backend API (must be running)
- **5173**: Vite dev server (only for development)
- **5432**: PostgreSQL database (must be running)

## Final Recommendation

✅ **Use the installed APK for mobile testing**  
❌ Don't try to use mobile Chrome with dev server (proxy issues)  
✅ Use laptop browser for development  
✅ Keep backend running on port 3001  

---

**TL;DR**: Install the APK on your phone. Don't use mobile Chrome browser to access the dev server—it won't work due to proxy configuration.
