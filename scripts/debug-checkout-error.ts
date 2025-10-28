import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Debug Checkout Error\n');

// Simular dados de checkout exatamente como vêm do formulário
const checkoutData = {
  planSlug: 'basico',
  billingName: 'Teste Debug',
  billingEmail: 'teste-debug@test.com',
  billingCpfCnpj: '24971563792',
  billingPhone: '47999887766',
  billingAddress: {
    postalCode: '01310100',
    street: 'Avenida Paulista',
    addressNumber: '1000',
    addressComplement: '',
    province: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  },
  billingType: 'CREDIT_CARD',
  creditCard: {
    holderName: 'MARIA SILVA',
    number: '5162306219378829',
    expiryMonth: '12',
    expiryYear: '2028',
    ccv: '318',
  },
};

async function testCheckout() {
  try {
    console.log('📤 Enviando dados para Edge Function...\n');
    console.log('Payload:', JSON.stringify(checkoutData, null, 2));
    console.log('');

    const response = await fetch(`${supabaseUrl}/functions/v1/create-asaas-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(checkoutData),
    });

    console.log(`📥 Status: ${response.status} ${response.statusText}\n`);

    const responseText = await response.text();
    console.log('📥 Response Body:');
    console.log(responseText);
    console.log('');

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('📊 Parsed Response:');
      console.log(JSON.stringify(result, null, 2));
    } catch {
      console.log('⚠️  Response is not JSON');
    }

    if (!response.ok) {
      console.log('\n❌ ERRO ENCONTRADO:');
      console.log('Status Code:', response.status);
      console.log('Error Message:', result?.error || 'Unknown');
      console.log('Details:', result?.details || 'N/A');
    } else {
      console.log('\n✅ Sucesso!');
    }

  } catch (error: any) {
    console.error('\n❌ Exception:', error.message);
    console.error(error);
  }
}

testCheckout();
