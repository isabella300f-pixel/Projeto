'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red'
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
}: KPICardProps) {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-gray-800/80 border border-gray-700',
    green: 'border-l-green-500 bg-gray-800/80 border border-gray-700',
    orange: 'border-l-orange-500 bg-gray-800/80 border border-gray-700',
    purple: 'border-l-purple-500 bg-gray-800/80 border border-gray-700',
    red: 'border-l-red-500 bg-gray-800/80 border border-gray-700',
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-400" />
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-400" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className={`rounded-lg border-l-4 p-6 shadow-lg transition-all hover:bg-gray-800 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${
                trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 opacity-90">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
