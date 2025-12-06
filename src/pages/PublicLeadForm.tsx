import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PublicLeadForm() {
  const { formId } = useParams();
  const { toast } = useToast();

  const { data: formConfig, isLoading } = useQuery({
    queryKey: ['public-form', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_capture_forms')
        .select('*')
        .eq('id', formId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!formId
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const { error } = await supabase.from('leads').insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.message,
        origin: 'Formulário Web',
        status: 'new',
        user_id: formConfig?.user_id
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Seus dados foram enviados com sucesso.",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar seus dados. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-destructive mb-2">Formulário não encontrado</h1>
            <p className="text-muted-foreground">Este formulário não existe ou foi desativado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-mesh opacity-10 pointer-events-none" />
        
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
        >
            <div className="glass-card rounded-3xl overflow-hidden border-white/10 shadow-2xl relative">
                {/* Decorative top bar */}
                <div className="h-2 w-full bg-gradient-to-r from-primary to-secondary"></div>

                <div className="p-8 sm:p-10 bg-card/40 backdrop-blur-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-3">{formConfig.title}</h1>
                        {formConfig.description && (
                            <p className="text-muted-foreground leading-relaxed">{formConfig.description}</p>
                        )}
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground/80">Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Seu nome" {...field} className="bg-background/30 border-white/10 focus:border-primary/50 h-12 rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground/80">Email Profissional</FormLabel>
                                        <FormControl>
                                            <Input placeholder="seu@email.com" {...field} className="bg-background/30 border-white/10 focus:border-primary/50 h-12 rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground/80">WhatsApp</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(00) 00000-0000" {...field} className="bg-background/30 border-white/10 focus:border-primary/50 h-12 rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground/80">Mensagem (Opcional)</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Como podemos ajudar?" 
                                                className="resize-none bg-background/30 border-white/10 focus:border-primary/50 min-h-[100px] rounded-xl" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button 
                                type="submit" 
                                className="w-full h-12 rounded-xl text-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] mt-6 transition-all hover:scale-[1.02]"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        Enviar Solicitação <Send className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>
                
                <div className="bg-black/20 p-4 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        Seus dados estão 100% seguros
                    </p>
                </div>
            </div>
            
            <div className="mt-6 text-center opacity-40 hover:opacity-100 transition-opacity">
                <a href="/" className="text-xs text-white flex items-center justify-center gap-1">
                    Powered by <span className="font-bold">InsightFy</span>
                </a>
            </div>
        </motion.div>
    </div>
  );
}
