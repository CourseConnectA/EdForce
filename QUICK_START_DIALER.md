# Quick Start: Testing Android Dialer Integration

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Docker & Docker Compose installed
- Node.js 16+ installed
- Android device or emulator (for full native testing)

---

## Step 1: Start the Backend

```powershell
cd backend
npm run migration:run
npm run start:dev
```

Backend will run on `http://localhost:3000`

---

## Step 2: Start the Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

---

## Step 3: Login & Test

1. **Open browser**: `http://localhost:5173`
2. **Login** with your credentials
3. **Go to Leads** page
4. **Look for phone icon** (📞) next to each lead in the actions column
5. **Click the icon** to test click-to-call

---

## Step 4: Test Call Logging (Web Version)

1. Click phone icon on any lead
2. Your device dialer opens (or web does nothing if no tel: handler)
3. After 2 seconds, **Call Disposition Modal** should appear
4. Fill in:
   - Duration: `120` (seconds)
   - Disposition: Select "Connected"
   - Notes: "Test call successful"
5. Click **Save**
6. Go to **Lead Detail** page for that lead
7. Scroll to **Call Details** section
8. Verify your call appears in the table

---

## Step 5: Check Analytics

1. Go to **Dashboard**
2. Scroll to **Call Analytics Widget**
3. Should show:
   - Total Calls: 1
   - Outgoing Calls: 1
   - Avg Duration: 2m 0s

---

## Step 6: Test Different Roles

### As Counselor
- Can only see/log calls for assigned leads
- Dashboard shows own call stats

### As Center Manager
- Can see/log calls for all leads in center
- Dashboard shows stats per counselor

### As Super Admin
- Can see all calls across all centers
- Dashboard shows stats per center

---

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F

# Rebuild
cd backend
npm run build
npm run start:dev
```

### Migration fails
```powershell
cd backend
npm run migration:revert  # Rollback
npm run migration:run     # Re-run
```

### Call icon not showing
- Verify lead has `mobileNumber`, `alternateNumber`, or `whatsappNumber`
- Check browser console for errors
- Refresh page

### Disposition modal doesn't appear
- Check browser console for `call-completed` event
- Verify `androidCallSyncService.start()` was called
- Try manually triggering: `window.dispatchEvent(new CustomEvent('call-completed', { detail: { phoneNumber: '1234567890', leadId: 'uuid', startTime: new Date().toISOString() } }))`

### Analytics shows zero
- Ensure at least one call is logged
- Check user role and center assignment
- Verify API call to `/api/calls/analytics` returns data

---

## 📱 Testing on Android Device

### Option 1: Capacitor Build (Full Native)

```powershell
# Build web assets
cd frontend
npm run build

# Initialize Capacitor (first time only)
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Connect Android device via USB
2. Enable USB debugging on device
3. Click **Run** (green play button)
4. App installs and launches on device

### Option 2: Cordova Build

```powershell
npm install -g cordova
cordova platform add android
cordova build android
cordova run android
```

### Option 3: PWA on Device

1. Deploy frontend to HTTPS server (e.g., Vercel, Netlify)
2. Open URL on Android Chrome
3. Tap menu → "Install app" or "Add to Home Screen"
4. PWA installs like native app
5. `tel:` links will work, but CallLog API won't

---

## 🎯 Expected Behavior

### ✅ What Should Work Now

**Web Browser (Desktop/Mobile):**
- ✅ Call icon visible
- ✅ Click opens dialer (if tel: handler exists)
- ✅ Disposition modal appears (timer-based)
- ✅ Manual call logging works
- ✅ Call history displays
- ✅ Analytics dashboard updates

**Android App (with Capacitor/Cordova):**
- ✅ Everything above, plus:
- ✅ Native dialer launches
- ✅ Automatic call detection (with native plugin)
- ✅ Call duration auto-populated
- ✅ Background sync (with permissions)

### ⚠️ What Needs Native Plugin

- Automatic call duration detection
- Incoming/missed call logging
- Background call monitoring
- Android CallLog.Calls access

These require:
- `@capacitor-community/call-number`
- Custom CallLog plugin
- Runtime permissions

---

## 📊 Sample Test Data

Use these to test analytics:

```typescript
// Log multiple test calls via browser console or Postman

const testCalls = [
  { leadId: 'your-lead-uuid', phoneNumber: '+1234567890', callType: 'outgoing', startTime: new Date(Date.now() - 3600000), duration: 180 },
  { leadId: 'your-lead-uuid', phoneNumber: '+1234567890', callType: 'incoming', startTime: new Date(Date.now() - 7200000), duration: 240 },
  { leadId: 'your-lead-uuid', phoneNumber: '+1234567890', callType: 'missed', startTime: new Date(Date.now() - 10800000), duration: 0 },
];

// Log via API
for (const call of testCalls) {
  await fetch('http://localhost:3000/api/calls/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${yourAccessToken}`
    },
    body: JSON.stringify(call)
  });
}
```

---

## 🔥 Pro Tips

1. **Use Browser DevTools**: Network tab to inspect API calls
2. **Check Redux DevTools**: See state changes in real-time
3. **Enable React DevTools**: Inspect component props
4. **Use Postman**: Test backend APIs independently
5. **Check Logs**: `docker logs edforce-backend -f`

---

## 📞 Need Help?

**Common Issues:**
- **"Report not found"**: Fixed! Center managers can now open reports from other centers
- **Call icon missing**: Ensure lead has phone number
- **Analytics empty**: Log at least one call first

**Check Documentation:**
- `ANDROID_DIALER_SETUP.md` - Full setup guide
- `IMPLEMENTATION_SUMMARY.md` - Technical details

**Contact:** tech-support@yourcompany.com

---

**Happy Testing! 🎉**
