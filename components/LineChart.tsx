'use client'

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface LineChartProps {
  data: Array<Record<string, any>>
  dataKey: string
  name: string
  color?: string
  secondDataKey?: string
  secondName?: string
  secondColor?: string
}

export default function LineChart({
  data,
  dataKey,
  name,
  color = '#0ea5e9',
  secondDataKey,
  secondName,
  secondColor = '#10b981',
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
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
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          name={name}
          stroke={color} 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        {secondDataKey && secondName && (
          <Line 
            type="monotone" 
            dataKey={secondDataKey} 
            name={secondName}
            stroke={secondColor} 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        )}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

