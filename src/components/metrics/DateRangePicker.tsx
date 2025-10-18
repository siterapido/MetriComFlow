import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export interface DateRangePickerProps {
  value?: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (value) {
      return {
        from: new Date(value.start),
        to: new Date(value.end),
      };
    }
    return undefined;
  });

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
      onChange({
        start: format(range.from, 'yyyy-MM-dd'),
        end: format(range.to, 'yyyy-MM-dd'),
      });
    }
  };

  const quickRanges = [
    {
      label: 'Últimos 7 dias',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { from: start, to: end };
      },
    },
    {
      label: 'Últimos 30 dias',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return { from: start, to: end };
      },
    },
    {
      label: 'Este mês',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from: start, to: end };
      },
    },
    {
      label: 'Mês passado',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: start, to: end };
      },
    },
  ];

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(date.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione o período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Quick ranges sidebar */}
            <div className="border-r border-border p-3 space-y-1">
              <div className="text-sm font-semibold mb-2 text-muted-foreground">
                Atalhos
              </div>
              {quickRanges.map((range) => (
                <Button
                  key={range.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handleSelect(range.getValue())}
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                locale={ptBR}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
