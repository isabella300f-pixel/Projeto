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

        {/* Gráficos - só mostrar se houver dados */}
        {filteredData.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de PA Semanal vs Meta */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">PA Semanal vs Meta</h2>
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

              {/* Gráfico de % Meta PA */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">% Meta PA Realizada</h2>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de N Semanal vs Meta */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">N Semanal vs Meta</h2>
                {chartData.length > 0 ? (
                  <BarChart
                    data={chartData}
                    dataKey="nSemana"
                    name="N Semanal"
                    color="#f59e0b"
                    secondDataKey="metaNSemanal"
                    secondName="Meta"
                    secondColor="#10b981"
                  />
                ) : (
                  <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                )}
              </div>

              {/* Gráfico de % Meta N */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">% Meta N Realizada</h2>
                {chartData.length > 0 ? (
                  <LineChart
                    data={chartData}
                    dataKey="percentualMetaN"
                    name="% Meta N"
                    color="#ec4899"
                  />
                ) : (
                  <p className="text-gray-500 text-center py-8">Sem dados para exibir</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de Apólices Emitidas */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Apólices Emitidas por Semana</h2>
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

              {/* Gráfico de OIs */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">OIs Agendadas vs Realizadas</h2>
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
