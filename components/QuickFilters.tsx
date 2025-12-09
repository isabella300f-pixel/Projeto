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
      color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700',
      isActive: currentFilters.performancePA === 'above',
    },
    {
      label: 'Abaixo da Meta PA',
      icon: <TrendingDown className="w-4 h-4" />,
      filter: { performancePA: 'below' as const },
      color: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700',
      isActive: currentFilters.performancePA === 'below',
    },
    {
      label: 'Acima da Meta N',
      icon: <Target className="w-4 h-4" />,
      filter: { performanceN: 'above' as const },
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
      isActive: currentFilters.performanceN === 'above',
    },
    {
      label: 'Abaixo da Meta N',
      icon: <Target className="w-4 h-4" />,
      filter: { performanceN: 'below' as const },
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700',
      isActive: currentFilters.performanceN === 'below',
    },
    {
      label: 'Últimos 30 dias',
      icon: <Calendar className="w-4 h-4" />,
      filter: { period: 'all', month: 'all' },
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
      isActive: false,
    },
  ]

  const handleClick = (filter: Partial<FilterState>) => {
    // Manter outros filtros e aplicar apenas o novo
    onFilterApply({ ...currentFilters, ...filter })
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <span className="flex items-center gap-1 text-sm font-medium text-gray-600 px-2">
        <Zap className="w-4 h-4" />
        Filtros Rápidos:
      </span>
      {quickFilters.map((quickFilter, index) => (
        <button
          key={index}
          onClick={() => handleClick(quickFilter.filter)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            quickFilter.isActive
              ? `${quickFilter.color} ring-2 ring-offset-2`
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

