import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useUserSettings } from "@/hooks/useUserSettings";

export function AppLayout() {
  const { data: settings } = useUserSettings();

  useEffect(() => {
    // Force dark mode as the base for the new theme
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  }, []);

  useEffect(() => {
    if (settings?.ui.language) {
      document.documentElement.lang = settings.ui.language;
    }
  }, [settings?.ui.language]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background items-stretch overflow-hidden relative selection:bg-primary/30 selection:text-primary-foreground">
         {/* Global Background Effects matching Landing Page */}
        <div className="fixed inset-0 bg-mesh opacity-20 pointer-events-none -z-10" />
        <div className="fixed top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03] pointer-events-none -z-10 mix-blend-overlay" />

        <AppSidebar />
        <div className="flex-1 flex flex-col relative z-0 h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="container max-w-[1600px] px-4 sm:px-8 py-8 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
