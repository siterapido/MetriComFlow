import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useUpdateOrganizationName } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

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
    // Fallback: allow owners to edit (based on hook data)
    return Boolean(org?.isOwner);
  }, [canEdit, org?.isOwner]);

  useEffect(() => {
    if (org?.name) {
      setValue(org.name);
      setDirty(false);
    }
  }, [org?.name]);

  // Debounced auto-save when user pauses typing
  useEffect(() => {
    if (!editable) return;
    if (!dirty) return;
    if (!value.trim()) return;
    if (org?.name && value.trim() === org.name) return;

    const t = setTimeout(() => {
      void updateName.mutateAsync(value.trim()).then(() => {
        toast({ title: "Nome atualizado", description: "Aplicado em CRM, formulários e perfis." });
        setDirty(false);
      }).catch((err: any) => {
        toast({ title: "Erro ao salvar", description: String(err?.message ?? err), variant: "destructive" });
      });
    }, autoSaveDelayMs);

    return () => clearTimeout(t);
  }, [autoSaveDelayMs, dirty, editable, org?.name, toast, updateName, value]);

  const handleSave = () => {
    const newName = value.trim();
    if (!editable || !newName) return;
    if (org?.name && newName === org.name) return;
    updateName.mutate(newName, {
      onSuccess: () => {
        toast({ title: "Nome atualizado", description: "Aplicado em CRM, formulários e perfis." });
        setDirty(false);
      },
      onError: (err: any) => {
        toast({ title: "Erro ao salvar", description: String(err?.message ?? err), variant: "destructive" });
      },
    });
  };

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="org-name">Nome da empresa</Label>
          <Input
            id="org-name"
            value={value}
            onChange={(e) => { setValue(e.target.value); setDirty(true); }}
            onBlur={() => { if (dirty) handleSave(); }}
            placeholder="Ex: Minha Empresa LTDA"
            className="w-72"
            disabled={!editable || updateName.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Este nome aparece no CRM, nos formulários públicos e em seções do perfil.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          disabled={!editable || updateName.isPending || !value.trim() || value.trim() === (org?.name ?? "")}
          onClick={handleSave}
        >
          {updateName.isPending ? (<>Salvando…</>) : (<><Save className="h-4 w-4" /> Salvar</>)}
        </Button>
      </div>
    </div>
  );
}

export default OrganizationNameEditor;

