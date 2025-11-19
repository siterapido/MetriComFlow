import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const PurchaseSuccessPage = () => {
  const { user } = useAuthContext();
  const [status, setStatus] = useState<"idle"|"finalizing"|"done"|"error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const finalize = async () => {
      if (!sessionId) {
        setStatus("error");
        setMessage("Sessão Stripe inválida.");
        return;
      }
      setStatus("finalizing");
      const { data, error } = await supabase.functions.invoke("finalize-stripe-checkout", {
        body: { sessionId },
      });
      if (error) {
        setStatus("error");
        setMessage("Falha ao confirmar a compra.");
      } else {
        setStatus("done");
        setMessage("Compra confirmada. Enviamos um Magic Link para seu e-mail.");
      }
    };
    void finalize();
  }, []);

  const resend = async () => {
    if (!user?.email) return;
    const { data, error } = await supabase.functions.invoke("resend-magic-link", { body: { email: user.email } });
    if (error) {
      setMessage("Não foi possível reenviar o Magic Link.");
    } else {
      setMessage("Magic Link reenviado. Verifique seu e-mail.");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Compra concluída</h1>
      {status === "finalizing" && <p>Finalizando sua compra…</p>}
      {status === "done" && (
        <div className="space-y-3">
          <p>{message}</p>
          <div className="flex gap-3">
            <a className="bg-gray-100 px-4 py-2 rounded-md" href="https://mail.google.com" target="_blank" rel="noreferrer">Abrir Gmail</a>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md" onClick={() => void resend()}>Reenviar Magic Link</button>
          </div>
        </div>
      )}
      {status === "error" && <p className="text-red-600">{message}</p>}
    </div>
  );
};

export default PurchaseSuccessPage;