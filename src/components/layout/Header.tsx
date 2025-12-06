import { Button } from "@/components/ui/button";
import { LogOut, User, Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { items as navItems } from "@/components/layout/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
    } catch (error) {
      console.warn("Não foi possível limpar a organização ativa do localStorage", error);
    }

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
    <header className="h-20 flex items-center justify-between px-6 gap-4 border-b border-white/5 bg-background/40 backdrop-blur-sm z-20 sticky top-0 transition-all">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-primary hover:bg-white/5" />
        
        <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
        
        <h1 className="text-xl font-semibold text-foreground tracking-tight hidden sm:block">
            {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Organization Switcher - Redesigned? Keeping functional for now but styling wrapper */}
        <div className="hidden md:block">
             <OrganizationSwitcher />
        </div>

        <div className="flex items-center gap-2 pl-2 sm:border-l border-white/10">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-white/5 rounded-full relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_var(--primary)]"></span>
            </Button>
        
            <div className="flex items-center gap-3 pl-2">
                <button
                    type="button"
                    onClick={() => navigate("/meu-perfil")}
                    className="group flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px] shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                         <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                             {/* Avatar placeholder or user image */}
                             <User className="w-5 h-5 text-primary" />
                         </div>
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{displayName}</span>
                        <span className="text-[10px] text-muted-foreground">Admin</span>
                    </div>
                </button>
            </div>
            
             <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full ml-1" 
                onClick={handleSignOut}
                title="Sair"
             >
                <LogOut className="w-5 h-5" />
            </Button>
        </div>
      </div>
    </header>
  );
}
