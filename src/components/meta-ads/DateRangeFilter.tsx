import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CalendarIcon } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

type PresetOption =
  | 'all_time'
  | 'last_365_days'
  | 'last_180_days'
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

type DateRange = {
  from: Date
  to: Date
}

type DateRangeFilterProps = {
  value?: DateRange | null
  onChange: (range: DateRange) => void
}

const PRESET_OPTIONS: { value: PresetOption; label: string }[] = [
  // Conforme limite oficial da Ads Insights API da Meta, o lookback máximo é 37 meses
  { value: 'all_time', label: 'Máximo permitido (37 meses)' },
  { value: 'last_365_days', label: 'Último ano (365 dias)' },
  { value: 'last_180_days', label: 'Últimos 6 meses (180 dias)' },
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

function getDateRangeFromPreset(preset: PresetOption): { from: Date; to: Date } {
  const today = new Date()
  const yesterday = subDays(today, 1)
  const maxLookbackStart = subMonths(today, 37) // Limite da API: início não pode ser além de 37 meses

  switch (preset) {
    case 'all_time':
      // Agora 'all_time' significa o máximo permitido pela API: últimos 37 meses
      return { from: maxLookbackStart, to: today }

    case 'last_365_days':
      return { from: subDays(today, 365), to: today }

    case 'last_180_days':
      return { from: subDays(today, 180), to: today }

    case 'last_90_days':
      return { from: subDays(today, 90), to: today }

    case 'last_60_days':
      return { from: subDays(today, 60), to: today }

    case 'last_30_days':
      return { from: subDays(today, 30), to: today }

    case 'today':
      return { from: today, to: today }

    case 'yesterday':
      return { from: yesterday, to: yesterday }

    case 'yesterday_today':
      return { from: yesterday, to: today }

    case 'last_7_days':
      return { from: subDays(today, 7), to: today }

    case 'last_14_days':
      return { from: subDays(today, 14), to: today }

    case 'last_28_days':
      return { from: subDays(today, 28), to: today }

    case 'this_week':
      return { from: startOfWeek(today, { weekStartsOn: 0 }), to: endOfWeek(today, { weekStartsOn: 0 }) }

    case 'last_week':
      {
        const lastWeekDate = subDays(today, 7)
        return {
          from: startOfWeek(lastWeekDate, { weekStartsOn: 0 }),
          to: endOfWeek(lastWeekDate, { weekStartsOn: 0 })
        }
      }

    case 'this_month':
      return { from: startOfMonth(today), to: endOfMonth(today) }

    case 'last_month':
      {
        const lastMonth = subMonths(today, 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      }

    case 'custom':
      return { from: subDays(today, 30), to: today }

    default:
      return { from: subDays(today, 90), to: today }
  }
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('all_time')
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const maxLookbackStart = subMonths(new Date(), 37)

  // Garante que o intervalo respeita o limite de 37 meses a partir de hoje
  const clampToMaxLookback = (range: { from: Date; to: Date }) => {
    const from = range.from < maxLookbackStart ? maxLookbackStart : range.from
    // Evita datas futuras
    const today = new Date()
    const to = range.to > today ? today : range.to
    
    // Garante que as datas são válidas
    return { 
      from: isValid(from) ? from : maxLookbackStart, 
      to: isValid(to) ? to : today 
    }
  }

  const handlePresetChange = (preset: PresetOption) => {
    setSelectedPreset(preset)

    if (preset !== 'custom') {
      const range = clampToMaxLookback(getDateRangeFromPreset(preset))
      onChange(range)
    }
  }

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range)

    if (range?.from && range?.to) {
      const clamped = clampToMaxLookback({ from: range.from, to: range.to })
      onChange(clamped)
    }
  }

  const handleApply = () => {
    if (selectedPreset === 'custom' && customRange?.from && customRange?.to) {
      const clamped = clampToMaxLookback({ from: customRange.from, to: customRange.to })
      onChange(clamped)
    }
    setOpen(false)
  }

  const getDisplayText = () => {
    if (!value || !value.from || !value.to) return 'Todo o período'

    // Verifica se as datas são válidas antes de formatar
    if (!isValid(value.from) || !isValid(value.to)) {
      return 'Todo o período'
    }

    const preset = PRESET_OPTIONS.find(opt => {
      if (opt.value === 'custom') return false
      const range = getDateRangeFromPreset(opt.value)
      const rangeStart = isValid(range.from) ? format(range.from, 'yyyy-MM-dd') : ''
      const rangeEnd = isValid(range.to) ? format(range.to, 'yyyy-MM-dd') : ''
      const valueStart = isValid(value.from) ? format(value.from, 'yyyy-MM-dd') : ''
      const valueEnd = isValid(value.to) ? format(value.to, 'yyyy-MM-dd') : ''
      return rangeStart === valueStart && rangeEnd === valueEnd
    })

    if (preset) {
      return preset.label
    }

    return `${isValid(value.from) ? format(value.from, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'} - ${isValid(value.to) ? format(value.to, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}`
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
                // Bloqueia datas fora do limite da API (antes de 37 meses) e futuras
                disabled={(date) => date > new Date() || date < maxLookbackStart}
              />

              {customRange?.from && customRange?.to && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isValid(customRange.from) ? format(customRange.from, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'} - {isValid(customRange.to) ? format(customRange.to, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}
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
                    <p>{isValid(value.from) ? format(value.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Data inválida'}</p>
                    <p className="mb-2">até</p>
                    <p>{isValid(value.to) ? format(value.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Data inválida'}</p>
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
