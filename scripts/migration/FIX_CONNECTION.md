# ⚠️ Problema de Conexão com o Novo Banco

Não conseguimos conectar ao banco de dados do novo projeto (`kyysmixnhdqrxynxjbwk`).

O endereço `db.kyysmixnhdqrxynxjbwk.supabase.co` não está sendo encontrado pelo DNS. Isso pode acontecer se:

1. O projeto é muito recente e o DNS ainda não propagou.
2. O projeto está em uma região que usa um endereço diferente.
3. O banco de dados está pausado.

## ✅ Como Resolver

1. Acesse o painel do novo projeto: https://supabase.com/dashboard/project/kyysmixnhdqrxynxjbwk
2. Vá em **Settings** (ícone de engrenagem) -> **Database**.
3. Role até a seção **Connection string**.
4. Clique em **URI**.
5. Copie a string completa. Ela deve se parecer com:
   `postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
   (O host pode ser diferente).

## 📝 Atualize o Arquivo

1. Abra o arquivo `.env.migration`:
   `/Users/marcosalexandre/metricom-flow/scripts/migration/.env.migration`

2. Atualize a linha `TARGET_DB_URL` com a string que você copiou.
   **Importante:** Substitua `[YOUR-PASSWORD]` pela senha: `sb_secret_dN8Knq7ReASgsqEMoThSZA_-73M75kO`

3. Atualize também `TARGET_DB_HOST` e `TARGET_DB_PORT` se forem diferentes.

## 🔄 Tente Novamente

Após atualizar, execute:

```bash
cd scripts/migration
./apply-migrations-to-target.sh
```
