import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Calendar, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Payment {
  id: string;
  asaas_payment_id: string | null;
  asaas_invoice_url: string | null;
  stripe_invoice_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_hosted_invoice_url?: string | null;
  stripe_receipt_url?: string | null;
  amount: number;
  payment_method: string | null;
  status: string;
  due_date: string;
  payment_date: string | null;
  created_at: string;
}

interface InvoiceHistoryProps {
  subscriptionId?: string;
}

export function InvoiceHistory({ subscriptionId }: InvoiceHistoryProps) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["subscription-payments", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return [];

      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("due_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!subscriptionId,
  });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; variant: string; icon: any; color: string }> = {
      PENDING: {
        label: "Pendente",
        variant: "secondary",
        icon: Clock,
        color: "text-muted-foreground",
      },
      CONFIRMED: {
        label: "Confirmado",
        variant: "default",
        icon: CheckCircle,
        color: "text-primary",
      },
      RECEIVED: {
        label: "Pago",
        variant: "default",
        icon: CheckCircle,
        color: "text-success",
      },
      OVERDUE: {
        label: "Vencido",
        variant: "destructive",
        icon: XCircle,
        color: "text-destructive",
      },
      REFUNDED: {
        label: "Reembolsado",
        variant: "secondary",
        icon: AlertCircle,
        color: "text-warning",
      },
      CANCELLED: {
        label: "Cancelado",
        variant: "outline",
        icon: XCircle,
        color: "text-muted-foreground",
      },
    };

    return configs[status] || configs.PENDING;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      CREDIT_CARD: "Cartão de Crédito",
      CARD: "Cartão (Stripe)",
      card: "Cartão (Stripe)",
      BOLETO: "Boleto Bancário",
      DEBIT_CARD: "Cartão de Débito",
    };

    return method ? labels[method] || method : "Não especificado";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Seus pagamentos aparecerão aqui</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Histórico de Pagamentos
        </CardTitle>
        <CardDescription>
          {payments.length} {payments.length === 1 ? "pagamento" : "pagamentos"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.map((payment) => {
          const statusConfig = getStatusConfig(payment.status);
          const StatusIcon = statusConfig.icon;

          return (
            <Card
              key={payment.id}
              className="border-border hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Payment Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig.variant as any} className="gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                      {payment.payment_method && (
                        <Badge variant="outline" className="gap-1">
                          <CreditCard className="w-3 h-3" />
                          {getPaymentMethodLabel(payment.payment_method)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Vencimento:{" "}
                          {format(new Date(payment.due_date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      {payment.payment_date && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span>
                            Pago em:{" "}
                            {format(new Date(payment.payment_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount and Actions */}
                  <div className="text-right space-y-2">
                    <div className="text-xl font-bold text-foreground">
                      {formatCurrency(payment.amount)}
                    </div>

                    {(payment.stripe_hosted_invoice_url || payment.stripe_receipt_url || payment.asaas_invoice_url) && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="w-full"
                      >
                        <a
                          href={
                            payment.stripe_hosted_invoice_url ||
                            payment.stripe_receipt_url ||
                            payment.asaas_invoice_url ||
                            "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Ver Fatura
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
