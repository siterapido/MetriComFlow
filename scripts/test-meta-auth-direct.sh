#!/bin/bash

# This script tests the meta-auth Edge Function directly with a user token

echo "========================================="
echo "Testing meta-auth Edge Function"
echo "========================================="
echo ""

# First, we need to get a user's JWT token
# For now, let's just show the instructions

echo "📋 To get your user token, run this in the browser console at http://localhost:8082:"
echo ""
echo "const { data } = await window.__supabase.auth.getSession();"
echo "console.log(data.session.access_token);"
echo ""
echo "Then run:"
echo ""
echo "export USER_TOKEN='<paste-your-token-here>'"
echo ""
echo "curl -i -X POST 'https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/meta-auth' \\"
echo "  -H 'Authorization: Bearer \$USER_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"action\": \"get_auth_url\", \"redirect_uri\": \"http://localhost:8082/meta-ads-config\"}'"
echo ""

# Check if USER_TOKEN is set
if [ -n "$USER_TOKEN" ]; then
    echo "🔄 Testing with provided USER_TOKEN..."
    echo ""

    curl -i -X POST "https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/meta-auth" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"action": "get_auth_url", "redirect_uri": "http://localhost:8082/meta-ads-config"}'

    echo ""
else
    echo "⚠️  USER_TOKEN not set. Please follow the instructions above."
fi
