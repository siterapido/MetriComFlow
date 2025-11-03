import { useEffect, useMemo, useState } from "react";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useSetActiveOrganization, useUserOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { ChevronDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OrganizationSwitcher() {
  const { data: activeOrg } = useActiveOrganization();
  const { data: orgs } = useUserOrganizations();
  const setActiveOrg = useSetActiveOrganization();
  const [needsChoice, setNeedsChoice] = useState(false);

  const hasPreference = useMemo(() => {
    try {
      return typeof window !== "undefined" && !!window.localStorage.getItem("activeOrgId");
    } catch (_e) {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!orgs) return;
    // Se usuário possui 2+ organizações e não há preferência salva, pedir escolha uma vez
    if (orgs.length > 1 && !hasPreference) {
      setNeedsChoice(true);
    }
  }, [orgs, hasPreference]);

  const handleSelect = (orgId: string) => {
    setActiveOrg(orgId);
    setNeedsChoice(false);
  };

  if (!activeOrg) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 max-w-[240px] truncate">
            <Building2 className="w-4 h-4" />
            <span className="truncate text-left">{activeOrg.name}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border min-w-[240px]">
          <DropdownMenuLabel>Trocar organização</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(orgs ?? []).map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => handleSelect(o.id)}
              className="cursor-pointer flex items-center justify-between gap-2"
            >
              <span className="truncate">{o.name}</span>
              <span className="text-xs text-muted-foreground">{o.role}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={needsChoice} onOpenChange={setNeedsChoice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha sua organização</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(orgs ?? []).map((o) => (
              <Button key={o.id} variant="outline" className="w-full justify-between" onClick={() => handleSelect(o.id)}>
                <span className="truncate">{o.name}</span>
                <span className="text-xs text-muted-foreground">{o.role}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OrganizationSwitcher;

