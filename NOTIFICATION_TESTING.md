# How to Test Notifications

## Quick Verification Steps

### 1. **Visual Check** ✅
**Look for the bell icon in the navbar:**
- If you see a 🔔 bell icon between "EarthLink" and the theme toggle button → **Frontend is working**
- If there's a red badge with a number → **You have unread notifications**

### 2. **Browser Notification Test** 🌐

**Option A: Using the UI (Easiest)**
1. Click the bell icon in navbar
2. Click the settings gear icon ⚙️
3. Click "Allow Notifications" button
4. You should see a browser permission popup
5. Click "Allow"
6. **You should immediately see a test notification:** "Notifications Enabled! 🚀"

**Option B: Using Browser Console**
1. Open browser console (F12)
2. Paste this code:
```javascript
// Copy the contents of test-notifications.js
// Then run:
notificationTests.runAll()
```

### 3. **Check Sample Notifications** 📬

**Step 1: Add sample data to database**
```bash
# In your terminal, run:
cd server
psql -U postgres -d spacescope -f schema/sample_notifications.sql
```

**Step 2: Verify in UI**
1. Refresh your browser
2. Look at the bell icon - should show a badge with "3" or more
3. Click the bell icon
4. You should see notifications like:
   - 🌟 Major Solar Flare Detected!
   - ⚠️ Asteroid 2024 XR Approaching
   - 🌪️ Geomagnetic Storm Warning

### 4. **Test Email Subscription** 📧

1. Click bell icon → Settings gear
2. Scroll to "Planning & Educational Content"
3. Enter any email (e.g., `test@example.com`)
4. Click "Subscribe"
5. **Success indicator:** Green checkmark with your email should appear

### 5. **Create a Test Notification** 🧪

**Using the API directly:**
```bash
# In terminal or Postman:
curl -X POST https://spacescope-1v1p.onrender.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "urgent",
    "category": "solar",
    "title": "🔥 Test Alert",
    "message": "This is a test notification",
    "link": "/dashboard"
  }'
```

**Then:**
1. Refresh your browser
2. Check the bell icon for updated badge count
3. Click bell to see your new notification

---

## Troubleshooting

### ❌ Bell icon not showing
**Problem:** NotificationBell component not rendering
**Fix:**
1. Check browser console for errors
2. Verify server is running on port 5002
3. Check that `NotificationBell` is imported in `Navbar.jsx`

### ❌ Browser notification permission denied
**Problem:** User clicked "Block" on permission popup
**Fix:**
1. Click the lock icon in browser address bar
2. Find "Notifications" setting
3. Change to "Allow"
4. Refresh page and try again

### ❌ No notifications appearing
**Problem:** Database is empty
**Fix:**
```bash
# Run sample data script:
cd server
psql -U postgres -d spacescope -f schema/sample_notifications.sql
```

### ❌ API errors (500/404)
**Problem:** Server not running or routes not loaded
**Fix:**
1. Check server terminal for errors
2. Verify server started successfully
3. Check that notification routes are imported in `index.js`
4. Test API directly: `curl https://spacescope-1v1p.onrender.com/api/notifications`

---

## Expected Behavior

### ✅ When Everything Works:

**Browser Notifications:**
- Permission popup appears when you click "Allow Notifications"
- Test notification shows on desktop immediately after allowing
- Notifications appear even when browser is minimized

**Notification Panel:**
- Bell icon shows unread count badge
- Clicking bell opens dropdown panel
- Notifications display with correct icons and colors
- "Mark all as read" button works
- Clicking notification marks it as read

**Email Subscription:**
- Email input accepts valid email addresses
- Success message appears after subscribing
- Green checkmark shows subscribed email
- Unsubscribe button appears

**API:**
- GET `/api/notifications` returns notification list
- POST `/api/notifications/send` creates new notifications
- POST `/api/notifications/mark-read` updates read status
- POST `/api/notifications/subscribe-email` saves email

---

## Live Testing Checklist

- [ ] Bell icon visible in navbar
- [ ] Badge shows unread count
- [ ] Clicking bell opens panel
- [ ] Sample notifications display
- [ ] Browser permission popup works
- [ ] Test notification appears on desktop
- [ ] Email subscription form works
- [ ] Mark as read functionality works
- [ ] Urgent tab filters correctly
- [ ] Settings modal opens and closes
- [ ] API endpoints respond correctly

---

## Quick Debug Commands

```javascript
// In browser console:

// 1. Check notification service
console.log('Permission:', Notification.permission);
console.log('Supported:', 'Notification' in window);

// 2. Fetch notifications
fetch('/api/notifications')
  .then(r => r.json())
  .then(d => console.log('Notifications:', d));

// 3. Create test notification
fetch('/api/notifications/send', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    type: 'info',
    category: 'general',
    title: 'Debug Test',
    message: 'Testing at ' + new Date().toLocaleTimeString()
  })
}).then(r => r.json()).then(d => console.log('Created:', d));
```

---

## Success Indicators 🎉

You'll know notifications are working when:
1. ✅ Bell icon appears in navbar
2. ✅ Badge shows unread count
3. ✅ Browser permission popup appears
4. ✅ Desktop notification shows after allowing
5. ✅ Notification panel displays sample notifications
6. ✅ Email subscription saves successfully
7. ✅ API endpoints return data without errors

If all these work → **Your notification system is fully functional!** 🚀
