# Diagnosing Meta Auth Connection Issue

## Problem
When trying to connect to Meta Business in the browser, we get a 400 error with "Invalid token" message.

## Root Cause
The Edge Function `meta-auth` expects a valid user JWT token in the Authorization header, but it's receiving something else (possibly the anon key or an expired token).

## Debugging Steps

### 1. Check User Session in Browser Console

Open the browser console and run:

```javascript
// Get the current session
const { data, error } = await window.__supabase.auth.getSession();
console.log('Session:', data.session);
console.log('User:', data.session?.user);
console.log('Access Token:', data.session?.access_token?.substring(0, 50) + '...');
console.log('Token Expires At:', new Date(data.session?.expires_at * 1000));
```

### 2. Check If Token is Expired

```javascript
const { data } = await window.__supabase.auth.getSession();
const expiresAt = data.session?.expires_at * 1000;
const now = Date.now();
console.log('Token expired:', now > expiresAt);
console.log('Time until expiry:', Math.floor((expiresAt - now) / 1000 / 60), 'minutes');
```

### 3. Test the Function Call Manually

```javascript
// Get fresh session
const { data: { session } } = await window.__supabase.auth.getSession();

if (!session) {
  console.error('No active session! Please log in again.');
} else {
  console.log('Session is active:', session.user.email);

  // Try calling the function
  const { data, error } = await window.__supabase.functions.invoke('meta-auth', {
    body: {
      action: 'get_auth_url',
      redirect_uri: 'http://localhost:8082/meta-ads-config',
    },
  });

  if (error) {
    console.error('Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      context: error.context
    });
  } else {
    console.log('Success!', data);
  }
}
```

### 4. Check Captured Function Calls

```javascript
// Check if there are any captured function calls
console.log('Captured invokes:', window.__capturedInvokes);
console.log('Last invoke:', window.__capturedInvokes?.[window.__capturedInvokes.length - 1]);
```

## Solutions

### Solution 1: Refresh the Session

If the token is expired, refresh the page or sign out and sign in again.

```javascript
// Refresh the session
const { data, error } = await window.__supabase.auth.refreshSession();
if (error) {
  console.error('Failed to refresh:', error);
  // If refresh fails, sign out and sign in again
  await window.__supabase.auth.signOut();
  window.location.href = '/';
} else {
  console.log('Session refreshed successfully');
}
```

### Solution 2: Ensure the Supabase Client Has the Session

If `supabase.functions.invoke()` isn't automatically sending the auth token, we might need to explicitly pass it:

```typescript
// In useMetaAuth.ts, modify getAuthUrl():
const getAuthUrl = async (): Promise<string> => {
  try {
    // Get the current session explicitly
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session. Please log in again.');
    }

    const { data, error } = await supabase.functions.invoke('meta-auth', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        action: 'get_auth_url',
        redirect_uri: REDIRECT_URI,
      },
    });

    if (error) throw error;
    return data.auth_url;
  } catch (error) {
    console.error('Error getting auth URL:', error);
    throw error;
  }
};
```

### Solution 3: Check Edge Function Token Validation

The Edge Function validates the token like this:

```typescript
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);

if (authError || !user) {
  throw new Error('Invalid token');
}
```

This should work, but if there's an issue with the service role key or the user validation, it will fail.

## Next Steps

1. Open the app at http://localhost:8082/meta-ads-config
2. Open browser console
3. Run the diagnostic commands above
4. Share the output to determine the exact issue
