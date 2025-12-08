import { useState, useRef, useMemo } from "react";
import { Upload, Loader2, Check, X, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpreadsheetImport, type ColumnMapping } from "@/hooks/useSpreadsheetImport";
import { useToast } from "@/hooks/use-toast";

interface SpreadsheetImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_ganho", label: "Fechado - Ganho" },
  { value: "fechado_perdido", label: "Fechado - Perdido" },
];

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
];

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  email: "E-mail",
  phone: "Telefone",
  source: "Origem",
  description: "Descrição",
  status: "Status",
  value: "Valor",
  // Campos de empresa/CNPJ
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

export function SpreadsheetImporter({
  open,
  onOpenChange,
}: SpreadsheetImporterProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { import: importMutation, undo: undoMutation, processFile, loadInfo, autoMapColumns } = useSpreadsheetImport();

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [defaultStatus, setDefaultStatus] = useState("novo_lead");
  const [defaultSource, setDefaultSource] = useState("manual");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    batch_id: string;
    imported: number;
    skipped: number;
    error_count: number;
  } | null>(null);

  // Resetar estado quando fechar
  const resetState = () => {
    setFile(null);
    setFileName("");
    setSheetNames([]);
    setSelectedSheet("");
    setColumns([]);
    setRows([]);
    setMapping({});
    setError(null);
    setImportResult(null);
    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setProcessing(true);

    try {
      // Carregar informações do arquivo (abas disponíveis)
      const info = await loadInfo(selectedFile);
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setSheetNames(info.sheetNames);
      
      // Se houver apenas uma aba, processar automaticamente
      if (info.sheetNames.length === 1) {
        setSelectedSheet(info.sheetNames[0]);
        await processSheet(selectedFile, info.sheetNames[0]);
      } else {
        // Se houver múltiplas abas, aguardar seleção
        setSelectedSheet("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar arquivo";
      setError(message);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const processSheet = async (fileToProcess: File, sheetName: string) => {
    setProcessing(true);
    setError(null);

    try {
      const processed = await processFile(fileToProcess, sheetName);
      setSelectedSheet(sheetName);
      setColumns(processed.columns);
      setRows(processed.rows);
      
      // Aplicar mapeamento automático automaticamente
      setMapping(processed.mapping);
      
      toast({
        title: "Aba processada",
        description: `Mapeamento automático aplicado para "${sheetName}"`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar aba";
      setError(message);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!file) return;
    await processSheet(file, sheetName);
  };

  // Mapeamento automático calculado
  const autoMapping = useMemo(() => {
    if (columns.length === 0) return {};
    return autoMapColumns(columns);
  }, [columns]);

  // Validar se pode importar
  const canImport = useMemo(() => {
    if (!mapping.title || rows.length === 0) return false;
    const validRows = rows.filter((row) => {
      const titleCol = mapping.title;
      return titleCol && String(row[titleCol] || "").trim();
    });
    return validRows.length > 0;
  }, [mapping, rows]);

  // Contar linhas válidas
  const validRowsCount = useMemo(() => {
    if (!mapping.title) return 0;
    return rows.filter((row) => {
      const titleCol = mapping.title;
      return titleCol && String(row[titleCol] || "").trim();
    }).length;
  }, [mapping, rows]);

  // Pré-visualização das primeiras linhas
  const previewRows = useMemo(() => {
    if (!mapping.title || rows.length === 0) return [];
    return rows
      .filter((row) => {
        const titleCol = mapping.title;
        return titleCol && String(row[titleCol] || "").trim();
      })
      .slice(0, 5);
  }, [mapping, rows]);

  // Campos mapeados para preview
  const previewFields = useMemo(() => {
    const fields: string[] = [];
    if (mapping.title) fields.push("title");
    if (mapping.email) fields.push("email");
    if (mapping.phone) fields.push("phone");
    if (mapping.source) fields.push("source");
    if (mapping.description) fields.push("description");
    if (mapping.value) fields.push("value");
    return fields.slice(0, 6);
  }, [mapping]);

  const handleImport = async () => {
    if (!canImport || !file) return;

    setError(null);
    setProcessing(true);

    try {
      const result = await importMutation.mutateAsync({
        rows,
        mapping,
        fileName,
        defaults: {
          status: defaultStatus,
          source: defaultSource,
        },
      });

      setImportResult({
        batch_id: result.batch_id,
        imported: result.imported,
        skipped: result.skipped,
        error_count: result.error_count,
      });

      toast({
        title: "Importação concluída",
        description: `${result.imported} lead(s) importado(s) com sucesso`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao importar leads";
      setError(message);
      toast({
        title: "Erro na importação",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUndo = async () => {
    if (!importResult) return;

    setProcessing(true);
    try {
      await undoMutation.mutateAsync(importResult.batch_id);
      toast({
        title: "Importação desfeita",
        description: "Os leads importados foram removidos",
      });
      resetState();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao desfazer importação";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    const str = String(value);
    return str.length > 30 ? `${str.slice(0, 27)}...` : str;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !processing) {
        resetState();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Planilha de Leads</DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha CSV ou Excel para importar leads em lote
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {importResult ? (
          <Card>
            <CardHeader>
              <CardTitle>Importação Concluída</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Importados: {importResult.imported}
                </Badge>
                {importResult.skipped > 0 && (
                  <Badge variant="destructive">
                    Ignorados: {importResult.skipped}
                  </Badge>
                )}
                {importResult.error_count > 0 && (
                  <Badge variant="destructive">
                    Erros: {importResult.error_count}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUndo} variant="outline" disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Desfazendo...
                    </>
                  ) : (
                    "Desfazer Importação"
                  )}
                </Button>
                <Button
                  onClick={() => {
                    resetState();
                    onOpenChange(false);
                  }}
                >
                  Concluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Upload */}
            <Card>
              <CardHeader>
                <CardTitle>1. Selecionar Arquivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Selecionar Planilha
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {fileName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{fileName}</span>
                      {rows.length > 0 && (
                        <Badge variant="secondary">{rows.length} linhas</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Seletor de Aba */}
                {sheetNames.length > 1 && (
                  <div className="space-y-2">
                    <Label>Selecione a aba/tabela</Label>
                    <Select
                      value={selectedSheet}
                      onValueChange={handleSheetChange}
                      disabled={processing}
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
                    <p className="text-xs text-muted-foreground">
                      O arquivo possui {sheetNames.length} aba(s). Selecione qual deseja importar.
                    </p>
                  </div>
                )}

                {sheetNames.length === 1 && selectedSheet && (
                  <div className="text-sm text-muted-foreground">
                    <Badge variant="outline">Aba: {selectedSheet}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapeamento */}
            {columns.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle>2. Mapeamento de Colunas</CardTitle>
                      <CardDescription>
                        Associe as colunas da planilha aos campos do CRM. O título é obrigatório.
                        {Object.keys(mapping).length > 0 && (
                          <span className="block mt-1 text-green-600 dark:text-green-400 text-xs">
                            ✓ Mapeamento automático aplicado ({Object.keys(mapping).length} campos)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {columns.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMapping(autoMapping);
                          toast({
                            title: "Mapeamento atualizado",
                            description: "Mapeamento automático reaplicado",
                          });
                        }}
                        className="shrink-0"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Reaplicar Auto
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status Padrão</Label>
                      <Select
                        value={defaultStatus}
                        onValueChange={setDefaultStatus}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Origem Padrão</Label>
                      <Select
                        value={defaultSource}
                        onValueChange={setDefaultSource}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Campos principais */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-muted-foreground">Campos Principais</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      {["title", "email", "phone", "source", "description", "status", "value"].map(
                        (field) => {
                          const isAutoMapped = mapping[field] && autoMapping[field] === mapping[field];
                          return (
                            <div key={field} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label>
                                  {FIELD_LABELS[field] || field}
                                  {field === "title" && " *"}
                                </Label>
                                {isAutoMapped && (
                                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Auto
                                  </Badge>
                                )}
                              </div>
                              <Select
                                value={mapping[field] || "__none__"}
                                onValueChange={(value) => {
                                  setMapping((prev) => ({
                                    ...prev,
                                    [field]: value === "__none__" ? undefined : value,
                                  }));
                                }}
                              >
                                <SelectTrigger className={mapping[field] && isAutoMapped ? "border-green-300 dark:border-green-600" : ""}>
                                  <SelectValue
                                    placeholder={
                                      field === "title"
                                        ? "Selecione (obrigatório)"
                                        : "Não mapear"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {field !== "title" && (
                                    <SelectItem value="__none__">Não mapear</SelectItem>
                                  )}
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Campos de Empresa/CNPJ */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-semibold text-muted-foreground">Dados da Empresa</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      {["cnpj", "razao_social", "nome_fantasia", "porte", "capital_social", "data_abertura", "atividade_principal"].map(
                        (field) => {
                          const isAutoMapped = mapping[field] && autoMapping[field] === mapping[field];
                          return (
                            <div key={field} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label>{FIELD_LABELS[field] || field}</Label>
                                {isAutoMapped && (
                                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Auto
                                  </Badge>
                                )}
                              </div>
                              <Select
                                value={mapping[field] || "__none__"}
                                onValueChange={(value) => {
                                  setMapping((prev) => ({
                                    ...prev,
                                    [field]: value === "__none__" ? undefined : value,
                                  }));
                                }}
                              >
                                <SelectTrigger className={mapping[field] && isAutoMapped ? "border-green-300 dark:border-green-600" : ""}>
                                  <SelectValue placeholder="Não mapear" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Não mapear</SelectItem>
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Contato */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-semibold text-muted-foreground">Contato</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      {["telefone_principal", "telefone_secundario"].map(
                        (field) => {
                          const isAutoMapped = mapping[field] && autoMapping[field] === mapping[field];
                          return (
                            <div key={field} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label>{FIELD_LABELS[field] || field}</Label>
                                {isAutoMapped && (
                                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Auto
                                  </Badge>
                                )}
                              </div>
                              <Select
                                value={mapping[field] || "__none__"}
                                onValueChange={(value) => {
                                  setMapping((prev) => ({
                                    ...prev,
                                    [field]: value === "__none__" ? undefined : value,
                                  }));
                                }}
                              >
                                <SelectTrigger className={mapping[field] && isAutoMapped ? "border-green-300 dark:border-green-600" : ""}>
                                  <SelectValue placeholder="Não mapear" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Não mapear</SelectItem>
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-semibold text-muted-foreground">Endereço</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      {["logradouro", "numero", "complemento", "bairro", "cidade", "estado", "cep"].map(
                        (field) => {
                          const isAutoMapped = mapping[field] && autoMapping[field] === mapping[field];
                          return (
                            <div key={field} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label>{FIELD_LABELS[field] || field}</Label>
                                {isAutoMapped && (
                                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Auto
                                  </Badge>
                                )}
                              </div>
                              <Select
                                value={mapping[field] || "__none__"}
                                onValueChange={(value) => {
                                  setMapping((prev) => ({
                                    ...prev,
                                    [field]: value === "__none__" ? undefined : value,
                                  }));
                                }}
                              >
                                <SelectTrigger className={mapping[field] && isAutoMapped ? "border-green-300 dark:border-green-600" : ""}>
                                  <SelectValue placeholder="Não mapear" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Não mapear</SelectItem>
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {mapping.title && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>
                          {validRowsCount} de {rows.length} linhas válidas para importação
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pré-visualização */}
            {previewRows.length > 0 && previewFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Pré-visualização</CardTitle>
                  <CardDescription>
                    Primeiras 5 linhas que serão importadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewFields.map((field) => (
                            <TableHead key={field}>
                              {FIELD_LABELS[field] || field}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, idx) => (
                          <TableRow key={idx}>
                            {previewFields.map((field) => {
                              const col = mapping[field];
                              return (
                                <TableCell key={field}>
                                  {formatValue(col ? row[col] : null)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <DialogFooter>
          {!importResult && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  resetState();
                  onOpenChange(false);
                }}
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!canImport || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${validRowsCount} lead(s)`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

