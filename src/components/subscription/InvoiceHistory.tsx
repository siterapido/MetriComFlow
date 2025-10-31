import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Download,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PaymentMethodInfo = {
  type: string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  wallet_type?: string | null;
};

interface StripePaymentSummary {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  receipt_url: string | null;
  payment_intent_id: string | null;
  charge_id: string | null;
  payment_method: PaymentMethodInfo | null;
}

interface Payment {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  receiptUrl: string | null;
  paymentIntentId: string | null;
  chargeId: string | null;
  paymentMethod: PaymentMethodInfo | null;
}

interface InvoiceHistoryProps {
  subscriptionId?: string;
}

export function InvoiceHistory({ subscriptionId }: InvoiceHistoryProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["subscription-payments", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return [];

      let warning: string | null = null;
      const payments: Payment[] = [];

      const mapStripePayment = (payment: StripePaymentSummary): Payment => ({
        id: payment.id,
        number: payment.number ?? null,
        amount: typeof payment.amount === "number" ? payment.amount : 0,
        currency: (payment.currency ?? "BRL").toUpperCase(),
        status: (payment.status ?? "open").toLowerCase(),
        dueDate: payment.due_date ?? null,
        paidAt: payment.paid_at ?? null,
        createdAt: payment.created_at ?? null,
        hostedInvoiceUrl: payment.hosted_invoice_url ?? null,
        invoicePdfUrl: payment.invoice_pdf_url ?? null,
        receiptUrl: payment.receipt_url ?? null,
        paymentIntentId: payment.payment_intent_id ?? null,
        chargeId: payment.charge_id ?? null,
        paymentMethod: payment.payment_method ?? null,
      });

      const mapLegacyPayment = (payment: any): Payment => {
        const amount =
          typeof payment.amount === "number"
            ? payment.amount
            : Number(payment.amount ?? 0);

        const method =
          typeof payment.payment_method === "string" && payment.payment_method.length > 0
            ? ({
                type: payment.payment_method.toLowerCase(),
              } as PaymentMethodInfo)
            : null;

        return {
          id: payment.id,
          number: payment.stripe_invoice_id ?? null,
          amount,
          currency: (payment.currency ?? "BRL").toUpperCase(),
          status: (payment.status ?? "open").toLowerCase(),
          dueDate: payment.due_date ?? null,
          paidAt: payment.payment_date ?? null,
          createdAt: payment.created_at ?? null,
          hostedInvoiceUrl: payment.stripe_hosted_invoice_url ?? payment.asaas_invoice_url ?? null,
          invoicePdfUrl: null,
          receiptUrl: payment.stripe_receipt_url ?? null,
          paymentIntentId: payment.stripe_payment_intent_id ?? null,
          chargeId: null,
          paymentMethod: method,
        };
      };

      try {
        const response = await supabase.functions.invoke("list-stripe-payments", {
          body: { subscriptionId },
        });

        if (response.error) {
          throw new Error(response.error.message ?? "Falha ao buscar pagamentos via Stripe.");
        }

        const payload = (response.data ?? {}) as {
          payments?: StripePaymentSummary[];
          warning?: string | null;
        };

        payments.push(...(payload.payments ?? []).map(mapStripePayment));
        warning = payload.warning ?? null;
      } catch (stripeError) {
        console.error("Falha ao consultar Stripe, usando dados locais:", stripeError);
        warning =
          "Não foi possível conectar à Stripe agora. Exibindo últimos registros sincronizados.";

        const { data: legacyPayments, error: legacyError } = await supabase
          .from("subscription_payments")
          .select("*")
          .eq("subscription_id", subscriptionId)
          .order("due_date", { ascending: false })
          .limit(10);

        if (legacyError) {
          throw legacyError;
        }

        payments.push(...(legacyPayments ?? []).map(mapLegacyPayment));
      }

      // Ensure deterministic order: newest by due date/created
      const sorted = [...payments].sort((a, b) => {
        const left = new Date(a.dueDate ?? a.createdAt ?? 0).getTime();
        const right = new Date(b.dueDate ?? b.createdAt ?? 0).getTime();
        return right - left;
      });

      return {
        payments: sorted,
        warning,
      };
    },
    enabled: !!subscriptionId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  const payments = data?.payments ?? [];
  const warning = data?.warning ?? null;

  const getStatusConfig = (status: string) => {
    const normalized = status?.toLowerCase?.() ?? "";
    const configs: Record<
      string,
      { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any; color: string }
    > = {
      paid: {
        label: "Pago",
        variant: "default",
        icon: CheckCircle,
        color: "text-success",
      },
      open: {
        label: "Em aberto",
        variant: "secondary",
        icon: Clock,
        color: "text-muted-foreground",
      },
      draft: {
        label: "Rascunho",
        variant: "outline",
        icon: Info,
        color: "text-muted-foreground",
      },
      void: {
        label: "Cancelado",
        variant: "outline",
        icon: XCircle,
        color: "text-muted-foreground",
      },
      uncollectible: {
        label: "Inadimplente",
        variant: "destructive",
        icon: AlertCircle,
        color: "text-destructive",
      },
      past_due: {
        label: "Em atraso",
        variant: "destructive",
        icon: AlertTriangle,
        color: "text-destructive",
      },
      upcoming: {
        label: "Próxima cobrança",
        variant: "secondary",
        icon: Clock,
        color: "text-muted-foreground",
      },
    };

    return configs[normalized] ?? {
      label: status || "Desconhecido",
      variant: "secondary",
      icon: Info,
      color: "text-muted-foreground",
    };
  };

  const getPaymentMethodLabel = (method: PaymentMethodInfo | null) => {
    if (!method || !method.type) {
      return "Não especificado";
    }

    if (method.type === "card") {
      const brand = method.brand ? method.brand.toUpperCase() : "Cartão";
      const last4 = method.last4 ? `•••• ${method.last4}` : "";
      return `${brand}${last4 ? ` · ${last4}` : ""}`;
    }

    if (method.type === "boleto") {
      return "Boleto Bancário";
    }

    if (method.type === "pix") {
      return "PIX";
    }

    return method.type;
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Não foi possível carregar os dados da Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-center text-sm text-destructive">
            {(error as Error)?.message ?? "Tente novamente em instantes."}
          </p>
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Histórico de Pagamentos
            </CardTitle>
            <CardDescription>
              {payments.length} {payments.length === 1 ? "pagamento" : "pagamentos"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCcw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Atualizando" : "Atualizar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      {warning && (
        <CardContent className="pt-0 pb-2">
          <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning-foreground">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <span>{warning}</span>
          </div>
        </CardContent>
      )}
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
                      {payment.number && (
                        <Badge variant="outline" className="text-xs font-medium">
                          Fatura #{payment.number}
                        </Badge>
                      )}
                      {payment.paymentMethod && (
                        <Badge variant="outline" className="gap-1">
                          <CreditCard className="w-3 h-3" />
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {payment.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Vencimento:{" "}
                            {format(new Date(payment.dueDate), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      )}

                      {payment.paidAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span>
                            Pago em:{" "}
                            {format(new Date(payment.paidAt), "dd/MM/yyyy", {
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
                      {formatCurrency(payment.amount, {
                        currency: payment.currency === "USD" ? "USD" : "BRL",
                      })}
                    </div>

                    {(payment.hostedInvoiceUrl || payment.invoicePdfUrl || payment.receiptUrl) && (
                      <div className="space-y-2">
                        {payment.hostedInvoiceUrl && (
                          <Button size="sm" variant="outline" asChild className="w-full">
                            <a
                              href={payment.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Ver Fatura
                            </a>
                          </Button>
                        )}
                        {!payment.hostedInvoiceUrl && payment.invoicePdfUrl && (
                          <Button size="sm" variant="outline" asChild className="w-full">
                            <a
                              href={payment.invoicePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Baixar Fatura
                            </a>
                          </Button>
                        )}
                        {payment.receiptUrl && (
                          <Button size="sm" variant="ghost" asChild className="w-full">
                            <a
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Ver Recibo
                            </a>
                          </Button>
                        )}
                      </div>
                    )}

                    {payment.paymentIntentId && (
                      <p className="text-xs text-muted-foreground">
                        Payment Intent: {payment.paymentIntentId}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {isFetching && (
          <div className="text-xs text-muted-foreground text-center">Atualizando…</div>
        )}
      </CardContent>
    </Card>
  );
}
