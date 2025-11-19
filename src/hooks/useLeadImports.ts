import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

export interface LeadImportMapping {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  mapping_json: Record<string, string>;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface ImportLeadsResponse {
  success: boolean;
  batch_id: string;
  imported: number;
  skipped: number;
  error_count: number;
  lead_ids: string[];
}

export function useLeadImportMappings() {
  const { data: org } = useActiveOrganization();

  const list = useQuery<LeadImportMapping[]>({
    queryKey: ["lead-import-mappings", org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const { data, error } = await supabase
        .from("lead_import_mappings")
        .select("*")
        .eq("organization_id", org.id)
        .order("usage_count", { ascending: false })
        .limit(50);
      if (error) {
        const msg = (error as any)?.message?.toLowerCase() || "";
        const details = (error as any)?.details?.toLowerCase() || "";
        const code = (error as any)?.code || "";
        // Tolerar ambiente sem tabela (migrations não aplicadas)
        if (code === "404" || msg.includes("failed to fetch") || details.includes("not found")) {
          return [] as LeadImportMapping[];
        }
        throw error;
      }
      return (data ?? []) as LeadImportMapping[];
    },
    enabled: !!org?.id,
  });

  const save = useMutation({
    mutationFn: async ({ name, mapping_json }: { name: string; mapping_json: Record<string, string> }) => {
      if (!org?.id) throw new Error("Organização ativa não definida");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("lead_import_mappings")
        .insert({ organization_id: org.id, user_id: user?.id, name, mapping_json, usage_count: 0, last_used_at: new Date().toISOString() });
      if (error) {
        const code = (error as any)?.code || "";
        const msg = (error as any)?.message?.toLowerCase() || "";
        if (code === "404" || msg.includes("failed to fetch")) return; // tolerar ausência
        throw error;
      }
    },
  });

  const touch = useMutation({
    mutationFn: async (id: string) => {
      // Incremento simples: ler e atualizar (fallback quando migrations ainda não existem)
      const { data, error } = await supabase
        .from("lead_import_mappings")
        .select("usage_count")
        .eq("id", id)
        .single();
      if (error) {
        const code = (error as any)?.code || "";
        const msg = (error as any)?.message?.toLowerCase() || "";
        if (code === "404" || msg.includes("failed to fetch")) return; // tolerar ausência
        throw error;
      }
      const next = (data?.usage_count ?? 0) + 1;
      const { error: upError } = await supabase
        .from("lead_import_mappings")
        .update({ usage_count: next, last_used_at: new Date().toISOString() })
        .eq("id", id);
      if (upError) {
        const code = (upError as any)?.code || "";
        const msg = (upError as any)?.message?.toLowerCase() || "";
        if (code === "404" || msg.includes("failed to fetch")) return; // tolerar ausência
        throw upError;
      }
    },
  });

  return { list, save, touch };
}

export function useImportLeadsWithReport() {
  const { data: org } = useActiveOrganization();
  return useMutation({
    mutationFn: async (params: {
      rows: Record<string, unknown>[];
      mapping_json: Record<string, string>;
      defaults: { status?: string; source?: string };
      source_file?: { name?: string; url?: string; hash?: string; sheet_name?: string };
      mode?: 'basic_only' | 'full';
    }) => {
      if (!org?.id) throw new Error("Organização ativa não definida");
      const { data, error } = await supabase.functions.invoke<ImportLeadsResponse>("import-leads", {
        body: {
          organization_id: org.id,
          mapping_json: params.mapping_json,
          rows: params.rows,
          defaults: params.defaults,
          source_file_name: params.source_file?.name,
          source_file_url: params.source_file?.url,
          source_file_hash: params.source_file?.hash,
          sheet_name: params.source_file?.sheet_name,
          mode: params.mode ?? 'full',
        },
      });
      if (error) throw error;
      return data as ImportLeadsResponse;
    },
  });
}

export function useUndoLeadImport() {
  const { data: org } = useActiveOrganization();
  return useMutation({
    mutationFn: async (batch_id: string) => {
      if (!org?.id) throw new Error("Organização ativa não definida");
      const { data, error } = await supabase.functions.invoke<{ success: boolean; undone: number; blocked: number }>("undo-lead-import", {
        body: { batch_id, organization_id: org.id },
      });
      if (error) throw error;
      return data as { success: boolean; undone: number; blocked: number };
    },
  });
}