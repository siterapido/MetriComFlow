Lead Form Assets (Logo e Capa)

Para que o upload de logo e capa funcione nos formulários públicos, é necessário ter um bucket público no Supabase Storage.

Recomendado: criar o bucket `lead-form-assets` como público.

Passos:

1) No Supabase Dashboard → Storage → Create bucket
   - Name: lead-form-assets
   - Public bucket: ON
   - Save

2) Políticas (se necessário)
   - Buckets públicos normalmente já permitem leitura pública.
   - Garanta que usuários autenticados possam `insert` e `update` no bucket.

3) Variável de ambiente (opcional)
   - Defina `VITE_LEAD_FORM_ASSETS_BUCKET` se quiser usar outro bucket.
   - Ex.: `VITE_LEAD_FORM_ASSETS_BUCKET=public`

4) Tamanhos sugeridos
   - Logo: quadrada (p. ex. 256×256), PNG com fundo transparente.
   - Capa: 1200×320 (ou 3:1), JPG/PNG.

Observações
 - O app tenta enviar para `VITE_LEAD_FORM_ASSETS_BUCKET`, caindo para `public`, `assets` ou `attachments` se o bucket padrão não existir.
 - Caso todos falhem, o app exibirá uma mensagem orientando a criação do bucket.

