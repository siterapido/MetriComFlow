import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2, ShieldCheck } from "lucide-react";

export default function SetupAdmin() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      // Usar domínio dedicado de funções para evitar falhas no /functions/v1
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const functionsBase = supabaseUrl.replace(".supabase.co", ".functions.supabase.co");
      const resp = await fetch(`${functionsBase}/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const json = await resp.json();

      if (!resp.ok) {
        setError(json?.error || "Falha ao criar admin");
      } else {
        setMessage(json?.message || "Admin criado com sucesso.");
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao criar admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 py-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Configurar Primeiro Admin</CardTitle>
          </div>
          <CardDescription>
            Esta ação só é permitida quando ainda não existe nenhum usuário com o papel <span className="font-semibold">admin</span>.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            {message && (
              <div className="text-sm text-green-600">{message}</div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate("/")}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando
                </>
              ) : (
                "Criar Admin"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}