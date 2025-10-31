import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import SetupAdmin from "./pages/SetupAdmin";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadsLinear from "./pages/LeadsLinear";
import MetaAdsConfig from "./pages/MetaAdsConfig";
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
import FinalizeSignup from "./pages/FinalizeSignup";
import PublicLeadForm from "./pages/PublicLeadForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Auth />} />
            {/* Checkout removido temporariamente para reinimplementação */}
            <Route path="/finalizar-cadastro" element={<FinalizeSignup />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            <Route path="/forms/:formId" element={<PublicLeadForm />} />
            <Route path= "/:orgSlug/:formId" element={<PublicLeadForm />} />
            <Route path= "/:profileSlug/:formSlug" element={<PublicLeadForm />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/update-password" element={<UpdatePassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/leads" element={<LeadsLinear />} />
                <Route path="/leads/kanban" element={<Leads />} />
                <Route path="/formularios" element={<LeadForms />} />
                {/* Rota /metas desabilitada temporariamente */}
                <Route path="/metas" element={<Navigate to="/dashboard" replace />} />
                <Route path="/metas-legacy" element={<Navigate to="/dashboard" replace />} />
                {/* Redireciona /metrics para /meta-ads-config (páginas unificadas) */}
                <Route path="/metrics" element={<Navigate to="/meta-ads-config" replace />} />
                <Route path="/meta-ads-config" element={<MetaAdsConfig />} />
                {/* Nova página unificada de gestão de equipe */}
                <Route path="/equipe" element={<TeamManagement />} />
                {/* Redirects de rotas antigas para nova rota unificada */}
                <Route path="/usuarios" element={<Navigate to="/equipe" replace />} />
                <Route path="/team" element={<Navigate to="/equipe" replace />} />
                {/* Planos e Assinatura */}
                <Route path="/planos" element={<SubscriptionPlans />} />
                <Route path="/meu-perfil" element={<Profile />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
