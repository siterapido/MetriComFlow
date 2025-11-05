import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MetaCreativePerformance } from "@/lib/metaMetrics";

interface CreativeGridProps {
  creatives: MetaCreativePerformance[];
  isLoading?: boolean;
}

export function CreativeGrid({ creatives, isLoading }: CreativeGridProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Ranking de Criativos</CardTitle>
        <CardDescription className="text-muted-foreground">
          Performance dos criativos com base no engajamento e impressões.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-muted/50 aspect-square" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {creatives.map((creative) => (
              <div key={creative.id} className="group relative overflow-hidden rounded-lg">
                <img
                  src={creative.thumbnail_url || creative.image_url || "https://via.placeholder.com/150"}
                  alt={creative.name}
                  className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
                  <div className="flex h-full flex-col justify-end p-3 text-white">
                    <p className="text-xs font-bold line-clamp-2">{creative.name}</p>
                    <p className="text-xs">CTR: {creative.uniqueCtr.toFixed(2)}%</p>
                    <p className="text-xs">Impressões: {creative.impressions.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
