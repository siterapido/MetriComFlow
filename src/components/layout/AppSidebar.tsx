import { BarChart3, Users, LayoutDashboard, TrendingUp, FileText, Settings, UsersRound, CreditCard, type LucideIcon } from "lucide-react";
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
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  requiresCRM?: boolean;
  requiresMetrics?: boolean;
  requiresOwner?: boolean;
}

const items: NavItem[] = [
  {
    title: "Leads",
    url: "/leads",
    icon: Users,
    requiresCRM: true,
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
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { data: permissions } = useUserPermissions();

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === "collapsed";

  const visibleItems = items.filter((item) => {
    if (item.requiresOwner && !permissions?.isOwner) return false;
    if (item.requiresCRM && !permissions?.hasCRMAccess) return false;
    if (item.requiresMetrics && !permissions?.hasMetricsAccess) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup className="pt-4">
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
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
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex justify-center w-full">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
