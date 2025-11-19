import { useEffect } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const PosLoginPage = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      if (user) navigate("/dashboard", { replace: true });
    }, 1000);
    return () => clearTimeout(t);
  }, [user, navigate]);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Acesso concedido</h1>
      <p>Você está autenticado. Redirecionando para o painel…</p>
      <a className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-md" href="/dashboard">Ir para o Dashboard</a>
    </div>
  );
};

export default PosLoginPage;