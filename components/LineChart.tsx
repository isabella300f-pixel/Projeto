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
  /** Ex.: [0, 100] para percentuais */
  yAxisDomain?: [number, number]
  /** Ex.: (v) => `${v}%` */
  formatTooltipValue?: (value: number) => string
}

export default function LineChart({
  data,
  dataKey,
  name,
  color = '#0ea5e9',
  secondDataKey,
  secondName,
  secondColor = '#10b981',
  yAxisDomain,
  formatTooltipValue,
}: LineChartProps) {
  const gridStroke = '#4b5563'
  const tickStyle = { fontSize: 12, fill: '#9ca3af' }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis
          dataKey="period"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={tickStyle}
        />
        <YAxis tick={tickStyle} domain={yAxisDomain} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgb(31, 41, 55)',
            border: '1px solid rgb(75, 85, 99)',
            borderRadius: '8px',
            color: '#f3f4f6',
          }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={formatTooltipValue ? (value: number) => [formatTooltipValue(Number(value)), name] : undefined}
        />
        <Legend wrapperStyle={{ color: '#9ca3af' }} />
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

