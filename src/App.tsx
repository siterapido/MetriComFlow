import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import OwnerRoute from "@/components/auth/OwnerRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import SetupAdmin from "./pages/SetupAdmin";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadsLinear from "./pages/LeadsLinear";
// import LeadImports from "./pages/LeadImports"; // Desabilitado temporariamente
// import LeadImportDetails from "./pages/LeadImportDetails"; // Desabilitado temporariamente
import Users from "./pages/Users";
import LeadForms from "./pages/LeadForms";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import AuthCallback from "./pages/AuthCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Profile from "./pages/Profile";
import Team from "./pages/Team";
import TeamManagement from "./pages/TeamManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import DistributionRules from "./pages/DistributionRules";
import FinalizeSignup from "./pages/FinalizeSignup";
import PublicLeadForm from "./pages/PublicLeadForm";
import PurchasePage from "./pages/PurchasePage";
import PurchaseSuccessPage from "./pages/PurchaseSuccessPage";
import PurchaseCancelPage from "./pages/PurchaseCancelPage";
import PurchaseCancelPage from "./pages/PurchaseCancelPage";
import PosLoginPage from "./pages/PosLoginPage";
import Organizations from "./pages/Organizations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Auth />} />
              {/* Checkout removido temporariamente para reinimplementação */}
              <Route path="/finalizar-cadastro" element={<FinalizeSignup />} />
              <Route path="/pos-login" element={<PosLoginPage />} />
              <Route path="/setup-admin" element={<SetupAdmin />} />
              <Route path="/forms/:formId" element={<PublicLeadForm />} />
              {/* Slug pair must come BEFORE orgSlug/formId to avoid misrouting */}
              <Route path="/:profileSlug/:formSlug" element={<PublicLeadForm />} />
              <Route path="/:orgSlug/:formId" element={<PublicLeadForm />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/update-password" element={<UpdatePassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/comprar" element={<PurchasePage />} />
                  <Route path="/compra/sucesso" element={<PurchaseSuccessPage />} />
                  <Route path="/compra/cancelada" element={<PurchaseCancelPage />} />
                  <Route path="/dashboard" element={<OwnerRoute><Dashboard /></OwnerRoute>} />
                  <Route path="/leads" element={<LeadsLinear />} />
                  <Route path="/leads/kanban" element={<Leads />} />
                  {/* Rotas de importação desabilitadas temporariamente */}
                  {/* <Route path="/leads/importacoes" element={<LeadImports />} /> */}
                  {/* <Route path="/leads/importacoes/:batchId" element={<LeadImportDetails />} /> */}
                  <Route path="/formularios" element={<LeadForms />} />
                  {/* Rota /metas desabilitada temporariamente */}
                  <Route path="/metas" element={<Navigate to="/leads" replace />} />
                  <Route path="/metas-legacy" element={<Navigate to="/leads" replace />} />
                  {/* Rotas de métricas desativadas - redireciona para o pipeline de leads */}
                  <Route path="/metricas" element={<Navigate to="/leads" replace />} />
                  <Route path="/meta-ads-config" element={<Navigate to="/leads" replace />} />
                  <Route path="/metrics" element={<Navigate to="/leads" replace />} />
                  {/* Nova página unificada de gestão de equipe */}
                  <Route path="/equipe" element={<OwnerRoute><TeamManagement /></OwnerRoute>} />
                  <Route path="/organizacoes" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
                  {/* Redirects de rotas antigas para nova rota unificada */}
                  <Route path="/usuarios" element={<Navigate to="/equipe" replace />} />
                  <Route path="/team" element={<Navigate to="/equipe" replace />} />
                  {/* Planos e Assinatura */}
                  <Route path="/planos" element={<OwnerRoute><SubscriptionPlans /></OwnerRoute>} />
                  <Route path="/distribuicao" element={<OwnerRoute><DistributionRules /></OwnerRoute>} />
                  <Route path="/meu-perfil" element={<Profile />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
