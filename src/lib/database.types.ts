// Reexporta os tipos gerados do Supabase para um único ponto de importação
// Vários arquivos do projeto importam de '@/lib/database.types'.
// Este arquivo estava vazio, causando erros de "não exportado".
// Mantemos apenas reexports de tipos para evitar carregar código desnecessário.

export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "../types/supabase";