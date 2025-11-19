import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BatchRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  source_file_name: string | null;
  sheet_name: string | null;
  row_count: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  started_at: string;
  completed_at: string | null;
}

export default function LeadImports() {
  const { data: org } = useActiveOrganization();
  const navigate = useNavigate();
  const { data, refetch } = useQuery<BatchRow[]>({
    queryKey: ["lead-import-batches", org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const { data, error } = await supabase
        .from("lead_import_batches")
        .select("*")
        .eq("organization_id", org.id)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as BatchRow[];
    },
    enabled: !!org?.id,
  });
  useEffect(() => { refetch(); }, [org?.id, refetch]);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Histórico de importações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Aba</TableHead>
                <TableHead>Linhas</TableHead>
                <TableHead>Importados</TableHead>
                <TableHead>Ignorados</TableHead>
                <TableHead>Erros</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.source_file_name ?? "—"}</TableCell>
                  <TableCell>{b.sheet_name ?? "—"}</TableCell>
                  <TableCell>{b.row_count ?? 0}</TableCell>
                  <TableCell><Badge variant="secondary">{b.imported_count ?? 0}</Badge></TableCell>
                  <TableCell>{b.skipped_count ?? 0}</TableCell>
                  <TableCell>{b.error_count ?? 0}</TableCell>
                  <TableCell>{new Date(b.started_at).toLocaleString()}</TableCell>
                  <TableCell>{b.completed_at ? "Concluído" : "Em andamento"}</TableCell>
                  <TableCell>
                    <Button variant="outline" onClick={() => navigate(`/leads/importacoes/${b.id}`)}>Detalhes</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}