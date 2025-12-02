# Android Dialer Integration - Setup Guide

## Overview
This CRM includes native Android dialer integration for click-to-call functionality, automatic call logging, and comprehensive call analytics. The system works with Android's native dialer without requiring modifications or custom dialers.

---

## Features
✅ **Click-to-Call** from lead list with a single tap  
✅ **Automatic Call Logging** after each call (time, date, duration, phone number)  
✅ **Post-Call Disposition** capture with notes  
✅ **Real-time Sync** to CRM via API + WebSocket  
✅ **Call History** displayed in Lead Detail pages  
✅ **Analytics Dashboard** showing daily/monthly call stats, average duration  
✅ **Multi-Role Support**: Counselor, Center Manager, and Super Admin views  

---

## Required Android Permissions

### 1. CALL_PHONE
Allows the app to initiate phone calls directly.

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CALL_PHONE" />
```

### 2. READ_CALL_LOG
Allows the app to read call history for automatic logging.

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.READ_CALL_LOG" />
```

### 3. READ_PHONE_STATE (Optional but Recommended)
Helps detect call state changes for better tracking.

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
```

---

## Setup Instructions

### Step 1: Install Required Capacitor Plugins

If you're building a hybrid app with Capacitor:

```bash
npm install @capacitor/core @capacitor/android
npm install @capacitor-community/call-number
npm install @capacitor/app
```

### Step 2: Configure Android Manifest

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourcompany.crmapp">

    <!-- Required Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <!-- Your activities here -->
        
    </application>
</manifest>
```

### Step 3: Request Runtime Permissions

For Android 6.0+ (API level 23+), runtime permissions are required.

Add this to your main activity or use a permission manager:

```typescript
import { CallNumber } from '@capacitor-community/call-number';

async function requestCallPermissions() {
  try {
    // Request CALL_PHONE permission
    const callResult = await CallNumber.requestPermissions();
    
    if (callResult.results[0] !== 'granted') {
      alert('Call permission is required for click-to-call functionality.');
      return false;
    }

    // Note: READ_CALL_LOG requires separate handling
    // You'll need a native plugin or Capacitor plugin to request this
    
    return true;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

// Call on app startup or before first call
requestCallPermissions();
```

### Step 4: Configure Call Sync Service

The `androidCallSyncService` automatically monitors calls. Ensure it starts on app load:

In your main App component:

```typescript
import React, { useEffect } from 'react';
import androidCallSyncService from '@/services/androidCallSyncService';

function App() {
  useEffect(() => {
    // Start call monitoring service
    androidCallSyncService.start();
    
    return () => {
      androidCallSyncService.stop();
    };
  }, []);

  // ... rest of your app
}
```

### Step 5: Build and Test on Android Device

```bash
# Build the web assets
npm run build

# Sync to Android project
npx cap sync android

# Open in Android Studio
npx cap open android

# Run on device or emulator
# Use Android Studio's Run button or:
npx cap run android
```

---

## How It Works

### 1. Click-to-Call Flow
1. User clicks **phone icon** next to lead in list
2. `callsService.initiateCall()` stores call context in `sessionStorage`
3. `window.location.href = 'tel:...'` launches native dialer
4. User completes call and returns to app
5. After 2 seconds, **Call Disposition Modal** appears
6. User enters call notes and disposition
7. Call is logged to backend via `/calls/log` API

### 2. Automatic Call Logging (Android Native)
1. `androidCallSyncService` polls Android's `CallLog.Calls` content provider every 5 seconds
2. When a completed call is detected matching pending call context, it:
   - Extracts: call type, start time, end time, duration, call log ID
   - Posts to `/calls/log` endpoint with `deviceCallLogId` for deduplication
   - Emits `call-completed` event to trigger disposition modal

### 3. Call History Display
- Lead Detail page fetches `/calls/lead/:leadId`
- Displays table with: Date, Phone, Type, Duration, Disposition, Counselor, Notes

### 4. Analytics Dashboard
- `/calls/analytics` endpoint returns stats grouped by:
  - **Counselor** (for Center Managers)
  - **Center** (for Super Admins)
- Displays: Total Calls, Outgoing/Incoming/Missed, Avg Duration, Total Duration

---

## API Endpoints

### POST /calls/log
Log a call manually or automatically.

**Request:**
```json
{
  "leadId": "uuid",
  "phoneNumber": "+1234567890",
  "callType": "outgoing",
  "startTime": "2025-11-21T10:30:00Z",
  "endTime": "2025-11-21T10:35:00Z",
  "duration": 300,
  "deviceCallLogId": "android_call_log_123"
}
```

**Response:** CallLog object

---

### GET /calls/lead/:leadId
Get all call logs for a specific lead.

**Response:**
```json
[
  {
    "id": "uuid",
    "phoneNumber": "+1234567890",
    "callType": "outgoing",
    "startTime": "2025-11-21T10:30:00Z",
    "endTime": "2025-11-21T10:35:00Z",
    "duration": 300,
    "disposition": "Connected",
    "notes": "Discussed program details",
    "userName": "John Doe",
    "userId": "uuid"
  }
]
```

---

### PATCH /calls/:id/disposition
Update disposition and notes after call.

**Request:**
```json
{
  "disposition": "Connected",
  "notes": "Scheduled follow-up for next week"
}
```

**Response:** Updated CallLog object

---

### GET /calls/analytics
Get call statistics.

**Query Params:**
- `period`: `"daily"` or `"monthly"`
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response (Center Manager):**
```json
[
  {
    "userId": "uuid",
    "userName": "Jane Smith",
    "totalCalls": 45,
    "totalDuration": 6750,
    "avgDuration": 150,
    "outgoingCalls": 30,
    "incomingCalls": 10,
    "missedCalls": 5
  }
]
```

**Response (Super Admin):**
```json
[
  {
    "centerName": "Mumbai Center",
    "totalCalls": 120,
    "totalDuration": 18000,
    "avgDuration": 150,
    "outgoingCalls": 80,
    "incomingCalls": 30,
    "missedCalls": 10
  }
]
```

---

## Database Schema

### call_logs Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lead_id | uuid | Foreign key to leads |
| user_id | uuid | Foreign key to users |
| phone_number | varchar(30) | Called number |
| call_type | varchar(20) | outgoing / incoming / missed |
| start_time | timestamp | Call start |
| end_time | timestamp | Call end |
| duration | int | Seconds |
| disposition | varchar(50) | Connected, Not Answered, etc. |
| notes | text | Post-call notes |
| synced | boolean | Sync status |
| device_call_log_id | varchar(100) | Android CallLog._ID |
| center_name | varchar(150) | For analytics |
| date_entered | timestamp | Created |
| date_modified | timestamp | Updated |
| created_by | uuid | User who logged |
| modified_by | uuid | Last modifier |
| deleted | boolean | Soft delete flag |

---

## Troubleshooting

### Issue: Permissions not requested on Android 6.0+
**Solution:** Ensure you're using a plugin that requests runtime permissions. The default Capacitor `tel:` URI doesn't automatically request permissions. Use `@capacitor-community/call-number` or implement a custom plugin.

### Issue: Call logs not syncing automatically
**Solution:** 
1. Verify `READ_CALL_LOG` permission is granted
2. Check `androidCallSyncService.start()` is called on app mount
3. Ensure pending call context is stored in `sessionStorage` before dialer launch
4. Check browser console for errors

### Issue: Analytics showing zero calls
**Solution:**
1. Verify at least one call has been logged via `/calls/log`
2. Check user role and center assignment
3. Ensure `center_name` is populated on call logs

### Issue: Call icon not showing in lead list
**Solution:**
1. Ensure lead has at least one phone number (mobileNumber, alternateNumber, or whatsappNumber)
2. Check DataGrid actions column width (should be 120px minimum)
3. Verify PhoneIcon import in LeadsDataTable.tsx

---

## Security Considerations

1. **Permissions**: Only request permissions when needed. Explain why in permission dialogs.
2. **Data Privacy**: Call logs contain sensitive data. Ensure HTTPS and proper authentication.
3. **Role-Based Access**: Counselors see only their calls; Center Managers see their center's; Admins see all.
4. **Deduplication**: `deviceCallLogId` prevents duplicate entries from repeated syncs.

---

## Testing Checklist

- [ ] CALL_PHONE permission granted
- [ ] READ_CALL_LOG permission granted
- [ ] Click call icon in lead list launches dialer
- [ ] Disposition modal appears after call
- [ ] Call logged to backend with correct data
- [ ] Call history displays in Lead Detail page
- [ ] Analytics widget shows correct stats for user role
- [ ] No duplicate call logs created
- [ ] Works on Android 6.0+ devices
- [ ] Works on Android 10+ with scoped storage restrictions

---

## Future Enhancements

- **Call Recording** (requires RECORD_AUDIO permission and backend storage)
- **VoIP Integration** (SIP/WebRTC)
- **SMS Integration** for follow-ups
- **Caller ID Display** during incoming calls
- **Call Queue Management** for multiple incoming calls
- **Automated Follow-up Reminders** based on call outcomes

---

## Support

For issues or questions:
- Check backend logs: `docker logs edforce-backend`
- Check frontend console for JavaScript errors
- Verify database migrations ran: `npm run migration:run`
- Contact: tech-support@yourcompany.com

---

**Version:** 1.0.0  
**Last Updated:** November 21, 2025
