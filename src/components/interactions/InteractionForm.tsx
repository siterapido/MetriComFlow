'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useCreateInteraction, 
  useUpdateInteraction, 
  useInteractionTypes, 
  useInteractionOutcomes 
} from '@/hooks/useInteractions';
import { useLeads } from '@/hooks/useLeads';
import { Tables } from '@/lib/database.types';

type Interaction = Tables<'interactions'>;

interface InteractionFormProps {
  interaction?: Interaction;
  leadId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const interactionSchema = z.object({
  interaction_type: z.string().min(1, 'Tipo de interação é obrigatório'),
  description: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  interaction_date: z.string().optional(),
  lead_id: z.string().optional(),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

export function InteractionForm({ interaction, leadId, onClose, onSuccess }: InteractionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createInteraction = useCreateInteraction();
  const updateInteraction = useUpdateInteraction();
  const { data: interactionTypes } = useInteractionTypes();
  const { data: interactionOutcomes } = useInteractionOutcomes();
  const { data: leads } = useLeads();

  const form = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      interaction_type: interaction?.interaction_type || '',
      description: interaction?.description || '',
      notes: interaction?.notes || '',
      outcome: interaction?.outcome || '',
      interaction_date: interaction?.interaction_date || new Date().toISOString().split('T')[0],
      lead_id: leadId || interaction?.lead_id || '',
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  const onSubmit = async (data: InteractionFormData) => {
    setIsSubmitting(true);
    try {
      const interactionData = {
        interaction_type: data.interaction_type,
        description: data.description || null,
        notes: data.notes || null,
        outcome: data.outcome || null,
        interaction_date: data.interaction_date || null,
        lead_id: data.lead_id || null,
      };

      if (interaction) {
        await updateInteraction.mutateAsync({
          id: interaction.id,
          ...interactionData,
        });
      } else {
        await createInteraction.mutateAsync(interactionData);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar interação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {interaction ? 'Editar Interação' : 'Nova Interação'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tipo de Interação */}
          <div className="space-y-2">
            <Label htmlFor="interaction_type">Tipo de Interação</Label>
            <Select
              value={watch('interaction_type')}
              onValueChange={(value) => setValue('interaction_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {interactionTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.interaction_type && (
              <p className="text-sm text-red-500">{errors.interaction_type.message}</p>
            )}
          </div>

          {/* Lead */}
          {!leadId && (
            <div className="space-y-2">
              <Label htmlFor="lead_id">Lead</Label>
              <Select
                value={watch('lead_id')}
                onValueChange={(value) => setValue('lead_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads?.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Data da Interação */}
          <div className="space-y-2">
            <Label htmlFor="interaction_date">Data da Interação</Label>
            <Input
              id="interaction_date"
              type="date"
              {...register('interaction_date')}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descreva a interação..."
              rows={3}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notas adicionais..."
              rows={2}
            />
          </div>

          {/* Resultado */}
          <div className="space-y-2">
            <Label htmlFor="outcome">Resultado</Label>
            <Select
              value={watch('outcome') || ''}
              onValueChange={(value) => setValue('outcome', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                {interactionOutcomes?.map((outcome) => (
                  <SelectItem key={outcome.id} value={outcome.name}>
                    {outcome.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : interaction ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}