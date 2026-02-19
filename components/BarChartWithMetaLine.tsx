'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface BarChartWithMetaLineProps {
  data: Array<Record<string, unknown>>
  dataKey: string
  name: string
  metaDataKey: string
  metaName: string
  color?: string
  metaColor?: string
}

/**
 * Gráfico de colunas (valor realizado) + linha pontilhada (meta) para melhor visualização.
 */
export default function BarChartWithMetaLine({
  data,
  dataKey,
  name,
  metaDataKey,
  metaName,
  color = '#0ea5e9',
  metaColor = '#94a3b8',
}: BarChartWithMetaLineProps) {
  const gridStroke = '#4b5563'
  const tickStyle = { fontSize: 12, fill: '#9ca3af' }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
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
        {/* Meta em linha pontilhada por baixo para não cobrir as colunas */}
        <Line
          type="monotone"
          dataKey={metaDataKey}
          name={metaName}
          stroke={metaColor}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        {/* Colunas (valor realizado) por cima, bem visíveis */}
        <Bar dataKey={dataKey} name={name} fill={color} barSize={28} radius={[4, 4, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
