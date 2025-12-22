'use client'

import { useState, useMemo, useEffect } from 'react'
import { weeklyData as fallbackData, formatCurrency, formatPercent, getAllPeriods } from '@/lib/data'
import { getAllWeeklyData } from '@/lib/supabase'
import { filterData, getFilterStats } from '@/lib/filters'
import { FilterState, WeeklyData } from '@/lib/types'
import KPICard from '@/components/KPICard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import SearchBar from '@/components/SearchBar'
import FilterPanel from '@/components/FilterPanel'
import QuickFilters from '@/components/QuickFilters'
import { DollarSign, Target, TrendingUp, CheckCircle, Search, Filter as FilterIcon, Upload, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>(fallbackData)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    period: 'all',
    month: 'all',
    performancePA: 'all',
    performanceN: 'all',
    searchQuery: '',
  })
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // Buscar dados do Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAllWeeklyData()
        if (data.length > 0) {
          setWeeklyDataState(data)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  
  const periods = getAllPeriods(weeklyDataState)
  
  // Aplicar filtros aos dados
  const filteredData = useMemo(() => {
    return filterData(weeklyDataState, filters)
  }, [weeklyDataState, filters])
  
  // Estatísticas dos dados filtrados
  const stats = useMemo(() => {
    return getFilterStats(filteredData)
  }, [filteredData])
  
  // Dados atuais para cards principais (usar dados totais ou filtrados)
  const currentData = filters.period === 'all' 
    ? weeklyDataState[weeklyDataState.length - 1]
    : filteredData.length > 0 
      ? filteredData[filteredData.length - 1]
      : weeklyDataState[weeklyDataState.length - 1]
  
  // Calcular totais e médias (sempre dos dados completos para os cards principais)
  const totalPAAno = weeklyDataState.length > 0 ? weeklyDataState[weeklyDataState.length - 1]?.paAcumuladoAno || 0 : 0
  const totalNAno = weeklyDataState.length > 0 ? weeklyDataState[weeklyDataState.length - 1]?.nAcumuladoAno || 0 : 0
  const mediaPASemanal = weeklyDataState.length > 0 
    ? weeklyDataState.reduce((sum, d) => sum + d.paSemanal, 0) / weeklyDataState.length 
    : 0
  const mediaNSemanal = weeklyDataState.length > 0
    ? weeklyDataState.reduce((sum, d) => sum + d.nSemana, 0) / weeklyDataState.length
    : 0

  // Preparar dados para gráficos (usar dados filtrados) - TODOS OS INDICADORES
  const chartData = filteredData.map(d => ({
    period: d.period,
    // PA
    paSemanal: d.paSemanal,
    metaPASemanal: d.metaPASemanal,
    paAcumuladoMes: d.paAcumuladoMes,
    paAcumuladoAno: d.paAcumuladoAno,
    paEmitido: d.paEmitido,
    percentualMeta: d.percentualMetaPASemana,
    percentualMetaPAAno: d.percentualMetaPAAno,
    // N
    nSemana: d.nSemana,
    metaNSemanal: d.metaNSemanal,
    nAcumuladoMes: d.nAcumuladoMes,
    nAcumuladoAno: d.nAcumuladoAno,
    percentualMetaN: d.percentualMetaNSemana,
    percentualMetaNAno: d.percentualMetaNAno,
    // Apólices e OIs
    apolicesEmitidas: d.apolicesEmitidas,
    oIsAgendadas: d.oIsAgendadas,
    oIsRealizadas: d.oIsRealizadas,
    metaOIsAgendadas: d.metaOIsAgendadas,
    percentualOIsRealizadas: d.percentualOIsRealizadas || 0,
    // RECS
    metaRECS: d.metaRECS || 0,
    novasRECS: d.novasRECS || 0,
    // PCs/C2
    metaPCsC2Agendados: d.metaPCsC2Agendados || 0,
    pcsRealizados: d.pcsRealizados || 0,
    c2Realizados: d.c2Realizados || 0,
    // Atrasos
    apoliceEmAtraso: d.apoliceEmAtraso || 0,
    premioEmAtraso: d.premioEmAtraso || 0,
    // Inadimplência
    taxaInadimplenciaGeral: d.taxaInadimplenciaGeral || 0,
    taxaInadimplenciaAssistente: d.taxaInadimplenciaAssistente || 0,
    // Revisitas
    metaRevisitasAgendadas: d.metaRevisitasAgendadas || 0,
    revisitasAgendadas: d.revisitasAgendadas || 0,
    revisitasRealizadas: d.revisitasRealizadas || 0,
    // Produtividade
    volumeTarefasTrello: d.volumeTarefasTrello || 0,
    videosTreinamentoGravados: d.videosTreinamentoGravados || 0,
    deliveryApolices: d.deliveryApolices || 0,
    totalReunioes: d.totalReunioes || 0,
    // Calculados
    ticketMedio: d.ticketMedio || 0,
  }))

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }))
  }

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const handleQuickFilter = (filter: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...filter }))
  }

  const hasActiveFilters = filters.period !== 'all' || 
    filters.paMin || filters.paMax || 
    filters.nMin || filters.nMax ||
    filters.performancePA !== 'all' || 
    filters.performanceN !== 'all' ||
    filters.month !== 'all' ||
    (filters.searchQuery && filters.searchQuery.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Legathon - Indicadores e Métricas</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-colors ${
                  showSearch
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>
              <Link
                href="/import"
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Importar dados"
              >
                <Upload className="w-5 h-5" />
              </Link>
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                periods={periods}
                isOpen={isFilterPanelOpen}
                onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              />
            </div>
          </div>
          
          {/* Barra de Busca */}
          {showSearch && (
            <div className="mt-4">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Buscar por período, valor, mês, performance (ex: 'acima da meta', 'agosto', '150000')..."
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Painel de Filtros */}
        {isFilterPanelOpen && (
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            periods={periods}
            isOpen={isFilterPanelOpen}
            onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          />
        )}

        {/* Filtros Rápidos */}
        <QuickFilters
          onFilterApply={handleQuickFilter}
          currentFilters={filters}
        />

        {/* Indicador de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilterIcon className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  Mostrando {filteredData.length} de {weeklyDataState.length} períodos
                </p>
              </div>
              <button
                onClick={() => {
                  setFilters({
                    period: 'all',
                    month: 'all',
                    performancePA: 'all',
                    performanceN: 'all',
                    searchQuery: '',
                  })
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Estatísticas dos Dados Filtrados */}
        {hasActiveFilters && filteredData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
            <div>
              <p className="text-xs text-gray-500">Média PA (Filtrado)</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.avgPA)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Média N (Filtrado)</p>
              <p className="text-lg font-bold text-gray-900">{stats.avgN.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Performance PA</p>
              <p className="text-lg font-bold text-gray-900">{formatPercent(stats.avgPerformancePA)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Performance N</p>
              <p className="text-lg font-bold text-gray-900">{formatPercent(stats.avgPerformanceN)}</p>
            </div>
          </div>
        )}

        {/* Cards de KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="PA Acumulado no Ano"
            value={formatCurrency(totalPAAno)}
            subtitle={currentData ? `${formatPercent(currentData.percentualMetaPAAno)} da meta` : ''}
            color="blue"
            icon={<DollarSign className="w-8 h-8 text-blue-600" />}
          />
          <KPICard
            title="N Acumulado no Ano"
            value={totalNAno}
            subtitle={currentData ? `${formatPercent(currentData.percentualMetaNAno)} da meta` : ''}
            color="green"
            icon={<Target className="w-8 h-8 text-green-600" />}
          />
          <KPICard
            title="Média PA Semanal"
            value={formatCurrency(mediaPASemanal)}
            subtitle={`Meta: ${formatCurrency(82000)}`}
            color="purple"
            icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
          />
          <KPICard
            title="Média N Semanal"
            value={mediaNSemanal.toFixed(1)}
            subtitle="Meta: 5"
            color="orange"
            icon={<CheckCircle className="w-8 h-8 text-orange-600" />}
          />
        </div>

        {/* TODOS OS 34 INDICADORES - SEMPRE VISÍVEIS */}
        {currentData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-600" />
              Todos os Indicadores - Período Mais Recente: {currentData.period}
            </h2>

            {/* Seção 1: Indicadores de PA (7 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                PA (Prêmio Anual) - 7 Indicadores
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">PA Semanal Realizado</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(currentData.paSemanal)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <p className="text-xs text-gray-600 mb-1">PA Acumulado no Mês</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(currentData.paAcumuladoMes)}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg border border-blue-400">
                  <p className="text-xs text-gray-600 mb-1">PA Acumulado no Ano</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(currentData.paAcumuladoAno)}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-xs text-gray-600 mb-1">Meta de PA Semanal</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(currentData.metaPASemanal)}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg border border-indigo-300">
                  <p className="text-xs text-gray-600 mb-1">% Meta PA Semana</p>
                  <p className="text-base font-bold text-gray-900">{formatPercent(currentData.percentualMetaPASemana)}</p>
                </div>
                <div className="p-3 bg-indigo-200 rounded-lg border border-indigo-400">
                  <p className="text-xs text-gray-600 mb-1">% Meta PA Ano</p>
                  <p className="text-base font-bold text-gray-900">{formatPercent(currentData.percentualMetaPAAno)}</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-xs text-gray-600 mb-1">PA Emitido na Semana</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(currentData.paEmitido)}</p>
                </div>
              </div>
            </div>

            {/* Seção 2: Indicadores de N (7 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                N (Número de Apólices) - 7 Indicadores
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">Apólices Emitidas</p>
                  <p className="text-base font-bold text-gray-900">{currentData.apolicesEmitidas}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg border border-green-300">
                  <p className="text-xs text-gray-600 mb-1">Meta de N Semanal</p>
                  <p className="text-base font-bold text-gray-900">{currentData.metaNSemanal}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-lg border border-green-400">
                  <p className="text-xs text-gray-600 mb-1">N da Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.nSemana}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-gray-600 mb-1">N Acumulados do Mês</p>
                  <p className="text-base font-bold text-gray-900">{currentData.nAcumuladoMes}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-300">
                  <p className="text-xs text-gray-600 mb-1">N Acumulados do Ano</p>
                  <p className="text-base font-bold text-gray-900">{currentData.nAcumuladoAno}</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-lg border border-emerald-400">
                  <p className="text-xs text-gray-600 mb-1">% Meta N Semana</p>
                  <p className="text-base font-bold text-gray-900">{formatPercent(currentData.percentualMetaNSemana)}</p>
                </div>
                <div className="p-3 bg-lime-50 rounded-lg border border-lime-200">
                  <p className="text-xs text-gray-600 mb-1">% Meta N Ano</p>
                  <p className="text-base font-bold text-gray-900">{formatPercent(currentData.percentualMetaNAno)}</p>
                </div>
              </div>
            </div>

            {/* Seção 3: Indicadores de OIs (3 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                OIs (Oportunidades de Inovação) - 3 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-600 mb-1">Meta OIs Agendadas</p>
                  <p className="text-base font-bold text-gray-900">{currentData.metaOIsAgendadas}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
                  <p className="text-xs text-gray-600 mb-1">OIs Agendadas</p>
                  <p className="text-base font-bold text-gray-900">{currentData.oIsAgendadas}</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-lg border border-purple-400">
                  <p className="text-xs text-gray-600 mb-1">OIs Realizadas na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.oIsRealizadas}</p>
                  {currentData.percentualOIsRealizadas && (
                    <p className="text-xs text-gray-500 mt-1">{formatPercent(currentData.percentualOIsRealizadas)} realizadas</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 4: Indicadores de RECS (2 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                RECS - 2 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-gray-600 mb-1">Meta RECS</p>
                  <p className="text-base font-bold text-gray-900">{currentData.metaRECS !== undefined ? currentData.metaRECS : 'N/A'}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-300">
                  <p className="text-xs text-gray-600 mb-1">Novas RECS</p>
                  <p className="text-base font-bold text-gray-900">{currentData.novasRECS !== undefined ? currentData.novasRECS : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Seção 5: Indicadores de PCs/C2 (3 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-600" />
                PCs/C2 - 3 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                  <p className="text-xs text-gray-600 mb-1">Meta de PCs/C2 Agendados</p>
                  <p className="text-base font-bold text-gray-900">{currentData.metaPCsC2Agendados !== undefined ? currentData.metaPCsC2Agendados : 'N/A'}</p>
                </div>
                <div className="p-3 bg-violet-100 rounded-lg border border-violet-300">
                  <p className="text-xs text-gray-600 mb-1">PCs Realizados na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.pcsRealizados !== undefined ? currentData.pcsRealizados : 'N/A'}</p>
                </div>
                <div className="p-3 bg-violet-200 rounded-lg border border-violet-400">
                  <p className="text-xs text-gray-600 mb-1">C2 Realizados na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.c2Realizados !== undefined ? currentData.c2Realizados : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Seção 6: Indicadores de Atrasos (2 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Atrasos - 2 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-gray-600 mb-1">Apólice em Atraso (nº)</p>
                  <p className="text-base font-bold text-gray-900">{currentData.apoliceEmAtraso !== undefined ? currentData.apoliceEmAtraso : 'N/A'}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg border border-red-300">
                  <p className="text-xs text-gray-600 mb-1">Prêmio em Atraso (R$)</p>
                  <p className="text-base font-bold text-gray-900">{currentData.premioEmAtraso !== undefined ? formatCurrency(currentData.premioEmAtraso) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Seção 7: Taxa de Inadimplência (2 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Taxa de Inadimplência - 2 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-gray-600 mb-1">Taxa de Inadimplência (%) Geral</p>
                  <p className="text-base font-bold text-gray-900">{currentData.taxaInadimplenciaGeral !== undefined ? formatPercent(currentData.taxaInadimplenciaGeral) : 'N/A'}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg border border-amber-300">
                  <p className="text-xs text-gray-600 mb-1">Taxa de Inadimplência (%) Assistente</p>
                  <p className="text-base font-bold text-gray-900">{currentData.taxaInadimplenciaAssistente !== undefined ? formatPercent(currentData.taxaInadimplenciaAssistente) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Seção 8: Indicadores de Revisitas (3 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-sky-600" />
                Revisitas - 3 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                  <p className="text-xs text-gray-600 mb-1">Meta Revisitas Agendadas</p>
                  <p className="text-base font-bold text-gray-900">{currentData.metaRevisitasAgendadas !== undefined ? currentData.metaRevisitasAgendadas : 'N/A'}</p>
                </div>
                <div className="p-3 bg-sky-100 rounded-lg border border-sky-300">
                  <p className="text-xs text-gray-600 mb-1">Revisitas Agendadas na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.revisitasAgendadas !== undefined ? currentData.revisitasAgendadas : 'N/A'}</p>
                </div>
                <div className="p-3 bg-sky-200 rounded-lg border border-sky-400">
                  <p className="text-xs text-gray-600 mb-1">Revisitas Realizadas na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.revisitasRealizadas !== undefined ? currentData.revisitasRealizadas : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Seção 9: Indicadores de Produtividade (4 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                Produtividade - 4 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-lime-50 rounded-lg border border-lime-200">
                  <p className="text-xs text-gray-600 mb-1">Volume de Tarefas Trello</p>
                  <p className="text-base font-bold text-gray-900">{currentData.volumeTarefasTrello !== undefined ? currentData.volumeTarefasTrello : 'N/A'}</p>
                </div>
                <div className="p-3 bg-lime-100 rounded-lg border border-lime-300">
                  <p className="text-xs text-gray-600 mb-1">Vídeos de Treinamento Gravados</p>
                  <p className="text-base font-bold text-gray-900">{currentData.videosTreinamentoGravados !== undefined ? currentData.videosTreinamentoGravados : 'N/A'}</p>
                </div>
                <div className="p-3 bg-lime-200 rounded-lg border border-lime-400">
                  <p className="text-xs text-gray-600 mb-1">Delivery Apólices</p>
                  <p className="text-base font-bold text-gray-900">{currentData.deliveryApolices !== undefined ? currentData.deliveryApolices : 'N/A'}</p>
                </div>
                <div className="p-3 bg-lime-300 rounded-lg border border-lime-500">
                  <p className="text-xs text-gray-600 mb-1">Total de Reuniões Realizadas</p>
                  <p className="text-base font-bold text-gray-900">{currentData.totalReunioes !== undefined ? currentData.totalReunioes : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Seção 10: Lista de Atrasos Raiza */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Lista de Atrasos - Raiza
              </h3>
              <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {currentData.listaAtrasosRaiza || 'N/A'}
                </p>
              </div>
            </div>

            {/* Indicadores Calculados */}
            <div className="mb-6 border-t border-gray-300 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Indicadores Calculados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-xs text-gray-600 mb-1">Ticket Médio</p>
                  <p className="text-base font-bold text-gray-900">{currentData.ticketMedio ? formatCurrency(currentData.ticketMedio) : 'N/A'}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg border border-indigo-300">
                  <p className="text-xs text-gray-600 mb-1">% OIs Realizadas</p>
                  <p className="text-base font-bold text-gray-900">{currentData.percentualOIsRealizadas ? formatPercent(currentData.percentualOIsRealizadas) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indicadores do Período Selecionado */}
        {currentData && filters.period !== 'all' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Indicadores do Período: {filters.period}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">PA Semanal</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(currentData.paSemanal)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPercent(currentData.percentualMetaPASemana)} da meta</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">N da Semana</p>
                <p className="text-lg font-bold text-gray-900">{currentData.nSemana}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPercent(currentData.percentualMetaNSemana)} da meta</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Apólices Emitidas</p>
                <p className="text-lg font-bold text-gray-900">{currentData.apolicesEmitidas}</p>
                {currentData.ticketMedio && (
                  <p className="text-xs text-gray-500 mt-1">Ticket Médio: {formatCurrency(currentData.ticketMedio)}</p>
                )}
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">OIs Agendadas</p>
                <p className="text-lg font-bold text-gray-900">{currentData.oIsAgendadas}</p>
                <p className="text-xs text-gray-500 mt-1">Meta: {currentData.metaOIsAgendadas}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">OIs Realizadas</p>
                <p className="text-lg font-bold text-gray-900">{currentData.oIsRealizadas}</p>
                {currentData.percentualOIsRealizadas && (
                  <p className="text-xs text-gray-500 mt-1">{formatPercent(currentData.percentualOIsRealizadas)} realizadas</p>
                )}
              </div>
            </div>
            {/* Indicadores Adicionais - PA e N */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-600">PA Emitido</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(currentData.paEmitido)}</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <p className="text-sm text-gray-600">PA Acumulado Mês</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(currentData.paAcumuladoMes)}</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-lg">
                <p className="text-sm text-gray-600">N Acumulado Mês</p>
                <p className="text-lg font-bold text-gray-900">{currentData.nAcumuladoMes}</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <p className="text-sm text-gray-600">% Meta PA Ano</p>
                <p className="text-lg font-bold text-gray-900">{formatPercent(currentData.percentualMetaPAAno)}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">% Meta N Ano</p>
                <p className="text-lg font-bold text-gray-900">{formatPercent(currentData.percentualMetaNAno)}</p>
              </div>
            </div>

            {/* Novos Indicadores - RECS, PCs/C2 */}
            {(currentData.metaRECS !== undefined || currentData.novasRECS !== undefined || currentData.metaPCsC2Agendados !== undefined || currentData.pcsRealizados !== undefined || currentData.c2Realizados !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                {currentData.metaRECS !== undefined && (
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-gray-600">Meta RECS</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.metaRECS}</p>
                  </div>
                )}
                {currentData.novasRECS !== undefined && (
                  <div className="p-4 bg-emerald-100 rounded-lg">
                    <p className="text-sm text-gray-600">Novas RECS</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.novasRECS}</p>
                  </div>
                )}
                {currentData.metaPCsC2Agendados !== undefined && (
                  <div className="p-4 bg-violet-50 rounded-lg">
                    <p className="text-sm text-gray-600">Meta PCs/C2 Agendados</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.metaPCsC2Agendados}</p>
                  </div>
                )}
                {currentData.pcsRealizados !== undefined && (
                  <div className="p-4 bg-violet-100 rounded-lg">
                    <p className="text-sm text-gray-600">PCs Realizados</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.pcsRealizados}</p>
                  </div>
                )}
                {currentData.c2Realizados !== undefined && (
                  <div className="p-4 bg-violet-200 rounded-lg">
                    <p className="text-sm text-gray-600">C2 Realizados</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.c2Realizados}</p>
                  </div>
                )}
              </div>
            )}

            {/* Indicadores de Atrasos e Inadimplência */}
            {(currentData.apoliceEmAtraso !== undefined || currentData.premioEmAtraso !== undefined || currentData.taxaInadimplenciaGeral !== undefined || currentData.taxaInadimplenciaAssistente !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                {currentData.apoliceEmAtraso !== undefined && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Apólice em Atraso</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.apoliceEmAtraso}</p>
                  </div>
                )}
                {currentData.premioEmAtraso !== undefined && (
                  <div className="p-4 bg-red-100 rounded-lg">
                    <p className="text-sm text-gray-600">Prêmio em Atraso</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(currentData.premioEmAtraso)}</p>
                  </div>
                )}
                {currentData.taxaInadimplenciaGeral !== undefined && (
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-gray-600">Taxa Inadimplência Geral</p>
                    <p className="text-lg font-bold text-gray-900">{formatPercent(currentData.taxaInadimplenciaGeral)}</p>
                  </div>
                )}
                {currentData.taxaInadimplenciaAssistente !== undefined && (
                  <div className="p-4 bg-amber-100 rounded-lg">
                    <p className="text-sm text-gray-600">Taxa Inadimplência Assistente</p>
                    <p className="text-lg font-bold text-gray-900">{formatPercent(currentData.taxaInadimplenciaAssistente)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Indicadores de Revisitas */}
            {(currentData.metaRevisitasAgendadas !== undefined || currentData.revisitasAgendadas !== undefined || currentData.revisitasRealizadas !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                {currentData.metaRevisitasAgendadas !== undefined && (
                  <div className="p-4 bg-sky-50 rounded-lg">
                    <p className="text-sm text-gray-600">Meta Revisitas Agendadas</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.metaRevisitasAgendadas}</p>
                  </div>
                )}
                {currentData.revisitasAgendadas !== undefined && (
                  <div className="p-4 bg-sky-100 rounded-lg">
                    <p className="text-sm text-gray-600">Revisitas Agendadas</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.revisitasAgendadas}</p>
                  </div>
                )}
                {currentData.revisitasRealizadas !== undefined && (
                  <div className="p-4 bg-sky-200 rounded-lg">
                    <p className="text-sm text-gray-600">Revisitas Realizadas</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.revisitasRealizadas}</p>
                  </div>
                )}
              </div>
            )}

            {/* Indicadores de Produtividade */}
            {(currentData.volumeTarefasTrello !== undefined || currentData.videosTreinamentoGravados !== undefined || currentData.deliveryApolices !== undefined || currentData.totalReunioes !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                {currentData.volumeTarefasTrello !== undefined && (
                  <div className="p-4 bg-lime-50 rounded-lg">
                    <p className="text-sm text-gray-600">Tarefas Trello</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.volumeTarefasTrello}</p>
                  </div>
                )}
                {currentData.videosTreinamentoGravados !== undefined && (
                  <div className="p-4 bg-lime-100 rounded-lg">
                    <p className="text-sm text-gray-600">Vídeos Treinamento</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.videosTreinamentoGravados}</p>
                  </div>
                )}
                {currentData.deliveryApolices !== undefined && (
                  <div className="p-4 bg-lime-200 rounded-lg">
                    <p className="text-sm text-gray-600">Delivery Apólices</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.deliveryApolices}</p>
                  </div>
                )}
                {currentData.totalReunioes !== undefined && (
                  <div className="p-4 bg-lime-300 rounded-lg">
                    <p className="text-sm text-gray-600">Total Reuniões</p>
                    <p className="text-lg font-bold text-gray-900">{currentData.totalReunioes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Lista de Atrasos Raiza */}
            {currentData.listaAtrasosRaiza && (
              <div className="pt-4 border-t border-gray-200">
                <div className="p-4 bg-rose-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Lista de Atrasos - Raiza</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{currentData.listaAtrasosRaiza}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mensagem quando não há resultados */}
        {filteredData.length === 0 && hasActiveFilters && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center mb-8">
            <p className="text-lg font-medium text-yellow-900 mb-2">
              Nenhum resultado encontrado com os filtros aplicados
            </p>
            <p className="text-sm text-yellow-700">
              Tente ajustar os filtros ou limpar para ver todos os dados
            </p>
          </div>
        )}

        {/* GRÁFICOS - TODOS OS INDICADORES VISUALIZADOS */}
        {filteredData.length > 0 && (
          <>
            {/* Seção 1: Indicadores de PA (Prêmio Anual) */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                Indicadores de PA (Prêmio Anual)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">PA Semanal vs Meta</h3>
                  {chartData.length > 0 ? (
                    <BarChart
                      data={chartData}
                      dataKey="paSemanal"
                      name="PA Semanal"
                      color="#0ea5e9"
                      secondDataKey="metaPASemanal"
                      secondName="Meta"
                      secondColor="#10b981"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">% Meta PA Realizada (Semana)</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualMeta"
                      name="% Meta PA"
                      color="#8b5cf6"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">PA Acumulado no Mês</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="paAcumuladoMes"
                      name="PA Acumulado Mês"
                      color="#06b6d4"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">PA Emitido na Semana</h3>
                  {chartData.length > 0 ? (
                    <BarChart
                      data={chartData}
                      dataKey="paEmitido"
                      name="PA Emitido"
                      color="#f59e0b"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 2: Indicadores de N (Número de Apólices) */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-green-600" />
                Indicadores de N (Número de Apólices)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">N da Semana vs Meta</h3>
                  {chartData.length > 0 ? (
                    <BarChart
                      data={chartData}
                      dataKey="nSemana"
                      name="N Semanal"
                      color="#10b981"
                      secondDataKey="metaNSemanal"
                      secondName="Meta"
                      secondColor="#059669"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">% Meta N Realizada</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualMetaN"
                      name="% Meta N"
                      color="#22c55e"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Apólices Emitidas</h3>
                  {chartData.length > 0 ? (
                    <BarChart
                      data={chartData}
                      dataKey="apolicesEmitidas"
                      name="Apólices Emitidas"
                      color="#06b6d4"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">N Acumulado no Mês</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="nAcumuladoMes"
                      name="N Acumulado Mês"
                      color="#14b8a6"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 3: Indicadores de OIs */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-purple-600" />
                Indicadores de OIs (Oportunidades de Inovação)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">OIs Agendadas vs Realizadas</h3>
                  {chartData.length > 0 ? (
                    <BarChart
                      data={chartData}
                      dataKey="oIsAgendadas"
                      name="OIs Agendadas"
                      color="#6366f1"
                      secondDataKey="oIsRealizadas"
                      secondName="OIs Realizadas"
                      secondColor="#14b8a6"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">% OIs Realizadas</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualOIsRealizadas"
                      name="% OIs Realizadas"
                      color="#a855f7"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 4: Indicadores de RECS */}
            {chartData.some(d => d.metaRECS > 0 || d.novasRECS > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                  Indicadores de RECS
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Meta RECS vs Novas RECS</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="metaRECS"
                        name="Meta RECS"
                        color="#10b981"
                        secondDataKey="novasRECS"
                        secondName="Novas RECS"
                        secondColor="#34d399"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Novas RECS</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="novasRECS"
                        name="Novas RECS"
                        color="#34d399"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 5: Indicadores de PCs/C2 */}
            {chartData.some(d => d.metaPCsC2Agendados > 0 || d.pcsRealizados > 0 || d.c2Realizados > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-violet-600" />
                  Indicadores de PCs/C2
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">PCs Realizados vs Meta</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="pcsRealizados"
                        name="PCs Realizados"
                        color="#8b5cf6"
                        secondDataKey="metaPCsC2Agendados"
                        secondName="Meta PCs/C2"
                        secondColor="#a78bfa"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">C2 Realizados</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="c2Realizados"
                        name="C2 Realizados"
                        color="#c084fc"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 6: Indicadores de Atrasos */}
            {chartData.some(d => d.apoliceEmAtraso > 0 || d.premioEmAtraso > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  Indicadores de Atrasos
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Apólices em Atraso</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="apoliceEmAtraso"
                        name="Apólices em Atraso"
                        color="#ef4444"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Prêmio em Atraso (R$)</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="premioEmAtraso"
                        name="Prêmio em Atraso"
                        color="#f87171"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 7: Indicadores de Inadimplência */}
            {chartData.some(d => d.taxaInadimplenciaGeral > 0 || d.taxaInadimplenciaAssistente > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  Taxa de Inadimplência
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Taxa de Inadimplência (%) Geral</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="taxaInadimplenciaGeral"
                        name="Taxa Inadimplência Geral"
                        color="#f59e0b"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Taxa de Inadimplência (%) Assistente</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="taxaInadimplenciaAssistente"
                        name="Taxa Inadimplência Assistente"
                        color="#fbbf24"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 8: Indicadores de Revisitas */}
            {chartData.some(d => d.metaRevisitasAgendadas > 0 || d.revisitasAgendadas > 0 || d.revisitasRealizadas > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-sky-600" />
                  Indicadores de Revisitas
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revisitas Agendadas vs Realizadas</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="revisitasAgendadas"
                        name="Revisitas Agendadas"
                        color="#0ea5e9"
                        secondDataKey="revisitasRealizadas"
                        secondName="Revisitas Realizadas"
                        secondColor="#38bdf8"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revisitas Realizadas</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="revisitasRealizadas"
                        name="Revisitas Realizadas"
                        color="#38bdf8"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 9: Indicadores de Produtividade */}
            {chartData.some(d => d.volumeTarefasTrello > 0 || d.videosTreinamentoGravados > 0 || d.deliveryApolices > 0 || d.totalReunioes > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-lime-600" />
                  Indicadores de Produtividade
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume de Tarefas Trello</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="volumeTarefasTrello"
                        name="Tarefas Trello"
                        color="#84cc16"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Vídeos de Treinamento Gravados</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="videosTreinamentoGravados"
                        name="Vídeos Gravados"
                        color="#a3e635"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Apólices</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="deliveryApolices"
                        name="Delivery Apólices"
                        color="#bef264"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Total de Reuniões Realizadas</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="totalReunioes"
                        name="Total Reuniões"
                        color="#d9f99d"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 10: Indicadores Adicionais */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                Indicadores Adicionais
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Médio</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="ticketMedio"
                      name="Ticket Médio (R$)"
                      color="#6366f1"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">% Meta PA Realizada do Ano</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualMetaPAAno"
                      name="% Meta PA Ano"
                      color="#8b5cf6"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabela de Dados */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Dados Detalhados</h2>
            {hasActiveFilters && (
              <span className="text-sm text-gray-500">
                {filteredData.length} resultado(s)
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            {filteredData.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Período</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PA Semanal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PA Emitido</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Meta PA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N Semanal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Meta N</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apólices</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OIs Agend.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OIs Real.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RECS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PCs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">C2</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atrasos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inadimpl.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revisitas</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">{row.period}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.paSemanal)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.paEmitido)}</td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                        row.percentualMetaPASemana >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercent(row.percentualMetaPASemana)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.nSemana}</td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                        row.percentualMetaNSemana >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercent(row.percentualMetaNSemana)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.apolicesEmitidas}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.oIsAgendadas}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.oIsRealizadas}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.novasRECS !== undefined ? row.novasRECS : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.pcsRealizados !== undefined ? row.pcsRealizados : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.c2Realizados !== undefined ? row.c2Realizados : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.apoliceEmAtraso !== undefined ? row.apoliceEmAtraso : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.taxaInadimplenciaGeral !== undefined ? formatPercent(row.taxaInadimplenciaGeral) : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.revisitasRealizadas !== undefined ? row.revisitasRealizadas : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Nenhum dado encontrado com os filtros aplicados
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Dashboard KPI - Legathon © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
