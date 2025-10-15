import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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

    toast({ title: "Sessão encerrada", description: "Você saiu com sucesso." });
    navigate("/", { replace: true });
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-foreground hover:bg-accent" />
        <h1 className="text-lg sm:text-xl font-bold text-foreground">Sistema MetriCom Flow</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{displayName}</span>
        </div>

        <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}