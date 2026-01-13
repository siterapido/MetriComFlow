import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const displayName = user?.user_metadata?.full_name || user?.email || "Usuário";

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/leads")) return "CRM - Pipeline";
    if (path === "/equipe") return "Gestão de Equipe";
    if (path === "/planos") return "Planos e Assinatura";
    if (path === "/meu-perfil") return "Meu Perfil";
    return "InsightFy";
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message || "Tente novamente em instantes",
        variant: "destructive",
      });
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('activeOrgId');
      }
    } catch (_e) { }

    toast({ title: "Sessão encerrada", description: "Você saiu com sucesso." });
    navigate("/", { replace: true });
  };

  return (
    <header className="h-14 bg-background/80 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 sm:px-6 gap-3 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-border/40">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-sm">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <h1 className="text-sm font-bold text-foreground">{getPageTitle()}</h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">InsightFy</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <OrganizationSwitcher />
        <div className="w-px h-6 bg-border/40 mx-1" />
        <button
          type="button"
          onClick={() => navigate("/meu-perfil")}
          className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
          title="Minhas configurações"
        >
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground/80">{displayName.split(' ')[0]}</span>
        </button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          onClick={handleSignOut}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sair
        </Button>
      </div>
    </header>
  );
}
