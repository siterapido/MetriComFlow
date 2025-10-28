import React from 'react'

type SparklineProps = {
  values: number[]
  width?: number
  height?: number
  stroke?: string
  strokeWidth?: number
  fill?: string | undefined
  className?: string
}

export function Sparkline({
  values,
  width = 100,
  height = 28,
  stroke = 'hsl(var(--primary))',
  strokeWidth = 2,
  fill,
  className,
}: SparklineProps) {
  const padding = 2
  const w = Math.max(width, 10)
  const h = Math.max(height, 10)

  if (!values || values.length === 0) {
    return (
      <svg width={w} height={h} className={className}>
        <line x1={padding} x2={w - padding} y1={h / 2} y2={h / 2} stroke={stroke} strokeOpacity={0.2} />
      </svg>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = (w - padding * 2) / Math.max(values.length - 1, 1)

  const points = values.map((v, i) => {
    const x = padding + i * stepX
    const y = h - padding - ((v - min) / range) * (h - padding * 2)
    return `${x},${y}`
  })

  const path = points.join(' ')

  return (
    <svg width={w} height={h} className={className}>
      {fill && (
        <polyline
          points={`${path} ${w - padding},${h - padding} ${padding},${h - padding}`}
          fill={fill}
          stroke="none"
        />
      )}
      <polyline
        points={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}