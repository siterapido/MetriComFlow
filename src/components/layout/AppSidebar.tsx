import { BarChart3, Users, Target, LayoutDashboard, Settings, TrendingUp, UserCog } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  requiresCRM?: boolean;
  requiresMetrics?: boolean;
  requiresOwner?: boolean;
}

const items: NavItem[] = [
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
    title: "Metas dos Clientes",
    url: "/metas",
    icon: Target,
    requiresMetrics: true,
  },
  {
    title: "Métricas Meta Ads",
    url: "/meta-ads-config",
    icon: TrendingUp,
    requiresMetrics: true,
  },
  {
    title: "Usuários",
    url: "/usuarios",
    icon: UserCog,
    requiresOwner: true,
  },
  {
    title: "Meu Perfil",
    url: "/meu-perfil",
    icon: Settings,
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
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-sidebar-foreground">MetriCom</h2>
                <p className="text-xs text-sidebar-foreground/60">Flow System</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
