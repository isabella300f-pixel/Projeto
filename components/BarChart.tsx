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
}

export default function BarChart({
  data,
  dataKey,
  name,
  color = '#0ea5e9',
  secondDataKey,
  secondName,
  secondColor = '#10b981',
}: BarChartProps) {
  const gridStroke = '#4b5563'
  const tickStyle = { fontSize: 12, fill: '#9ca3af' }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis
          dataKey="period"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={tickStyle}
        />
        <YAxis tick={tickStyle} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgb(31, 41, 55)',
            border: '1px solid rgb(75, 85, 99)',
            borderRadius: '8px',
            color: '#f3f4f6',
          }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af' }} />
        <Bar dataKey={dataKey} name={name} fill={color} />
        {secondDataKey && secondName && (
          <Bar dataKey={secondDataKey} name={secondName} fill={secondColor} />
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

