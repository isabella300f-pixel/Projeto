'use client'

// Garantia: todos os gráficos e a aplicação populam EXCLUSIVAMENTE com dados da base (Supabase).
// Fonte única: GET /api/kpi (Supabase ou, se vazio, Google Sheets → upsert no Supabase). Sem dados de exemplo/fallback.
import { useState, useMemo, useEffect } from 'react'
import { formatCurrency, formatPercent, getAllPeriods } from '@/lib/data'
import { filterData, getFilterStats, percentTo100 } from '@/lib/filters'
import { FilterState, WeeklyData } from '@/lib/types'
import KPICard from '@/components/KPICard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import SearchBar from '@/components/SearchBar'
import FilterPanel from '@/components/FilterPanel'
import QuickFilters from '@/components/QuickFilters'
import { DollarSign, Target, TrendingUp, CheckCircle, Search, Filter as FilterIcon, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>([])
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
  const [apiMessage, setApiMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null)

  async function loadKpiData() {
    setApiMessage(null)
    try {
      const response = await fetch('/api/kpi', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      })

      const result = await response.json().catch(() => ({}))
      const meta = result._meta as { source?: string; message?: string } | undefined
      if (meta?.message) {
        setApiMessage(meta.source === 'google_sheets' && meta.message.includes('gravados') ? { type: 'info', text: meta.message } : { type: 'error', text: meta.message })
      }

      if (response.ok) {
        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
          setWeeklyDataState(result.data)
          setLastUpdate(new Date())
        } else if (!result.data || result.data.length === 0) {
          setWeeklyDataState([])
        }
      } else {
        setWeeklyDataState([])
      }
    } catch {
      setWeeklyDataState([])
    } finally {
      setLoading(false)
    }
  }

  /** Atualiza: sincroniza planilha → Supabase e recarrega os dados (inclui novas colunas/semanas). */
  async function refreshData() {
    setApiMessage(null)
    setLoading(true)
    try {
      const res = await fetch('/api/sync-sheets', { method: 'POST', cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (json.success && json.synced > 0) {
        setApiMessage({ type: 'info', text: `${json.synced} períodos sincronizados da planilha.` })
      } else if (json.success) {
        setApiMessage({ type: 'info', text: json.message || 'Sincronização concluída.' })
      } else {
        setApiMessage({ type: 'error', text: json.error || 'Falha ao sincronizar da planilha.' })
      }
      await loadKpiData()
    } catch {
      setApiMessage({ type: 'error', text: 'Erro ao atualizar dados.' })
      await loadKpiData()
    }
  }

  // Carregar dados do Supabase (atualiza ao abrir/atualizar a página)
  useEffect(() => {
    loadKpiData()
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
        if (!isComplete && (mostRecentWithData.paSemanal === 0 || mostRecentWithData.paAcumuladoAno === 0)) {
          const currentIndex = sortedData.findIndex(d => d.period === mostRecentWithData.period)
          const alternativePeriods = sortedData.slice(currentIndex + 1).filter(d => hasCompleteKPIData(d))
          if (alternativePeriods.length > 0) {
            return alternativePeriods[0]
          }
        }
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

  // Dados agregados por mês para PA Acumulado no Mês e N Acumulado no Mês (uma barra/ponto por mês)
  const monthlyChartData = useMemo(() => {
    if (weeklyDataState.length === 0) return []
    const sorted = [...weeklyDataState].sort((a, b) => {
      const dateA = parsePeriodToDate(a.period)
      const dateB = parsePeriodToDate(b.period)
      if (!dateA || !dateB) return 0
      return dateA.getTime() - dateB.getTime()
    })
    const byMonth = new Map<string, { year: number; month: number; paAcumuladoMes: number; nAcumuladoMes: number }>()
    for (const d of sorted) {
      const date = parsePeriodToDate(d.period)
      if (!date) continue
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      byMonth.set(key, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        paAcumuladoMes: d.paAcumuladoMes ?? 0,
        nAcumuladoMes: d.nAcumuladoMes ?? 0,
      })
    }
    const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        period: `${monthNames[v.month]}/${String(v.year).slice(-2)}`,
        paAcumuladoMes: v.paAcumuladoMes,
        nAcumuladoMes: v.nAcumuladoMes,
      }))
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

  const periodLabel = currentData ? currentData.period : '—'

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header compacto: título, ações, status e filtros rápidos */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Linha 1: Logo 300 + Título + Ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 shrink-0">
              {/* Logo 300: quadrado vermelho com "300" em branco */}
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-red-600 text-white font-bold text-sm sm:text-base shadow">
                300
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">KPI Dash - Legatum</h1>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Aceleradora de Franquias</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-colors ${
                  showSearch ? 'bg-blue-500/30 text-blue-300' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
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
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sincroniza a planilha com a base e recarrega os dados (inclui novas colunas/semanas)"
              >
                {loading && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Atualizar dados
              </button>
            </div>
          </div>
          {/* Linha 2: Status + Filtros rápidos na mesma faixa */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-gray-400">
              Supabase: <strong className="text-gray-300">{weeklyDataState.length}</strong> registros
              {lastUpdate && <span className="ml-1 text-green-400">• {lastUpdate.toLocaleTimeString('pt-BR')}</span>}
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">
              Filtrados: <strong className="text-gray-300">{filteredData.length}</strong> de {weeklyDataState.length}
              {periodLabel !== '—' && <span> • Período: {periodLabel}</span>}
            </span>
            {hasActiveFilters && (
              <>
                <span className="text-gray-500">|</span>
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
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Limpar Filtros
                </button>
              </>
            )}
          </div>
          {/* Filtros rápidos integrados ao header */}
          <div className="mt-3 pt-3 border-t border-gray-600">
            <QuickFilters onFilterApply={handleQuickFilter} currentFilters={filters} />
          </div>
          {apiMessage && (
            <div className={`mt-2 px-3 py-2 rounded text-sm ${apiMessage.type === 'info' ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
              {apiMessage.text}
            </div>
          )}
          {showSearch && (
            <div className="mt-3">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Buscar por período, valor, mês, performance (ex: 'acima da meta', 'agosto', '150000')..."
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isFilterPanelOpen && (
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            periods={periods}
            isOpen={isFilterPanelOpen}
            onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          />
        )}

        {/* Estado vazio: sem dados na base — nenhum gráfico ou card usa fallback */}
        {!loading && weeklyDataState.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-8 text-center">
            <p className="text-lg font-medium text-amber-200 mb-2">Nenhum dado na base de dados</p>
            <p className="text-sm text-amber-300 mb-4">
              Atualize a planilha no Google Sheets e clique em <strong>&quot;Atualizar dados&quot;</strong> para sincronizar a planilha com a base e recarregar os gráficos (inclui novas colunas/semanas).
            </p>
            <p className="text-xs text-gray-400">Não há dados de exemplo; a aplicação só exibe o que está na base.</p>
          </div>
        )}

        {hasActiveFilters && filteredData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div>
              <p className="text-xs text-gray-400">Média PA (Filtrado)</p>
              <p className="text-lg font-bold text-white">{formatCurrency(stats.avgPA)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Média N (Filtrado)</p>
              <p className="text-lg font-bold text-white">{stats.avgN.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Performance PA</p>
              <p className="text-lg font-bold text-white">{formatPercent(stats.avgPerformancePA)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Performance N</p>
              <p className="text-lg font-bold text-white">{formatPercent(stats.avgPerformanceN)}</p>
            </div>
          </div>
        )}

        {/* Métricas de Performance (funil) */}
        <h2 className="text-xl font-bold text-white mb-4">Métricas de Performance (funil de conversão)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="PA Acumulado no Ano"
            value={formatCurrency(totalPAAno)}
            subtitle={currentData ? `${formatPercent(currentData.percentualMetaPAAno)} da meta` : ''}
            color="blue"
            icon={<DollarSign className="w-8 h-8 text-blue-400" />}
          />
          <KPICard
            title="N Acumulado no Ano"
            value={totalNAno}
            subtitle={currentData ? `${formatPercent(currentData.percentualMetaNAno)} da meta` : ''}
            color="green"
            icon={<Target className="w-8 h-8 text-green-400" />}
          />
          <KPICard
            title="Média PA Semanal"
            value={formatCurrency(mediaPASemanal)}
            subtitle={`Meta: ${formatCurrency(82000)}`}
            color="purple"
            icon={<TrendingUp className="w-8 h-8 text-purple-400" />}
          />
          <KPICard
            title="Média N Semanal"
            value={mediaNSemanal.toFixed(1)}
            subtitle="Meta: 5"
            color="orange"
            icon={<CheckCircle className="w-8 h-8 text-orange-400" />}
          />
        </div>

        {/* TODOS OS 34 INDICADORES - SEMPRE VISÍVEIS */}
        {currentData && (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-400" />
              Todos os Indicadores - Período Mais Recente: {currentData.period}
            </h2>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                PA (Prêmio Anual) - 7 Indicadores
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="text-xs text-gray-400 mb-1">PA Semanal Realizado</p>
                  <p className="text-base font-bold text-white">
                    {currentData.paSemanal > 0 ? formatCurrency(currentData.paSemanal) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/40">
                  <p className="text-xs text-gray-400 mb-1">PA Acumulado no Mês</p>
                  <p className="text-base font-bold text-white">
                    {currentData.paAcumuladoMes > 0 ? formatCurrency(currentData.paAcumuladoMes) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/25 rounded-lg border border-blue-500/50">
                  <p className="text-xs text-gray-400 mb-1">PA Acumulado no Ano</p>
                  <p className="text-base font-bold text-white">
                    {currentData.paAcumuladoAno > 0 ? formatCurrency(currentData.paAcumuladoAno) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                  <p className="text-xs text-gray-400 mb-1">Meta de PA Semanal</p>
                  <p className="text-base font-bold text-white">
                    {currentData.metaPASemanal > 0 ? formatCurrency(currentData.metaPASemanal) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="p-3 bg-indigo-500/20 rounded-lg border border-indigo-500/40">
                  <p className="text-xs text-gray-400 mb-1">% Meta PA Semana</p>
                  <p className="text-base font-bold text-white">
                    {currentData.percentualMetaPASemana > 0 ? formatPercent(currentData.percentualMetaPASemana) : '0%'}
                  </p>
                </div>
                <div className="p-3 bg-indigo-500/25 rounded-lg border border-indigo-500/50">
                  <p className="text-xs text-gray-400 mb-1">% Meta PA Ano</p>
                  <p className="text-base font-bold text-white">
                    {currentData.percentualMetaPAAno > 0 ? formatPercent(currentData.percentualMetaPAAno) : '0%'}
                  </p>
                </div>
                <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/30">
                  <p className="text-xs text-gray-400 mb-1">PA Emitido na Semana</p>
                  <p className="text-base font-bold text-white">
                    {currentData.paEmitido > 0 ? formatCurrency(currentData.paEmitido) : 'R$ 0,00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 2: Indicadores de N (7 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                N (Número de Apólices) - 7 Indicadores
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-xs text-gray-400 mb-1">Apólices Emitidas</p>
                  <p className="text-base font-bold text-white">{currentData.apolicesEmitidas}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/40">
                  <p className="text-xs text-gray-400 mb-1">Meta de N Semanal</p>
                  <p className="text-base font-bold text-white">{currentData.metaNSemanal}</p>
                </div>
                <div className="p-3 bg-green-500/25 rounded-lg border border-green-500/50">
                  <p className="text-xs text-gray-400 mb-1">N da Semana</p>
                  <p className="text-base font-bold text-white">{currentData.nSemana}</p>
                </div>
                <div className="p-3 bg-emerald-500/100/10 rounded-lg border border-emerald-500/30">
                  <p className="text-xs text-gray-400 mb-1">N Acumulados do Mês</p>
                  <p className="text-base font-bold text-white">{currentData.nAcumuladoMes}</p>
                </div>
                <div className="p-3 bg-emerald-500/100/20 rounded-lg border border-emerald-500/40">
                  <p className="text-xs text-gray-400 mb-1">N Acumulados do Ano</p>
                  <p className="text-base font-bold text-white">{currentData.nAcumuladoAno}</p>
                </div>
                <div className="p-3 bg-emerald-500/100/25 rounded-lg border border-emerald-500/50">
                  <p className="text-xs text-gray-400 mb-1">% Meta N Semana</p>
                  <p className="text-base font-bold text-white">{formatPercent(currentData.percentualMetaNSemana)}</p>
                </div>
                <div className="p-3 bg-lime-500/10 rounded-lg border border-lime-500/30">
                  <p className="text-xs text-gray-400 mb-1">% Meta N Ano</p>
                  <p className="text-base font-bold text-white">{formatPercent(currentData.percentualMetaNAno)}</p>
                </div>
              </div>
            </div>

            {/* Seção 3: Indicadores de OIs (3 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                OIs (Oportunidades de Inovação) - 3 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <p className="text-xs text-gray-400 mb-1">Meta OIs Agendadas</p>
                  <p className="text-base font-bold text-white">{currentData.metaOIsAgendadas}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/40">
                  <p className="text-xs text-gray-400 mb-1">OIs Agendadas</p>
                  <p className="text-base font-bold text-white">{currentData.oIsAgendadas}</p>
                </div>
                <div className="p-3 bg-purple-500/25 rounded-lg border border-purple-500/50">
                  <p className="text-xs text-gray-400 mb-1">OIs Realizadas na Semana</p>
                  <p className="text-base font-bold text-white">{currentData.oIsRealizadas}</p>
                  {currentData.percentualOIsRealizadas && (
                    <p className="text-xs text-gray-400 mt-1">{formatPercent(currentData.percentualOIsRealizadas)} realizadas</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 4: Indicadores de RECS (2 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                RECS - 2 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-500/100/10 rounded-lg border border-emerald-500/30">
                  <p className="text-xs text-gray-400 mb-1">Meta RECS</p>
                  <p className="text-base font-bold text-white">{currentData.metaRECS ?? 0}</p>
                </div>
                <div className="p-3 bg-emerald-500/100/20 rounded-lg border border-emerald-500/40">
                  <p className="text-xs text-gray-400 mb-1">Novas RECS</p>
                  <p className="text-base font-bold text-white">{currentData.novasRECS ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Seção 5: Indicadores de PCs/C2 (3 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-600" />
                PCs/C2 - 3 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-violet-500/10 rounded-lg border border-violet-500/30">
                  <p className="text-xs text-gray-400 mb-1">Meta de PCs/C2 Agendados</p>
                  <p className="text-base font-bold text-white">{currentData.metaPCsC2Agendados ?? 0}</p>
                </div>
                <div className="p-3 bg-violet-500/20 rounded-lg border border-violet-500/40">
                  <p className="text-xs text-gray-400 mb-1">PCs Realizados na Semana</p>
                  <p className="text-base font-bold text-white">{currentData.pcsRealizados ?? 0}</p>
                </div>
                <div className="p-3 bg-violet-500/25 rounded-lg border border-violet-500/50">
                  <p className="text-xs text-gray-400 mb-1">C2 Realizados na Semana</p>
                  <p className="text-base font-bold text-white">{currentData.c2Realizados ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Seção 6: Indicadores de Atrasos (2 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Atrasos - 2 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-xs text-gray-400 mb-1">Apólice em Atraso (nº)</p>
                  <p className="text-base font-bold text-white">{currentData.apoliceEmAtraso ?? 0}</p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/40">
                  <p className="text-xs text-gray-400 mb-1">Prêmio em Atraso (R$)</p>
                  <p className="text-base font-bold text-white">{currentData.premioEmAtraso ? formatCurrency(currentData.premioEmAtraso) : 'R$ 0,00'}</p>
                </div>
              </div>
            </div>

            {/* Seção 7: Taxa de Inadimplência (2 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Taxa de Inadimplência - 2 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <p className="text-xs text-gray-400 mb-1">Taxa de Inadimplência (%) Geral</p>
                  <p className="text-base font-bold text-white">{formatPercent(currentData.taxaInadimplenciaGeral ?? 0)}</p>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/40">
                  <p className="text-xs text-gray-400 mb-1">Taxa de Inadimplência (%) Assistente</p>
                  <p className="text-base font-bold text-white">{formatPercent(currentData.taxaInadimplenciaAssistente ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Seção 8: Indicadores de Revisitas (3 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-sky-600" />
                Revisitas - 3 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-sky-500/10 rounded-lg border border-sky-500/30">
                  <p className="text-xs text-gray-400 mb-1">Meta Revisitas Agendadas</p>
                  <p className="text-base font-bold text-white">{currentData.metaRevisitasAgendadas ?? 0}</p>
                </div>
                <div className="p-3 bg-sky-500/20 rounded-lg border border-sky-500/40">
                  <p className="text-xs text-gray-400 mb-1">Revisitas Agendadas na Semana</p>
                  <p className="text-base font-bold text-white">{currentData.revisitasAgendadas ?? 0}</p>
                </div>
                <div className="p-3 bg-sky-500/25 rounded-lg border border-sky-500/50">
                  <p className="text-xs text-gray-400 mb-1">Revisitas Realizadas na Semana</p>
                  <p className="text-base font-bold text-white">{currentData.revisitasRealizadas ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Seção 9: Indicadores de Produtividade (4 indicadores) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                Produtividade - 4 Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-lime-500/10 rounded-lg border border-lime-500/30">
                  <p className="text-xs text-gray-400 mb-1">Volume de Tarefas Trello</p>
                  <p className="text-base font-bold text-white">{currentData.volumeTarefasTrello ?? 0}</p>
                </div>
                <div className="p-3 bg-lime-500/20 rounded-lg border border-lime-500/40">
                  <p className="text-xs text-gray-400 mb-1">Vídeos de Treinamento Gravados</p>
                  <p className="text-base font-bold text-white">{currentData.videosTreinamentoGravados ?? 0}</p>
                </div>
                <div className="p-3 bg-lime-500/25 rounded-lg border border-lime-500/50">
                  <p className="text-xs text-gray-400 mb-1">Delivery Apólices</p>
                  <p className="text-base font-bold text-white">{currentData.deliveryApolices ?? 0}</p>
                </div>
                <div className="p-3 bg-lime-500/30 rounded-lg border border-lime-500/50">
                  <p className="text-xs text-gray-400 mb-1">Total de Reuniões Realizadas</p>
                  <p className="text-base font-bold text-white">{currentData.totalReunioes ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Seção 10: Lista de Atrasos Raiza */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Lista de Atrasos - Raiza
              </h3>
              <div className="p-4 bg-rose-500/10 rounded-lg border border-rose-500/30">
                <p className="text-sm text-white whitespace-pre-wrap">
                  {currentData.listaAtrasosRaiza || '-'}
                </p>
              </div>
            </div>

            {/* Indicadores Calculados */}
            <div className="mb-6 border-t border-gray-600 pt-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Indicadores Calculados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                  <p className="text-xs text-gray-400 mb-1">Ticket Médio</p>
                  <p className="text-base font-bold text-white">{currentData.ticketMedio ? formatCurrency(currentData.ticketMedio) : 'R$ 0,00'}</p>
                </div>
                <div className="p-3 bg-indigo-500/20 rounded-lg border border-indigo-500/40">
                  <p className="text-xs text-gray-400 mb-1">% OIs Realizadas</p>
                  <p className="text-base font-bold text-white">{formatPercent(currentData.percentualOIsRealizadas ?? 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indicadores do Período Selecionado */}
        {currentData && filters.period !== 'all' && (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Indicadores do Período: {filters.period}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-400">PA Semanal</p>
                <p className="text-lg font-bold text-white">{formatCurrency(currentData.paSemanal)}</p>
                <p className="text-xs text-gray-400 mt-1">{formatPercent(currentData.percentualMetaPASemana)} da meta</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-400">N da Semana</p>
                <p className="text-lg font-bold text-white">{currentData.nSemana}</p>
                <p className="text-xs text-gray-400 mt-1">{formatPercent(currentData.percentualMetaNSemana)} da meta</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-400">Apólices Emitidas</p>
                <p className="text-lg font-bold text-white">{currentData.apolicesEmitidas}</p>
                {currentData.ticketMedio && (
                  <p className="text-xs text-gray-400 mt-1">Ticket Médio: {formatCurrency(currentData.ticketMedio)}</p>
                )}
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-400">OIs Agendadas</p>
                <p className="text-lg font-bold text-white">{currentData.oIsAgendadas}</p>
                <p className="text-xs text-gray-400 mt-1">Meta: {currentData.metaOIsAgendadas}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-400">OIs Realizadas</p>
                <p className="text-lg font-bold text-white">{currentData.oIsRealizadas}</p>
                {currentData.percentualOIsRealizadas && (
                  <p className="text-xs text-gray-400 mt-1">{formatPercent(currentData.percentualOIsRealizadas)} realizadas</p>
                )}
              </div>
            </div>
            {/* Indicadores Adicionais - PA e N */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-600">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-400">PA Emitido</p>
                <p className="text-lg font-bold text-white">{formatCurrency(currentData.paEmitido)}</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <p className="text-sm text-gray-400">PA Acumulado Mês</p>
                <p className="text-lg font-bold text-white">{formatCurrency(currentData.paAcumuladoMes)}</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-lg">
                <p className="text-sm text-gray-400">N Acumulado Mês</p>
                <p className="text-lg font-bold text-white">{currentData.nAcumuladoMes}</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <p className="text-sm text-gray-400">% Meta PA Ano</p>
                <p className="text-lg font-bold text-white">{formatPercent(currentData.percentualMetaPAAno)}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-400">% Meta N Ano</p>
                <p className="text-lg font-bold text-white">{formatPercent(currentData.percentualMetaNAno)}</p>
              </div>
            </div>

            {/* Novos Indicadores - RECS, PCs/C2 */}
            {(currentData.metaRECS !== undefined || currentData.novasRECS !== undefined || currentData.metaPCsC2Agendados !== undefined || currentData.pcsRealizados !== undefined || currentData.c2Realizados !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-600">
                {currentData.metaRECS !== undefined && (
                  <div className="p-4 bg-emerald-500/10 rounded-lg">
                    <p className="text-sm text-gray-400">Meta RECS</p>
                    <p className="text-lg font-bold text-white">{currentData.metaRECS}</p>
                  </div>
                )}
                {currentData.novasRECS !== undefined && (
                  <div className="p-4 bg-emerald-100 rounded-lg">
                    <p className="text-sm text-gray-400">Novas RECS</p>
                    <p className="text-lg font-bold text-white">{currentData.novasRECS}</p>
                  </div>
                )}
                {currentData.metaPCsC2Agendados !== undefined && (
                  <div className="p-4 bg-violet-50 rounded-lg">
                    <p className="text-sm text-gray-400">Meta PCs/C2 Agendados</p>
                    <p className="text-lg font-bold text-white">{currentData.metaPCsC2Agendados}</p>
                  </div>
                )}
                {currentData.pcsRealizados !== undefined && (
                  <div className="p-4 bg-violet-100 rounded-lg">
                    <p className="text-sm text-gray-400">PCs Realizados</p>
                    <p className="text-lg font-bold text-white">{currentData.pcsRealizados}</p>
                  </div>
                )}
                {currentData.c2Realizados !== undefined && (
                  <div className="p-4 bg-violet-200 rounded-lg">
                    <p className="text-sm text-gray-400">C2 Realizados</p>
                    <p className="text-lg font-bold text-white">{currentData.c2Realizados}</p>
                  </div>
                )}
              </div>
            )}

            {/* Indicadores de Atrasos e Inadimplência */}
            {(currentData.apoliceEmAtraso !== undefined || currentData.premioEmAtraso !== undefined || currentData.taxaInadimplenciaGeral !== undefined || currentData.taxaInadimplenciaAssistente !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-600">
                {currentData.apoliceEmAtraso !== undefined && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-400">Apólice em Atraso</p>
                    <p className="text-lg font-bold text-white">{currentData.apoliceEmAtraso}</p>
                  </div>
                )}
                {currentData.premioEmAtraso !== undefined && (
                  <div className="p-4 bg-red-100 rounded-lg">
                    <p className="text-sm text-gray-400">Prêmio em Atraso</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(currentData.premioEmAtraso)}</p>
                  </div>
                )}
                {currentData.taxaInadimplenciaGeral !== undefined && (
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-gray-400">Taxa Inadimplência Geral</p>
                    <p className="text-lg font-bold text-white">{formatPercent(currentData.taxaInadimplenciaGeral)}</p>
                  </div>
                )}
                {currentData.taxaInadimplenciaAssistente !== undefined && (
                  <div className="p-4 bg-amber-100 rounded-lg">
                    <p className="text-sm text-gray-400">Taxa Inadimplência Assistente</p>
                    <p className="text-lg font-bold text-white">{formatPercent(currentData.taxaInadimplenciaAssistente)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Indicadores de Revisitas */}
            {(currentData.metaRevisitasAgendadas !== undefined || currentData.revisitasAgendadas !== undefined || currentData.revisitasRealizadas !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-600">
                {currentData.metaRevisitasAgendadas !== undefined && (
                  <div className="p-4 bg-sky-50 rounded-lg">
                    <p className="text-sm text-gray-400">Meta Revisitas Agendadas</p>
                    <p className="text-lg font-bold text-white">{currentData.metaRevisitasAgendadas}</p>
                  </div>
                )}
                {currentData.revisitasAgendadas !== undefined && (
                  <div className="p-4 bg-sky-100 rounded-lg">
                    <p className="text-sm text-gray-400">Revisitas Agendadas</p>
                    <p className="text-lg font-bold text-white">{currentData.revisitasAgendadas}</p>
                  </div>
                )}
                {currentData.revisitasRealizadas !== undefined && (
                  <div className="p-4 bg-sky-200 rounded-lg">
                    <p className="text-sm text-gray-400">Revisitas Realizadas</p>
                    <p className="text-lg font-bold text-white">{currentData.revisitasRealizadas}</p>
                  </div>
                )}
              </div>
            )}

            {/* Indicadores de Produtividade */}
            {(currentData.volumeTarefasTrello !== undefined || currentData.videosTreinamentoGravados !== undefined || currentData.deliveryApolices !== undefined || currentData.totalReunioes !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-600">
                {currentData.volumeTarefasTrello !== undefined && (
                  <div className="p-4 bg-lime-50 rounded-lg">
                    <p className="text-sm text-gray-400">Tarefas Trello</p>
                    <p className="text-lg font-bold text-white">{currentData.volumeTarefasTrello}</p>
                  </div>
                )}
                {currentData.videosTreinamentoGravados !== undefined && (
                  <div className="p-4 bg-lime-100 rounded-lg">
                    <p className="text-sm text-gray-400">Vídeos Treinamento</p>
                    <p className="text-lg font-bold text-white">{currentData.videosTreinamentoGravados}</p>
                  </div>
                )}
                {currentData.deliveryApolices !== undefined && (
                  <div className="p-4 bg-lime-200 rounded-lg">
                    <p className="text-sm text-gray-400">Delivery Apólices</p>
                    <p className="text-lg font-bold text-white">{currentData.deliveryApolices}</p>
                  </div>
                )}
                {currentData.totalReunioes !== undefined && (
                  <div className="p-4 bg-lime-300 rounded-lg">
                    <p className="text-sm text-gray-400">Total Reuniões</p>
                    <p className="text-lg font-bold text-white">{currentData.totalReunioes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Lista de Atrasos Raiza */}
            {currentData.listaAtrasosRaiza && (
              <div className="pt-4 border-t border-gray-600">
                <div className="p-4 bg-rose-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-300 mb-2">Lista de Atrasos - Raiza</p>
                  <p className="text-sm text-white whitespace-pre-wrap">{currentData.listaAtrasosRaiza}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GRÁFICOS - TODOS OS INDICADORES VISUALIZADOS */}
        {chartData.length > 0 && (
          <>
            {/* Seção 1: Indicadores de PA (Prêmio Anual) */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                Indicadores de PA (Prêmio Anual)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">PA Semanal vs Meta</h3>
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
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">% Meta PA Realizada (Semana)</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualMeta"
                      name="% Meta PA"
                      color="#8b5cf6"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">PA Acumulado no Mês (por mês)</h3>
                  {monthlyChartData.length > 0 ? (
                    <LineChart
                      data={monthlyChartData}
                      dataKey="paAcumuladoMes"
                      name="PA Acumulado Mês"
                      color="#06b6d4"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">PA Emitido na Semana</h3>
                  {chartData.length > 0 ? (
                    <BarChart
                      data={chartData}
                      dataKey="paEmitido"
                      name="PA Emitido"
                      color="#f59e0b"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 2: Indicadores de N (Número de Apólices) */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-green-600" />
                Indicadores de N (Número de Apólices)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">N da Semana vs Meta</h3>
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
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">% Meta N Realizada</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualMetaN"
                      name="% Meta N"
                      color="#22c55e"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Apólices Emitidas</h3>
                  {chartData.length > 0 ? (
                    <BarChart
                      data={chartData}
                      dataKey="apolicesEmitidas"
                      name="Apólices Emitidas"
                      color="#06b6d4"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">N Acumulado no Mês (por mês)</h3>
                  {monthlyChartData.length > 0 ? (
                    <LineChart
                      data={monthlyChartData}
                      dataKey="nAcumuladoMes"
                      name="N Acumulado Mês"
                      color="#14b8a6"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 3: Indicadores de OIs */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-purple-600" />
                Indicadores de OIs (Oportunidades de Inovação)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">OIs Agendadas vs Realizadas</h3>
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
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">% OIs Realizadas</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualOIsRealizadas"
                      name="% OIs Realizadas"
                      color="#a855f7"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 4: Indicadores de RECS */}
            {chartData.some(d => d.metaRECS > 0 || d.novasRECS > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                  Indicadores de RECS
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Meta RECS vs Novas RECS</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="metaRECS"
                        name="Meta RECS"
                        color="#3b82f6"
                        secondDataKey="novasRECS"
                        secondName="Novas RECS"
                        secondColor="#f59e0b"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Novas RECS</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="novasRECS"
                        name="Novas RECS"
                        color="#34d399"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 5: Indicadores de PCs/C2 */}
            {chartData.some(d => d.metaPCsC2Agendados > 0 || d.pcsRealizados > 0 || d.c2Realizados > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-violet-600" />
                  Indicadores de PCs/C2
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">PCs Realizados vs Meta</h3>
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
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">C2 Realizados</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="c2Realizados"
                        name="C2 Realizados"
                        color="#c084fc"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 6: Indicadores de Atrasos */}
            {chartData.some(d => d.apoliceEmAtraso > 0 || d.premioEmAtraso > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  Indicadores de Atrasos
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Apólices em Atraso</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="apoliceEmAtraso"
                        name="Apólices em Atraso"
                        color="#ef4444"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Prêmio em Atraso (R$)</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="premioEmAtraso"
                        name="Prêmio em Atraso"
                        color="#f87171"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 7: Indicadores de Inadimplência */}
            {chartData.some(d => d.taxaInadimplenciaGeral > 0 || d.taxaInadimplenciaAssistente > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  Taxa de Inadimplência
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Taxa de Inadimplência (%) Geral</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="taxaInadimplenciaGeral"
                        name="Taxa Inadimplência Geral"
                        color="#f59e0b"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Taxa de Inadimplência (%) Assistente</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="taxaInadimplenciaAssistente"
                        name="Taxa Inadimplência Assistente"
                        color="#fbbf24"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 8: Indicadores de Revisitas */}
            {chartData.some(d => d.metaRevisitasAgendadas > 0 || d.revisitasAgendadas > 0 || d.revisitasRealizadas > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-sky-600" />
                  Indicadores de Revisitas
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Revisitas Agendadas vs Realizadas</h3>
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
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Revisitas Realizadas</h3>
                    {chartData.length > 0 ? (
                      <LineChart
                        data={chartData}
                        dataKey="revisitasRealizadas"
                        name="Revisitas Realizadas"
                        color="#38bdf8"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 9: Indicadores de Produtividade */}
            {chartData.some(d => d.volumeTarefasTrello > 0 || d.videosTreinamentoGravados > 0 || d.deliveryApolices > 0 || d.totalReunioes > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-lime-600" />
                  Indicadores de Produtividade
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Volume de Tarefas Trello</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="volumeTarefasTrello"
                        name="Tarefas Trello"
                        color="#84cc16"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Vídeos de Treinamento Gravados</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="videosTreinamentoGravados"
                        name="Vídeos Gravados"
                        color="#a3e635"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Delivery Apólices</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="deliveryApolices"
                        name="Delivery Apólices"
                        color="#bef264"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Total de Reuniões Realizadas</h3>
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        dataKey="totalReunioes"
                        name="Total Reuniões"
                        color="#d9f99d"
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 10: Indicadores Adicionais */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                Indicadores Adicionais
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Ticket Médio</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="ticketMedio"
                      name="Ticket Médio (R$)"
                      color="#6366f1"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">% Meta PA Realizada do Ano</h3>
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      dataKey="percentualMetaPAAno"
                      name="% Meta PA Ano"
                      color="#8b5cf6"
                    />
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sem dados para exibir</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabela Dados Detalhados: layout claro com grupos (PA, N, OIs, Outros) e listras */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-600 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold text-white">Dados Detalhados</h2>
            <span className="text-sm text-gray-400">
              {filteredData.length} de {weeklyDataState.length} período(s)
              {hasActiveFilters && ' (com filtros)'}
            </span>
          </div>
          <div className="overflow-x-auto">
            {filteredData.length > 0 ? (
              <table className="w-full min-w-[900px] text-sm border-collapse">
                <thead className="sticky top-0 z-30 bg-gray-800">
                  {/* Linha de grupos: PA | N | OIs | Outros */}
                  <tr className="bg-gray-700/80">
                    <th className="sticky left-0 z-20 w-[130px] min-w-[130px] border-r-2 border-gray-500 bg-gray-700/80 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Período
                    </th>
                    <th colSpan={5} className="border-r border-gray-600 py-1.5 text-center text-[10px] font-semibold uppercase text-blue-300 bg-blue-500/20">
                      PA (Prêmio Anual)
                    </th>
                    <th colSpan={4} className="border-r border-gray-600 py-1.5 text-center text-[10px] font-semibold uppercase text-green-300 bg-green-500/20">
                      N (Apólices)
                    </th>
                    <th colSpan={3} className="border-r border-gray-600 py-1.5 text-center text-[10px] font-semibold uppercase text-purple-300 bg-purple-500/20">
                      OIs
                    </th>
                    <th colSpan={5} className="py-1.5 text-center text-[10px] font-semibold uppercase text-gray-300 bg-gray-600/80">
                      Outros
                    </th>
                  </tr>
                  {/* Linha de nomes das colunas */}
                  <tr className="bg-gray-700">
                    <th className="sticky left-0 z-20 w-[130px] min-w-[130px] border-r-2 border-gray-500 bg-gray-700 px-2 py-2 text-left text-xs font-bold text-white">
                      Semana
                    </th>
                    <th className="w-[90px] min-w-[90px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-blue-300 bg-blue-500/30" title="PA Semanal">PA Sem</th>
                    <th className="w-[90px] min-w-[90px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-blue-300 bg-blue-500/30" title="PA Emitido">PA Emit</th>
                    <th className="w-[75px] min-w-[75px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-blue-300 bg-blue-500/30">% PA Sem</th>
                    <th className="w-[75px] min-w-[75px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-blue-300 bg-blue-500/30">% PA Ano</th>
                    <th className="w-[90px] min-w-[90px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-blue-300 bg-blue-500/30">PA Ac Mês</th>
                    <th className="w-[60px] min-w-[60px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-green-300 bg-green-500/30">N Sem</th>
                    <th className="w-[65px] min-w-[65px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-green-300 bg-green-500/30">Apól.</th>
                    <th className="w-[70px] min-w-[70px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-green-300 bg-green-500/30">% N Sem</th>
                    <th className="w-[70px] min-w-[70px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-green-300 bg-green-500/30">% N Ano</th>
                    <th className="w-[65px] min-w-[65px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-purple-300 bg-purple-500/30">OIs Ag</th>
                    <th className="w-[65px] min-w-[65px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-purple-300 bg-purple-500/30">OIs Real</th>
                    <th className="w-[60px] min-w-[60px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-purple-300 bg-purple-500/30">% OIs</th>
                    <th className="w-[50px] min-w-[50px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-gray-300 bg-gray-600/80">RECS</th>
                    <th className="w-[45px] min-w-[45px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-gray-300 bg-gray-600/80">PCs</th>
                    <th className="w-[45px] min-w-[45px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-gray-300 bg-gray-600/80">C2</th>
                    <th className="w-[55px] min-w-[55px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-gray-300 bg-gray-600/80">Atrasos</th>
                    <th className="w-[65px] min-w-[65px] border-r border-gray-600 px-1 py-2 text-center text-[10px] font-bold text-gray-300 bg-gray-600/80">Inad.</th>
                    <th className="w-[60px] min-w-[60px] px-1 py-2 text-center text-[10px] font-bold text-gray-300 bg-gray-600/80">Revis.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-600/80 hover:bg-gray-600/30 transition-colors ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60'}`}
                    >
                      <td className="sticky left-0 z-10 w-[130px] min-w-[130px] border-r-2 border-gray-500 bg-inherit px-2 py-2.5 text-xs font-semibold text-white whitespace-nowrap">
                        {row.period}
                      </td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-white bg-blue-500/5">{formatCurrency(row.paSemanal)}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-white bg-blue-500/5">{formatCurrency(row.paEmitido)}</td>
                      <td className={`border-r border-gray-600/60 px-1 py-2 text-right text-xs font-semibold bg-blue-500/5 ${percentTo100(row.percentualMetaPASemana) >= 100 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(row.percentualMetaPASemana)}</td>
                      <td className={`border-r border-gray-600/60 px-1 py-2 text-right text-xs font-semibold bg-blue-500/5 ${percentTo100(row.percentualMetaPAAno) >= 100 ? 'text-green-400' : 'text-amber-400'}`}>{formatPercent(row.percentualMetaPAAno)}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-white bg-blue-500/5">{formatCurrency(row.paAcumuladoMes)}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs font-medium text-white bg-green-500/5">{row.nSemana}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-white bg-green-500/5">{row.apolicesEmitidas}</td>
                      <td className={`border-r border-gray-600/60 px-1 py-2 text-right text-xs font-semibold bg-green-500/5 ${percentTo100(row.percentualMetaNSemana) >= 100 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(row.percentualMetaNSemana)}</td>
                      <td className={`border-r border-gray-600/60 px-1 py-2 text-right text-xs font-semibold bg-green-500/5 ${percentTo100(row.percentualMetaNAno) >= 100 ? 'text-green-400' : 'text-amber-400'}`}>{formatPercent(row.percentualMetaNAno)}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-white bg-purple-500/5">{row.oIsAgendadas}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-white bg-purple-500/5">{row.oIsRealizadas}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-white bg-purple-500/5">{row.percentualOIsRealizadas != null ? formatPercent(row.percentualOIsRealizadas) : '—'}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-gray-300 bg-gray-700/30">{row.novasRECS != null ? row.novasRECS : '—'}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-gray-300 bg-gray-700/30">{row.pcsRealizados != null ? row.pcsRealizados : '—'}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-gray-300 bg-gray-700/30">{row.c2Realizados != null ? row.c2Realizados : '—'}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-gray-300 bg-gray-700/30">{row.apoliceEmAtraso != null ? row.apoliceEmAtraso : '—'}</td>
                      <td className="border-r border-gray-600/60 px-1 py-2 text-right text-xs text-gray-300 bg-gray-700/30">{row.taxaInadimplenciaGeral != null ? formatPercent(row.taxaInadimplenciaGeral) : '—'}</td>
                      <td className="px-1 py-2 text-right text-xs text-gray-300 bg-gray-700/30">{row.revisitasRealizadas != null ? row.revisitasRealizadas : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                {weeklyDataState.length === 0 ? (
                  <p className="text-gray-400">Nenhum dado na base. Use &quot;Atualizar dados&quot; para carregar da planilha.</p>
                ) : (
                  <>
                    <p className="text-amber-200 font-medium mb-1">Nenhum período corresponde aos filtros aplicados.</p>
                    <p className="text-sm text-gray-400">Use &quot;Limpar Filtros&quot; no cabeçalho para ver todos os {weeklyDataState.length} períodos.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-400">
            Dashboard KPI - Legathon © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
