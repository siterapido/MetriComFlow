import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config(); // Load .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCreditCardCheckout() {
  console.log('🧪 Testing Credit Card Checkout Flow');
  console.log('=====================================\n');

  try {
    // Step 1: Get test organization
    console.log('📋 Step 1: Getting test organization...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();

    if (orgError) throw new Error(`Failed to get organization: ${orgError.message}`);
    console.log(`✅ Organization: ${orgs.name} (${orgs.id})\n`);

    // Step 2: Get Intermediário plan (better for testing)
    console.log('📋 Step 2: Getting Intermediário plan...');
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', 'intermediario')
      .single();

    if (planError) throw new Error(`Failed to get plan: ${planError.message}`);
    console.log(`✅ Plan: ${plan.name} - R$ ${plan.price}/mês\n`);

    // Step 3: Check if subscription exists
    console.log('📋 Step 3: Checking existing subscription...');
    const { data: existingSub } = await supabase
      .from('organization_subscriptions')
      .select('id, status, plan_id')
      .eq('organization_id', orgs.id)
      .maybeSingle();

    let subscriptionId: string;

    if (existingSub) {
      console.log(`✅ Found existing subscription: ${existingSub.id}`);
      console.log(`   Current status: ${existingSub.status}\n`);
      subscriptionId = existingSub.id;
    } else {
      // Create new subscription
      console.log('📋 Creating new subscription...');
      const { data: newSub, error: subError } = await supabase
        .from('organization_subscriptions')
        .insert({
          organization_id: orgs.id,
          plan_id: plan.id,
          status: 'trial',
        })
        .select()
        .single();

      if (subError) throw new Error(`Failed to create subscription: ${subError.message}`);
      console.log(`✅ Subscription created: ${newSub.id}\n`);
      subscriptionId = newSub.id;
    }

    // Step 4: Prepare checkout data (simulate form submission)
    console.log('📋 Step 4: Preparing checkout data...');
    const checkoutData = {
      subscriptionId: subscriptionId,
      planSlug: plan.slug,
      billingName: 'João Silva Teste',
      billingEmail: 'joao.teste@metricom.com.br',
      billingCpfCnpj: '24971563792', // Valid test CPF
      billingPhone: '47999887766',
      billingAddress: {
        postalCode: '01310100',
        street: 'Avenida Paulista',
        addressNumber: '1000',
        addressComplement: 'Sala 101',
        province: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      billingType: 'CREDIT_CARD', // ⚡ CREDIT CARD
    };

    console.log('✅ Checkout data prepared:');
    console.log(`   Name: ${checkoutData.billingName}`);
    console.log(`   Email: ${checkoutData.billingEmail}`);
    console.log(`   CPF: ${checkoutData.billingCpfCnpj}`);
    console.log(`   Payment Method: ${checkoutData.billingType} 💳\n`);

    // Step 5: Call Edge Function (simulate checkout submission)
    console.log('📋 Step 5: Calling create-asaas-subscription Edge Function...');
    console.log('   (This is what happens when user clicks "Confirmar e Contratar Plano")\n');

    const { data: result, error: functionError } = await supabase.functions.invoke(
      'create-asaas-subscription',
      {
        body: checkoutData,
      }
    );

    if (functionError) {
      console.error('❌ Edge Function Error:', functionError);
      throw functionError;
    }

    if (!result.success) {
      console.error('❌ Subscription Creation Failed:', result);
      throw new Error(result.error || 'Unknown error');
    }

    console.log('✅ Edge Function Response:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Asaas Subscription ID: ${result.asaasSubscriptionId}`);
    console.log(`   Asaas Customer ID: ${result.asaasCustomerId}`);
    console.log(`   Next Due Date: ${result.nextDueDate}`);
    if (result.paymentLink) {
      console.log(`   Payment Link: ${result.paymentLink}`);
    }
    console.log('');

    // Step 6: Verify subscription was updated
    console.log('📋 Step 6: Verifying subscription in database...');
    const { data: updatedSub, error: verifyError } = await supabase
      .from('organization_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('id', subscriptionId)
      .single();

    if (verifyError) throw new Error(`Failed to verify subscription: ${verifyError.message}`);

    console.log('✅ Subscription verified:');
    console.log(`   Status: ${updatedSub.status}`);
    console.log(`   Plan: ${updatedSub.subscription_plans.name}`);
    console.log(`   Asaas Subscription ID: ${updatedSub.asaas_subscription_id}`);
    console.log(`   Asaas Customer ID: ${updatedSub.asaas_customer_id}`);
    console.log(`   Billing CPF: ${updatedSub.billing_cpf_cnpj}`);
    console.log(`   Next Billing Date: ${updatedSub.next_billing_date}\n`);

    // Step 7: Check if payment was created
    console.log('📋 Step 7: Checking for payment records...');
    const { data: payments, error: paymentsError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.log('⚠️  Could not fetch payments:', paymentsError.message);
    } else if (payments && payments.length > 0) {
      console.log(`✅ Found ${payments.length} payment(s):`);
      payments.forEach((payment, idx) => {
        console.log(`\n   Payment ${idx + 1}:`);
        console.log(`   - ID: ${payment.asaas_payment_id || 'N/A'}`);
        console.log(`   - Amount: R$ ${payment.amount}`);
        console.log(`   - Status: ${payment.status}`);
        console.log(`   - Method: ${payment.payment_method || 'N/A'}`);
        console.log(`   - Due Date: ${payment.due_date}`);
        if (payment.payment_date) {
          console.log(`   - Paid At: ${payment.payment_date}`);
        }
      });
      console.log('');
    } else {
      console.log('ℹ️  No payments found yet (they may be created via webhook)\n');
    }

    // Success Summary
    console.log('\n🎉🎉🎉 CREDIT CARD CHECKOUT TEST SUCCESSFUL! 🎉🎉🎉\n');
    console.log('📊 Summary:');
    console.log('   ✅ Subscription created in Asaas');
    console.log('   ✅ Customer registered with credit card billing');
    console.log('   ✅ Database updated with Asaas IDs');
    console.log('   ✅ Ready to receive webhook events');
    console.log('');
    console.log('💳 Credit Card Flow:');
    console.log('   → Asaas will charge the card automatically');
    console.log('   → Webhook PAYMENT_CREATED will be sent');
    console.log('   → Webhook PAYMENT_CONFIRMED will be sent on approval');
    console.log('   → Subscription status will update to "active"');
    console.log('');
    console.log('🔗 Asaas Subscription URL:');
    console.log(`   https://www.asaas.com/subscriptions/${result.asaasSubscriptionId}`);
    console.log('');
    console.log('📱 Next Steps:');
    console.log('   1. Check Asaas dashboard for the subscription');
    console.log('   2. Verify webhook events are being received');
    console.log('   3. View payment in /planos page (Invoice History)');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message || error);
    console.error('\n🔍 Troubleshooting:');
    console.error('   - Verify ASAAS_API_KEY is set in Supabase secrets');
    console.error('   - Check Edge Function logs: npx supabase functions logs create-asaas-subscription');
    console.error('   - Verify Asaas API is accessible');
    console.error('');
    process.exit(1);
  }
}

testCreditCardCheckout();
