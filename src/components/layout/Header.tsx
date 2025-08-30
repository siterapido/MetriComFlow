import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-foreground hover:bg-accent" />
        <h1 className="text-xl font-bold text-foreground">Sistema MetriCom Flow</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Usuário Demo</span>
        </div>
        
        <Button variant="outline" size="sm" className="gap-2">
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}