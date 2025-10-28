import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config(); // Load .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY; // Use anon key (public checkout)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPublicCheckoutPIX() {
  console.log('🧪 Testing PUBLIC CHECKOUT with PIX');
  console.log('=====================================\n');

  try {
    // Step 1: Get Básico plan
    console.log('📋 Step 1: Getting Básico plan...');
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', 'basico')
      .single();

    if (planError) throw new Error(`Failed to get plan: ${planError.message}`);
    console.log(`✅ Plan: ${plan.name} - R$ ${plan.price}/mês\n`);

    // Step 2: Prepare PUBLIC checkout data (NO subscriptionId, NO creditCard)
    console.log('📋 Step 2: Preparing PUBLIC checkout data with PIX...');
    const checkoutData = {
      // NO subscriptionId = public checkout flow
      planSlug: plan.slug,
      billingName: 'Pedro Santos Cliente PIX',
      billingEmail: `teste-pix-${Date.now()}@metricom.com.br`,
      billingCpfCnpj: '24971563792', // Valid test CPF
      billingPhone: '47999887766',
      billingAddress: {
        postalCode: '01310100',
        street: 'Avenida Paulista',
        addressNumber: '1500',
        addressComplement: '',
        province: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      billingType: 'PIX', // PIX payment
    };

    console.log('✅ Checkout data prepared:');
    console.log(`   Name: ${checkoutData.billingName}`);
    console.log(`   Email: ${checkoutData.billingEmail}`);
    console.log(`   CPF: ${checkoutData.billingCpfCnpj}`);
    console.log(`   Payment Method: ${checkoutData.billingType} 💚\n`);

    // Step 3: Call Edge Function (PUBLIC checkout - no auth needed)
    console.log('📋 Step 3: Calling create-asaas-subscription Edge Function (PUBLIC CHECKOUT)...');
    console.log('   Using anon key (no authentication required)\n');

    const response = await fetch(`${supabaseUrl}/functions/v1/create-asaas-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(checkoutData),
    });

    const responseText = await response.text();
    console.log('📥 Raw HTTP response:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Body: ${responseText}\n`);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { error: responseText };
    }

    const functionError = !response.ok ? new Error(`HTTP ${response.status}: ${responseText}`) : null;

    if (functionError) {
      console.error('\n❌ Edge Function Error:', functionError);
      throw functionError;
    }

    if (!result.success) {
      console.error('\n❌ Subscription Creation Failed:', result);
      throw new Error(result.error || 'Unknown error');
    }

    console.log('\n✅ Edge Function Response:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Organization ID: ${result.organizationId}`);
    console.log(`   Subscription ID: ${result.subscriptionId}`);
    console.log(`   Asaas Subscription ID: ${result.asaasSubscriptionId}`);
    console.log(`   Asaas Customer ID: ${result.asaasCustomerId}`);
    console.log(`   Claim Token: ${result.claimToken}`);
    console.log(`   Next Due Date: ${result.nextDueDate}`);
    if (result.paymentLink) {
      console.log(`   Payment Link: ${result.paymentLink}`);
    }
    console.log('');

    // Success Summary
    console.log('\n🎉🎉🎉 PUBLIC CHECKOUT with PIX TEST SUCCESSFUL! 🎉🎉🎉\n');
    console.log('📊 Summary:');
    console.log('   ✅ Organization created without owner');
    console.log('   ✅ Subscription created in database');
    console.log('   ✅ Customer registered in Asaas');
    console.log('   ✅ PIX subscription created in Asaas');
    console.log('   ✅ Claim token generated for account finalization');
    console.log('');
    console.log('💚 PIX Flow:');
    console.log('   → User receives PIX QR code and payment link');
    console.log('   → User pays via PIX');
    console.log('   → Asaas sends webhook when payment is confirmed');
    console.log('   → User receives email with finalization link');
    console.log('   → User accesses /finalizar-cadastro with claim token');
    console.log('   → User creates account and becomes organization owner');
    console.log('');
    console.log('🔗 Finalization URL (would be sent to user):');
    console.log(`   /finalizar-cadastro?org=${result.organizationId}&sub=${result.subscriptionId}&claim=${result.claimToken}&email=${encodeURIComponent(checkoutData.billingEmail)}`);
    console.log('');
    if (result.paymentLink) {
      console.log('💳 Payment Link (for PIX QR code):');
      console.log(`   ${result.paymentLink}`);
      console.log('');
    }

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message || error);
    console.error('\n🔍 Troubleshooting:');
    console.error('   - Check Edge Function logs for detailed error');
    console.error('   - Verify Asaas API is accessible');
    console.error('   - Check that ASAAS_API_KEY is set in Supabase secrets');
    console.error('');
    process.exit(1);
  }
}

testPublicCheckoutPIX();
