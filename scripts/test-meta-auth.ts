#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

async function testMetaAuth() {
  console.log('🔍 Testing Meta Auth Configuration\n');

  // First, let's check the environment variables
  console.log('Environment Variables:');
  console.log('  VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Not set');
  console.log('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Not set');
  console.log('');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration. Please check your .env file.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Get current user session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.error('❌ No active session. Please log in first.');
    process.exit(1);
  }

  console.log('✅ User authenticated:', session.user.email);
  console.log('');

  // Test the meta-auth function
  console.log('🔄 Testing meta-auth Edge Function (get_auth_url)...\n');

  try {
    const { data, error } = await supabase.functions.invoke('meta-auth', {
      body: {
        action: 'get_auth_url',
        redirect_uri: 'http://localhost:8082/meta-ads-config',
      },
    });

    if (error) {
      console.error('❌ Error response from Edge Function:');
      console.error('  Status:', error.status);
      console.error('  Name:', error.name);
      console.error('  Message:', error.message);
      console.error('  Context:', JSON.stringify(error.context, null, 2));

      // Try to get more details from the response
      if (error.context?.response) {
        try {
          const text = await error.context.response.text();
          console.error('  Response body:', text);
        } catch (e) {
          console.error('  Could not read response body');
        }
      }

      process.exit(1);
    }

    console.log('✅ Success!');
    console.log('  Auth URL:', data.auth_url);
    console.log('');

    // Parse the URL to verify the App ID
    const url = new URL(data.auth_url);
    const appId = url.searchParams.get('client_id');
    console.log('Meta App Configuration:');
    console.log('  App ID from URL:', appId);
    console.log('  Expected App ID: 336112808735379 (CRMads)');
    console.log('  Match:', appId === '336112808735379' ? '✅' : '❌');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

testMetaAuth().catch(console.error);
