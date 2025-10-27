import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CalendarIcon } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

type PresetOption =
  | 'last_90_days'
  | 'last_60_days'
  | 'last_30_days'
  | 'today'
  | 'yesterday'
  | 'yesterday_today'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_28_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom'

type DateRangeFilterProps = {
  value?: { start: string; end: string } | null
  onChange: (range: { start: string; end: string }) => void
}

const PRESET_OPTIONS: { value: PresetOption; label: string }[] = [
  { value: 'last_90_days', label: 'Últimos 90 dias' },
  { value: 'last_60_days', label: 'Últimos 60 dias' },
  { value: 'last_30_days', label: 'Últimos 30 dias' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'yesterday_today', label: 'Hoje e ontem' },
  { value: 'last_7_days', label: 'Últimos 7 dias' },
  { value: 'last_14_days', label: 'Últimos 14 dias' },
  { value: 'last_28_days', label: 'Últimos 28 dias' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana passada' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'custom', label: 'Personalizado' },
]

function getDateRangeFromPreset(preset: PresetOption): { start: Date; end: Date } {
  const today = new Date()
  const yesterday = subDays(today, 1)

  switch (preset) {
    case 'last_90_days':
      return { start: subDays(today, 90), end: today }

    case 'last_60_days':
      return { start: subDays(today, 60), end: today }

    case 'last_30_days':
      return { start: subDays(today, 30), end: today }

    case 'today':
      return { start: today, end: today }

    case 'yesterday':
      return { start: yesterday, end: yesterday }

    case 'yesterday_today':
      return { start: yesterday, end: today }

    case 'last_7_days':
      return { start: subDays(today, 7), end: today }

    case 'last_14_days':
      return { start: subDays(today, 14), end: today }

    case 'last_28_days':
      return { start: subDays(today, 28), end: today }

    case 'this_week':
      return { start: startOfWeek(today, { weekStartsOn: 0 }), end: endOfWeek(today, { weekStartsOn: 0 }) }

    case 'last_week':
      {
        const lastWeekDate = subDays(today, 7)
        return {
          start: startOfWeek(lastWeekDate, { weekStartsOn: 0 }),
          end: endOfWeek(lastWeekDate, { weekStartsOn: 0 })
        }
      }

    case 'this_month':
      return { start: startOfMonth(today), end: endOfMonth(today) }

    case 'last_month':
      {
        const lastMonth = subMonths(today, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      }

    case 'custom':
      return { start: subDays(today, 30), end: today }

    default:
      return { start: subDays(today, 90), end: today }
  }
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('last_90_days')
  const [customRange, setCustomRange] = useState<DateRange | undefined>()

  const handlePresetChange = (preset: PresetOption) => {
    setSelectedPreset(preset)

    if (preset !== 'custom') {
      const range = getDateRangeFromPreset(preset)
      onChange({
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
      })
    }
  }

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range)

    if (range?.from && range?.to) {
      onChange({
        start: format(range.from, 'yyyy-MM-dd'),
        end: format(range.to, 'yyyy-MM-dd'),
      })
    }
  }

  const handleApply = () => {
    if (selectedPreset === 'custom' && customRange?.from && customRange?.to) {
      onChange({
        start: format(customRange.from, 'yyyy-MM-dd'),
        end: format(customRange.to, 'yyyy-MM-dd'),
      })
    }
    setOpen(false)
  }

  const getDisplayText = () => {
    if (!value) return 'Últimos 90 dias'

    const preset = PRESET_OPTIONS.find(opt => {
      if (opt.value === 'custom') return false
      const range = getDateRangeFromPreset(opt.value)
      const rangeStart = format(range.start, 'yyyy-MM-dd')
      const rangeEnd = format(range.end, 'yyyy-MM-dd')
      return rangeStart === value.start && rangeEnd === value.end
    })

    if (preset) {
      return preset.label
    }

    return `${format(new Date(value.start), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(value.end), 'dd/MM/yyyy', { locale: ptBR })}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal bg-background',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Sidebar com opções predefinidas */}
          <div className="border-r border-border p-4 w-64">
            <h4 className="text-sm font-semibold mb-3 text-foreground">Usados recentemente</h4>
            <RadioGroup value={selectedPreset} onValueChange={(v) => handlePresetChange(v as PresetOption)}>
              <div className="space-y-2">
                {PRESET_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="text-sm font-normal cursor-pointer text-foreground hover:text-primary"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Calendário para seleção personalizada */}
          {selectedPreset === 'custom' && (
            <div className="p-4">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={handleCustomRangeChange}
                numberOfMonths={2}
                locale={ptBR}
                disabled={(date) => date > new Date()}
              />

              {customRange?.from && customRange?.to && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    {format(customRange.from, 'dd/MM/yyyy', { locale: ptBR })} - {format(customRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fuso horário das datas: Horário de São Paulo
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={!customRange?.from || !customRange?.to}
                >
                  Atualizar
                </Button>
              </div>
            </div>
          )}

          {/* Resumo para opções predefinidas */}
          {selectedPreset !== 'custom' && (
            <div className="p-4 w-64">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong className="text-foreground">Período selecionado:</strong>
                </p>
                {value ? (
                  <>
                    <p>{format(new Date(value.start), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    <p className="mb-2">até</p>
                    <p>{format(new Date(value.end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    <p className="text-xs mt-4">Fuso horário das datas: Horário de São Paulo</p>
                  </>
                ) : null}
              </div>

              <div className="flex gap-2 mt-6 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setOpen(false)}>
                  Atualizar
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
