'use client'

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BarChartProps {
  data: Array<Record<string, any>>
  dataKey: string
  name: string
  color?: string
  secondDataKey?: string
  secondName?: string
  secondColor?: string
  tickFormatter?: (value: string) => string
}

export default function BarChart({
  data,
  dataKey,
  name,
  color = '#0ea5e9',
  secondDataKey,
  secondName,
  secondColor = '#10b981',
  tickFormatter,
}: BarChartProps) {
  const gridStroke = '#4b5563'
  const tickStyle = { fontSize: 11, fill: '#9ca3af' }
  const tickCount = data?.length || 0
  const interval = tickCount > 15 ? Math.max(1, Math.floor(tickCount / 12)) : 0
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis
          dataKey="period"
          angle={-45}
          textAnchor="end"
          height={70}
          interval={interval}
          tick={tickStyle}
          tickFormatter={tickFormatter}
        />
        <YAxis tick={tickStyle} width={40} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgb(31, 41, 55)',
            border: '1px solid rgb(75, 85, 99)',
            borderRadius: '8px',
            color: '#f3f4f6',
          }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af' }} verticalAlign="top" />
        <Bar dataKey={dataKey} name={name} fill={color} />
        {secondDataKey && secondName && (
          <Bar dataKey={secondDataKey} name={secondName} fill={secondColor} />
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

