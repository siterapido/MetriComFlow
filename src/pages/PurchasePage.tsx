import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionPlans } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";

const PurchasePage = () => {
  const navigate = useNavigate();
  const { data: plans, isLoading, error } = useSubscriptionPlans();
  const sortedPlans = useMemo(() => (plans ?? []).slice().sort((a, b) => a.display_order - b.display_order), [plans]);

  const handleCheckout = async (planSlug: string) => {
    const origin = window.location.origin.replace(/\/$/, "");
    const successUrl = `${origin}/compra/sucesso?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/compra/cancelada`;
    const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
      body: { planSlug, successUrl, cancelUrl },
    });
    if (error || !data?.checkoutUrl) return;
    window.location.href = data.checkoutUrl as string;
  };

  if (isLoading) return <div className="p-6">Carregando planos…</div>;
  if (error) return <div className="p-6 text-red-600">Erro ao carregar planos.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedPlans.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-4 flex flex-col">
            <h2 className="text-lg font-medium">{plan.name}</h2>
            <p className="text-sm text-gray-600 mb-2">R$ {plan.price}/mês</p>
            <ul className="text-sm text-gray-700 mb-4 list-disc pl-5">
              {(plan.features ?? []).slice(0, 5).map((f, i) => (<li key={i}>{f}</li>))}
            </ul>
            <button
              className="mt-auto bg-blue-600 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={() => void handleCheckout(plan.slug)}
            >
              Comprar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchasePage;