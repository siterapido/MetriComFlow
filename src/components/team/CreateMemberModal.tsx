import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserPlus, Eye, EyeOff, Loader2, Check, X, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface CreateMemberModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateMemberModal({
    open,
    onOpenChange,
    onSuccess,
}: CreateMemberModalProps) {
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState<"member" | "admin" | "manager" | "owner">("member");
    const [userType, setUserType] = useState<"sales" | "traffic_manager" | "owner">("sales");
    const [showPassword, setShowPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const validatePassword = (pwd: string) => {
        return {
            minLength: pwd.length >= 8,
            hasUpperCase: /[A-Z]/.test(pwd),
            hasLowerCase: /[a-z]/.test(pwd),
            hasNumber: /[0-9]/.test(pwd),
        };
    };

    const passwordValidation = validatePassword(password);
    const isPasswordValid =
        passwordValidation.minLength &&
        passwordValidation.hasUpperCase &&
        passwordValidation.hasLowerCase &&
        passwordValidation.hasNumber;

    const handleReset = () => {
        setEmail("");
        setPassword("");
        setFullName("");
        setRole("member");
        setUserType("sales");
        setShowPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || !fullName) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha todos os campos do formulário.",
                variant: "destructive",
            });
            return;
        }

        if (!isPasswordValid) {
            toast({
                title: "Senha insuficiente",
                description: "A senha escolhida não atende aos requisitos mínimos de segurança.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sessão expirada. Por favor, faça login novamente.");

            const response = await supabase.functions.invoke("create-team-member", {
                body: {
                    email: email.trim(),
                    password,
                    full_name: fullName.trim(),
                    role,
                    user_type: userType,
                },
            });

            if (response.error) throw new Error(response.error.message || "Falha na comunicação com o servidor");

            const data = response.data as any;
            if (!data.success) throw new Error(data.error || "Não foi possível criar o membro");

            toast({
                title: "Sucesso!",
                description: `${fullName} agora faz parte do seu time.`,
            });

            handleReset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Erro ao criar membro:", error);
            toast({
                title: "Ops! Algo deu errado",
                description: error instanceof Error ? error.message : "Erro desconhecido ao cadastrar membro.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const PasswordCheckItem = ({ label, met }: { label: string; met: boolean }) => (
        <div className={cn("flex items-center gap-2 text-[11px] transition-colors", met ? "text-primary" : "text-muted-foreground")}>
            {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-30" />}
            {label}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass border-primary/20 p-0 overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/5 p-8 border-b border-border/50">
                    <DialogHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-2xl ring-4 ring-primary/5">
                                <UserPlus className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">
                                    Novo Membro
                                </DialogTitle>
                                <DialogDescription className="text-base">
                                    Cadastre um colaborador e defina seus acessos.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-xs uppercase tracking-widest font-bold opacity-70">
                                Nome Completo
                            </Label>
                            <Input
                                id="fullName"
                                placeholder="Ex: João Silva"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs uppercase tracking-widest font-bold opacity-70">
                                Email de Acesso
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs uppercase tracking-widest font-bold opacity-70">
                                Senha Temporária
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={cn(
                                        "h-11 bg-background/50 border-border/50 pr-10 focus:border-primary/50 transition-all",
                                        password && (isPasswordValid ? "border-primary/50" : "border-destructive/50")
                                    )}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {password && (
                                <div className="grid grid-cols-2 gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10 mt-2">
                                    <PasswordCheckItem label="8+ caracteres" met={passwordValidation.minLength} />
                                    <PasswordCheckItem label="Maiúscula" met={passwordValidation.hasUpperCase} />
                                    <PasswordCheckItem label="Minúscula" met={passwordValidation.hasLowerCase} />
                                    <PasswordCheckItem label="Número" met={passwordValidation.hasNumber} />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Privilégios</Label>
                                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                    <SelectTrigger className="h-11 bg-background/50 border-border/50">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-3.5 w-3.5 opacity-50" />
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Membro</SelectItem>
                                        <SelectItem value="manager">Gerente</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="owner">Proprietário</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Atuação</Label>
                                <Select value={userType} onValueChange={(v: any) => setUserType(v)}>
                                    <SelectTrigger className="h-11 bg-background/50 border-border/50">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-3.5 w-3.5 opacity-50" />
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sales">Vendas / CRM</SelectItem>
                                        <SelectItem value="traffic_manager">Tráfego</SelectItem>
                                        <SelectItem value="owner">Acesso Total</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isCreating}
                            className="hover:bg-destructive/10 hover:text-destructive"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isCreating || !email || !password || !fullName || !isPasswordValid}
                            className="bg-primary hover:bg-primary/90 text-white h-11 px-8 shadow-lg shadow-primary/20"
                        >
                            {isCreating ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Finalizar Cadastro"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
