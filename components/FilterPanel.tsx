'use client'

import { Filter, X, Calendar, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { FilterState } from '@/lib/types'

export type { FilterState }

interface FilterPanelProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  periods: string[]
  isOpen: boolean
  onToggle: () => void
}

export default function FilterPanel({
  filters,
  onFilterChange,
  periods,
  isOpen,
  onToggle
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const months = [
    'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Janeiro', 'Fevereiro'
  ]

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      period: 'all',
      month: 'all',
      performancePA: 'all',
      performanceN: 'all',
      searchQuery: ''
    }
    setLocalFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters = filters.period !== 'all' ||
    filters.paMin || filters.paMax ||
    filters.nMin || filters.nMax ||
    filters.performancePA !== 'all' ||
    filters.performanceN !== 'all' ||
    filters.month !== 'all' ||
    filters.searchQuery

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filtros</span>
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
            Ativos
          </span>
        )}
      </button>
    )
  }

  const inputClass = 'w-full px-4 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-gray-100 text-sm font-medium'

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6 mb-6 z-50 relative">
      <div className="flex items-center justify-between mb-6 border-b border-gray-600 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Filtros Avançados</h3>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-400 hover:text-red-300 font-semibold px-3 py-1 rounded hover:bg-red-500/20 transition-colors"
            >
              Limpar Todos
            </button>
          )}
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white hover:bg-gray-600 rounded p-1 transition-colors"
            aria-label="Fechar filtros"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Período Específico</span>
          </label>
          <select
            value={localFilters.period}
            onChange={(e) => updateFilter('period', e.target.value)}
            className={inputClass}
          >
            <option value="all">Todos os Períodos</option>
            {periods.map(period => (
              <option key={period} value={period}>{period}</option>
            ))}
          </select>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Mês</span>
          </label>
          <select
            value={localFilters.month || 'all'}
            onChange={(e) => updateFilter('month', e.target.value)}
            className={inputClass}
          >
            <option value="all">Todos os Meses</option>
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span>Performance PA</span>
          </label>
          <select
            value={localFilters.performancePA || 'all'}
            onChange={(e) => updateFilter('performancePA', e.target.value)}
            className={inputClass}
          >
            <option value="all">Todas</option>
            <option value="above">Acima da Meta (&gt;100%)</option>
            <option value="below">Abaixo da Meta (&lt;100%)</option>
            <option value="exact">Na Meta (≈100%)</option>
          </select>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span>Performance N</span>
          </label>
          <select
            value={localFilters.performanceN || 'all'}
            onChange={(e) => updateFilter('performanceN', e.target.value)}
            className={inputClass}
          >
            <option value="all">Todas</option>
            <option value="above">Acima da Meta (&gt;100%)</option>
            <option value="below">Abaixo da Meta (&lt;100%)</option>
            <option value="exact">Na Meta (≈100%)</option>
          </select>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-400" />
            <span>PA Semanal (Faixa)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Mín"
              value={localFilters.paMin || ''}
              onChange={(e) => updateFilter('paMin', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Máx"
              value={localFilters.paMax || ''}
              onChange={(e) => updateFilter('paMax', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-pink-400" />
            <span>N Semanal (Faixa)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Mín"
              value={localFilters.nMin || ''}
              onChange={(e) => updateFilter('nMin', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Máx"
              value={localFilters.nMax || ''}
              onChange={(e) => updateFilter('nMax', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-6 pt-6 border-t border-gray-600">
          <p className="text-sm font-bold text-gray-300 mb-3">Filtros Ativos:</p>
          <div className="flex flex-wrap gap-2">
            {filters.period !== 'all' && (
              <span className="px-3 py-1.5 bg-blue-500/20 text-blue-300 text-sm font-semibold rounded-full border border-blue-500/50">
                Período: {filters.period}
              </span>
            )}
            {filters.month && filters.month !== 'all' && (
              <span className="px-3 py-1.5 bg-blue-500/20 text-blue-300 text-sm font-semibold rounded-full border border-blue-500/50">
                Mês: {filters.month}
              </span>
            )}
            {filters.performancePA && filters.performancePA !== 'all' && (
              <span className="px-3 py-1.5 bg-green-500/20 text-green-300 text-sm font-semibold rounded-full border border-green-500/50">
                PA: {filters.performancePA === 'above' ? 'Acima' : filters.performancePA === 'below' ? 'Abaixo' : 'Na Meta'}
              </span>
            )}
            {filters.performanceN && filters.performanceN !== 'all' && (
              <span className="px-3 py-1.5 bg-purple-500/20 text-purple-300 text-sm font-semibold rounded-full border border-purple-500/50">
                N: {filters.performanceN === 'above' ? 'Acima' : filters.performanceN === 'below' ? 'Abaixo' : 'Na Meta'}
              </span>
            )}
            {(filters.paMin || filters.paMax) && (
              <span className="px-3 py-1.5 bg-orange-500/20 text-orange-300 text-sm font-semibold rounded-full border border-orange-500/50">
                PA: {filters.paMin || 0} - {filters.paMax || '∞'}
              </span>
            )}
            {(filters.nMin || filters.nMax) && (
              <span className="px-3 py-1.5 bg-pink-500/20 text-pink-300 text-sm font-semibold rounded-full border border-pink-500/50">
                N: {filters.nMin || 0} - {filters.nMax || '∞'}
              </span>
            )}
            {filters.searchQuery && (
              <span className="px-3 py-1.5 bg-gray-600 text-gray-300 text-sm font-semibold rounded-full border border-gray-500">
                Busca: &quot;{filters.searchQuery}&quot;
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
