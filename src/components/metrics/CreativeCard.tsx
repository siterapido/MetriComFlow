/**
 * Card de visualização de criativo individual
 * Exibe preview visual + métricas de performance
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, Video, Play, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AdMetrics } from '@/hooks/useAdSetsAndAds';

interface CreativeCardProps {
  ad: AdMetrics;
  showFullMetrics?: boolean;
  onClick?: () => void;
}

export function CreativeCard({ ad, showFullMetrics = false, onClick }: CreativeCardProps) {
  const hasImage = !!(ad.thumbnail_url || ad.image_url);
  const hasVideo = !!ad.video_url;
  const creativeType = ad.creative_type || 'UNKNOWN';

  // Quality ranking badge colors
  const qualityColor = {
    ABOVE_AVERAGE: 'bg-success text-success-foreground',
    AVERAGE: 'bg-warning text-warning-foreground',
    BELOW_AVERAGE: 'bg-destructive text-destructive-foreground',
  }[ad.quality_ranking || ''] || 'bg-muted text-muted-foreground';

  return (
    <Card
      className={cn(
        'bg-gradient-to-br from-card to-accent/20 border-border hover-lift overflow-hidden',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Visual Preview */}
      <div className="relative w-full h-48 bg-muted flex items-center justify-center overflow-hidden">
        {hasImage && (
          <img
            src={ad.thumbnail_url || ad.image_url}
            alt={ad.ad_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder on error
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Play className="w-16 h-16 text-white opacity-80" />
          </div>
        )}

        {!hasImage && !hasVideo && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {creativeType === 'VIDEO' ? (
              <Video className="w-12 h-12" />
            ) : (
              <Image className="w-12 h-12" />
            )}
            <span className="text-sm">Sem preview</span>
          </div>
        )}

        {/* Creative Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-black/60 text-white border-0">
            {creativeType}
          </Badge>
        </div>

        {/* Quality Ranking Badge */}
        {ad.quality_ranking && (
          <div className="absolute top-2 right-2">
            <Badge className={qualityColor}>
              {ad.quality_ranking.replace('_', ' ')}
            </Badge>
          </div>
        )}
      </div>

      {/* Metrics */}
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground line-clamp-2">
          {ad.ad_name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Leads</div>
            <div className="text-lg font-bold text-foreground">
              {formatNumber(ad.leads_count)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">CPL</div>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(ad.cpl)}
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        {showFullMetrics && (
          <>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground">Gasto</div>
                <div className="text-sm font-medium text-foreground">
                  {formatCurrency(ad.spend)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cliques</div>
                <div className="text-sm font-medium text-foreground">
                  {formatNumber(ad.clicks)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">CTR</div>
                <div className="text-sm font-medium text-foreground">
                  {ad.ctr.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Impressões</div>
                <div className="text-sm font-medium text-foreground">
                  {formatNumber(ad.impressions)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">CPC</div>
                <div className="text-sm font-medium text-foreground">
                  {formatCurrency(ad.cpc)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">CPM</div>
                <div className="text-sm font-medium text-foreground">
                  R$ {ad.cpm.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Engagement & Conversion Rankings */}
            {(ad.engagement_ranking || ad.conversion_ranking) && (
              <div className="flex gap-2 pt-2 border-t border-border">
                {ad.engagement_ranking && (
                  <Badge variant="outline" className="text-xs">
                    Eng: {ad.engagement_ranking.replace('_', ' ')}
                  </Badge>
                )}
                {ad.conversion_ranking && (
                  <Badge variant="outline" className="text-xs">
                    Conv: {ad.conversion_ranking.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Lista de criativos em grid
 */
interface CreativeGridProps {
  ads: AdMetrics[];
  showFullMetrics?: boolean;
  onAdClick?: (ad: AdMetrics) => void;
}

export function CreativeGrid({ ads, showFullMetrics, onAdClick }: CreativeGridProps) {
  if (ads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Nenhum criativo encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {ads.map((ad) => (
        <CreativeCard
          key={ad.ad_id}
          ad={ad}
          showFullMetrics={showFullMetrics}
          onClick={onAdClick ? () => onAdClick(ad) : undefined}
        />
      ))}
    </div>
  );
}
