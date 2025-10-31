import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionEventLog } from "@/hooks/useSubscription";

interface SubscriptionTimelineProps {
  events: SubscriptionEventLog[];
}

const EVENT_LABELS: Record<string, string> = {
  plan_change_requested: "Checkout iniciado",
  plan_change_confirmed: "Plano confirmado",
  plan_change_failed: "Falha no checkout",
  payment_failed: "Pagamento falhou",
  payment_recovered: "Pagamento recuperado",
  subscription_canceled: "Cancelamento solicitado",
  subscription_reactivated: "Assinatura reativada",
};

const EVENT_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  plan_change_requested: "secondary",
  plan_change_confirmed: "default",
  plan_change_failed: "destructive",
  payment_failed: "destructive",
  payment_recovered: "secondary",
  subscription_canceled: "outline",
  subscription_reactivated: "default",
};

function formatTimestamp(timestamp: string) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  } catch {
    return timestamp;
  }
}

export function SubscriptionTimeline({ events }: SubscriptionTimelineProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Histórico de Assinatura</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Movimentações do plano aparecerão aqui após upgrades, cancelamentos ou falhas de pagamento.
          </p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => {
              const label = EVENT_LABELS[event.event_type] ?? event.event_type;
              const badgeVariant = EVENT_VARIANTS[event.event_type] ?? "secondary";
              const contextEntries = Object.entries(event.context ?? {}).filter(
                ([, value]) => value !== null && value !== undefined && value !== "",
              );

              return (
                <li key={event.id} className="border-l border-border pl-4 relative">
                  <span className="w-2 h-2 rounded-full bg-primary absolute -left-1 top-2" />
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeVariant}>{label}</Badge>
                    <span className="text-xs text-muted-foreground">{formatTimestamp(event.created_at)}</span>
                  </div>
                  {contextEntries.length > 0 && (
                    <dl className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      {contextEntries.map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1">
                          <dt className="font-medium capitalize">{key.replace(/_/g, " ")}:</dt>
                          <dd className="truncate">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
