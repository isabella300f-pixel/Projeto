'use client'

import { FilterState } from '@/lib/types'
import { Zap, TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react'

interface QuickFiltersProps {
  onFilterApply: (filter: Partial<FilterState>) => void
  currentFilters: FilterState
}

export default function QuickFilters({ onFilterApply, currentFilters }: QuickFiltersProps) {
  const quickFilters = [
    {
      label: 'Acima da Meta PA',
      icon: <TrendingUp className="w-4 h-4" />,
      filter: { performancePA: 'above' as const },
      color: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300',
      isActive: currentFilters.performancePA === 'above',
    },
    {
      label: 'Abaixo da Meta PA',
      icon: <TrendingDown className="w-4 h-4" />,
      filter: { performancePA: 'below' as const },
      color: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-300',
      isActive: currentFilters.performancePA === 'below',
    },
    {
      label: 'Acima da Meta N',
      icon: <Target className="w-4 h-4" />,
      filter: { performanceN: 'above' as const },
      color: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-300',
      isActive: currentFilters.performanceN === 'above',
    },
    {
      label: 'Abaixo da Meta N',
      icon: <Target className="w-4 h-4" />,
      filter: { performanceN: 'below' as const },
      color: 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300',
      isActive: currentFilters.performanceN === 'below',
    },
    {
      label: 'Últimos 30 dias',
      icon: <Calendar className="w-4 h-4" />,
      filter: { period: 'last30days' as any, month: 'all' },
      color: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50 text-purple-300',
      isActive: currentFilters.period === 'last30days',
    },
  ]

  const handleClick = (filter: Partial<FilterState>) => {
    onFilterApply({ ...currentFilters, ...filter })
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <span className="flex items-center gap-1 text-sm font-medium text-gray-400 px-2">
        <Zap className="w-4 h-4" />
        Filtros Rápidos:
      </span>
      {quickFilters.map((quickFilter, index) => (
        <button
          key={index}
          onClick={() => handleClick(quickFilter.filter)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            quickFilter.isActive
              ? `${quickFilter.color} ring-2 ring-offset-2 ring-offset-gray-900`
              : quickFilter.color
          }`}
        >
          {quickFilter.icon}
          {quickFilter.label}
        </button>
      ))}
    </div>
  )
}
