import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import * as XLSX from "xlsx"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { type LeadImportPayload } from "@/hooks/useLeads"
import { useLeadImportMappings, useImportLeadsWithReport, useUndoLeadImport } from "@/hooks/useLeadImports"

const STATUS_OPTIONS = [
  { value: "novo_lead", label: "Novo lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_ganho", label: "Fechado (ganho)" },
  { value: "fechado_perdido", label: "Fechado (perdido)" },
  { value: "follow_up", label: "Follow-up" },
  { value: "aguardando_resposta", label: "Aguardando resposta" },
]

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "google_ads", label: "Google Ads" },
  { value: "site", label: "Site" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "indicacao", label: "Indicação" },
  { value: "evento", label: "Evento" },
]

const MAPPING_FIELDS = [
  { id: "title", label: "Título", hint: "Nome da oportunidade", required: true },
  { id: "email", label: "E-mail", hint: "Contato do lead" },
  { id: "phone", label: "Telefone", hint: "Contato do lead" },
  { id: "description", label: "Descrição", hint: "Notas ou contexto" },
  { id: "status", label: "Status", hint: "Etapas do funil" },
  { id: "value", label: "Valor total", hint: "Usado nos dashboards" },
  { id: "contract_value", label: "Valor do contrato" },
  { id: "contract_months", label: "Meses (contratos mensais)" },
  { id: "contract_type", label: "Tipo de contrato" },
  { id: "priority", label: "Prioridade" },
  { id: "source", label: "Origem" },
  { id: "product_interest", label: "Produto/serviço de interesse" },
  { id: "lead_source_detail", label: "Detalhe da origem" },
  { id: "expected_close_date", label: "Data prevista de fechamento" },
  { id: "next_follow_up_date", label: "Próximo follow-up" },
  { id: "last_contact_date", label: "Último contato" },
  { id: "lead_score", label: "Lead score" },
  { id: "conversion_probability", label: "Probabilidade de conversão" },
  { id: "campaign_id", label: "Campanha (ID)" },
  { id: "external_lead_id", label: "ID externo" },
  { id: "adset_id", label: "Adset ID" },
  { id: "adset_name", label: "Adset (nome)" },
  { id: "ad_id", label: "Ad ID" },
  { id: "ad_name", label: "Ad (nome)" },
  { id: "closed_won_at", label: "Data de ganho" },
  { id: "closed_lost_at", label: "Data de perda" },
  { id: "lost_reason", label: "Motivo da perda" },
  { id: "due_date", label: "Data de vencimento" },
] as const

type MappableLeadField = (typeof MAPPING_FIELDS)[number]["id"]

type ColumnMapping = Partial<Record<MappableLeadField, string>>

const FIELD_GUESS_PATTERNS: Record<MappableLeadField, string[]> = {
  title: ["nome", "titulo", "title", "lead"],
  email: ["email", "e-mail", "mail"],
  phone: ["telefone", "phone", "celular", "whatsapp"],
  description: ["descricao", "description", "notes", "context"],
  status: ["status", "etapa", "fase", "stage"],
  value: ["valor", "value", "amount", "investment"],
  contract_value: ["contract_value", "valor contrato", "contrato valor"],
  contract_months: ["contract_months", "meses", "months"],
  contract_type: ["tipo contrato", "contract_type"],
  priority: ["prioridade", "priority"],
  source: ["origem", "source"],
  product_interest: ["produto", "product_interest"],
  lead_source_detail: ["lead_source_detail", "origem detalhe", "channel"],
  expected_close_date: ["expected_close_date", "previsao", "fechamento"],
  next_follow_up_date: ["next_follow_up_date", "follow"],
  last_contact_date: ["last_contact_date", "ultimo contato"],
  lead_score: ["lead_score", "score"],
  conversion_probability: ["conversion_probability", "probabilidade", "conversion"],
  campaign_id: ["campaign_id", "campanha", "campaign"],
  external_lead_id: ["external_lead_id", "id externo", "external"],
  adset_id: ["adset_id"],
  adset_name: ["adset_name", "nome adset", "conjunto"],
  ad_id: ["ad_id"],
  ad_name: ["ad_name", "nome ad", "anuncio"],
  closed_won_at: ["closed_won_at", "ganho", "win"],
  closed_lost_at: ["closed_lost_at", "perdido", "lost"],
  lost_reason: ["lost_reason", "motivo", "reason"],
  due_date: ["due_date", "vencimento"],
}

const STATUS_ALIAS: Record<string, string> = {
  novo_lead: "novo_lead",
  novo: "novo_lead",
  qualificacao: "qualificacao",
  qualificacao_lead: "qualificacao",
  qualificação: "qualificacao",
  proposta: "proposta",
  negociacao: "negociacao",
  negociação: "negociacao",
  fechado_ganho: "fechado_ganho",
  ganho: "fechado_ganho",
  fechado_perdido: "fechado_perdido",
  perdido: "fechado_perdido",
  follow_up: "follow_up",
  follow: "follow_up",
  aguardando_resposta: "aguardando_resposta",
  aguardando: "aguardando_resposta",
}

const PRIORITY_ALIAS: Record<string, "low" | "medium" | "high" | "urgent"> = {
  baixa: "low",
  low: "low",
  media: "medium",
  médio: "medium",
  medium: "medium",
  alta: "high",
  high: "high",
  urgente: "urgent",
  urgent: "urgent",
}

const SOURCE_ALIAS: Record<string, string> = {
  manual: "manual",
  meta_ads: "meta_ads",
  meta: "meta_ads",
  whatsapp: "whatsapp",
  google_ads: "google_ads",
  google: "google_ads",
  site: "site",
  website: "site",
  email: "email",
  telefone: "telefone",
  phone: "telefone",
  indicacao: "indicacao",
  referencia: "indicacao",
  evento: "evento",
  event: "evento",
}

const CONTRACT_TYPE_ALIAS: Record<string, "monthly" | "annual" | "one_time"> = {
  mensal: "monthly",
  month: "monthly",
  monthly: "monthly",
  anual: "annual",
  anualy: "annual",
  annual: "annual",
  unico: "one_time",
  único: "one_time",
  once: "one_time",
  "one time": "one_time",
}

const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const normalizeKey = (value?: string | null) => {
  if (!value) return ""
  return stripAccents(value.toLowerCase()).replace(/[\s-]+/g, "_")
}

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === "number" && Number.isFinite(value)) return value
  const text = String(value).trim()
  if (!text) return undefined
  const hasComma = text.includes(",")
  const hasDot = text.includes(".")
  let normalized = text.replace(/[^\d.,-]/g, "")

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".")
  } else if (hasComma) {
    normalized = normalized.replace(/,/g, ".")
  }

  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? undefined : parsed
}

const parseInteger = (value: unknown): number | undefined => {
  const parsed = parseNumber(value)
  if (parsed === undefined) return undefined
  return Math.round(parsed)
}

const parseDateValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed && parsed.y && parsed.m) {
      return new Date(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H,
        parsed.M,
        parsed.S
      ).toISOString()
    }
  }
  const cast = new Date(String(value).trim())
  if (!Number.isNaN(cast.getTime())) return cast.toISOString()
  return undefined
}

const normalizeStatus = (value?: string | null): string | undefined => {
  const canonical = normalizeKey(value)
  if (!canonical) return undefined
  return STATUS_ALIAS[canonical] ?? canonical
}

const normalizePriority = (
  value?: string | null
): "low" | "medium" | "high" | "urgent" | undefined => {
  const canonical = normalizeKey(value)
  if (!canonical) return undefined
  return PRIORITY_ALIAS[canonical]
}

const normalizeSource = (value?: string | null, fallback?: string) => {
  const canonical = normalizeKey(value)
  if (!canonical) return fallback
  return SOURCE_ALIAS[canonical] ?? fallback
}

const normalizeContractType = (
  value?: string | null
): "monthly" | "annual" | "one_time" | undefined => {
  const canonical = normalizeKey(value)
  if (!canonical) return undefined
  return CONTRACT_TYPE_ALIAS[canonical]
}

const clampPercentage = (value: number) => {
  if (Number.isNaN(value)) return undefined
  return Math.max(0, Math.min(100, value))
}

const toText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined
  const text = String(value).trim()
  return text || undefined
}

const formatPreviewValue = (value: unknown) => {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR").format(value)
  }
  const text = String(value)
  return text.length > 35 ? `${text.slice(0, 32)}…` : text
}

interface LeadsImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadsImportDialog({ open, onOpenChange }: LeadsImportDialogProps) {
  const { data: org } = useActiveOrganization()
  const importLeadsReport = useImportLeadsWithReport()
  const undoImport = useUndoLeadImport()
  const mappings = useLeadImportMappings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetName, setSheetName] = useState<string>("")
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<ColumnMapping>({})
  const [parseError, setParseError] = useState<string | null>(null)
  const [defaultStatus, setDefaultStatus] = useState(STATUS_OPTIONS[0].value)
  const [defaultSource, setDefaultSource] = useState(SOURCE_OPTIONS[0].value)
  const [isParsing, setIsParsing] = useState(false)
  const [metaAds, setMetaAds] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mappingName, setMappingName] = useState("")
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null)
  const [importReport, setImportReport] = useState<{ batch_id: string; imported: number; skipped: number; error_count: number } | null>(null)

  const sheetNames = useMemo(() => workbook?.SheetNames ?? [], [workbook])
  const [step, setStep] = useState<number>(1)
  const readyStep1 = useMemo(() => {
    const hasFile = Boolean(selectedFileName) && parsedRows.length > 0
    const hasTitle = Boolean(columnMap.title)
    const hasEmail = Boolean(columnMap.email)
    const hasPhone = Boolean(columnMap.phone)
    const hasSource = Boolean(columnMap.source || defaultSource)
    return hasFile && hasTitle && hasEmail && hasPhone && hasSource
  }, [selectedFileName, parsedRows.length, columnMap.title, columnMap.email, columnMap.phone, columnMap.source, defaultSource])

  const resetState = useCallback(() => {
    setWorkbook(null)
    setParsedRows([])
    setAvailableColumns([])
    setColumnMap({})
    setSheetName("")
    setSelectedFileName(null)
    setParseError(null)
    setDefaultStatus(STATUS_OPTIONS[0].value)
    setDefaultSource(SOURCE_OPTIONS[0].value)
    setIsParsing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      setStep(1)
    }
  }, [open, resetState])

  const parseSheetData = useCallback(
    (name: string) => {
      if (!workbook) return
      const worksheet = workbook.Sheets[name]
      if (!worksheet) {
        setParseError("Não foi possível carregar a aba selecionada.")
        setParsedRows([])
        setAvailableColumns([])
        return
      }

      setParseError(null)
      setIsParsing(true)

      try {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: undefined,
          raw: false,
          cellDates: true,
        })

        setParsedRows(rows)

        const columns = new Set<string>()
        rows.forEach((row) => {
          Object.keys(row).forEach((column) => {
            if (column) columns.add(column)
          })
        })

        setAvailableColumns([...columns].sort((a, b) => a.localeCompare(b, "pt-BR")))
      } catch (error) {
        console.error("[LeadsImportDialog] Falha ao ler a aba:", error)
        setParseError("Não foi possível interpretar os dados dessa aba.")
        setParsedRows([])
        setAvailableColumns([])
      } finally {
        setIsParsing(false)
      }
    },
    [workbook]
  )

  useEffect(() => {
    if (!workbook) {
      setSheetName("")
      return
    }
    const firstSheet = workbook.SheetNames[0]
    if (!firstSheet) {
      setSheetName("")
      setParsedRows([])
      setAvailableColumns([])
      setParseError("O arquivo não possui aba visível.")
      setIsParsing(false)
      return
    }
    setSheetName(firstSheet)
    parseSheetData(firstSheet)
    setStep(1)
  }, [workbook, parseSheetData])

  useEffect(() => {
    if (!availableColumns.length) return
    setColumnMap((prev) => {
      const next = { ...prev };
      (Object.keys(FIELD_GUESS_PATTERNS) as MappableLeadField[]).forEach(
        (field) => {
          if (next[field]) return
          const patterns = FIELD_GUESS_PATTERNS[field] ?? []
          const match = availableColumns.find((column) =>
            patterns.some((pattern) =>
              column.toLowerCase().includes(pattern.toLowerCase())
            )
          )
          if (match) {
            next[field] = match
          }
        }
      )
      return next
    });
  }, [availableColumns])

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFileName(file.name)
    setParseError(null)
    setIsParsing(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      setWorkbook(workbook)
    } catch (error) {
      console.error("[LeadsImportDialog] Erro ao ler arquivo:", error)
      setParseError("Não foi possível ler o arquivo selecionado.")
      setWorkbook(null)
      setParsedRows([])
      setAvailableColumns([])
      setIsParsing(false)
    } finally {
      event.target.value = ""
    }
  }

  const getColumnValue = useCallback((field: MappableLeadField, row: Record<string, unknown>) => {
    const columnKey = columnMap[field]
    if (!columnKey) return undefined
    return row[columnKey]
  }, [columnMap])

  const normalizedRows = useMemo(() => {
    if (!parsedRows.length) return []

    return parsedRows
      .map((row) => {
        const title = toText(getColumnValue("title", row))
        if (!title) return null

        const payload: LeadImportPayload & Partial<Record<"email"|"phone"|"adset_name"|"ad_name", string>> = { title }

        const description = toText(getColumnValue("description", row))
        if (description) payload.description = description

        payload.status =
          normalizeStatus(toText(getColumnValue("status", row))) ?? defaultStatus
        payload.source = normalizeSource(
          toText(getColumnValue("source", row)),
          defaultSource
        )

        const parsedValue = parseNumber(getColumnValue("value", row))
        if (parsedValue !== undefined) payload.value = parsedValue

        const contractValue = parseNumber(getColumnValue("contract_value", row))
        if (contractValue !== undefined) payload.contract_value = contractValue

        const contractMonths = parseInteger(
          getColumnValue("contract_months", row)
        )
        if (contractMonths !== undefined) payload.contract_months = contractMonths

        const contractType = normalizeContractType(
          toText(getColumnValue("contract_type", row))
        )
        if (contractType) payload.contract_type = contractType

        const priority = normalizePriority(
          toText(getColumnValue("priority", row))
        )
        if (priority) payload.priority = priority

        if (org?.id) {
          payload.organization_id = org.id
        }

        const expectedClose = parseDateValue(
          getColumnValue("expected_close_date", row)
        )
        if (expectedClose) payload.expected_close_date = expectedClose

        const nextFollowUp = parseDateValue(
          getColumnValue("next_follow_up_date", row)
        )
        if (nextFollowUp) payload.next_follow_up_date = nextFollowUp

        const lastContact = parseDateValue(
          getColumnValue("last_contact_date", row)
        )
        if (lastContact) payload.last_contact_date = lastContact

        const dueDate = parseDateValue(getColumnValue("due_date", row))
        if (dueDate) payload.due_date = dueDate

        const leadScore = parseInteger(getColumnValue("lead_score", row))
        if (leadScore !== undefined) payload.lead_score = clampPercentage(leadScore)

        const conversion = parseNumber(
          getColumnValue("conversion_probability", row)
        )
        if (conversion !== undefined)
          payload.conversion_probability = clampPercentage(conversion)

        const productInterest = toText(
          getColumnValue("product_interest", row)
        )
        if (productInterest) payload.product_interest = productInterest

        const sourceDetail = toText(getColumnValue("lead_source_detail", row))
        if (sourceDetail) payload.lead_source_detail = sourceDetail

        const campaign = toText(getColumnValue("campaign_id", row))
        if (campaign) payload.campaign_id = campaign

        const externalLead = toText(getColumnValue("external_lead_id", row))
        if (externalLead) payload.external_lead_id = externalLead

        const adset = toText(getColumnValue("adset_id", row))
        if (adset) payload.adset_id = adset

        const ad = toText(getColumnValue("ad_id", row))
        if (ad) payload.ad_id = ad

        const email = toText(getColumnValue("email", row))
        if (email) (payload as any).email = email
        const phone = toText(getColumnValue("phone", row))
        if (phone) (payload as any).phone = phone
        const adsetName = toText(getColumnValue("adset_name", row))
        if (adsetName) (payload as any).adset_name = adsetName
        const adName = toText(getColumnValue("ad_name", row))
        if (adName) (payload as any).ad_name = adName

        const closedWon = parseDateValue(getColumnValue("closed_won_at", row))
        if (closedWon) payload.closed_won_at = closedWon

        const closedLost = parseDateValue(
          getColumnValue("closed_lost_at", row)
        )
        if (closedLost) payload.closed_lost_at = closedLost

        const lostReason = toText(getColumnValue("lost_reason", row))
        if (lostReason) payload.lost_reason = lostReason

        return payload
      })
      .filter(Boolean) as LeadImportPayload[]
  }, [
    parsedRows,
    getColumnValue,
    defaultStatus,
    defaultSource,
    org?.id,
  ])

  const previewFields = useMemo(
    () =>
      MAPPING_FIELDS.filter((field) => columnMap[field.id] && ["title","email","phone","source","campaign_id","adset_id","ad_id"].includes(field.id)).slice(0, 6),
    [columnMap]
  )

  const previewRows = normalizedRows.slice(0, 3)
  const totalRows = parsedRows.length
  const validRows = normalizedRows.length
  const skippedRows = Math.max(totalRows - validRows, 0)
  const canImport = validRows > 0 && Boolean(org?.id)

  const handleImport = () => {
    if (!canImport) return
    const mapping_json: Record<string, string> = {}
    Object.entries(columnMap).forEach(([field, col]) => {
      if (col) mapping_json[field] = col as string
    })
    importLeadsReport.mutate(
      {
        rows: parsedRows,
        mapping_json,
        defaults: { status: defaultStatus, source: defaultSource },
        source_file: { name: selectedFileName ?? undefined, sheet_name: sheetName || undefined },
        mode: "full",
      },
      {
        onSuccess: (data) => {
          setImportReport({ batch_id: data.batch_id, imported: data.imported, skipped: data.skipped, error_count: data.error_count })
        },
      }
    )
  }

  const handleImportAndAdvance = () => {
    if (!canImport) return
    const mapping_json: Record<string, string> = {}
    Object.entries(columnMap).forEach(([field, col]) => {
      if (col) mapping_json[field] = col as string
    })
    importLeadsReport.mutate(
      {
        rows: parsedRows,
        mapping_json,
        defaults: { status: defaultStatus, source: defaultSource },
        source_file: { name: selectedFileName ?? undefined, sheet_name: sheetName || undefined },
        mode: "basic_only",
      },
      {
        onSuccess: (data) => {
          setImportReport({ batch_id: data.batch_id, imported: data.imported, skipped: data.skipped, error_count: data.error_count })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Importar planilha de leads</DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha, mapeie as colunas para o CRM e
            crie leads em lote com o registro correto.
          </DialogDescription>
          <div className="text-xs text-muted-foreground">Etapa {step} de 3</div>
        </DialogHeader>

        {parseError ? (
          <Alert className="mb-4">
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        ) : null}

        {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Escolha o arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
              >
                {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Selecionar planilha
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.ods"
                className="hidden"
                onChange={handleFileSelection}
              />
              <span className="text-sm text-muted-foreground">
                {selectedFileName ?? "Nenhum arquivo selecionado"}
              </span>
            </div>

            {sheetNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Aba
                  </Label>
                  <Select
                    value={sheetName}
                    onValueChange={(value) => {
                      setSheetName(value)
                      parseSheetData(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma aba" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-sm text-muted-foreground">
                  {parsedRows.length} linha{parsedRows.length !== 1 && "s"} detectada
                  {parsedRows.length !== 1 && "s"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Mapeie as colunas</CardTitle>
            <CardDescription>
              Associe cada campo do CRM a uma coluna da planilha. O título é
              obrigatório.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status padrão</Label>
                <Select
                  value={defaultStatus}
                  onValueChange={(value) => setDefaultStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Será usado quando a coluna estiver vazia ou com valor inválido.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Origem padrão</Label>
                <Select
                  value={defaultSource}
                  onValueChange={(value) => setDefaultSource(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Mapeamentos salvos</Label>
                  <Select
                    value={selectedMappingId ?? "__none__"}
                    onValueChange={(value) => {
                      const id = value === "__none__" ? null : value
                      setSelectedMappingId(id)
                      const found = mappings.list.data?.find((m) => m.id === id)
                      if (found) {
                        const next: ColumnMapping = {}
                        Object.entries(found.mapping_json).forEach(([field, col]) => {
                          next[field as MappableLeadField] = col as string
                        })
                        setColumnMap(next)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um mapeamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {(mappings.list.data ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Salvar mapeamento</Label>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    placeholder="Nome do mapeamento"
                    value={mappingName}
                    onChange={(e) => setMappingName(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!mappingName || !Object.keys(columnMap).length) return
                      const mapping_json: Record<string, string> = {}
                      Object.entries(columnMap).forEach(([field, col]) => {
                        if (col) mapping_json[field] = col as string
                      })
                      mappings.save.mutate({ name: mappingName, mapping_json })
                      setMappingName("")
                    }}
                  >
                    Salvar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Armazena mapeamentos usados com frequência para futuras importações.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {MAPPING_FIELDS.filter((f)=>["title","email","phone","source"].includes(f.id)).map((field) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-semibold">
                      {field.label}
                      {field.required && " *"}
                    </Label>
                    {field.hint && (
                      <span className="text-xs text-muted-foreground">
                        {field.hint}
                      </span>
                    )}
                  </div>
                  <Select
                    value={columnMap[field.id] ?? "__ignore__"}
                    onValueChange={(value) =>
                      setColumnMap((prev) => ({
                        ...prev,
                        [field.id]: value === "__ignore__" ? undefined : (value as string),
                      }))
                    }
                    disabled={!availableColumns.length}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          field.required ? "Selecione a coluna" : "Ignorar"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {!field.required && (
                        <SelectItem value="__ignore__">Não importar</SelectItem>
                      )}
                      {availableColumns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {!showAdvanced && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={()=>setShowAdvanced(true)}>Mostrar mais opções</Button>
              </div>
            )}
            {showAdvanced && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Opções avançadas</Label>
                  </div>
                  <Button variant="ghost" onClick={()=>setShowAdvanced(false)}>Ocultar opções</Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {MAPPING_FIELDS.filter((f)=>!["title","email","phone","source"].includes(f.id)).map((field) => (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-semibold">
                          {field.label}
                          {field.required && " *"}
                        </Label>
                        {field.hint && (
                          <span className="text-xs text-muted-foreground">
                            {field.hint}
                          </span>
                        )}
                      </div>
                      <Select
                        value={columnMap[field.id] ?? "__ignore__"}
                        onValueChange={(value) =>
                          setColumnMap((prev) => ({
                            ...prev,
                            [field.id]: value === "__ignore__" ? undefined : (value as string),
                          }))
                        }
                        disabled={!availableColumns.length}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              field.required ? "Selecione a coluna" : "Ignorar"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {!field.required && (
                            <SelectItem value="__ignore__">Não importar</SelectItem>
                          )}
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}

        {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2.1 Origem — Meta Ads</CardTitle>
            <CardDescription>Marque se os leads vieram de Meta Ads e mapeie campos específicos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm">Lead veio de Meta Ads</Label>
              <input type="checkbox" checked={metaAds} onChange={(e)=>setMetaAds(e.target.checked)} />
            </div>
            {metaAds && (
              <div className="grid gap-4 md:grid-cols-2">
                {(["campaign_id","adset_id","adset_name","ad_id","ad_name"] as MappableLeadField[]).map((field)=> (
                  <div key={field} className="space-y-1">
                    <Label className="text-sm font-semibold">{MAPPING_FIELDS.find(f=>f.id===field)?.label}</Label>
                    <Select
                      value={columnMap[field] ?? "__ignore__"}
                      onValueChange={(value) =>
                        setColumnMap((prev) => ({
                          ...prev,
                          [field]: value === "__ignore__" ? undefined : (value as string),
                        }))
                      }
                      disabled={!availableColumns.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">Não importar</SelectItem>
                        {availableColumns.map((column) => (
                          <SelectItem key={column} value={column}>
                            {column}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Visualize e importe</CardTitle>
            <CardDescription>
              Confira quantas linhas estão prontas e veja uma prévia dos dados
              mapeados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Linhas detectadas: {totalRows}
              </Badge>
              <Badge variant="secondary">Prontas: {validRows}</Badge>
              {skippedRows > 0 ? (
                <Badge variant="destructive">Ignoradas: {skippedRows}</Badge>
              ) : null}
            </div>

            {previewFields.length > 0 && previewRows.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewFields.map((field) => (
                        <TableHead key={field.label}>{field.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, index) => (
                      <TableRow key={index}>
                        {previewFields.map((field) => (
                          <TableCell key={`${index}-${field.id}`}>
                            {formatPreviewValue(row[field.id])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {MAPPING_FIELDS.filter((field) => columnMap[field.id])
                  .length > 6 && (
                  <p className="text-xs text-muted-foreground">
                    Exibindo até seis campos mapeados. Os demais campos também
                    serão importados.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Mapeie ao menos um campo para visualizar a prévia.
              </p>
            )}
          </CardContent>
        </Card>
        )}

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importLeadsReport.isLoading}>Cancelar</Button>
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={!readyStep1}>Avançar</Button>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)}>Avançar</Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleImport} disabled={!canImport || importLeadsReport.isLoading}>
                {importLeadsReport.isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>) : (`Importar ${validRows} lead${validRows === 1 ? "" : "s"}`)}
              </Button>
              <Button variant="secondary" onClick={handleImportAndAdvance} disabled={!canImport || importLeadsReport.isLoading}>Importar e avançar</Button>
            </>
          )}
        </DialogFooter>
        {importReport ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Importados: {importReport.imported}</Badge>
              {importReport.skipped > 0 && (
                <Badge variant="destructive">Ignorados: {importReport.skipped}</Badge>
              )}
              {importReport.error_count > 0 && (
                <Badge variant="destructive">Erros: {importReport.error_count}</Badge>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  undoImport.mutate(importReport.batch_id, {
                    onSuccess: () => {
                      setImportReport(null)
                      resetState()
                      onOpenChange(false)
                    },
                  })
                }}
              >
                Desfazer importação
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setImportReport(null)
                  resetState()
                  onOpenChange(false)
                }}
              >
                Concluir
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
