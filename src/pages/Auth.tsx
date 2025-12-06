import { useEffect } from "react";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Effects matching Landing Page */}
      <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />
      
      {/* Animated Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] -z-10 animate-float" style={{ animationDelay: "2s" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <img src="/favicon.ico" alt="InsightFy" className="w-8 h-8 brightness-200" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Bem-vindo de volta</h1>
            <p className="text-muted-foreground">Acesse sua dashboard de inteligência</p>
        </div>

        <div className="glass-card rounded-3xl p-1 border-white/10 shadow-2xl relative overflow-hidden">
             {/* Top accent line */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
             
             <div className="bg-card/50 backdrop-blur-sm rounded-[20px] p-6 sm:p-8">
                <Button 
                    variant="ghost" 
                    className="mb-6 -ml-4 text-muted-foreground hover:text-white hover:bg-white/5" 
                    onClick={() => navigate("/")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Home
                </Button>

                <SupabaseAuth
                    supabaseClient={supabase}
                    appearance={{
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: 'hsl(195, 100%, 50%)', // Neon Primary
                                brandAccent: 'hsl(195, 100%, 40%)',
                                brandButtonText: 'hsl(222, 47%, 11%)', // Dark Text on Neon Button
                                defaultButtonBackground: 'transparent',
                                defaultButtonBackgroundHover: 'rgba(255,255,255,0.05)',
                                defaultButtonBorder: 'rgba(255,255,255,0.1)',
                                defaultButtonText: 'white',
                                dividerBackground: 'rgba(255,255,255,0.1)',
                                inputBackground: 'rgba(0,0,0,0.2)',
                                inputBorder: 'rgba(255,255,255,0.1)',
                                inputBorderHover: 'hsl(195, 100%, 50%)',
                                inputBorderFocus: 'hsl(195, 100%, 50%)',
                                inputText: 'white',
                                inputLabelText: '#94a3b8',
                                inputPlaceholder: '#475569',
                            },
                            radii: {
                                borderRadiusButton: '12px',
                                buttonBorderRadius: '12px',
                                inputBorderRadius: '12px',
                            },
                        },
                    },
                    className: {
                        container: 'space-y-4',
                        button: 'h-12 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                        input: 'h-12 bg-background/50 border-white/10 focus:ring-2 focus:ring-primary/20 transition-all',
                        label: 'text-sm font-medium text-muted-foreground',
                        anchor: 'text-primary hover:text-primary/80 transition-colors',
                    }
                    }}
                    localization={{
                    variables: {
                        sign_in: {
                            email_label: 'Seu email corporativo',
                            password_label: 'Sua senha',
                            button_label: 'Entrar na plataforma',
                        },
                    },
                    }}
                    providers={[]}
                />
             </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
            Protegido por criptografia de ponta a ponta.
        </p>
      </motion.div>
    </div>
  );
}
