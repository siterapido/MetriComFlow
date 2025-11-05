/**
 * Preview de Thumbnail de Criativo (Ad)
 *
 * Mostra thumbnail/imagem/vídeo do criativo com modal de visualização
 * Suporta: IMAGE, VIDEO, CAROUSEL, COLLECTION
 */

import { useState } from 'react';
import { Image as ImageIcon, Play, Maximize2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface AdThumbnailPreviewProps {
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  creativeType?: string;
  adName: string;
  title?: string;
  body?: string;
  callToAction?: string;
  size?: 'sm' | 'md' | 'lg';
  showType?: boolean; // Mostrar badge de tipo (IMAGE, VIDEO, etc)
}

export const AdThumbnailPreview = ({
  imageUrl,
  videoUrl,
  thumbnailUrl,
  creativeType,
  adName,
  title,
  body,
  callToAction,
  size = 'md',
  showType = true,
}: AdThumbnailPreviewProps) => {
  const [imageError, setImageError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Prioridade: thumbnail > image > video (para preview)
  const displayUrl = thumbnailUrl || imageUrl || videoUrl;
  const isVideo = creativeType?.toUpperCase().includes('VIDEO');
  const isCarousel = creativeType?.toUpperCase().includes('CAROUSEL');

  // Tamanhos do thumbnail
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  // Se não há mídia, mostra placeholder
  if (!displayUrl || imageError) {
    return (
      <div className={`${sizes[size]} bg-muted rounded-lg flex items-center justify-center border border-border`}>
        <ImageIcon className="w-1/2 h-1/2 text-muted-foreground opacity-50" />
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          {/* Thumbnail */}
          <div className={`${sizes[size]} rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all shadow-sm hover:shadow-md relative`}>
            <img
              src={displayUrl}
              alt={adName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />

            {/* Overlay com ícones */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Badge de vídeo */}
            {isVideo && (
              <div className="absolute top-1 right-1 bg-black/70 rounded-md p-1">
                <Play className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Badge de tipo */}
            {showType && creativeType && (
              <div className="absolute bottom-1 left-1">
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-black/70 text-white border-0">
                  {creativeType.split('_')[0]}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </DialogTrigger>

      {/* Modal de Preview */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl font-bold">{adName}</DialogTitle>
        <DialogDescription className="sr-only">
          Preview do criativo {adName}
        </DialogDescription>

        <div className="space-y-4">
          {/* Tipo de criativo */}
          {creativeType && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                {isVideo && <Play className="w-3 h-3" />}
                {creativeType}
              </Badge>
            </div>
          )}

          {/* Mídia principal */}
          <div className="rounded-lg overflow-hidden border border-border bg-black">
            {isVideo && videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full max-h-[500px] mx-auto"
                poster={thumbnailUrl || imageUrl}
              >
                Seu navegador não suporta o elemento de vídeo.
              </video>
            ) : (
              <img
                src={displayUrl}
                alt={adName}
                className="w-full max-h-[500px] object-contain mx-auto"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Conteúdo do criativo */}
          {(title || body || callToAction) && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Conteúdo do Anúncio
              </h4>

              {title && (
                <div>
                  <span className="text-xs text-muted-foreground">Título:</span>
                  <p className="text-sm font-medium text-foreground mt-1">{title}</p>
                </div>
              )}

              {body && (
                <div>
                  <span className="text-xs text-muted-foreground">Descrição:</span>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{body}</p>
                </div>
              )}

              {callToAction && (
                <div>
                  <span className="text-xs text-muted-foreground">Call to Action:</span>
                  <Badge variant="default" className="mt-1">
                    {callToAction}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Grid de thumbnails (para múltiplos criativos)
 */
interface AdThumbnailGridProps {
  ads: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    creativeType?: string;
    title?: string;
    body?: string;
    callToAction?: string;
  }>;
  maxItems?: number; // Limite de itens a exibir
}

export const AdThumbnailGrid = ({ ads, maxItems = 6 }: AdThumbnailGridProps) => {
  const displayAds = ads.slice(0, maxItems);
  const remainingCount = ads.length - maxItems;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {displayAds.map((ad) => (
          <AdThumbnailPreview
            key={ad.id}
            imageUrl={ad.imageUrl}
            videoUrl={ad.videoUrl}
            thumbnailUrl={ad.thumbnailUrl}
            creativeType={ad.creativeType}
            adName={ad.name}
            title={ad.title}
            body={ad.body}
            callToAction={ad.callToAction}
            size="md"
          />
        ))}

        {/* Indicador de "e mais X" */}
        {remainingCount > 0 && (
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border border-dashed border-border">
            <span className="text-xs font-medium text-muted-foreground">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
