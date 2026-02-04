'use client'

import { useState, useMemo, useEffect } from 'react'
import { weeklyData as fallbackData, formatCurrency, formatPercent, getAllPeriods } from '@/lib/data'
import { filterData, getFilterStats } from '@/lib/filters'
import { FilterState, WeeklyData } from '@/lib/types'
import KPICard from '@/components/KPICard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import SearchBar from '@/components/SearchBar'
import FilterPanel from '@/components/FilterPanel'
import QuickFilters from '@/components/QuickFilters'
import { DollarSign, Target, TrendingUp, CheckCircle, Search, Filter as FilterIcon, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>(fallbackData)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    period: 'all',
    month: 'all',
    performancePA: 'all',
    performanceN: 'all',
    searchQuery: '',
  })
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // Carregar dados do Supabase (atualiza ao abrir/atualizar a página)
  useEffect(() => {
    async function loadKpiData() {
      try {
        const response = await fetch('/api/kpi', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            setWeeklyDataState(result.data)
            setLastUpdate(new Date())
          } else if (!result.data || result.data.length === 0) {
            setWeeklyDataState(fallbackData)
          }
        } else {
          setWeeklyDataState(fallbackData)
        }
      } catch {
        setWeeklyDataState(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    loadKpiData()

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadKpiData, 30000)
    return () => clearInterval(interval)
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
  
  // Função auxiliar para converter período em data completa (considerando ano)
  const parsePeriodToDate = (period: string): Date | null => {
    const match = period.match(/(\d{1,2})\/(\d{1,2})/)
    if (!match) return null
    
    const day = parseInt(match[1])
    const month = parseInt(match[2]) - 1 // JavaScript months are 0-indexed
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    let year = currentYear
    
    // Se o mês do período é dezembro (11) e estamos em janeiro/fevereiro, é do ano anterior
    if (month === 11 && currentMonth <= 1) {
      year = currentYear - 1
    }
    // Se o mês do período é janeiro (0) e estamos em dezembro, é do próximo ano
    else if (month === 0 && currentMonth === 11) {
      year = currentYear + 1
    }
    // Se o mês do período é maior que o mês atual, é do ano anterior
    else if (month > currentMonth) {
      year = currentYear - 1
    }
    // Se o mês do período é menor que o mês atual, é do ano atual
    else if (month < currentMonth) {
      year = currentYear
    }
    // Se estamos no mesmo mês, é do ano atual
    else {
      year = currentYear
    }
    
    return new Date(year, month, day)
  }

  // Dados atuais para cards principais (usar dados totais ou filtrados)
  // IMPORTANTE: Buscar o período mais recente com dados válidos (não zerados)
  const currentData = useMemo(() => {
    if (!weeklyDataState || weeklyDataState.length === 0) {
      return null
    }
    
    // Função para verificar se um registro tem dados válidos para exibir KPIs principais
    // Deve ter pelo menos PA Semanal OU PA Acumulado Ano com valores significativos
    const hasValidData = (data: WeeklyData): boolean => {
      // Verificar se tem dados de PA (semanal ou acumulado)
      const hasPAData = data.paSemanal > 0 || data.paAcumuladoAno > 0
      // Verificar se tem meta de PA (importante para cálculos de porcentagem)
      const hasMetaPA = data.metaPASemanal > 0
      // Verificar se tem dados de N ou apólices
      const hasNData = data.nSemana > 0 || data.apolicesEmitidas > 0 || data.nAcumuladoAno > 0
      
      // Para ser considerado válido, deve ter pelo menos dados de PA E meta de PA
      // OU ter dados de N significativos
      return (hasPAData && hasMetaPA) || hasNData
    }
    
    // Função mais rigorosa: verificar se tem dados suficientes para exibir os KPIs principais
    const hasCompleteKPIData = (data: WeeklyData): boolean => {
      // Deve ter pelo menos:
      // 1. PA Semanal OU PA Acumulado Ano (com valores > 0)
      // 2. Meta de PA Semanal (para cálculos de porcentagem)
      // 3. PA Acumulado no Mês OU PA Acumulado no Ano (para exibir nos cards)
      const hasPASemanalOrAcumulado = data.paSemanal > 0 || data.paAcumuladoAno > 0
      const hasMetaPA = data.metaPASemanal > 0
      const hasPAcumuladoMes = data.paAcumuladoMes > 0
      
      // Para KPIs principais, precisamos de dados de PA completos
      return hasPASemanalOrAcumulado && hasMetaPA && (hasPAcumuladoMes || data.paAcumuladoAno > 0)
    }
    
    // Ordenar por período (mais recente primeiro) usando data completa
    const sortedData = [...weeklyDataState].sort((a, b) => {
      const dateA = parsePeriodToDate(a.period)
      const dateB = parsePeriodToDate(b.period)
      
      if (!dateA || !dateB) {
        // Se não conseguir parsear, ordenar alfabeticamente (invertido para mais recente primeiro)
        return b.period.localeCompare(a.period)
      }
      
      // Ordenar por data completa (mais recente primeiro)
      return dateB.getTime() - dateA.getTime()
    })
    
    if (filters.period === 'all') {
      // PRIMEIRO: Tentar encontrar período mais recente com dados COMPLETOS para KPIs
      let mostRecentWithCompleteData = sortedData.find(d => hasCompleteKPIData(d))
      
      // SEGUNDO: Se não encontrar, buscar período mais recente com dados válidos (menos rigoroso)
      if (!mostRecentWithCompleteData) {
        mostRecentWithCompleteData = sortedData.find(d => hasValidData(d))
      }
      
      // TERCEIRO: Se ainda não encontrar, usar o mais recente disponível
      const mostRecentWithData = mostRecentWithCompleteData || sortedData[0] || null
      
      if (mostRecentWithData) {
        const isComplete = hasCompleteKPIData(mostRecentWithData)
        console.log(`✅ [Frontend] Período selecionado: ${mostRecentWithData.period} ${isComplete ? '(dados completos)' : '(dados parciais)'}`)
        console.log('📊 [Frontend] Valores COMPLETOS do período selecionado:', {
          period: mostRecentWithData.period,
          paSemanal: mostRecentWithData.paSemanal,
          paAcumuladoMes: mostRecentWithData.paAcumuladoMes,
          paAcumuladoAno: mostRecentWithData.paAcumuladoAno,
          metaPASemanal: mostRecentWithData.metaPASemanal,
          percentualMetaPASemana: mostRecentWithData.percentualMetaPASemana,
          percentualMetaPAAno: mostRecentWithData.percentualMetaPAAno,
          paEmitido: mostRecentWithData.paEmitido,
          apolicesEmitidas: mostRecentWithData.apolicesEmitidas,
          nSemana: mostRecentWithData.nSemana,
          nAcumuladoAno: mostRecentWithData.nAcumuladoAno
        })
        
        // Se os valores principais estão zerados, tentar encontrar período alternativo
        if (!isComplete && (mostRecentWithData.paSemanal === 0 || mostRecentWithData.paAcumuladoAno === 0)) {
          console.warn('⚠️ [Frontend] ATENÇÃO: Período selecionado tem valores principais zerados!')
          console.warn('⚠️ [Frontend] Tentando encontrar período anterior com dados completos...')
          
          // Tentar encontrar período mais antigo (índices maiores) com dados completos
          const currentIndex = sortedData.findIndex(d => d.period === mostRecentWithData.period)
          const alternativePeriods = sortedData.slice(currentIndex + 1).filter(d => hasCompleteKPIData(d))
          
          if (alternativePeriods.length > 0) {
            const nextValid = alternativePeriods[0]
            console.log('✅ [Frontend] Período alternativo com dados completos encontrado:', nextValid.period)
            console.log('📊 [Frontend] Valores do período alternativo:', {
              paSemanal: nextValid.paSemanal,
              paAcumuladoAno: nextValid.paAcumuladoAno,
              paAcumuladoMes: nextValid.paAcumuladoMes,
              metaPASemanal: nextValid.metaPASemanal,
              paEmitido: nextValid.paEmitido
            })
            return nextValid
          } else {
            console.warn('⚠️ [Frontend] Nenhum período alternativo com dados completos encontrado')
            console.warn('⚠️ [Frontend] Usando período selecionado mesmo com dados parciais')
          }
        }
      } else {
        console.warn('⚠️ [Frontend] Nenhum período com dados válidos encontrado!')
        console.warn('⚠️ [Frontend] Usando primeiro período disponível:', sortedData[0]?.period)
      }
      
      return mostRecentWithData
    } else {
      // Se há filtro de período, usar dados filtrados
      const sortedFiltered = [...filteredData].sort((a, b) => {
        const dateA = parsePeriodToDate(a.period)
        const dateB = parsePeriodToDate(b.period)
        
        if (!dateA || !dateB) {
          return b.period.localeCompare(a.period)
        }
        
        return dateB.getTime() - dateA.getTime()
      })
      const mostRecentFiltered = sortedFiltered.find(d => hasValidData(d))
      return mostRecentFiltered || sortedFiltered[0] || null
    }
  }, [weeklyDataState, filteredData, filters.period])
  
  // Calcular totais e médias (sempre dos dados completos para os cards principais)
  // IMPORTANTE: Usar o último período ordenado (mais recente) para valores acumulados
  const totalPAAno = useMemo(() => {
    if (weeklyDataState.length === 0) return 0
    // Ordenar por período para garantir que pegamos o mais recente
    const sorted = [...weeklyDataState].sort((a, b) => {
      const dateA = parsePeriodToDate(a.period)
      const dateB = parsePeriodToDate(b.period)
      if (!dateA || !dateB) return 0
      return dateA.getTime() - dateB.getTime()
    })
    // Buscar o último período com dados válidos
    const lastWithData = [...sorted].reverse().find(d => d.paAcumuladoAno > 0)
    return lastWithData?.paAcumuladoAno || sorted[sorted.length - 1]?.paAcumuladoAno || 0
  }, [weeklyDataState])
  
  const totalNAno = useMemo(() => {
    if (weeklyDataState.length === 0) return 0
    const sorted = [...weeklyDataState].sort((a, b) => {
      const dateA = parsePeriodToDate(a.period)
      const dateB = parsePeriodToDate(b.period)
      if (!dateA || !dateB) return 0
      return dateA.getTime() - dateB.getTime()
    })
    // Buscar o último período com dados válidos
    const lastWithData = [...sorted].reverse().find(d => d.nAcumuladoAno > 0)
    return lastWithData?.nAcumuladoAno || sorted[sorted.length - 1]?.nAcumuladoAno || 0
  }, [weeklyDataState])
  
  const mediaPASemanal = useMemo(() => {
    if (weeklyDataState.length === 0) return 0
    const validValues = weeklyDataState.filter(d => d.paSemanal > 0)
    if (validValues.length === 0) return 0
    return validValues.reduce((sum, d) => sum + d.paSemanal, 0) / validValues.length
  }, [weeklyDataState])
  
  const mediaNSemanal = useMemo(() => {
    if (weeklyDataState.length === 0) return 0
    const validValues = weeklyDataState.filter(d => d.nSemana > 0)
    if (validValues.length === 0) return 0
    return validValues.reduce((sum, d) => sum + d.nSemana, 0) / validValues.length
  }, [weeklyDataState])

  // Preparar dados para gráficos
  // IMPORTANTE: Usar weeklyDataState (todos os dados) em vez de filteredData para garantir que todos os períodos apareçam
  // Ordenar por período para garantir ordem cronológica correta
  const chartData = useMemo(() => {
    // Ordenar dados por período (cronologicamente)
    const sortedForCharts = [...weeklyDataState].sort((a, b) => {
      const dateA = parsePeriodToDate(a.period)
      const dateB = parsePeriodToDate(b.period)
      if (!dateA || !dateB) return 0
      return dateA.getTime() - dateB.getTime()
    })
    
    const data = sortedForCharts.map(d => ({
      period: d.period,
      // PA
      paSemanal: d.paSemanal || 0,
      metaPASemanal: d.metaPASemanal || 0,
      paAcumuladoMes: d.paAcumuladoMes || 0,
      paAcumuladoAno: d.paAcumuladoAno || 0,
      paEmitido: d.paEmitido || 0,
      percentualMeta: d.percentualMetaPASemana || 0,
      percentualMetaPAAno: d.percentualMetaPAAno || 0,
      // N
      nSemana: d.nSemana || 0,
      metaNSemanal: d.metaNSemanal || 0,
      nAcumuladoMes: d.nAcumuladoMes || 0,
      nAcumuladoAno: d.nAcumuladoAno || 0,
      percentualMetaN: d.percentualMetaNSemana || 0,
      percentualMetaNAno: d.percentualMetaNAno || 0,
      // Apólices e OIs
      apolicesEmitidas: d.apolicesEmitidas || 0,
      oIsAgendadas: d.oIsAgendadas || 0,
      oIsRealizadas: d.oIsRealizadas || 0,
      metaOIsAgendadas: d.metaOIsAgendadas || 0,
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
    
    // Log para debug - verificar valores zerados
    console.log('📊 [Gráficos] Total de períodos para gráficos:', data.length)
    console.log('📊 [Gráficos] Períodos:', data.map(d => d.period))
    
    // Verificar quantos períodos têm valores zerados para cada indicador principal
    const zeroCounts = {
      paSemanal: data.filter(d => d.paSemanal === 0).length,
      paEmitido: data.filter(d => d.paEmitido === 0).length,
      nSemana: data.filter(d => d.nSemana === 0).length,
      apolicesEmitidas: data.filter(d => d.apolicesEmitidas === 0).length,
      oIsRealizadas: data.filter(d => d.oIsRealizadas === 0).length,
      novasRECS: data.filter(d => d.novasRECS === 0).length,
      pcsRealizados: data.filter(d => d.pcsRealizados === 0).length,
      c2Realizados: data.filter(d => d.c2Realizados === 0).length,
      apoliceEmAtraso: data.filter(d => d.apoliceEmAtraso === 0).length,
      premioEmAtraso: data.filter(d => d.premioEmAtraso === 0).length,
      taxaInadimplenciaGeral: data.filter(d => d.taxaInadimplenciaGeral === 0).length,
      revisitasRealizadas: data.filter(d => d.revisitasRealizadas === 0).length,
      volumeTarefasTrello: data.filter(d => d.volumeTarefasTrello === 0).length,
      totalReunioes: data.filter(d => d.totalReunioes === 0).length,
    }
    
    console.log('📊 [Gráficos] Períodos com valores zerados:', zeroCounts)
    
    // Verificar se algum indicador está completamente zerado
    Object.entries(zeroCounts).forEach(([key, count]) => {
      if (count === data.length) {
        console.warn(`⚠️ [Gráficos] ATENÇÃO: ${key} está completamente zerado em todos os ${data.length} períodos!`)
      }
    })
    
    console.log('📊 [Gráficos] Exemplo - PA Semanal do primeiro período:', data[0]?.paSemanal)
    console.log('📊 [Gráficos] Exemplo - PA Semanal do último período:', data[data.length - 1]?.paSemanal)
    
    return data
  }, [weeklyDataState])

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
              <p className="text-sm text-gray-500 mt-1">
                Legathon - Indicadores e Métricas
                {lastUpdate && (
                  <span className="ml-2 text-green-600">
                    • Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </p>
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
            
            {/* Debug: Mostrar valores do currentData */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>Debug:</strong> PA Semanal={currentData.paSemanal}, PA Acumulado Ano={currentData.paAcumuladoAno}, 
                Meta PA={currentData.metaPASemanal}, PA Emitido={currentData.paEmitido}
              </div>
            )}

            {/* Seção 1: Indicadores de PA (7 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                PA (Prêmio Anual) - 7 Indicadores
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">PA Semanal Realizado</p>
                  <p className="text-base font-bold text-gray-900">
                    {currentData.paSemanal > 0 ? formatCurrency(currentData.paSemanal) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <p className="text-xs text-gray-600 mb-1">PA Acumulado no Mês</p>
                  <p className="text-base font-bold text-gray-900">
                    {currentData.paAcumuladoMes > 0 ? formatCurrency(currentData.paAcumuladoMes) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg border border-blue-400">
                  <p className="text-xs text-gray-600 mb-1">PA Acumulado no Ano</p>
                  <p className="text-base font-bold text-gray-900">
                    {currentData.paAcumuladoAno > 0 ? formatCurrency(currentData.paAcumuladoAno) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-xs text-gray-600 mb-1">Meta de PA Semanal</p>
                  <p className="text-base font-bold text-gray-900">
                    {currentData.metaPASemanal > 0 ? formatCurrency(currentData.metaPASemanal) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg border border-indigo-300">
                  <p className="text-xs text-gray-600 mb-1">% Meta PA Semana</p>
                  <p className="text-base font-bold text-gray-900">
                    {currentData.percentualMetaPASemana > 0 ? formatPercent(currentData.percentualMetaPASemana) : '0%'}
                  </p>
                </div>
                <div className="p-3 bg-indigo-200 rounded-lg border border-indigo-400">
                  <p className="text-xs text-gray-600 mb-1">% Meta PA Ano</p>
                  <p className="text-base font-bold text-gray-900">
                    {currentData.percentualMetaPAAno > 0 ? formatPercent(currentData.percentualMetaPAAno) : '0%'}
                  </p>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-xs text-gray-600 mb-1">PA Emitido na Semana</p>
                  <p className="text-base font-bold text-gray-900">
                    {currentData.paEmitido > 0 ? formatCurrency(currentData.paEmitido) : 'R$ 0,00'}
                  </p>
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
                  <p className="text-base font-bold text-gray-900">{currentData.metaRECS ?? 0}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-300">
                  <p className="text-xs text-gray-600 mb-1">Novas RECS</p>
                  <p className="text-base font-bold text-gray-900">{currentData.novasRECS ?? 0}</p>
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
                  <p className="text-base font-bold text-gray-900">{currentData.metaPCsC2Agendados ?? 0}</p>
                </div>
                <div className="p-3 bg-violet-100 rounded-lg border border-violet-300">
                  <p className="text-xs text-gray-600 mb-1">PCs Realizados na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.pcsRealizados ?? 0}</p>
                </div>
                <div className="p-3 bg-violet-200 rounded-lg border border-violet-400">
                  <p className="text-xs text-gray-600 mb-1">C2 Realizados na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.c2Realizados ?? 0}</p>
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
                  <p className="text-base font-bold text-gray-900">{currentData.apoliceEmAtraso ?? 0}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg border border-red-300">
                  <p className="text-xs text-gray-600 mb-1">Prêmio em Atraso (R$)</p>
                  <p className="text-base font-bold text-gray-900">{currentData.premioEmAtraso ? formatCurrency(currentData.premioEmAtraso) : 'R$ 0,00'}</p>
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
                  <p className="text-base font-bold text-gray-900">{formatPercent(currentData.taxaInadimplenciaGeral ?? 0)}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg border border-amber-300">
                  <p className="text-xs text-gray-600 mb-1">Taxa de Inadimplência (%) Assistente</p>
                  <p className="text-base font-bold text-gray-900">{formatPercent(currentData.taxaInadimplenciaAssistente ?? 0)}</p>
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
                  <p className="text-base font-bold text-gray-900">{currentData.metaRevisitasAgendadas ?? 0}</p>
                </div>
                <div className="p-3 bg-sky-100 rounded-lg border border-sky-300">
                  <p className="text-xs text-gray-600 mb-1">Revisitas Agendadas na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.revisitasAgendadas ?? 0}</p>
                </div>
                <div className="p-3 bg-sky-200 rounded-lg border border-sky-400">
                  <p className="text-xs text-gray-600 mb-1">Revisitas Realizadas na Semana</p>
                  <p className="text-base font-bold text-gray-900">{currentData.revisitasRealizadas ?? 0}</p>
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
                  <p className="text-base font-bold text-gray-900">{currentData.volumeTarefasTrello ?? 0}</p>
                </div>
                <div className="p-3 bg-lime-100 rounded-lg border border-lime-300">
                  <p className="text-xs text-gray-600 mb-1">Vídeos de Treinamento Gravados</p>
                  <p className="text-base font-bold text-gray-900">{currentData.videosTreinamentoGravados ?? 0}</p>
                </div>
                <div className="p-3 bg-lime-200 rounded-lg border border-lime-400">
                  <p className="text-xs text-gray-600 mb-1">Delivery Apólices</p>
                  <p className="text-base font-bold text-gray-900">{currentData.deliveryApolices ?? 0}</p>
                </div>
                <div className="p-3 bg-lime-300 rounded-lg border border-lime-500">
                  <p className="text-xs text-gray-600 mb-1">Total de Reuniões Realizadas</p>
                  <p className="text-base font-bold text-gray-900">{currentData.totalReunioes ?? 0}</p>
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
                  {currentData.listaAtrasosRaiza || '-'}
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
                  <p className="text-base font-bold text-gray-900">{currentData.ticketMedio ? formatCurrency(currentData.ticketMedio) : 'R$ 0,00'}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg border border-indigo-300">
                  <p className="text-xs text-gray-600 mb-1">% OIs Realizadas</p>
                  <p className="text-base font-bold text-gray-900">{formatPercent(currentData.percentualOIsRealizadas ?? 0)}</p>
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
        {chartData.length > 0 && (
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

        {/* Tabela de Dados - Layout Ultra Compacto */}
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
              <div className="min-w-full">
                {/* Cabeçalho Fixo */}
                <div className="sticky top-0 z-40 bg-white border-b-2 border-gray-300">
                  <div className="grid grid-cols-[120px_repeat(17,minmax(80px,1fr))] gap-1 px-2 py-2 bg-gray-100">
                    <div className="px-2 py-1 text-xs font-bold text-gray-900 border-r-2 border-gray-400">Período</div>
                    {/* PA */}
                    <div className="px-1 py-1 text-[10px] font-bold text-blue-700 text-center bg-blue-100 border-r border-blue-300" title="PA Semanal Realizado">PA Sem</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-blue-700 text-center bg-blue-100 border-r border-blue-300" title="PA Emitido">PA Emit</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-blue-700 text-center bg-blue-100 border-r border-blue-300" title="% Meta PA Semana">% PA Sem</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-blue-700 text-center bg-blue-100 border-r border-blue-300" title="% Meta PA Ano">% PA Ano</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-blue-700 text-center bg-blue-100 border-r border-blue-300" title="PA Acumulado Mês">PA Ac Mês</div>
                    {/* N */}
                    <div className="px-1 py-1 text-[10px] font-bold text-green-700 text-center bg-green-100 border-r border-green-300" title="N da Semana">N Sem</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-green-700 text-center bg-green-100 border-r border-green-300" title="Apólices Emitidas">Apólices</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-green-700 text-center bg-green-100 border-r border-green-300" title="% Meta N Semana">% N Sem</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-green-700 text-center bg-green-100 border-r border-green-300" title="% Meta N Ano">% N Ano</div>
                    {/* OIs */}
                    <div className="px-1 py-1 text-[10px] font-bold text-purple-700 text-center bg-purple-100 border-r border-purple-300" title="OIs Agendadas">OIs Agend</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-purple-700 text-center bg-purple-100 border-r border-purple-300" title="OIs Realizadas">OIs Real</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-purple-700 text-center bg-purple-100 border-r border-purple-300" title="% OIs Realizadas">% OIs</div>
                    {/* Outros */}
                    <div className="px-1 py-1 text-[10px] font-bold text-gray-700 text-center bg-gray-100 border-r border-gray-300" title="Novas RECS">RECS</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-gray-700 text-center bg-gray-100 border-r border-gray-300" title="PCs Realizados">PCs</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-gray-700 text-center bg-gray-100 border-r border-gray-300" title="C2 Realizados">C2</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-gray-700 text-center bg-gray-100 border-r border-gray-300" title="Apólice em Atraso">Atrasos</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-gray-700 text-center bg-gray-100 border-r border-gray-300" title="Taxa Inadimplência">Inadimpl</div>
                    <div className="px-1 py-1 text-[10px] font-bold text-gray-700 text-center bg-gray-100" title="Revisitas Realizadas">Revisitas</div>
                  </div>
                </div>
                {/* Dados */}
                <div className="divide-y divide-gray-200">
                  {filteredData.map((row, index) => (
                    <div key={index} className="grid grid-cols-[120px_repeat(17,minmax(80px,1fr))] gap-1 px-2 py-2 hover:bg-blue-50 transition-colors">
                      <div className="px-2 py-1 text-xs font-bold text-gray-900 sticky left-0 bg-white z-30 border-r-2 border-gray-400">
                        {row.period}
                      </div>
                      {/* PA */}
                      <div className="px-1 py-1 text-xs text-gray-900 text-right font-medium bg-blue-50/50">{formatCurrency(row.paSemanal)}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-blue-50/50">{formatCurrency(row.paEmitido)}</div>
                      <div className={`px-1 py-1 text-xs font-bold text-right bg-blue-50/50 ${row.percentualMetaPASemana >= 100 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatPercent(row.percentualMetaPASemana)}
                      </div>
                      <div className={`px-1 py-1 text-xs font-bold text-right bg-blue-50/50 ${row.percentualMetaPAAno >= 100 ? 'text-green-700' : 'text-orange-700'}`}>
                        {formatPercent(row.percentualMetaPAAno)}
                      </div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-blue-50/50">{formatCurrency(row.paAcumuladoMes)}</div>
                      {/* N */}
                      <div className="px-1 py-1 text-xs text-gray-900 text-right font-medium bg-green-50/50">{row.nSemana}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-green-50/50">{row.apolicesEmitidas}</div>
                      <div className={`px-1 py-1 text-xs font-bold text-right bg-green-50/50 ${row.percentualMetaNSemana >= 100 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatPercent(row.percentualMetaNSemana)}
                      </div>
                      <div className={`px-1 py-1 text-xs font-bold text-right bg-green-50/50 ${row.percentualMetaNAno >= 100 ? 'text-green-700' : 'text-orange-700'}`}>
                        {formatPercent(row.percentualMetaNAno)}
                      </div>
                      {/* OIs */}
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-purple-50/50">{row.oIsAgendadas}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-purple-50/50">{row.oIsRealizadas}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-purple-50/50">
                        {row.percentualOIsRealizadas ? formatPercent(row.percentualOIsRealizadas) : '-'}
                      </div>
                      {/* Outros */}
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-gray-50/50">{row.novasRECS !== undefined ? row.novasRECS : '-'}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-gray-50/50">{row.pcsRealizados !== undefined ? row.pcsRealizados : '-'}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-gray-50/50">{row.c2Realizados !== undefined ? row.c2Realizados : '-'}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-gray-50/50">{row.apoliceEmAtraso !== undefined ? row.apoliceEmAtraso : '-'}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-gray-50/50">{row.taxaInadimplenciaGeral !== undefined ? formatPercent(row.taxaInadimplenciaGeral) : '-'}</div>
                      <div className="px-1 py-1 text-xs text-gray-900 text-right bg-gray-50/50">{row.revisitasRealizadas !== undefined ? row.revisitasRealizadas : '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
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
