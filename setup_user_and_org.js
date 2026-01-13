#!/usr/bin/env node
import https from 'https';

const SUPABASE_URL = 'https://kyysmixnhdqrxynxjbwk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NTg0MywiZXhwIjoyMDc5MzYxODQzfQ.ZKJM6aLlE9ROjPBmKTxYq32J81Wl_MqPQPNyKuDLaSk';
const USER_EMAIL = 'galileubarecafe@gmail.com';
const USER_PASSWORD = 'Galileu@2026!';
const USER_NAME = 'Galileu';
const ORG_NAME = 'Organização do Galileu';

console.log('🚀 Configurando sistema InsightFy...\n');

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SUPABASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
            }
        };
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    try {
        // Passo 1: Buscar usuário
        console.log('📋 Buscando usuário...');
        let userId;

        const profiles = await makeRequest('GET', `/rest/v1/profiles?email=eq.${USER_EMAIL}&select=id`);
        if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            console.log(`✅ Usuário encontrado: ${userId}`);
        } else {
            throw new Error('Usuário não encontrado! Execute primeiro a criação via Dashboard.');
        }

        // Passo 2: Verificar organização
        console.log('\n🏢 Verificando organização...');
        let orgId;

        const orgs = await makeRequest('GET', `/rest/v1/organizations?name=eq.${encodeURIComponent(ORG_NAME)}`);
        if (orgs && orgs.length > 0) {
            orgId = orgs[0].id;
            console.log(`✅ Organização encontrada: ${orgId}`);
        } else {
            console.log('🏢 Criando organização...');
            await makeRequest('POST', '/rest/v1/organizations', [{
                name: ORG_NAME,
                slug: 'galileu-org'
            }]);

            await new Promise(r => setTimeout(r, 1000));

            const newOrgs = await makeRequest('GET', `/rest/v1/organizations?name=eq.${encodeURIComponent(ORG_NAME)}`);
            if (newOrgs && newOrgs.length > 0) {
                orgId = newOrgs[0].id;
                console.log(`✅ Organização criada: ${orgId}`);
            } else {
                throw new Error('Falha ao criar organização');
            }
        }

        // Passo 3: Verificar vínculo
        console.log('\n🔗 Verificando vínculo...');
        const memberships = await makeRequest('GET',
            `/rest/v1/organization_memberships?profile_id=eq.${userId}&organization_id=eq.${orgId}`);

        if (memberships && memberships.length > 0) {
            console.log('✅ Vínculo já existe');
        } else {
            console.log('🔗 Criando vínculo...');
            await makeRequest('POST', '/rest/v1/organization_memberships', [{
                profile_id: userId,
                organization_id: orgId,
                role: 'owner',
                is_active: true
            }]);
            console.log('✅ Vínculo criado');
        }

        // Passo 4: Configurar organização ativa
        console.log('\n🔄 Configurando organização ativa...');
        await makeRequest('PATCH', `/rest/v1/profiles?id=eq.${userId}`, {
            active_organization_id: orgId
        });
        console.log('✅ Organização ativa configurada');

        console.log('\n' + '='.repeat(60));
        console.log('✅ CONFIGURAÇÃO CONCLUÍDA!');
        console.log('='.repeat(60));
        console.log(`\n📊 Login:`);
        console.log(`   Email: ${USER_EMAIL}`);
        console.log(`   Senha: ${USER_PASSWORD}`);
        console.log(`\n🏢 Organização: ${ORG_NAME} (${orgId})`);
        console.log(`👤 Usuário: ${USER_NAME} (${userId})`);
        console.log('\n🌐 http://localhost:8080');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        process.exit(1);
    }
}

main();
