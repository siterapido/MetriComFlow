import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useUserSettings } from "@/hooks/useUserSettings";

export function AppLayout() {
  const { data: settings } = useUserSettings();

  useEffect(() => {
    const theme = settings?.ui.theme ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
    document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";
  }, [settings?.ui.theme]);

  useEffect(() => {
    if (settings?.ui.language) {
      document.documentElement.lang = settings.ui.language;
    }
  }, [settings?.ui.language]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background items-stretch">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto">
            <div className="container px-4 sm:px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
