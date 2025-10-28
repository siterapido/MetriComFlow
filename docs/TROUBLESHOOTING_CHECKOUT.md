# 🔧 Troubleshooting - Checkout com Cartão de Crédito

## Como Debugar Erros de Checkout

### 1. **Abra o Console do Navegador**
- Pressione `F12` ou `Ctrl+Shift+I` (Windows/Linux)
- Pressione `Cmd+Option+I` (Mac)
- Vá para a aba **Console**

### 2. **Faça o Checkout**
- Preencha todos os campos
- Clique em "Confirmar e Contratar Plano"
- Observe as mensagens no console

### 3. **Analise os Logs**

Você verá algo assim:

```
📤 Sending to Edge Function: {
  "planSlug": "basico",
  "billingName": "João Silva",
  "billingEmail": "joao@example.com",
  "billingCpfCnpj": "12345678901",
  "billingPhone": "47999887766",
  "billingAddress": {
    "postalCode": "01310100",
    "street": "Avenida Paulista",
    "addressNumber": "1000",
    "province": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "billingType": "CREDIT_CARD",
  "creditCard": {
    "holderName": "MARIA SILVA",
    "number": "****",
    "expiryMonth": "12",
    "expiryYear": "2028",
    "ccv": "***"
  }
}

📦 Response Status: 200 OK  (✅ Sucesso!)
// OU
📦 Response Status: 400 Bad Request  (❌ Erro!)

📦 Response Body: {"success":false,"error":"MENSAGEM DO ERRO"}
```

---

## ❌ Erros Comuns e Soluções

### **Erro 400 - "Endereço incompleto"**
```json
{"error": "Endereço incompleto. Informe logradouro, bairro, cidade e estado"}
```

**Causa**: Algum campo de endereço está vazio
**Solução**: Verifique que preencheu:
- ✅ CEP
- ✅ Endereço (Rua/Avenida)
- ✅ Número
- ✅ Bairro
- ✅ Cidade
- ✅ Estado (2 letras, ex: SP)

---

### **Erro 400 - "Transação não autorizada"**
```json
{"error": "Transação não autorizada. Verifique os dados do cartão de crédito"}
```

**Causa**: Cartão de teste rejeitado ou dados inválidos
**Solução**:

#### **Ambiente Sandbox (Homologação)**
Use o cartão de teste oficial do Asaas:
```
Número: 5162306219378829
Titular: MARIA SILVA
Validade: 12/2028
CVV: 318
```

#### **Ambiente Produção**
- Use um cartão real e válido
- Verifique se o cartão tem limite disponível
- Confirme que o cartão aceita transações online

---

### **Erro 400 - "Plan not found"**
```json
{"error": "Plan not found: nome-do-plano"}
```

**Causa**: Plano não existe no banco de dados
**Solução**: Verifique os planos disponíveis:

```sql
SELECT slug, name, price FROM subscription_plans ORDER BY price;
```

Planos válidos:
- `basico` - R$ 97/mês
- `intermediario` - R$ 197/mês
- `pro` - R$ 497/mês

---

### **Erro 400 - "CPF/CNPJ inválido"**
```json
{"error": "CPF ou CNPJ inválido"}
```

**Causa**: CPF/CNPJ não passou na validação
**Solução**:
- Use um CPF válido (11 dígitos)
- Ou CNPJ válido (14 dígitos)
- Formatação é removida automaticamente

**CPF de teste válido**: `249.715.637-92` (ou `24971563792`)

---

### **Erro 400 - "Email inválido"**
```json
{"error": "Email inválido"}
```

**Causa**: Formato de email incorreto
**Solução**: Use formato válido: `usuario@dominio.com`

---

### **Erro 400 - "Telefone inválido"**
```json
{"error": "Telefone inválido"}
```

**Causa**: Telefone com formato incorreto
**Solução**:
- Celular (11 dígitos): `(47) 99988-7766`
- Fixo (10 dígitos): `(47) 3333-4444`

---

### **Erro 400 - "Validade do cartão inválida"**
```json
{"error": "Validade inválida (MM/AA)"}
```

**Causa**: Formato de validade incorreto
**Solução**: Use formato `MM/AA`, exemplo: `12/28`

---

### **Erro 500 - "Internal Server Error"**
```json
{"error": "Internal server error"}
```

**Causa**: Erro no servidor (Supabase ou Asaas API)
**Solução**:
1. Verifique os logs da Edge Function:
   ```bash
   npx supabase functions logs create-asaas-subscription
   ```
2. Verifique se o Asaas API está online
3. Confirme que `ASAAS_API_KEY` está configurado:
   ```bash
   npx supabase secrets list
   ```

---

## ✅ Checklist de Teste

Antes de reportar um erro, verifique:

- [ ] Todos os campos obrigatórios estão preenchidos
- [ ] CPF/CNPJ é válido (use validador online)
- [ ] CEP existe (use ViaCEP para testar)
- [ ] Email tem formato correto
- [ ] Telefone tem 10 ou 11 dígitos
- [ ] Cartão tem número válido (16 dígitos)
- [ ] Validade do cartão está no formato MM/AA
- [ ] CVV tem 3 ou 4 dígitos
- [ ] Estado tem 2 letras (SP, RJ, etc.)
- [ ] Console do navegador está aberto (F12)
- [ ] Você está usando a chave Sandbox (testes) ou Produção

---

## 🧪 Teste Rápido via Script

Para testar sem o formulário:

```bash
# Teste com PIX (sem cartão)
npx tsx scripts/test-public-checkout-pix.ts

# Teste com Cartão de Crédito
npx tsx scripts/test-public-checkout-creditcard.ts

# Teste todos os planos
npx tsx scripts/test-all-plans-creditcard.ts

# Debug de erro específico
npx tsx scripts/debug-checkout-error.ts
```

---

## 🔍 Logs Detalhados

### **Ver logs da Edge Function**
```bash
npx supabase functions logs create-asaas-subscription
```

### **Ver últimos 50 logs**
```bash
npx supabase functions logs create-asaas-subscription --limit 50
```

### **Ver logs em tempo real**
```bash
npx supabase functions logs create-asaas-subscription --follow
```

---

## 📞 Suporte

Se o erro persistir após verificar todos os itens acima:

1. **Copie o output completo do console** (F12 → Console → Clique direito → Save as...)
2. **Tire um screenshot** do formulário preenchido
3. **Anote o horário** que o erro ocorreu
4. **Envie** essas informações para análise

---

## 🚀 Próximos Passos Após Sucesso

Quando o checkout funcionar (Status 200):

1. ✅ Assinatura criada no Asaas Sandbox
2. ✅ Organização criada no banco
3. ✅ Claim token gerado
4. ✅ Redirecionado para `/finalizar-cadastro`
5. ✅ Aguardar webhook `PAYMENT_CONFIRMED`
6. ✅ Criar conta de usuário
7. ✅ Virar owner da organização

Verifique no painel Asaas:
- **Sandbox**: https://sandbox.asaas.com/subscriptions
- **Produção**: https://www.asaas.com/subscriptions

---

## 🔐 Ambiente Sandbox vs Produção

### **Como saber qual ambiente está ativo?**

Verifique a chave de API configurada:

```bash
npx supabase secrets list
```

- **Sandbox**: Chave começa com `$aact_hmlg_`
- **Produção**: Chave NÃO começa com `$aact_hmlg_`

### **Trocar de ambiente**

```bash
# Para SANDBOX (testes)
npx supabase secrets set ASAAS_API_KEY='$aact_hmlg_...'

# Para PRODUÇÃO (cartões reais)
npx supabase secrets set ASAAS_API_KEY="sua_chave_producao"
```

Após trocar, faça deploy:
```bash
npx supabase functions deploy create-asaas-subscription
```

---

**Última atualização**: 2025-10-28
