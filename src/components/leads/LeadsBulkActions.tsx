import { Trash2, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LeadsBulkActionsProps {
  selectedCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export function LeadsBulkActions({
  selectedCount,
  onEdit,
  onDelete,
  onClearSelection,
  isLoading = false,
}: LeadsBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-card border border-border rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 backdrop-blur-md">
          {/* Contador */}
          <Badge variant="secondary" className="h-7 px-3 text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "lead selecionado" : "leads selecionados"}
          </Badge>

          {/* Divisor */}
          <div className="h-6 w-px bg-border" />

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={isLoading}
              className="h-8 px-3 text-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isLoading}
              className="h-8 px-3 text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Mover para Lixeira
            </Button>
          </div>

          {/* Botão Fechar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            disabled={isLoading}
            className="h-7 w-7"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


