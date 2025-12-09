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
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Bar dataKey={dataKey} name={name} fill={color} />
        {secondDataKey && secondName && (
          <Bar dataKey={secondDataKey} name={secondName} fill={secondColor} />
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

