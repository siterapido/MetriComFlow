import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, X } from "lucide-react";
import { toast } from "sonner";

interface QuickLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onContinueAsNew: () => void;
}

export function QuickLoginDialog({
  open,
  onOpenChange,
  email,
  onLogin,
  onContinueAsNew,
}: QuickLoginDialogProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      toast.error("Digite sua senha");
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLogin(email, password);
      if (success) {
        onOpenChange(false);
        setPassword("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsNew = () => {
    onContinueAsNew();
    onOpenChange(false);
    setPassword("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleLogin();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Email já cadastrado
          </DialogTitle>
          <DialogDescription>
            Encontramos uma conta com o email <strong>{email}</strong>.
            Você pode fazer login ou continuar criando uma nova conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-login-email">Email</Label>
            <Input
              id="quick-login-email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-login-password">Senha</Label>
            <Input
              id="quick-login-password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleLogin}
              disabled={isLoading || !password.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fazendo login...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Fazer Login
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleContinueAsNew}
              disabled={isLoading}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Continuar como novo usuário
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Esqueceu sua senha?{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                toast.info("Redirecionando para recuperação de senha...");
                // Aqui você pode implementar a lógica de recuperação de senha
                window.open("/auth/reset-password", "_blank");
              }}
            >
              Clique aqui para recuperá-la
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}