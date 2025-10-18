import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import SetupAdmin from "./pages/SetupAdmin";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Metas from "./pages/Metas";
import MetaAdsConfig from "./pages/MetaAdsConfig";
import MetricsPage from "./pages/MetricsPage";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import AuthCallback from "./pages/AuthCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";

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
            <Route path="/" element={<Auth />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/update-password" element={<UpdatePassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/metas" element={<Metas />} />
                <Route path="/metrics" element={<MetricsPage />} />
                <Route path="/meta-ads-config" element={<MetaAdsConfig />} />
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
