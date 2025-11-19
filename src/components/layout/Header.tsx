import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { items as navItems } from "@/components/layout/AppSidebar";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const displayName = user?.user_metadata?.full_name || user?.email || "Usuário";

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
    } catch (_e) {}

    toast({ title: "Sessão encerrada", description: "Você saiu com sucesso." });
    navigate("/", { replace: true });
  };

  const deriveTitleFromPath = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return "Início";
    const last = decodeURIComponent(segments[segments.length - 1]).replace(/-/g, " ");
    return last.charAt(0).toUpperCase() + last.slice(1);
  };

  const pageTitle = (navItems.find((i) => i.url === location.pathname)?.title) ?? deriveTitleFromPath(location.pathname);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-medium text-muted-foreground">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <OrganizationSwitcher />
        <button
          type="button"
          onClick={() => navigate("/meu-perfil")}
          className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted rounded-lg hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Ir para minhas configurações"
        >
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{displayName}</span>
        </button>

        <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
