/**
 * Funções utilitárias para manipulação de leads
 */

/**
 * Obtém o nome do lead priorizando nome fantasia, depois razão social, e por último o título atual
 * @param lead - Objeto do lead com title e custom_fields
 * @returns Nome do lead (nome fantasia > razão social > title)
 */
export function getLeadDisplayName(lead: {
  title: string;
  custom_fields?: Record<string, any> | null;
}): string {
  const customFields = lead.custom_fields || {};
  
  // Prioridade: Nome Fantasia > Razão Social > Título atual
  const nomeFantasia = customFields["Nome Fantasia"];
  const razaoSocial = customFields["Razão Social"];
  
  if (nomeFantasia && typeof nomeFantasia === "string" && nomeFantasia.trim()) {
    return nomeFantasia.trim();
  }
  
  if (razaoSocial && typeof razaoSocial === "string" && razaoSocial.trim()) {
    return razaoSocial.trim();
  }
  
  // Fallback para o título atual
  return lead.title || "Lead sem nome";
}

/**
 * Constrói o título do lead baseado nos campos disponíveis
 * Prioriza: Nome Fantasia > Razão Social > Outros campos
 * @param customFields - Campos customizados do lead
 * @param fallbackTitle - Título de fallback caso nenhum campo seja encontrado
 * @returns Título do lead
 */
export function buildLeadTitleFromCustomFields(
  customFields?: Record<string, any> | null,
  fallbackTitle?: string
): string {
  if (!customFields) {
    return fallbackTitle || "Lead sem nome";
  }
  
  const nomeFantasia = customFields["Nome Fantasia"];
  const razaoSocial = customFields["Razão Social"];
  
  if (nomeFantasia && typeof nomeFantasia === "string" && nomeFantasia.trim()) {
    return nomeFantasia.trim();
  }
  
  if (razaoSocial && typeof razaoSocial === "string" && razaoSocial.trim()) {
    return razaoSocial.trim();
  }
  
  return fallbackTitle || "Lead sem nome";
}


