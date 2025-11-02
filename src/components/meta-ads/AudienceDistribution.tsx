import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface AudienceDistributionProps {
  data: {
    byAge: Array<{ name: string; value: number }>
    byGender: Array<{ name: string; value: number }>
    byDevice: Array<{ name: string; value: number }>
    byLocation: Array<{ name: string; value: number }>
  }
  isLoading?: boolean
}

const COLORS = {
  age: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'],
  gender: ['#8B5CF6', '#7C3AED', '#6D28D9'],
  device: ['#10B981', '#059669', '#047857'],
  location: ['#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F'],
}

export function AudienceDistribution({ data, isLoading }: AudienceDistributionProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Distribuição de Público</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const hasData =
    (data.byAge && data.byAge.length > 0) ||
    (data.byGender && data.byGender.length > 0) ||
    (data.byDevice && data.byDevice.length > 0) ||
    (data.byLocation && data.byLocation.length > 0)

  if (!hasData) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Distribuição de Público</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            Dados demográficos não disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCustomLabel = (entry: any) => {
    const percent = entry.percent * 100
    if (percent < 5) return '' // Don't show label for small slices
    return `${percent.toFixed(0)}%`
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Distribuição de Público</CardTitle>
        <CardDescription className="text-muted-foreground">
          Segmentação demográfica dos leads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Age Distribution */}
          {data.byAge && data.byAge.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 text-center">Por Idade</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.byAge}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.byAge.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.age[index % COLORS.age.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {data.byAge.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS.age[index % COLORS.age.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gender Distribution */}
          {data.byGender && data.byGender.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 text-center">Por Gênero</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.byGender}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.byGender.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.gender[index % COLORS.gender.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {data.byGender.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS.gender[index % COLORS.gender.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Device Distribution */}
          {data.byDevice && data.byDevice.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 text-center">Por Dispositivo</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.byDevice}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.byDevice.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.device[index % COLORS.device.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {data.byDevice.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS.device[index % COLORS.device.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Distribution */}
          {data.byLocation && data.byLocation.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 text-center">Por Localização (Top 5)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.byLocation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.byLocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.location[index % COLORS.location.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {data.byLocation.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS.location[index % COLORS.location.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
