import os
import json
import requests
from typing import List, Dict, Any

# Configurações
OLD_PROJECT_URL = "https://kyysmixnhdqrxynxjbwk.supabase.co"
OLD_SERVICE_KEY = input("Cole a Service Role Key do projeto ANTIGO (kyysmixnhdqrxynxjbwk): ").strip()

NEW_PROJECT_URL = "https://fjoaliipjfcnokermkhy.supabase.co"
NEW_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw"

# Tabelas em ordem de dependência
TABLES = [
    "organizations",
    "profiles", 
    "organization_memberships",
    "leads",
    "lead_activity",
    "lead_notes",
    "goals",
    "metrics"
]

class SupabaseMigrator:
    def __init__(self, old_url: str, old_key: str, new_url: str, new_key: str):
        self.old_url = old_url
        self.old_key = old_key
        self.new_url = new_url
        self.new_key = new_key
        self.backup_dir = "migration_backup_python"
        os.makedirs(self.backup_dir, exist_ok=True)

    def export_table(self, table: str) -> List[Dict[str, Any]]:
        """Exporta dados de uma tabela do projeto antigo"""
        print(f"📦 Exportando {table}...")
        
        headers = {
            "apikey": self.old_key,
            "Authorization": f"Bearer {self.old_key}",
            "Content-Type": "application/json"
        }
        
        url = f"{self.old_url}/rest/v1/{table}?select=*"
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Salvar backup
            filepath = os.path.join(self.backup_dir, f"{table}.json")
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Exportados {len(data)} registro(s) de {table}")
            return data
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro ao exportar {table}: {e}")
            return []

    def import_table(self, table: str, data: List[Dict[str, Any]]) -> bool:
        """Importa dados para uma tabela do projeto novo"""
        if not data:
            print(f"⚠️  Nenhum dado para importar em {table}")
            return True
        
        print(f"📥 Importando {len(data)} registro(s) em {table}...")
        
        headers = {
            "apikey": self.new_key,
            "Authorization": f"Bearer {self.new_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal"
        }
        
        url = f"{self.new_url}/rest/v1/{table}"
        
        try:
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code in [200, 201, 204]:
                print(f"✅ Dados importados com sucesso em {table}")
                return True
            else:
                print(f"⚠️  Resposta ao importar {table}: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro ao importar {table}: {e}")
            return False

    def migrate(self):
        """Executa a migração completa"""
        print("🚀 Iniciando migração...")
        print(f"Origem: {self.old_url}")
        print(f"Destino: {self.new_url}\n")
        
        # Fase 1: Exportação
        print("=== FASE 1: EXPORTAÇÃO ===")
        exported_data = {}
        for table in TABLES:
            exported_data[table] = self.export_table(table)
        
        print(f"\n=== FASE 2: IMPORTAÇÃO ===")
        # Fase 2: Importação
        for table in TABLES:
            self.import_table(table, exported_data[table])
        
        print("\n✅ Migração concluída!")
        print(f"📁 Backups salvos em: {self.backup_dir}/")

if __name__ == "__main__":
    if not OLD_SERVICE_KEY:
        print("❌ Service Role Key não fornecida. Abortando.")
        exit(1)
    
    migrator = SupabaseMigrator(
        old_url=OLD_PROJECT_URL,
        old_key=OLD_SERVICE_KEY,
        new_url=NEW_PROJECT_URL,
        new_key=NEW_SERVICE_KEY
    )
    
    migrator.migrate()
