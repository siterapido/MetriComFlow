'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Users, 
  FileText, 
  Video, 
  Plus, 
  Edit, 
  Trash2, 
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useInteractions, useDeleteInteraction, useInteractionTypes } from '@/hooks/useInteractions';
import { useLeads } from '@/hooks/useLeads';
import { InteractionForm } from './InteractionForm';
import { Tables } from '@/lib/database.types';

type Interaction = Tables<'interactions'>;

interface InteractionListProps {
  leadId?: string;
}

export function InteractionList({ leadId }: InteractionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const [deletingInteraction, setDeletingInteraction] = useState<Interaction | null>(null);

  const { data: interactions, isLoading } = useInteractions(leadId);
  const { data: interactionTypes } = useInteractionTypes();
  const { data: leads } = useLeads();
  const deleteInteraction = useDeleteInteraction();

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'ligação':
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
      case 'mensagem':
        return <MessageSquare className="h-4 w-4" />;
      case 'reunião':
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'proposta':
      case 'proposal':
        return <FileText className="h-4 w-4" />;
      case 'demo':
      case 'demonstração':
        return <Video className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome?.toLowerCase()) {
      case 'positivo':
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'neutro':
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'negativo':
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredInteractions = interactions?.filter((interaction) => {
    const matchesSearch = 
      interaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.interaction_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !typeFilter || interaction.interaction_type === typeFilter;
    const matchesOutcome = !outcomeFilter || interaction.outcome === outcomeFilter;

    return matchesSearch && matchesType && matchesOutcome;
  });

  const handleEdit = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deletingInteraction) {
      try {
        await deleteInteraction.mutateAsync(deletingInteraction.id);
        setDeletingInteraction(null);
      } catch (error) {
        console.error('Erro ao deletar interação:', error);
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingInteraction(null);
  };

  const getLeadName = (leadId: string) => {
    const lead = leads?.find(l => l.id === leadId);
    return lead ? lead.title || 'Lead sem título' : 'Lead não encontrado';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando interações...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Interações</h2>
          <p className="text-muted-foreground">
            {leadId ? 'Histórico de interações com este lead' : 'Histórico de todas as interações'}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Interação
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por descrição, notas ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {interactionTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os resultados</SelectItem>
                <SelectItem value="positivo">Positivo</SelectItem>
                <SelectItem value="neutro">Neutro</SelectItem>
                <SelectItem value="negativo">Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Interações */}
      <div className="space-y-4">
        {filteredInteractions?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma interação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || typeFilter || outcomeFilter
                  ? 'Tente ajustar os filtros para encontrar interações.'
                  : 'Comece criando sua primeira interação.'}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Interação
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredInteractions?.map((interaction) => (
            <Card key={interaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(interaction.interaction_type || '')}
                        <span className="font-medium">{interaction.interaction_type}</span>
                      </div>
                      {interaction.outcome && (
                        <Badge className={getOutcomeColor(interaction.outcome)}>
                          {interaction.outcome}
                        </Badge>
                      )}
                    </div>

                    {interaction.description && (
                      <p className="text-gray-900 mb-2">{interaction.description}</p>
                    )}

                    {interaction.notes && (
                      <p className="text-gray-600 text-sm mb-3">{interaction.notes}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {interaction.interaction_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(interaction.interaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      )}
                      {!leadId && interaction.lead_id && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {getLeadName(interaction.lead_id)}
                        </div>
                      )}
                      <div className="text-xs">
                        Criado em {format(new Date(interaction.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(interaction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingInteraction(interaction)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal do Formulário */}
      <Dialog open={showForm} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInteraction ? 'Editar Interação' : 'Nova Interação'}
            </DialogTitle>
          </DialogHeader>
          <InteractionForm
            interaction={editingInteraction || undefined}
            leadId={leadId}
            onClose={handleFormClose}
            onSuccess={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingInteraction} onOpenChange={() => setDeletingInteraction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta interação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}