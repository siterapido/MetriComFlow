import { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowRight,
    ArrowLeft,
    Loader2,
} from "lucide-react";
import {
    parseCSV,
    useImportLeads,
    AVAILABLE_FIELDS,
    type ParsedData,
    type FieldMapping,
    type ImportResult,
} from "@/hooks/useImportLeads";

interface LeadImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "mapping" | "result";

export function LeadImportModal({ open, onOpenChange }: LeadImportModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const importMutation = useImportLeads();

    const resetState = useCallback(() => {
        setStep("upload");
        setParsedData(null);
        setMappings([]);
        setResult(null);
        setError(null);
        setIsLoading(false);
        setIsDragging(false);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onOpenChange(false);
    }, [resetState, onOpenChange]);

    const handleFileSelect = async (file: File) => {
        if (!file.name.endsWith(".csv")) {
            setError("Por favor, selecione um arquivo CSV válido");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await parseCSV(file);
            setParsedData(data);
            setMappings(data.mappings);
            setStep("mapping");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const updateMapping = (csvColumn: string, newDbField: string | null) => {
        setMappings((prev) =>
            prev.map((m) =>
                m.csvColumn === csvColumn
                    ? { ...m, dbField: newDbField, confidence: "manual" as const }
                    : m
            )
        );
    };

    const handleImport = async () => {
        if (!parsedData) return;

        setIsLoading(true);
        try {
            const importResult = await importMutation.mutateAsync({
                rows: parsedData.rows,
                mappings,
            });
            setResult(importResult);
            setStep("result");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro na importação");
        } finally {
            setIsLoading(false);
        }
    };

    const getConfidenceBadge = (confidence: FieldMapping["confidence"]) => {
        switch (confidence) {
            case "high":
                return (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Alta
                    </Badge>
                );
            case "medium":
                return (
                    <Badge variant="secondary" className="bg-yellow-500 text-black">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Média
                    </Badge>
                );
            case "low":
                return (
                    <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" /> Baixa
                    </Badge>
                );
            case "manual":
                return (
                    <Badge variant="outline">
                        Manual
                    </Badge>
                );
        }
    };

    const mappedFieldsCount = mappings.filter((m) => m.dbField).length;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Importar Leads
                    </DialogTitle>
                </DialogHeader>

                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div
                        className={`flex items-center gap-1 ${step === "upload" ? "text-primary font-medium" : "text-muted-foreground"
                            }`}
                    >
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                        >
                            1
                        </div>
                        <span className="text-sm">Upload</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div
                        className={`flex items-center gap-1 ${step === "mapping" ? "text-primary font-medium" : "text-muted-foreground"
                            }`}
                    >
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "mapping" ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                        >
                            2
                        </div>
                        <span className="text-sm">Mapeamento</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div
                        className={`flex items-center gap-1 ${step === "result" ? "text-primary font-medium" : "text-muted-foreground"
                            }`}
                    >
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "result" ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                        >
                            3
                        </div>
                        <span className="text-sm">Resultado</span>
                    </div>
                </div>

                {/* Step: Upload */}
                {step === "upload" && (
                    <div className="space-y-4">
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragging
                                    ? "border-primary bg-primary/5"
                                    : "border-muted-foreground/25 hover:border-primary/50"
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleInputChange}
                                className="hidden"
                            />
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                                    <p className="text-muted-foreground">Processando arquivo...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-lg font-medium mb-2">
                                        Arraste seu arquivo CSV aqui
                                    </p>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        ou clique para selecionar
                                    </p>
                                    <Button variant="secondary" size="sm">
                                        Selecionar arquivo
                                    </Button>
                                </>
                            )}
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium mb-1">Dica:</p>
                            <p>
                                O sistema reconhecerá automaticamente colunas com nomes como:{" "}
                                <span className="font-mono text-xs">
                                    Nome, Email, Telefone, Valor, Empresa
                                </span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Step: Mapping */}
                {step === "mapping" && parsedData && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {parsedData.rows.length} linhas encontradas •{" "}
                                {mappedFieldsCount} de {mappings.length} colunas mapeadas
                            </p>
                            <Progress
                                value={(mappedFieldsCount / mappings.length) * 100}
                                className="w-32"
                            />
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Coluna CSV</TableHead>
                                        <TableHead className="w-[150px]">Exemplo</TableHead>
                                        <TableHead className="w-[100px]">Confiança</TableHead>
                                        <TableHead>Campo no Sistema</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mappings.map((mapping) => (
                                        <TableRow key={mapping.csvColumn}>
                                            <TableCell className="font-medium">
                                                {mapping.csvColumn}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground truncate max-w-[150px]">
                                                {mapping.sampleValue || "-"}
                                            </TableCell>
                                            <TableCell>{getConfidenceBadge(mapping.confidence)}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={mapping.dbField || "none"}
                                                    onValueChange={(value) =>
                                                        updateMapping(
                                                            mapping.csvColumn,
                                                            value === "none" ? null : value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-[200px]">
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            <span className="text-muted-foreground">
                                                                (Ignorar coluna)
                                                            </span>
                                                        </SelectItem>
                                                        {AVAILABLE_FIELDS.map((field) => (
                                                            <SelectItem key={field.value} value={field.value}>
                                                                {field.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Preview */}
                        {parsedData.rows.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">
                                    Preview (primeiras 3 linhas):
                                </p>
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {parsedData.headers.map((h) => (
                                                    <TableHead key={h} className="text-xs">
                                                        {h}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {parsedData.rows.slice(0, 3).map((row, i) => (
                                                <TableRow key={i}>
                                                    {parsedData.headers.map((h) => (
                                                        <TableCell key={h} className="text-xs truncate max-w-[150px]">
                                                            {row[h] || "-"}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                {/* Step: Result */}
                {step === "result" && result && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                <p className="text-2xl font-bold text-green-500">{result.success}</p>
                                <p className="text-sm text-muted-foreground">Importados</p>
                            </div>
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                                <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                                <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                                <p className="text-sm text-muted-foreground">Falhas</p>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                                <p className="text-2xl font-bold text-yellow-500">
                                    {result.duplicates}
                                </p>
                                <p className="text-sm text-muted-foreground">Duplicados</p>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">
                                    Erros ({result.errors.length}):
                                </p>
                                <div className="border rounded-lg max-h-40 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-20">Linha</TableHead>
                                                <TableHead>Erro</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {result.errors.slice(0, 20).map((err, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-mono">{err.row}</TableCell>
                                                    <TableCell className="text-destructive text-sm">
                                                        {err.message}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {result.errors.length > 20 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        ... e mais {result.errors.length - 20} erros
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === "upload" && (
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                    )}

                    {step === "mapping" && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setStep("upload")}
                                disabled={isLoading}
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Voltar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={isLoading || mappedFieldsCount === 0}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        Importar {parsedData?.rows.length || 0} leads
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </Button>
                        </>
                    )}

                    {step === "result" && (
                        <>
                            <Button variant="outline" onClick={resetState}>
                                Importar outro arquivo
                            </Button>
                            <Button onClick={handleClose}>Concluir</Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
