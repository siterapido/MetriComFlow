import { Users, LayoutDashboard, FileText, Settings, UsersRound, CreditCard, Share2, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  requiresCRM?: boolean;
  requiresMetrics?: boolean;
  requiresOwner?: boolean;
  requiresForms?: boolean;
}

export const items: NavItem[] = [
  {
    title: "Dashboard Geral",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Leads",
    url: "/leads",
    icon: Users,
    requiresCRM: true,
  },
  {
    title: "Formulários",
    url: "/formularios",
    icon: FileText,
    requiresCRM: true,
    requiresForms: true,
  },
  {
    title: "Gestão de Equipe",
    url: "/equipe",
    icon: UsersRound,
    requiresOwner: true,
  },
  {
    title: "Planos e Assinatura",
    url: "/planos",
    icon: CreditCard,
    requiresOwner: true,
  },
  {
    title: "Meu Perfil",
    url: "/meu-perfil",
    icon: Settings,
  },
  {
    title: "Distribuição",
    url: "/distribuicao",
    icon: Share2,
    requiresOwner: true,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { data: permissions } = useUserPermissions();

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === "collapsed";

  // Filter items based on user permissions
  const visibleItems = items.filter((item) => {
    if (item.requiresOwner && !permissions?.isOwner) return false;
    if (item.requiresCRM && !permissions?.hasCRMAccess) return false;
    if (item.requiresMetrics && !permissions?.hasMetricsAccess) return false;
    if (item.requiresForms && !permissions?.hasFormsAccess) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-sidebar/80 backdrop-blur-xl shadow-2xl">
      <SidebarContent>
        <div className={`py-6 flex items-center justify-between transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-md opacity-40 rounded-lg"></div>
              <div className={`bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center relative z-10 shadow-lg border border-white/10 transition-all duration-300 ${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'}`}>
                <img src="/favicon.ico" alt="Logo" className={`brightness-200 transition-all duration-300 ${isCollapsed ? 'w-5 h-5' : 'w-6 h-6'}`} />
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col animate-fade-in">
                <span className="font-bold text-lg text-white tracking-tight leading-none">InsightFy</span>
                <span className="text-[10px] text-primary font-medium tracking-widest uppercase mt-1">Workspace</span>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-2 transition-all duration-300 ${isCollapsed ? 'px-1' : 'px-2'}`}>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`
                        group relative overflow-hidden transition-all duration-300 rounded-xl h-auto
                        ${isCollapsed ? 'px-2 py-2' : 'px-3 py-3'}
                        ${isActive(item.url)
                        ? "bg-primary/10 text-primary font-semibold shadow-[0_0_15px_rgba(0,191,255,0.15)] border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/10 border border-transparent"
                      }
                    `}
                  >
                    <NavLink to={item.url} className="flex items-center gap-3 w-full">
                      {/* Active Indicator Bar */}
                      {isActive(item.url) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full shadow-[0_0_10px_var(--primary)]" />
                      )}

                      <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive(item.url) ? 'text-primary' : 'group-hover:text-primary'}`} />
                      {!isCollapsed && <span className="text-sm tracking-wide">{item.title}</span>}

                      {/* Hover Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 translate-x-full group-hover:animate-shine" />
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
