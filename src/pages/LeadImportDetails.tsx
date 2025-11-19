import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RowAudit {
  id: string;
  original_values: Record<string, unknown>;
  normalized_values: Record<string, unknown> | null;
  status: "imported" | "skipped";
  errors: string[] | null;
  lead_id: string | null;
  created_at: string;
}

export default function LeadImportDetails() {
  const { batchId } = useParams();
  const { data } = useQuery<RowAudit[]>({
    queryKey: ["lead-import-rows", batchId],
    queryFn: async () => {
      if (!batchId) return [];
      const { data, error } = await supabase
        .from("lead_import_rows")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RowAudit[];
    },
    enabled: !!batchId,
  });

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do lote</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Erros</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Normalizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant={r.status === "imported" ? "secondary" : "destructive"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.lead_id ?? "—"}</TableCell>
                  <TableCell>{(r.errors ?? []).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(r.original_values, null, 2)}</pre>
                  </TableCell>
                  <TableCell>
                    <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(r.normalized_values ?? {}, null, 2)}</pre>
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