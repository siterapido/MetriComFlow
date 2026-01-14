import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { useAuth } from '@/hooks/useAuth'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// Sinônimos para cada campo do lead (normalizado, sem acentos, lowercase)

const FIELD_SYNONYMS: Record<string, string[]> = {
    // Campos Básicos
    trade_name: ['nome_fantasia', 'nome fantasia', 'fantasia', 'title', 'titulo', 'name', 'nome', 'cliente', 'lead'], // Titulo/Nome geralmente é o Nome Fantasia
    legal_name: ['razao_social', 'razao social', 'company', 'empresa', 'organizacao', 'firma'],
    cnpj: ['cnpj', 'documento_federal', 'tax_id'],
    email: ['email', 'e-mail', 'correio', 'mail'],
    phone: ['telefone_principal', 'telefone principal', 'telefone', 'phone', 'celular', 'whatsapp', 'fone', 'tel', 'mobile'],
    secondary_phone: ['telefone_secundario', 'telefone secundario', 'telefone_2', 'celular_2'],

    // Detalhes da Empresa
    size: ['porte', 'tamanho', 'size'],
    share_capital: ['capital_social', 'capital social', 'share_capital', 'capital'],
    opening_date: ['data_abertura', 'data abertura', 'data_fundacao', 'inicio_atividades'],
    main_activity: ['atividade_principal', 'atividade principal', 'cnae', 'atividade', 'segmento'],

    // Endereço
    zip_code: ['cep', 'zip_code', 'codigo_postal'],
    address: ['logradouro', 'endereco', 'address', 'rua', 'avenida', 'street'],
    address_number: ['numero', 'number', 'num'],
    complement: ['complemento', 'complement', 'comp'],
    neighborhood: ['bairro', 'neighborhood', 'vicinity'],
    city: ['cidade', 'city', 'municipio'],
    state: ['estado', 'state', 'uf', 'provincia'],

    // Outros campos existentes
    value: ['valor', 'value', 'receita', 'faturamento', 'deal', 'orcamento', 'budget', 'preco', 'price'],
    source: ['origem', 'source', 'fonte', 'canal'],
    status: ['status', 'estagio', 'etapa', 'fase', 'stage'],
    priority: ['prioridade', 'priority', 'urgencia'],
    product_interest: ['produto', 'product', 'interesse', 'interest', 'servico', 'service'],
    notes: ['notas', 'notes', 'observacoes', 'obs', 'comentarios', 'comments', 'descricao', 'description'],
}

// Status válidos para leads (devem corresponder à constraint leads_status_check no banco)
const VALID_STATUSES = [
    'novo_lead', 'qualificacao', 'reuniao', 'proposta', 'negociacao',
    'fechado_ganho', 'fechado_perdido', 'follow_up', 'aguardando_resposta'
]

// Fontes válidas para leads
const VALID_SOURCES = [
    'meta_ads', 'google_ads', 'whatsapp', 'indicacao',
    'site', 'telefone', 'email', 'evento', 'manual'
]

// Prioridades válidas
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']

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
 * Lê um arquivo Excel e retorna os nomes das abas
 */
export async function getExcelSheets(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                resolve(workbook.SheetNames)
            } catch (error) {
                reject(new Error('Falha ao ler arquivo Excel'))
            }
        }
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
        reader.readAsBinaryString(file)
    })
}

/**
 * Processa dados parseados (comum para CSV e Excel)
 */
function processParsedData(headers: string[], rows: Record<string, string>[]): ParsedData {
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

    return { headers, rows, mappings }
}

/**
 * Faz o parse de uma aba específica do Excel
 */
export async function parseExcelSheet(file: File, sheetName: string): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const worksheet = workbook.Sheets[sheetName]

                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                if (jsonData.length === 0) {
                    throw new Error('A planilha está vazia')
                }

                // Assumindo que a primeira linha são os headers
                const headers = jsonData[0] as string[]

                // Converter linhas subsequentes para objetos
                const rows = jsonData.slice(1).map(row => {
                    const rowData: Record<string, string> = {}
                    headers.forEach((header, index) => {
                        rowData[header] = String(row[index] || '')
                    })
                    return rowData
                })

                resolve(processParsedData(headers, rows))
            } catch (error) {
                reject(new Error('Falha ao processar aba do Excel'))
            }
        }
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
        reader.readAsBinaryString(file)
    })
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
                resolve(processParsedData(headers, rows))
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
        case 'share_capital':
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
                'reuniao': 'reuniao',
                'meeting': 'reuniao',
                'proposta': 'proposta',
                'proposal': 'proposta',
                'negociacao': 'negociacao',
                'negotiation': 'negociacao',
                'ganho': 'fechado_ganho',
                'won': 'fechado_ganho',
                'perdido': 'fechado_perdido',
                'lost': 'fechado_perdido',
                'follow_up': 'follow_up',
                'followup': 'follow_up',
                'acompanhamento': 'follow_up',
                'aguardando': 'aguardando_resposta',
                'aguardando_resposta': 'aguardando_resposta',
                'waiting': 'aguardando_resposta',
            }
            const mappedStatus = statusMap[normalizedStatus] || normalizedStatus
            return VALID_STATUSES.includes(mappedStatus) ? mappedStatus : 'novo_lead'

        case 'priority':
            const normalizedPriority = normalizeString(trimmed)
            const priorityMap: Record<string, string> = {
                'baixa': 'low',
                'baixo': 'low',
                'low': 'low',
                'media': 'medium',
                'medio': 'medium',
                'medium': 'medium',
                'alta': 'high',
                'alto': 'high',
                'high': 'high',
                'urgente': 'urgent',
                'urgent': 'urgent',
            }
            const mappedPriority = priorityMap[normalizedPriority] || 'medium'
            return VALID_PRIORITIES.includes(mappedPriority) ? mappedPriority : 'medium'

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
        case 'secondary_phone':
            // Remove caracteres não numéricos, mantém apenas dígitos
            const phone = trimmed.replace(/\D/g, '')
            return phone.length >= 8 ? phone : null

        case 'opening_date':
            // Tenta converter data (aceita DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD ou Serial Excel)
            try {
                // Se for número (Excel Serial Date) -> ex: "34731"
                if (/^\d+(\.\d+)?$/.test(trimmed)) {
                    const serial = parseFloat(trimmed)
                    // Excel base date aproximada
                    const date = new Date((serial - 25569) * 86400 * 1000)
                    date.setUTCHours(12)
                    return date.toISOString().split('T')[0]
                }

                if (trimmed.includes('/')) {
                    const parts = trimmed.split('/')
                    if (parts.length === 3) {
                        let day: number
                        let month: number
                        let year: number

                        // Tenta identificar onde está o ano (4 dígitos)
                        if (parts[2].length === 4) {
                            // Formato DD/MM/YYYY ou MM/DD/YYYY
                            year = parseInt(parts[2])
                            const p0 = parseInt(parts[0])
                            const p1 = parseInt(parts[1])

                            // Heurística para Dia e Mês
                            if (p1 > 12) {
                                // Se o segundo numero > 12, ele só pode ser DIA (então formato MM/DD/YYYY)
                                month = p0
                                day = p1
                            } else {
                                // Padrão DD/MM/YYYY
                                day = p0
                                month = p1
                            }
                        } else if (parts[0].length === 4) {
                            // Formato YYYY/MM/DD
                            year = parseInt(parts[0])
                            month = parseInt(parts[1])
                            day = parseInt(parts[2])
                        } else {
                            // Assume DD/MM/YY (2 dígitos ano no fim)
                            year = parseInt(parts[2]) + 2000 // Assume século 21
                            const p1 = parseInt(parts[1])
                            if (p1 > 12) {
                                month = parseInt(parts[0])
                                day = p1
                            } else {
                                day = parseInt(parts[0])
                                month = p1
                            }
                        }

                        // Validação básica
                        if (month < 1 || month > 12 || day < 1 || day > 31) return null

                        // Garante formato YYYY-MM-DD
                        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                        // Valida se a data realmente existe (ex: não aceita 30/02)
                        const dateObj = new Date(isoDate)
                        if (isNaN(dateObj.getTime()) || dateObj.toISOString().split('T')[0] !== isoDate) {
                            return null
                        }

                        return isoDate
                    }
                }

                const date = new Date(trimmed)
                if (isNaN(date.getTime())) return null

                return date.toISOString().split('T')[0]
            } catch {
                return null
            }

        case 'cnpj':
            // Remove formatação de CNPJ
            return trimmed.replace(/\D/g, '')

        default:
            return trimmed
    }
}

export function useImportLeads() {
    const queryClient = useQueryClient()
    const { data: org } = useActiveOrganization()
    const { data: permissions } = useUserPermissions()
    const { user } = useAuth()

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

            // Mapa de email -> ID para leads existentes
            const emailToId = new Map<string, string>()

            // Buscar leads existentes (id e email) para verificar duplicados e permitir update
            // Limitando a 10000 para garantir que pegamos a maioria em casos de bases grandes
            // Idealmente isso seria paginado ou filtrado, mas para o escopo atual vamos aumentar o limite
            const { data: existingLeads } = await supabase
                .from('leads')
                .select('id, email')
                .eq('organization_id', org.id)
                .not('email', 'is', null)
                .limit(10000)

            existingLeads?.forEach(lead => {
                if (lead.email) {
                    emailToId.set(lead.email.toLowerCase(), lead.id)
                }
            })

            const leadsToUpsertMap = new Map<string, any>()
            const leadsToInsertWithoutEmail: any[] = []

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowNumber = i + 2 // +2 porque linha 1 é header e começamos em 0

                try {
                    const isSeller = permissions?.userType === 'sales' || org?.role === 'member'
                    const leadData: Record<string, any> = {
                        organization_id: org.id,
                        status: 'novo_lead', // Status padrão
                        source: 'manual', // Fonte padrão para importação
                        priority: 'medium', // Prioridade padrão
                        assignee_id: isSeller ? user?.id : null,
                        assignee_name: isSeller ? (user?.user_metadata?.full_name || user?.email) : null,
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

                    // Definir o título do lead (nome de exibição)
                    // Regra: Nome Fantasia > Razão Social > Outros fallbacks
                    if (!leadData.title) {
                        if (leadData.trade_name) {
                            leadData.title = leadData.trade_name
                        } else if (leadData.legal_name) {
                            leadData.title = leadData.legal_name
                        } else if (leadData.email) {
                            leadData.title = leadData.email.split('@')[0]
                        } else {
                            leadData.title = `Lead importado ${rowNumber}`
                        }
                    }

                    // Verificar se já existe no banco ou no arquivo atual
                    if (leadData.email) {
                        const email = leadData.email.toLowerCase()

                        // Verifica se existe no banco
                        const existingId = emailToId.get(email)

                        // Se existir, adiciona o ID para que o upsert faça update
                        if (existingId) {
                            leadData.id = existingId
                            // Não incrementamos duplicates erro, pois será um update (sucesso)
                        }

                        // Adiciona ao mapa (se já houver no arquivo, sobrescreve - último vence)
                        leadsToUpsertMap.set(email, leadData)
                    } else {
                        // Sem email, sempre insere como novo
                        leadsToInsertWithoutEmail.push(leadData)
                    }

                } catch (error) {
                    result.failed++
                    result.errors.push({
                        row: rowNumber,
                        message: error instanceof Error ? error.message : 'Erro desconhecido'
                    })
                }
            }

            // Combinar todos os leads para processar
            const leadsToProcess = [...leadsToUpsertMap.values(), ...leadsToInsertWithoutEmail]

            // Inserir/Atualizar leads em lotes de 50
            const BATCH_SIZE = 50
            for (let i = 0; i < leadsToProcess.length; i += BATCH_SIZE) {
                const batch = leadsToProcess.slice(i, i + BATCH_SIZE)

                const { data, error } = await supabase
                    .from('leads')
                    .upsert(batch, { onConflict: 'id' }) // Usa ID para conflito (update), ou insere se não tiver ID
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
    { value: 'trade_name', label: 'Nome Fantasia / Título' },
    { value: 'legal_name', label: 'Razão Social' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone Principal' },
    { value: 'secondary_phone', label: 'Telefone Secundário' },
    { value: 'size', label: 'Porte' },
    { value: 'share_capital', label: 'Capital Social' },
    { value: 'opening_date', label: 'Data de Abertura' },
    { value: 'main_activity', label: 'Atividade Principal' },
    { value: 'zip_code', label: 'CEP' },
    { value: 'address', label: 'Logradouro' },
    { value: 'address_number', label: 'Número' },
    { value: 'complement', label: 'Complemento' },
    { value: 'neighborhood', label: 'Bairro' },
    { value: 'city', label: 'Cidade' },
    { value: 'state', label: 'Estado' },
    { value: 'value', label: 'Valor Estimado' },
    { value: 'status', label: 'Status Inicial' },
    { value: 'priority', label: 'Prioridade' },
    { value: 'source', label: 'Origem' },
    { value: 'product_interest', label: 'Produto/Interesse' },
    { value: 'notes', label: 'Notas/Observações' },
]