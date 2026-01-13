/**
 * Script de Teste - Banco de Dados e Login
 * 
 * Este script testa:
 * 1. Conexão com o Supabase
 * 2. Login com credenciais específicas
 * 3. Operações básicas no banco de dados
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();

// Credenciais de teste fornecidas
const TEST_EMAIL = 'Galileubarecafe@gmail.com';
const TEST_PASSWORD = '@Elefanteazul8';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas');
    process.exit(1);
}

console.log('🔧 Configuração do Supabase:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
console.log('');

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
    console.log('📊 Teste 1: Conexão com o Banco de Dados');
    console.log('─'.repeat(60));

    try {
        // Tentar buscar tabelas públicas
        const { data, error } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(1);

        if (error) {
            console.log('⚠️  Erro ao buscar organizações:', error.message);
            console.log('   Detalhes:', error);
        } else {
            console.log('✅ Conexão com banco de dados OK');
            if (data && data.length > 0) {
                console.log(`   Encontrada organização de teste: ${data[0].name}`);
            }
        }
    } catch (err) {
        console.error('❌ Erro de conexão:', err);
    }
    console.log('');
}

async function testLogin() {
    console.log('🔐 Teste 2: Login com Credenciais Fornecidas');
    console.log('─'.repeat(60));
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Senha: ${'*'.repeat(TEST_PASSWORD.length)}`);
    console.log('');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });

        if (error) {
            console.log('❌ Erro ao fazer login:', error.message);
            console.log('   Código do erro:', error.status);
            console.log('   Detalhes:', error);

            // Tentar verificar se o usuário existe
            await checkUserExists();
            return false;
        }

        if (data.user) {
            console.log('✅ Login realizado com sucesso!');
            console.log(`   User ID: ${data.user.id}`);
            console.log(`   Email: ${data.user.email}`);
            console.log(`   Email confirmado: ${data.user.email_confirmed_at ? 'Sim' : 'Não'}`);
            console.log(`   Criado em: ${data.user.created_at}`);
            console.log(`   Último login: ${data.user.last_sign_in_at}`);

            if (data.session) {
                console.log('   ✅ Sessão criada com sucesso');
                console.log(`   Token expira em: ${new Date(data.session.expires_at * 1000).toLocaleString()}`);
            }

            // Testar acesso aos dados do usuário
            await testUserData(data.user.id);

            // Fazer logout
            await supabase.auth.signOut();
            console.log('   ✅ Logout realizado');

            return true;
        }
    } catch (err) {
        console.error('❌ Erro inesperado:', err);
        return false;
    }
    console.log('');
}

async function checkUserExists() {
    console.log('');
    console.log('🔍 Verificando se o usuário existe no sistema...');

    try {
        // Tentar buscar na tabela de profiles (se existir)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', TEST_EMAIL)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('   ⚠️  Usuário NÃO encontrado na tabela profiles');
                console.log('   Sugestão: Criar o usuário através do painel do Supabase ou');
                console.log('             através da funcionalidade de registro da aplicação');
            } else {
                console.log('   ⚠️  Erro ao verificar usuário:', error.message);
            }
        } else if (data) {
            console.log('   ✅ Usuário encontrado na tabela profiles');
            console.log(`   ID: ${data.id}`);
            console.log('   ⚠️  Possível problema: Senha incorreta ou email não confirmado');
        }
    } catch (err) {
        console.log('   ⚠️  Não foi possível verificar a tabela profiles:', err);
    }
}

async function testUserData(userId) {
    console.log('');
    console.log('📋 Teste 3: Acesso aos Dados do Usuário');
    console.log('─'.repeat(60));

    try {
        // Buscar perfil do usuário
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.log('   ⚠️  Erro ao buscar perfil:', profileError.message);
        } else if (profile) {
            console.log('   ✅ Perfil encontrado');
            console.log(`   Nome: ${profile.full_name || 'Não definido'}`);
            console.log(`   Email: ${profile.email}`);
        }

        // Buscar organizações do usuário
        const { data: orgs, error: orgsError } = await supabase
            .from('organization_memberships')
            .select(`
        id,
        role,
        organization:organizations(id, name)
      `)
            .eq('profile_id', userId);

        if (orgsError) {
            console.log('   ⚠️  Erro ao buscar organizações:', orgsError.message);
        } else if (orgs && orgs.length > 0) {
            console.log('   ✅ Organizações associadas:');
            orgs.forEach(org => {
                console.log(`      - ${org.organization?.name} (${org.role})`);
            });
        } else {
            console.log('   ℹ️  Usuário não está associado a nenhuma organização');
        }

    } catch (err) {
        console.error('   ❌ Erro ao buscar dados do usuário:', err);
    }
    console.log('');
}

async function runTests() {
    console.log('');
    console.log('═'.repeat(60));
    console.log('  TESTE DE BANCO DE DADOS E LOGIN - MetriComFlow');
    console.log('═'.repeat(60));
    console.log('');

    await testDatabaseConnection();
    const loginSuccess = await testLogin();

    console.log('');
    console.log('═'.repeat(60));
    console.log('  RESUMO DOS TESTES');
    console.log('═'.repeat(60));

    if (loginSuccess) {
        console.log('✅ Todos os testes passaram com sucesso!');
        console.log('   O sistema de autenticação está funcionando corretamente.');
    } else {
        console.log('⚠️  Alguns testes falharam.');
        console.log('   Verifique os detalhes acima para identificar os problemas.');
        console.log('');
        console.log('💡 Possíveis soluções:');
        console.log('   1. Verificar se o usuário existe no Supabase');
        console.log('   2. Confirmar se a senha está correta');
        console.log('   3. Verificar se o email foi confirmado');
        console.log('   4. Checar as configurações de autenticação no Supabase');
    }

    console.log('');
    process.exit(loginSuccess ? 0 : 1);
}

// Executar testes
runTests().catch(console.error);
