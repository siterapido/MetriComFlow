/**
 * DashboardSelector - Componente para seleção de tipos de dashboard
 * 
 * Permite ao usuário escolher entre diferentes dashboards de Meta Ads e CRM
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ALL_DASHBOARDS, 
  META_ADS_DASHBOARDS, 
  CRM_DASHBOARDS,
  getDashboardsByCategory,
  type DashboardType,
  type DashboardCategory,
} from "@/lib/dashboardTypes";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";

interface DashboardSelectorProps {
  selectedDashboard?: string;
  onDashboardChange: (dashboardId: string) => void;
  defaultCategory?: DashboardCategory;
}

export function DashboardSelector({
  selectedDashboard,
  onDashboardChange,
  defaultCategory = 'meta-ads',
}: DashboardSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>(defaultCategory);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrar dashboards por categoria e busca
  const filteredDashboards = getDashboardsByCategory(activeCategory).filter((dashboard) =>
    dashboard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dashboard.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Renderizar ícone dinamicamente
  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.TrendingUp;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Selecionar Dashboard</CardTitle>
            <CardDescription className="text-muted-foreground">
              Escolha o tipo de análise que deseja visualizar
            </CardDescription>
          </div>
          <Select
            value={selectedDashboard || ""}
            onValueChange={onDashboardChange}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione um dashboard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance-overview">
                Visão Geral de Performance (Meta Ads)
              </SelectItem>
              {ALL_DASHBOARDS.map((dashboard) => (
                <SelectItem key={dashboard.id} value={dashboard.id}>
                  {dashboard.name} ({dashboard.category === 'meta-ads' ? 'Meta Ads' : 'CRM'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as DashboardCategory)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meta-ads" className="gap-2">
              <LucideIcons.TrendingUp className="w-4 h-4" />
              Meta Ads
            </TabsTrigger>
            <TabsTrigger value="crm" className="gap-2">
              <LucideIcons.Users className="w-4 h-4" />
              CRM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meta-ads" className="mt-4">
            <DashboardGrid
              dashboards={filteredDashboards}
              selectedDashboard={selectedDashboard}
              onDashboardChange={onDashboardChange}
              renderIcon={renderIcon}
            />
          </TabsContent>

          <TabsContent value="crm" className="mt-4">
            <DashboardGrid
              dashboards={filteredDashboards}
              selectedDashboard={selectedDashboard}
              onDashboardChange={onDashboardChange}
              renderIcon={renderIcon}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface DashboardGridProps {
  dashboards: DashboardType[];
  selectedDashboard?: string;
  onDashboardChange: (dashboardId: string) => void;
  renderIcon: (iconName: string) => React.ReactNode;
}

function DashboardGrid({
  dashboards,
  selectedDashboard,
  onDashboardChange,
  renderIcon,
}: DashboardGridProps) {
  if (dashboards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dashboard encontrado
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {dashboards.map((dashboard) => {
        const isSelected = selectedDashboard === dashboard.id;
        return (
          <motion.div
            key={dashboard.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border hover:border-primary/50 hover:shadow-md"
              }`}
              onClick={() => onDashboardChange(dashboard.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {renderIcon(dashboard.icon)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm">
                        {dashboard.name}
                      </h3>
                    </div>
                  </div>
                  {dashboard.popular && (
                    <Badge variant="secondary" className="text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {dashboard.description}
                </p>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 pt-3 border-t border-primary/20"
                  >
                    <Badge variant="default" className="w-full justify-center">
                      Dashboard Ativo
                    </Badge>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}




