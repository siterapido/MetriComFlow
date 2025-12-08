import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import * as XLSX from "xlsx";
import type { LeadImportPayload } from "@/hooks/useLeads";

export interface ImportResult {
  success: boolean;
  batch_id: string;
  imported: number;
  skipped: number;
  error_count: number;
}

export interface ColumnMapping {
  title?: string;
  email?: string;
  phone?: string;
  source?: string;
  description?: string;
  status?: string;
  value?: string;
  // Campos de empresa/CNPJ
  cnpj?: string;
  razao_social?: string;
  porte?: string;
  capital_social?: string;
  data_abertura?: string;
  nome_fantasia?: string;
  telefone_principal?: string;
  telefone_secundario?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  atividade_principal?: string;
  [key: string]: string | undefined; // Para campos personalizados adicionais
}

export interface ProcessedFile {
  columns: string[];
  rows: Record<string, unknown>[];
  mapping: ColumnMapping;
  sheetName?: string;
}

export interface SpreadsheetInfo {
  sheetNames: string[];
  workbook: any; // XLSX.WorkBook
}

// Padrões para mapeamento automático
const AUTO_MAPPING_PATTERNS: Record<string, string[]> = {
  title: ["nome", "titulo", "title", "lead", "name", "cliente", "customer", "nome completo"],
  email: ["email", "e-mail", "mail", "correio", "endereço de email"],
  phone: ["telefone", "phone", "celular", "whatsapp", "mobile", "tel", "contato"],
  source: ["origem", "source", "canal", "fonte"],
  description: ["descricao", "description", "observacao", "obs", "notas", "detalhes"],
  status: ["status", "etapa", "fase", "situacao"],
  value: ["valor", "value", "amount", "receita"],
  // Campos de empresa/CNPJ
  cnpj: ["cnpj", "cnpj/cpf", "documento", "cpf/cnpj"],
  razao_social: ["razao social", "razão social", "razao_social", "razão_social", "razaosocial", "nome empresarial", "empresa"],
  porte: ["porte", "porte empresa", "tamanho", "porte da empresa"],
  capital_social: ["capital social", "capital_social", "capitalsocial", "capital", "capital inicial"],
  data_abertura: ["data de abertura", "data_abertura", "dataabertura", "abertura", "data abertura", "dt abertura"],
  nome_fantasia: ["nome fantasia", "nome_fantasia", "nomefantasia", "fantasia", "nome comercial"],
  telefone_principal: ["telefone principal", "telefone_principal", "telefoneprincipal", "tel principal", "telefone 1", "fone principal"],
  telefone_secundario: ["telefone secundario", "telefone secundário", "telefone_secundario", "telefone_secundário", "tel secundario", "telefone 2", "fone secundario"],
  logradouro: ["logradouro", "endereco", "endereço", "rua", "rua/avenida", "endereço completo"],
  numero: ["numero", "número", "num", "nº", "nro", "número do endereço"],
  complemento: ["complemento", "compl", "complemento endereco", "complemento endereço"],
  bairro: ["bairro", "distrito", "zona"],
  cidade: ["cidade", "municipio", "município", "localidade"],
  estado: ["estado", "uf", "estado/uf", "unidade federativa"],
  cep: ["cep", "código postal", "codigo postal", "postal code"],
  atividade_principal: ["atividade principal", "atividade_principal", "atividadeprincipal", "cnae", "cnae principal", "ramo de atividade"],
};

// Normaliza string para comparação
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-_]+/g, "_")
    .trim();
};

// Mapeia colunas automaticamente
export const autoMapColumns = (columns: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {};
  const usedColumns = new Set<string>();

  // Para cada campo conhecido, tentar encontrar coluna correspondente
  Object.entries(AUTO_MAPPING_PATTERNS).forEach(([field, patterns]) => {
    for (const column of columns) {
      if (usedColumns.has(column)) continue;

      const normalizedColumn = normalizeString(column);
      const matches = patterns.some((pattern) => {
        const normalizedPattern = normalizeString(pattern);
        return (
          normalizedColumn === normalizedPattern ||
          normalizedColumn.includes(normalizedPattern) ||
          normalizedPattern.includes(normalizedColumn)
        );
      });

      if (matches) {
        mapping[field] = column;
        usedColumns.add(column);
        break;
      }
    }
  });

  return mapping;
};

// Carrega informações do arquivo (abas disponíveis)
export const loadSpreadsheetInfo = async (
  file: File
): Promise<SpreadsheetInfo> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Não foi possível ler o arquivo"));
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error("O arquivo não possui abas"));
          return;
        }

        resolve({
          sheetNames: workbook.SheetNames,
          workbook,
        });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Erro ao processar arquivo")
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Processa uma aba específica do arquivo Excel/CSV
export const processSpreadsheetFile = async (
  file: File,
  sheetName?: string
): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Não foi possível ler o arquivo"));
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        const selectedSheetName = sheetName || workbook.SheetNames[0];
        
        if (!selectedSheetName) {
          reject(new Error("O arquivo não possui abas"));
          return;
        }

        const worksheet = workbook.Sheets[selectedSheetName];
        if (!worksheet) {
          reject(new Error(`A aba "${selectedSheetName}" não foi encontrada`));
          return;
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          {
            defval: undefined,
            raw: false,
          }
        );

        if (rows.length === 0) {
          reject(new Error("A aba selecionada está vazia"));
          return;
        }

        // Extrair colunas únicas
        const columns = new Set<string>();
        rows.forEach((row) => {
          Object.keys(row).forEach((key) => {
            if (key) columns.add(key);
          });
        });

        const columnArray = Array.from(columns).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );

        // Mapeamento automático
        const mapping = autoMapColumns(columnArray);

        resolve({
          columns: columnArray,
          rows,
          mapping,
          sheetName: selectedSheetName,
        });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Erro ao processar arquivo")
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Normaliza uma linha usando o mapeamento
const normalizeRow = (
  row: Record<string, unknown>,
  mapping: ColumnMapping,
  defaults: { status: string; source: string; organization_id: string }
): { payload?: LeadImportPayload; errors: string[] } => {
  const errors: string[] = [];

  // Título é obrigatório
  const titleColumn = mapping.title;
  if (!titleColumn) {
    errors.push("Campo 'título' não mapeado");
    return { payload: undefined, errors };
  }

  const title = String(row[titleColumn] || "").trim();
  if (!title) {
    errors.push("Título vazio");
    return { payload: undefined, errors };
  }

  const payload: LeadImportPayload = {
    title,
    organization_id: defaults.organization_id,
    status: defaults.status,
    source: defaults.source,
  };

  // Email
  if (mapping.email) {
    const email = String(row[mapping.email] || "").trim();
    if (email) {
      if (!payload.custom_fields) payload.custom_fields = {};
      // Validação básica de email
      if (email.includes("@") && email.includes(".")) {
        (payload.custom_fields as Record<string, unknown>)["email"] = email.toLowerCase();
      } else if (email) {
        // Se tem valor mas formato inválido, adiciona como email_raw
        (payload.custom_fields as Record<string, unknown>)["email_raw"] = email;
      }
    }
  }

  // Telefone
  if (mapping.phone) {
    const phone = String(row[mapping.phone] || "").trim();
    if (phone) {
      if (!payload.custom_fields) payload.custom_fields = {};
      (payload.custom_fields as Record<string, unknown>)["phone"] = phone.replace(/[^\d+()-]/g, "");
    }
  }

  // Descrição
  if (mapping.description) {
    const description = String(row[mapping.description] || "").trim();
    if (description) {
      payload.description = description;
    }
  }

  // Status
  if (mapping.status) {
    const status = String(row[mapping.status] || "").trim();
    if (status) {
      payload.status = status;
    }
  }

  // Origem
  if (mapping.source) {
    const source = String(row[mapping.source] || "").trim();
    if (source) {
      payload.source = source;
    }
  }

  // Valor
  if (mapping.value) {
    const valueStr = String(row[mapping.value] || "").trim();
    if (valueStr) {
      const value = parseFloat(
        valueStr.replace(/[^\d.,-]/g, "").replace(",", ".")
      );
      if (!isNaN(value)) {
        payload.value = value;
      }
    }
  }

  // Campos de empresa/CNPJ
  const empresaFields: Record<string, unknown> = {};
  
  const empresaFieldMap: Record<string, string> = {
    cnpj: "CNPJ",
    razao_social: "Razão Social",
    porte: "Porte",
    capital_social: "Capital Social",
    data_abertura: "Data de Abertura",
    nome_fantasia: "Nome Fantasia",
    telefone_principal: "Telefone Principal",
    telefone_secundario: "Telefone Secundário",
    logradouro: "Logradouro",
    numero: "Número",
    complemento: "Complemento",
    bairro: "Bairro",
    cidade: "Cidade",
    estado: "Estado",
    cep: "CEP",
    atividade_principal: "Atividade Principal",
  };

  Object.entries(empresaFieldMap).forEach(([fieldKey, fieldLabel]) => {
    if (mapping[fieldKey]) {
      const value = row[mapping[fieldKey]];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        empresaFields[fieldLabel] = String(value).trim();
      }
    }
  });

  // Campos personalizados (colunas não mapeadas)
  const customFields: Record<string, unknown> = {};
  Object.keys(row).forEach((column) => {
    const isMapped = Object.values(mapping).includes(column);
    if (!isMapped && row[column] !== undefined && row[column] !== null && row[column] !== "") {
      customFields[column] = row[column];
    }
  });

  // Combinar campos de empresa com campos personalizados
  const allCustomFields = { ...empresaFields, ...customFields };
  
  if (Object.keys(allCustomFields).length > 0) {
    payload.custom_fields = allCustomFields;
  }

  return { payload, errors };
};

export function useSpreadsheetImport() {
  const { data: org } = useActiveOrganization();

  const importMutation = useMutation({
    mutationFn: async (params: {
      rows: Record<string, unknown>[];
      mapping: ColumnMapping;
      fileName?: string;
      defaults?: { status?: string; source?: string };
    }): Promise<ImportResult> => {
      if (!org?.id) {
        throw new Error("Organização ativa não definida");
      }

      if (!params.rows || params.rows.length === 0) {
        throw new Error("Nenhuma linha para importar");
      }

      if (params.rows.length > 5000) {
        throw new Error("Limite de 5000 linhas excedido. Divida o arquivo.");
      }

      const defaults = {
        status: params.defaults?.status || "novo_lead",
        source: params.defaults?.source || "manual",
        organization_id: org.id,
      };

      // Normalizar linhas
      const normalized = params.rows.map((row) =>
        normalizeRow(row, params.mapping, defaults)
      );

      const validRows = normalized
        .filter((n) => n.payload)
        .map((n) => n.payload!);

      if (validRows.length === 0) {
        throw new Error("Nenhuma linha válida para importar");
      }

      // Chamar edge function
      const { data, error } = await supabase.functions.invoke<ImportResult>(
        "spreadsheet-import",
        {
          body: {
            organization_id: org.id,
            rows: validRows,
            mapping: params.mapping,
            source_file_name: params.fileName,
            defaults: {
              status: defaults.status,
              source: defaults.source,
            },
          },
        }
      );

      if (error) {
        const errorMessage =
          (error as any)?.context?.error ||
          (error as any)?.message ||
          "Erro ao importar leads";
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error("Resposta vazia do servidor");
      }

      return data;
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (batchId: string): Promise<{ success: boolean; undone: number }> => {
      if (!org?.id) {
        throw new Error("Organização ativa não definida");
      }

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        undone: number;
      }>("spreadsheet-import-undo", {
        body: {
          batch_id: batchId,
          organization_id: org.id,
        },
      });

      if (error) {
        throw new Error(
          (error as any)?.message || "Erro ao desfazer importação"
        );
      }

      if (!data) {
        throw new Error("Resposta vazia do servidor");
      }

      return data;
    },
  });

  return {
    import: importMutation,
    undo: undoMutation,
    processFile: processSpreadsheetFile,
    loadInfo: loadSpreadsheetInfo,
    autoMapColumns,
  };
}

