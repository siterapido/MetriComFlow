import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, RefreshCcw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DistributionRule {
    id: string;
    user_type: string;
    lead_limit: number;
    is_active: boolean;
    active_leads_count?: number; // Calculated on frontend or fetched
}

const USER_TYPE_LABELS: Record<string, string> = {
    owner: "Dono (Admin)",
    sales: "Vendas",
    crm_user: "Usuário CRM",
    traffic_manager: "Gestor de Tráfego",
};

export default function DistributionRules() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [localRules, setLocalRules] = useState<DistributionRule[]>([]);

    // Fetch rules
    const { data: rules, isLoading, isError } = useQuery({
        queryKey: ["distribution_rules"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("distribution_rules")
                .select("*")
                .order("user_type");

            if (error) throw error;
            return data as DistributionRule[];
        },
    });

    // Sync local state when data loads
    useEffect(() => {
        if (rules) {
            setLocalRules(rules);
        }
    }, [rules]);

    // Update rule mutation
    const updateRuleMutation = useMutation({
        mutationFn: async (rule: DistributionRule) => {
            const { error } = await supabase
                .from("distribution_rules")
                .update({
                    lead_limit: rule.lead_limit,
                    is_active: rule.is_active
                })
                .eq("id", rule.id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: "Regra atualizada",
                description: "As configurações de distribuição foram salvas.",
            });
            queryClient.invalidateQueries({ queryKey: ["distribution_rules"] });
        },
        onError: (error) => {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível atualizar a regra: " + error.message,
                variant: "destructive",
            });
        },
    });

    const handleLimitChange = (id: string, value: string) => {
        const numValue = parseInt(value) || 0;
        setLocalRules(prev => prev.map(r => r.id === id ? { ...r, lead_limit: numValue } : r));
    };

    const handleActiveToggle = (id: string, checked: boolean) => {
        const rule = localRules.find(r => r.id === id);
        if (rule) {
            const updatedRule = { ...rule, is_active: checked };
            setLocalRules(prev => prev.map(r => r.id === id ? updatedRule : r));
            updateRuleMutation.mutate(updatedRule);
        }
    };

    const handleSaveLimit = (rule: DistributionRule) => {
        updateRuleMutation.mutate(rule);
    };

    // Helper to ensure 'crm_user' and 'sales' exist in the list even if not in DB yet (could happen if seed failed)
    // In a real scenario, we might want a button to "Add Rule" or ensure DB is seeded.
    // For now, we display what's in the DB.

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Distribuição de Leads</h1>
                <p className="text-muted-foreground">
                    Configure as regras automáticas de distribuição de leads para sua equipe.
                </p>
            </div>

            <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle>Como funcionam os limites</AlertTitle>
                <AlertDescription>
                    Novos leads serão distribuídos automaticamente para usuários do tipo selecionado que tiverem menos leads ativos do que o limite definido.
                    A distribuição ocorre de forma aleatória entre os usuários elegíveis.
                </AlertDescription>
            </Alert>

            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle>Regras por Tipo de Usuário</CardTitle>
                    <CardDescription>Defina o limite máximo de leads ativos por tipo de usuário.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isError ? (
                        <div className="text-red-500 p-4">Erro ao carregar regras. Verifique se a migração foi aplicada.</div>
                    ) : localRules.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            Nenhuma regra encontrada. Contate o suporte para inicializar as configurações.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-white/5 border-white/10">
                                    <TableHead className="text-white">Tipo de Usuário</TableHead>
                                    <TableHead className="text-white">Limite de Leads</TableHead>
                                    <TableHead className="text-white">Status</TableHead>
                                    <TableHead className="text-right text-white">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {localRules.map((rule) => {
                                    const originalRule = rules?.find(r => r.id === rule.id);
                                    const hasChanges = originalRule && (originalRule.lead_limit !== rule.lead_limit);

                                    return (
                                        <TableRow key={rule.id} className="hover:bg-white/5 border-white/10">
                                            <TableCell className="font-medium">
                                                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                                                    {USER_TYPE_LABELS[rule.user_type] || rule.user_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="w-24 bg-black/20 border-white/10"
                                                        value={rule.lead_limit}
                                                        onChange={(e) => handleLimitChange(rule.id, e.target.value)}
                                                    />
                                                    <span className="text-xs text-muted-foreground">leads ativos</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={rule.is_active}
                                                        onCheckedChange={(checked) => handleActiveToggle(rule.id, checked)}
                                                    />
                                                    <span className={`text-sm ${rule.is_active ? 'text-green-400' : 'text-muted-foreground'}`}>
                                                        {rule.is_active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {hasChanges && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => handleSaveLimit(rule)}
                                                        className="bg-primary hover:bg-primary/90"
                                                    >
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Salvar
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
