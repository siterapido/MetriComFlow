import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "react-router-dom";

export default function Auth() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center px-4 sm:px-6 py-6">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRlZnM+CjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgo8cGF0aCBkPSJtIDYwIDAgLTYwIDYwIE0gMzAgMzAgbCAzMCAtMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJkYTdmZjEwIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9wYXR0ZXJuPgo8L2RlZnM+CjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz4KPHN2Zz4=')] opacity-30 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl">
            <span className="text-3xl font-bold text-white">I</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">InsightFy</h1>
          <p className="text-muted-foreground">Sistema Interno de Gestão</p>
        </div>

        <div className="space-y-4">
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            Ainda não possui um plano ativo?
            {" "}
            <Link to="/planos" className="text-primary font-semibold hover:underline">
              Comprar plano
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
