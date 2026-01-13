import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'
import Papa from 'papaparse'

// Sinônimos para cada campo do lead (normalizado, sem acentos, lowercase)
const FIELD_SYNONYMS: Record<string, string[]> = {
    name: ['nome', 'name', 'cliente', 'lead', 'contato', 'contact', 'razao_social', 'razao social'],
    email: ['email', 'e-mail', 'correio', 'mail'],
    phone: ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'tel', 'mobile'],
    value: ['valor', 'value', 'receita', 'faturamento', 'deal', 'orcamento', 'budget', 'preco', 'price'],
    source: ['origem', 'source', 'fonte', 'canal'],
    status: ['status', 'estagio', 'etapa', 'fase', 'stage'],
    priority: ['prioridade', 'priority', 'urgencia'],
    product_interest: ['produto', 'product', 'interesse', 'interest', 'servico', 'service'],
    notes: ['notas', 'notes', 'observacoes', 'obs', 'comentarios', 'comments', 'descricao', 'description'],
    company: ['empresa', 'company', 'organizacao', 'org', 'firma', 'cnpj'],
    title: ['titulo', 'title', 'assunto', 'subject'],
}

// Status válidos para leads
const VALID_STATUSES = [
    'novo_lead', 'qualificacao', 'proposta', 'negociacao',
    'fechado_ganho', 'fechado_perdido'
]

// Fontes válidas para leads
const VALID_SOURCES = [
    'meta_ads', 'google_ads', 'whatsapp', 'indicacao',
    'site', 'telefone', 'email', 'evento', 'manual'
]

// Prioridades válidas
const VALID_PRIORITIES = ['baixa', 'media', 'alta', 'urgente']

export interface FieldMapping {
    csvColumn: string
    dbField: string | null
    confidence: 'high' | 'medium' | 'low' | 'manual'
    sampleValue: string
}

export interface ImportResult {
    success: number
    failed: number
    errors: Array<{ row: number; message: string }>
    duplicates: number
}

export interface ParsedData {
    headers: string[]
    rows: Record<string, string>[]
    mappings: FieldMapping[]
}

/**
 * Normaliza uma string removendo acentos, espaços extras e convertendo para lowercase
 */
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, '_') // Substitui caracteres especiais por _
        .replace(/_+/g, '_') // Remove underscores duplicados
        .replace(/^_|_$/g, '') // Remove underscores no início/fim
}

/**
 * Calcula a similaridade entre duas strings (algoritmo de Dice coefficient)
 */
function stringSimilarity(a: string, b: string): number {
    if (a === b) return 1
    if (a.length < 2 || b.length < 2) return 0

    const bigrams = new Map<string, number>()
    for (let i = 0; i < a.length - 1; i++) {
        const bigram = a.slice(i, i + 2)
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1)
    }

    let intersectionSize = 0
    for (let i = 0; i < b.length - 1; i++) {
        const bigram = b.slice(i, i + 2)
        const count = bigrams.get(bigram)
        if (count && count > 0) {
            bigrams.set(bigram, count - 1)
            intersectionSize++
        }
    }

    return (2 * intersectionSize) / (a.length + b.length - 2)
}

/**
 * Encontra o melhor match para uma coluna CSV
 */
function findBestMatch(csvColumn: string): { field: string | null; confidence: 'high' | 'medium' | 'low' } {
    const normalizedColumn = normalizeString(csvColumn)

    let bestMatch: string | null = null
    let bestScore = 0
    let confidence: 'high' | 'medium' | 'low' = 'low'

    for (const [dbField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
        // Verificar match exato com sinônimos
        if (synonyms.includes(normalizedColumn)) {
            return { field: dbField, confidence: 'high' }
        }

        // Verificar similaridade com sinônimos
        for (const synonym of synonyms) {
            const similarity = stringSimilarity(normalizedColumn, synonym)
            if (similarity > bestScore) {
                bestScore = similarity
                bestMatch = dbField
            }
        }
    }

    if (bestScore >= 0.8) {
        confidence = 'high'
    } else if (bestScore >= 0.5) {
        confidence = 'medium'
    } else {
        confidence = 'low'
        if (bestScore < 0.3) {
            bestMatch = null
        }
    }

    return { field: bestMatch, confidence }
}

/**
 * Faz o parse de um arquivo CSV e retorna os dados parseados com mapeamento automático
 */
export function parseCSV(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
                const headers = results.meta.fields || []
                const rows = results.data as Record<string, string>[]

                // Criar mapeamentos automáticos
                const mappings: FieldMapping[] = headers.map(header => {
                    const { field, confidence } = findBestMatch(header)
                    return {
                        csvColumn: header,
                        dbField: field,
                        confidence: field ? confidence : 'low',
                        sampleValue: rows[0]?.[header] || ''
                    }
                })

                resolve({ headers, rows, mappings })
            },
            error: (error) => {
                reject(new Error(`Erro ao processar CSV: ${error.message}`))
            }
        })
    })
}

/**
 * Valida e normaliza o valor de um campo
 */
function normalizeValue(value: string, dbField: string): any {
    const trimmed = value?.trim() || ''

    if (!trimmed) return null

    switch (dbField) {
        case 'value':
            // Converte para número (aceita vírgula ou ponto como decimal)
            const numValue = parseFloat(trimmed.replace(/[^\d.,]/g, '').replace(',', '.'))
            return isNaN(numValue) ? null : numValue

        case 'status':
            const normalizedStatus = normalizeString(trimmed)
            // Mapear status comuns
            const statusMap: Record<string, string> = {
                'novo': 'novo_lead',
                'new': 'novo_lead',
                'qualificado': 'qualificacao',
                'qualified': 'qualificacao',
                'proposta': 'proposta',
                'proposal': 'proposta',
                'negociacao': 'negociacao',
                'negotiation': 'negociacao',
                'ganho': 'fechado_ganho',
                'won': 'fechado_ganho',
                'perdido': 'fechado_perdido',
                'lost': 'fechado_perdido',
            }
            const mappedStatus = statusMap[normalizedStatus] || normalizedStatus
            return VALID_STATUSES.includes(mappedStatus) ? mappedStatus : 'novo_lead'

        case 'priority':
            const normalizedPriority = normalizeString(trimmed)
            const priorityMap: Record<string, string> = {
                'low': 'baixa',
                'medium': 'media',
                'high': 'alta',
                'urgent': 'urgente',
            }
            const mappedPriority = priorityMap[normalizedPriority] || normalizedPriority
            return VALID_PRIORITIES.includes(mappedPriority) ? mappedPriority : 'media'

        case 'source':
            const normalizedSource = normalizeString(trimmed)
            const sourceMap: Record<string, string> = {
                'meta': 'meta_ads',
                'facebook': 'meta_ads',
                'instagram': 'meta_ads',
                'google': 'google_ads',
                'whats': 'whatsapp',
                'indicacao': 'indicacao',
                'referral': 'indicacao',
                'website': 'site',
                'phone': 'telefone',
            }
            const mappedSource = sourceMap[normalizedSource] || normalizedSource
            return VALID_SOURCES.includes(mappedSource) ? mappedSource : 'manual'

        case 'email':
            // Validação básica de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            return emailRegex.test(trimmed) ? trimmed : null

        case 'phone':
            // Remove caracteres não numéricos, mantém apenas dígitos
            const phone = trimmed.replace(/\D/g, '')
            return phone.length >= 8 ? phone : null

        default:
            return trimmed
    }
}

export function useImportLeads() {
    const queryClient = useQueryClient()
    const { data: org } = useActiveOrganization()

    return useMutation({
        mutationFn: async ({
            rows,
            mappings
        }: {
            rows: Record<string, string>[]
            mappings: FieldMapping[]
        }): Promise<ImportResult> => {
            if (!org?.id) {
                throw new Error('Organização ativa não definida')
            }

            const result: ImportResult = {
                success: 0,
                failed: 0,
                errors: [],
                duplicates: 0
            }

            // Criar mapa de colunas CSV para campos DB
            const columnMap = new Map<string, string>()
            mappings.forEach(m => {
                if (m.dbField) {
                    columnMap.set(m.csvColumn, m.dbField)
                }
            })

            // Processar cada linha
            const leadsToInsert: any[] = []
            const existingEmails = new Set<string>()

            // Buscar emails existentes para verificar duplicados
            const { data: existingLeads } = await supabase
                .from('leads')
                .select('email')
                .eq('organization_id', org.id)
                .not('email', 'is', null)

            existingLeads?.forEach(lead => {
                if (lead.email) {
                    existingEmails.add(lead.email.toLowerCase())
                }
            })

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowNumber = i + 2 // +2 porque linha 1 é header e começamos em 0

                try {
                    const leadData: Record<string, any> = {
                        organization_id: org.id,
                        status: 'novo_lead', // Status padrão
                        source: 'manual', // Fonte padrão para importação
                        priority: 'media', // Prioridade padrão
                    }

                    // Mapear valores da linha
                    for (const [csvColumn, value] of Object.entries(row)) {
                        const dbField = columnMap.get(csvColumn)
                        if (dbField && value) {
                            const normalizedValue = normalizeValue(value, dbField)
                            if (normalizedValue !== null) {
                                leadData[dbField] = normalizedValue
                            }
                        }
                    }

                    // Se não tiver nome, usar email ou título genérico
                    if (!leadData.name && !leadData.title) {
                        if (leadData.email) {
                            leadData.name = leadData.email.split('@')[0]
                        } else {
                            leadData.name = `Lead importado ${rowNumber}`
                        }
                    }

                    // Se tiver name mas não title, usar name como title
                    if (leadData.name && !leadData.title) {
                        leadData.title = leadData.name
                    }

                    // Verificar duplicados por email
                    if (leadData.email && existingEmails.has(leadData.email.toLowerCase())) {
                        result.duplicates++
                        result.errors.push({
                            row: rowNumber,
                            message: `Email duplicado: ${leadData.email}`
                        })
                        continue
                    }

                    // Adicionar à lista para inserção
                    leadsToInsert.push(leadData)

                    if (leadData.email) {
                        existingEmails.add(leadData.email.toLowerCase())
                    }

                } catch (error) {
                    result.failed++
                    result.errors.push({
                        row: rowNumber,
                        message: error instanceof Error ? error.message : 'Erro desconhecido'
                    })
                }
            }

            // Inserir leads em lotes de 50
            const BATCH_SIZE = 50
            for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
                const batch = leadsToInsert.slice(i, i + BATCH_SIZE)

                const { data, error } = await supabase
                    .from('leads')
                    .insert(batch)
                    .select('id')

                if (error) {
                    // Marcar todas do lote como falha
                    batch.forEach((_, idx) => {
                        result.failed++
                        result.errors.push({
                            row: i + idx + 2,
                            message: error.message
                        })
                    })
                } else {
                    result.success += data?.length || 0
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
            queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] })

            if (result.success > 0 && result.failed === 0) {
                toast.success(`${result.success} leads importados com sucesso!`)
            } else if (result.success > 0 && result.failed > 0) {
                toast.warning(`${result.success} importados, ${result.failed} falhas`)
            } else {
                toast.error('Nenhum lead foi importado')
            }
        },
        onError: (error) => {
            console.error('[useImportLeads] Erro:', error)
            toast.error('Erro ao importar leads')
        }
    })
}

// Campos disponíveis para mapeamento manual
export const AVAILABLE_FIELDS = [
    { value: 'name', label: 'Nome' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'value', label: 'Valor' },
    { value: 'company', label: 'Empresa' },
    { value: 'title', label: 'Título' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Prioridade' },
    { value: 'source', label: 'Origem' },
    { value: 'product_interest', label: 'Produto/Interesse' },
    { value: 'notes', label: 'Notas/Observações' },
]
