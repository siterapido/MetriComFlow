# How to View Real-Time Edge Function Logs

##Option 1: Supabase Dashboard (Recommended)

1. Open https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/functions/meta-auth/logs
2. Click on the "**Logs**" tab
3. You'll see real-time logs with all the console.log and console.error output
4. Leave this tab open while testing

## Option 2: Use Supabase CLI

Unfortunately, the Supabase CLI doesn't support `--tail` flag yet for real-time logs.

## Testing the Meta Auth Flow

1. **Open the Supabase Dashboard logs** (link above) in one browser tab
2. **Open your app** at http://localhost:8082/meta-ads-config in another tab
3. Click "**Conectar Meta Business**"
4. **Watch the logs in real-time** in the Dashboard tab

You should now see detailed output including:
- 📨 Request received
- 🔑 Token information
- 👤 User validation result
- ✅ Success messages or ❌ Error details

## What the Logs Will Show

### If Successful:
```
📨 Received request with auth header: Present
🔑 Token length: 234 First 20 chars: eyJhbGciOiJIUzI1NiIs...
👤 User validation result: { hasUser: true, userId: 'xxx', userEmail: 'user@example.com', hasError: false }
✅ User authenticated successfully: user@example.com
==================== META AUTH DEBUG ====================
Action: get_auth_url
META_APP_ID: 3361128087359379
... (more debug info)
```

### If There's an Error:
```
📨 Received request with auth header: Present
🔑 Token length: 234 First 20 chars: eyJhbGciOiJIUzI1NiIs...
👤 User validation result: { hasUser: false, hasError: true, errorMessage: 'JWT expired' }
❌ Auth error details: { ... }
==================== META AUTH ERROR ====================
Error type: Error
Error message: Invalid token: JWT expired
```

## Common Errors and Solutions

### "Invalid token: JWT expired"
**Solution:** Your session has expired. Sign out and sign in again.

### "Invalid token: User not found"
**Solution:** The token is valid but the user doesn't exist. This shouldn't happen in normal use.

### "No authorization header"
**Solution:** The request isn't including the auth header. Check if the Supabase client is properly initialized.

### "Meta app credentials not configured"
**Solution:** META_APP_ID or META_APP_SECRET is missing from Supabase secrets.
