import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useUpdateOrganizationName } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Save, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizationNameEditorProps {
  className?: string;
  canEdit?: boolean;
  autoSaveDelayMs?: number;
}

export function OrganizationNameEditor({ className, canEdit, autoSaveDelayMs = 800 }: OrganizationNameEditorProps) {
  const { data: org } = useActiveOrganization();
  const { toast } = useToast();
  const updateName = useUpdateOrganizationName();
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);

  const editable = useMemo(() => {
    if (typeof canEdit === "boolean") return canEdit;
    return Boolean(org?.isOwner);
  }, [canEdit, org?.isOwner]);

  useEffect(() => {
    if (org?.name) {
      setValue(org.name);
      setDirty(false);
    }
  }, [org?.name]);

  useEffect(() => {
    if (!editable || !dirty || !value.trim() || (org?.name && value.trim() === org.name)) return;

    const t = setTimeout(() => {
      handleSave();
    }, autoSaveDelayMs);

    return () => clearTimeout(t);
  }, [autoSaveDelayMs, dirty, editable, org?.name, value]);

  const handleSave = () => {
    const newName = value.trim();
    if (!editable || !newName || (org?.name && newName === org.name)) return;

    updateName.mutate(newName, {
      onSuccess: () => {
        toast({ title: "Nome atualizado", description: "O nome da organização foi salvo com sucesso." });
        setDirty(false);
      },
      onError: (err: any) => {
        toast({ title: "Erro ao salvar", description: String(err?.message ?? err), variant: "destructive" });
      },
    });
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex-1 max-w-sm">
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          id="org-name"
          value={value}
          onChange={(e) => { setValue(e.target.value); setDirty(true); }}
          onBlur={() => { if (dirty) handleSave(); }}
          placeholder="Nome da organização"
          className="pl-10 h-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-lg"
          disabled={!editable || updateName.isPending}
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-10 px-4 gap-2 transition-all duration-300",
          dirty ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground opacity-50 pointer-events-none"
        )}
        disabled={!editable || updateName.isPending || !value.trim() || value.trim() === (org?.name ?? "")}
        onClick={handleSave}
      >
        {updateName.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Salvar</span>
      </Button>
    </div>
  );
}

export default OrganizationNameEditor;

