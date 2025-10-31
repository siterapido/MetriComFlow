# Configuração Meta Conversions API (CAPI)

## 1. Coletar Credenciais
- `META_PIXEL_ID` (no Events Manager)
- `META_ACCESS_TOKEN` (long-lived; gere via Graph API ou painel com permissões adequadas)
- `META_TEST_EVENT_CODE` (opcional, para validar em Test Events)

## 2. Definir no Supabase (Functions Secrets)
```
supabase secrets set META_PIXEL_ID="<pixel_id>"
supabase secrets set META_ACCESS_TOKEN="<access_token>"
# opcional
supabase secrets set META_TEST_EVENT_CODE="<code>"
```

## 3. Verificar
- Envie um formulário público e acompanhe em `Test Events`.
- Os campos `em/ph` são enviados hasheados (SHA-256) quando disponíveis.
- `event_id` utiliza o `submission_id` do formulário para deduplicação com Pixel.

## 4. Boas Práticas
- Prefira capturar `fbp/fbc` via Pixel na página onde o formulário é embedado.
- Evite enviar PII em claro para logs.
- Use `META_TEST_EVENT_CODE` apenas em ambientes de teste.

