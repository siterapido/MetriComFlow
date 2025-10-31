# Meta OAuth Connection - Troubleshooting Guide

## Problem Summary

When attempting to connect to Meta Business via the "Conectar Meta Business" button at `/meta-ads-config`, the request fails with a 400 error. The Edge Function `meta-auth` is returning an "Invalid token" error.

## Changes Made (Oct 28, 2025)

### 1. Enhanced Client-Side Token Handling

**File:** [src/hooks/useMetaAuth.ts:144-171](../src/hooks/useMetaAuth.ts#L144-L171)

- Modified `getAuthUrl()` to explicitly fetch and validate the session token before making the request
- Added explicit `Authorization` header to ensure token is passed correctly
- Added session validation to catch expired sessions early

```typescript
// Get the current session explicitly to ensure we have a valid token
const { data: { session } } = await supabase.auth.getSession();

if (!session?.access_token) {
  throw new Error('No active session. Please log in again.');
}

const { data, error } = await supabase.functions.invoke('meta-auth', {
  headers: {
    Authorization: `Bearer ${session.access_token}`,  // ✅ Explicit token
  },
  body: { action: 'get_auth_url', redirect_uri: REDIRECT_URI },
});
```

### 2. Enhanced Edge Function Logging

**File:** [supabase/functions/meta-auth/index.ts](../supabase/functions/meta-auth/index.ts)

- Added detailed logging for auth header presence
- Added token length and preview logging
- Added user validation result logging with email and error details
- Enhanced error messages to include specific auth error details
- Added comprehensive debug output for troubleshooting

**Deployed:** Version 60 (Oct 28, 2025, 07:44 UTC)

### 3. Created Diagnostic Tools

**Files Created:**
- [scripts/test-meta-auth.ts](../scripts/test-meta-auth.ts) - TypeScript diagnostic script
- [scripts/test-meta-auth-direct.sh](../scripts/test-meta-auth-direct.sh) - Direct cURL test script
- [scripts/diagnose-meta-auth.md](../scripts/diagnose-meta-auth.md) - Browser console debugging guide
- [scripts/VIEW_LOGS.md](../scripts/VIEW_LOGS.md) - How to view real-time logs

## How to Debug

### Step 1: View Real-Time Logs

Open the Supabase Dashboard logs:
👉 https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/functions/meta-auth/logs

Keep this tab open while testing.

### Step 2: Test the Connection

1. Refresh your browser at http://localhost:8082/meta-ads-config
2. Open browser console (F12)
3. Click "Conectar Meta Business"
4. Watch both:
   - Browser console for client-side logs
   - Supabase Dashboard for server-side logs

### Step 3: Check for Common Issues

#### Issue: "Invalid token: JWT expired"
**Symptoms:**
- Browser console shows "🔐 Using session token"
- Edge Function logs show "JWT expired"

**Solution:**
1. Sign out: Click your profile → "Sair"
2. Sign in again with your credentials
3. Try connecting to Meta again

#### Issue: "No active session"
**Symptoms:**
- Browser console shows error before making the request
- No request appears in Edge Function logs

**Solution:**
1. Hard refresh the page (Ctrl/Cmd + Shift + R)
2. If still fails, clear browser localStorage:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
3. Sign in again

#### Issue: "Invalid token: User not found"
**Symptoms:**
- Token appears valid but user doesn't exist in Supabase Auth

**Solution:**
This is rare. Check if the user exists:
```sql
SELECT * FROM auth.users WHERE id = 'USER_ID_FROM_LOGS';
```

#### Issue: Meta App credentials not configured
**Symptoms:**
- Logs show "Meta app credentials not configured"
- hasAppId or hasAppSecret is false

**Solution:**
Check Supabase secrets:
```bash
npx supabase secrets list
```

Should show:
- `META_APP_ID`: 3361128087359379
- `META_APP_SECRET`: (hidden)

If missing, set them:
```bash
npx supabase secrets set META_APP_ID="3361128087359379"
npx supabase secrets set META_APP_SECRET="your-secret-here"
```

## Expected Behavior

### Successful Flow

1. **Browser Console:**
   ```
   🔐 Using session token for meta-auth
   ✅ Successfully fetched auth URL
   ```

2. **Edge Function Logs:**
   ```
   📨 Received request with auth header: Present
   🔑 Token length: 234 First 20 chars: eyJhbGciOiJIUzI1NiIs...
   👤 User validation result: { hasUser: true, userId: 'xxx', userEmail: 'user@example.com', hasError: false }
   ✅ User authenticated successfully: user@example.com
   ==================== META AUTH DEBUG ====================
   Action: get_auth_url
   META_APP_ID: 3361128087359379
   ✅ Using correct App ID: InsightFy
   ========================================================
   ```

3. **Browser:**
   - Redirects to Meta OAuth page (facebook.com)
   - Shows permission request for ads_management, business_management, etc.

## Environment Configuration

### Client (.env)
```env
VITE_SUPABASE_URL="https://fjoaliipjfcnokermkhy.supabase.co"
VITE_SUPABASE_ANON_KEY="..."
VITE_META_APP_ID="3361128087359379"
VITE_META_REDIRECT_URI="http://localhost:8082/meta-ads-config"
```

### Server (Supabase Secrets)
```
META_APP_ID=3361128087359379
META_APP_SECRET=(secret)
PROJECT_URL=https://fjoaliipjfcnokermkhy.supabase.co
SERVICE_ROLE_KEY=(secret)
```

## Architecture Notes

### Why Explicit Token Passing?

The Supabase JS client (`supabase.functions.invoke()`) should automatically include the auth token, but in some edge cases it might not:
- Stale client initialization
- Session expiration during page load
- React strict mode double-invocation

By explicitly fetching and passing the token, we ensure:
1. The token is fresh
2. The token exists before making the request
3. Clear error messages if the session is invalid

### Auth Flow

```
Browser
  ↓ (1) Get session from localStorage
  ↓ (2) Extract access_token
  ↓ (3) POST /functions/v1/meta-auth
  ↓      Headers: Authorization: Bearer <token>
  ↓      Body: { action: "get_auth_url", redirect_uri: "..." }
  ↓
Edge Function (meta-auth)
  ↓ (4) Extract token from Authorization header
  ↓ (5) Validate token with supabase.auth.getUser(token)
  ↓ (6) If valid, fetch Meta credentials from secrets
  ↓ (7) Generate Meta OAuth URL
  ↓ (8) Return { auth_url: "https://facebook.com/..." }
  ↓
Browser
  ↓ (9) Redirect to auth_url
  ↓
Meta OAuth
  ↓ (10) User authorizes
  ↓ (11) Redirect back with code parameter
  ↓
Browser
  ↓ (12) Exchange code for access token (via meta-auth function)
```

## Related Documentation

- [Meta Ads Setup Guide](./META_ADS_SETUP.md) - Initial setup and configuration
- [Database Schema](./DATABASE.md) - Table structures for Meta integration
- [Edge Function Code](../supabase/functions/meta-auth/index.ts) - Source code

## Support

If you're still experiencing issues after following this guide:

1. Collect the following information:
   - Browser console output
   - Edge Function logs (from Dashboard)
   - Current session status:
     ```javascript
     const { data } = await window.__supabase.auth.getSession();
     console.log('Session:', data.session);
     ```

2. Check if the issue is reproducible:
   - Clear browser cache
   - Try in incognito/private window
   - Try with a different user account

3. Verify Meta App configuration:
   - Check App ID is correct (3361128087359379)
   - Verify redirect URI matches in Meta for Developers
   - Ensure app is in Development mode (for testing)

## Version History

- **2025-10-28 07:44 UTC** - Enhanced logging and explicit token passing (v60)
- **2025-10-28 07:30 UTC** - Added error type and message to error response (v59)
- **Earlier** - Original implementation (v56 last successful)
