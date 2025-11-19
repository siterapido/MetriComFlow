/**
 * Badge de Quality Ranking do Meta Ads
 *
 * Mostra os rankings de qualidade fornecidos pelo Meta:
 * - Quality Ranking: Qualidade do criativo
 * - Engagement Ranking: Taxa de engajamento
 * - Conversion Ranking: Eficiência em conversões
 *
 * Valores possíveis:
 * - ABOVE_AVERAGE (Acima da Média) - Verde
 * - AVERAGE (Média) - Amarelo
 * - BELOW_AVERAGE (Abaixo da Média) - Vermelho
 */

import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QualityRankingBadgeProps {
  ranking?: string; // 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE'
  label?: string; // 'Qualidade' | 'Engajamento' | 'Conversão'
  showLabel?: boolean; // Mostrar label acima do badge
  size?: 'sm' | 'md' | 'lg';
}

export const QualityRankingBadge = ({
  ranking,
  label = 'Qualidade',
  showLabel = true,
  size = 'md',
}: QualityRankingBadgeProps) => {
  if (!ranking) return null;

  const config = {
    ABOVE_AVERAGE: {
      icon: TrendingUp,
      color: 'bg-success/20 text-success border-success/30 hover:bg-success/30',
      text: 'Acima da Média',
      shortText: '↑',
    },
    AVERAGE: {
      icon: Minus,
      color: 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30',
      text: 'Média',
      shortText: '→',
    },
    BELOW_AVERAGE: {
      icon: TrendingDown,
      color: 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30',
      text: 'Abaixo da Média',
      shortText: '↓',
    },
  };

  const normalizedRanking = ranking.toUpperCase().replace(/\s+/g, '_');
  const { icon: Icon, color, text, shortText } = config[normalizedRanking] || config.AVERAGE;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      )}
      <Badge
        variant="outline"
        className={`gap-1.5 ${color} ${sizeClasses[size]} transition-all`}
      >
        <Icon className={iconSizes[size]} />
        <span className="font-medium">{text}</span>
      </Badge>
    </div>
  );
};

/**
 * Grupo de Quality Rankings (para exibir os 3 juntos)
 */
interface QualityRankingGroupProps {
  qualityRanking?: string;
  engagementRanking?: string;
  conversionRanking?: string;
  layout?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
}

export const QualityRankingGroup = ({
  qualityRanking,
  engagementRanking,
  conversionRanking,
  layout = 'horizontal',
  size = 'md',
}: QualityRankingGroupProps) => {
  const hasAnyRanking = qualityRanking || engagementRanking || conversionRanking;

  if (!hasAnyRanking) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Rankings não disponíveis
      </div>
    );
  }

  const containerClass = layout === 'horizontal'
    ? 'flex flex-wrap gap-3'
    : 'flex flex-col gap-2';

  return (
    <div className={containerClass}>
      {qualityRanking && (
        <QualityRankingBadge
          ranking={qualityRanking}
          label="Qualidade"
          size={size}
        />
      )}
      {engagementRanking && (
        <QualityRankingBadge
          ranking={engagementRanking}
          label="Engajamento"
          size={size}
        />
      )}
      {conversionRanking && (
        <QualityRankingBadge
          ranking={conversionRanking}
          label="Conversão"
          size={size}
        />
      )}
    </div>
  );
};

/**
 * Badge compacto (apenas ícone) para uso em tabelas
 */
interface QualityRankingIconProps {
  ranking?: string;
  tooltip?: string;
}

export const QualityRankingIcon = ({ ranking, tooltip }: QualityRankingIconProps) => {
  if (!ranking) return <span className="text-muted-foreground text-xs">—</span>;

  const config = {
    ABOVE_AVERAGE: {
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    AVERAGE: {
      icon: Minus,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    BELOW_AVERAGE: {
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  };

  const normalizedRanking = ranking.toUpperCase().replace(/\s+/g, '_');
  const { icon: Icon, color, bgColor } = config[normalizedRanking] || config.AVERAGE;

  return (
    <div
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${bgColor}`}
      title={tooltip || ranking}
    >
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
};
