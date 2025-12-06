import { Filter, Calendar, Layers, Target, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterPopoverProps {
    accountId?: string;
    campaignId?: string;
    onAccountChange: (value: string) => void;
    onCampaignChange: (value: string) => void;
    adAccounts?: { id: string; business_name?: string; external_id?: string }[];
    campaigns?: { id: string; name: string }[];
    isLoading?: boolean;
    dateRange?: DateRange;
    onDateChange?: (range: DateRange | undefined) => void;
}

export function FilterPopover({
    accountId,
    campaignId,
    onAccountChange,
    onCampaignChange,
    adAccounts = [],
    campaigns = [],
    isLoading,
    dateRange,
    onDateChange
}: FilterPopoverProps) {
    const activeFilterCount = (accountId ? 1 : 0) + (campaignId ? 1 : 0) + (dateRange?.from ? 1 : 0);
    const hasActiveFilters = activeFilterCount > 0;

    const handleClearFilters = () => {
        onAccountChange("");
        onCampaignChange("");
        if (onDateChange) onDateChange(undefined);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-9 px-3 gap-2 transition-all duration-200 border-dashed",
                        hasActiveFilters
                            ? "bg-primary/10 border-primary/50 text-primary hover:bg-primary/15"
                            : "bg-background/50 border-border/50 hover:bg-accent/50 hover:text-accent-foreground"
                    )}
                >
                    <Filter className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium hidden sm:inline">Filtros</span>
                    {hasActiveFilters && (
                        <Badge
                            variant="secondary"
                            className="ml-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold bg-primary/20 text-primary hover:bg-primary/20 border-0"
                        >
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0 overflow-hidden border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl" align="end">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                            <Filter className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-sm">Filtros</span>
                    </div>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={handleClearFilters}
                            title="Limpar filtros"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>

                <div className="p-4 space-y-5">
                    {/* Period Section */}
                    {onDateChange && (
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <Calendar className="w-3.5 h-3.5" />
                                Período
                            </div>
                            <div className="relative">
                                <DateRangePicker
                                    date={dateRange}
                                    onDateChange={onDateChange}
                                    className="w-full justify-start text-left font-normal bg-background/50 border-white/10 hover:bg-accent/50 hover:text-accent-foreground transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <Separator className="bg-white/5" />

                    {/* Dimensions Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <Layers className="w-3.5 h-3.5" />
                            Dimensões
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="account" className="text-xs text-muted-foreground ml-1">Conta de Anúncios</Label>
                                <Select
                                    value={accountId || 'all'}
                                    onValueChange={(value) => onAccountChange(value === 'all' ? '' : value)}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger
                                        id="account"
                                        className="w-full bg-background/50 border-white/10 focus:ring-primary/20 transition-all"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <SelectValue placeholder="Todas as contas" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as contas</SelectItem>
                                        {adAccounts?.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.business_name || account.external_id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="campaign" className="text-xs text-muted-foreground ml-1">Campanha</Label>
                                <Select
                                    value={campaignId || 'all'}
                                    onValueChange={(value) => onCampaignChange(value === 'all' ? '' : value)}
                                    disabled={!accountId || isLoading}
                                >
                                    <SelectTrigger
                                        id="campaign"
                                        className="w-full bg-background/50 border-white/10 focus:ring-primary/20 transition-all"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Target className="w-3.5 h-3.5 text-muted-foreground/50" />
                                            <SelectValue placeholder="Todas as campanhas" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as campanhas</SelectItem>
                                        {campaigns?.map((campaign) => (
                                            <SelectItem key={campaign.id} value={campaign.id}>
                                                {campaign.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Status */}
                <div className="px-4 py-2 bg-muted/30 border-t border-white/5 text-[10px] text-muted-foreground text-center">
                    {activeFilterCount === 0 ? (
                        "Nenhum filtro ativo"
                    ) : (
                        `${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} aplicado${activeFilterCount > 1 ? 's' : ''}`
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
