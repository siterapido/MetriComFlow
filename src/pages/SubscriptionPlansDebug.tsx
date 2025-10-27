import { useSubscriptionPlans, useCurrentSubscription, useOrganizationPlanLimits } from "@/hooks/useSubscription";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

export default function SubscriptionPlansDebug() {
  const { data: org, isLoading: orgLoading, error: orgError } = useActiveOrganization();
  const { data: plans, isLoading: plansLoading, error: plansError } = useSubscriptionPlans();
  const { data: currentSub, isLoading: subLoading, error: subError } = useCurrentSubscription();
  const { data: limits, isLoading: limitsLoading, error: limitsError } = useOrganizationPlanLimits();

  return (
    <div className="p-6 space-y-6 bg-background text-foreground">
      <h1 className="text-3xl font-bold">🔍 Subscription Debug</h1>

      <div className="space-y-4">
        {/* Organization */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">1. Organization</h2>
          <p>Loading: {orgLoading ? "YES ⏳" : "NO"}</p>
          <p>Error: {orgError ? JSON.stringify(orgError) : "None ✅"}</p>
          <p>Data: {org ? `${org.name} (${org.id})` : "No data"}</p>
        </div>

        {/* Plans */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">2. Subscription Plans</h2>
          <p>Loading: {plansLoading ? "YES ⏳" : "NO"}</p>
          <p>Error: {plansError ? JSON.stringify(plansError) : "None ✅"}</p>
          <p>Data: {plans ? `${plans.length} plans found` : "No data"}</p>
          {plans && (
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify(plans, null, 2)}
            </pre>
          )}
        </div>

        {/* Current Subscription */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">3. Current Subscription</h2>
          <p>Loading: {subLoading ? "YES ⏳" : "NO"}</p>
          <p>Error: {subError ? JSON.stringify(subError) : "None ✅"}</p>
          <p>Data: {currentSub ? `Found (${currentSub.id})` : "No data"}</p>
          {currentSub && (
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify(currentSub, null, 2)}
            </pre>
          )}
        </div>

        {/* Limits */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">4. Organization Plan Limits</h2>
          <p>Loading: {limitsLoading ? "YES ⏳" : "NO"}</p>
          <p>Error: {limitsError ? JSON.stringify(limitsError) : "None ✅"}</p>
          <p>Data: {limits ? "Found ✅" : "No data"}</p>
          {limits && (
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify(limits, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div className="p-4 border-2 border-primary rounded-lg">
        <h2 className="text-xl font-semibold mb-2">📊 Summary</h2>
        <p>✅ Tudo OK = Todos devem estar com "Loading: NO" e "Error: None"</p>
        <p>⏳ Travando = Se algum está "Loading: YES" por mais de 5 segundos</p>
        <p>❌ Erro = Se algum mostra erro, copie e cole no chat</p>
      </div>
    </div>
  );
}
