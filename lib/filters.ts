import { WeeklyData, FilterState } from './types'

// Função para extrair mês de um período
export function getMonthFromPeriod(period: string): string {
  const months: { [key: string]: string } = {
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro',
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
  }
  
  // Extrai o mês da data inicial do período (formato: DD/MM a DD/MM ou DD/MM/YYYY a DD/MM/YYYY)
  const match = period.match(/(\d{1,2})\/(\d{1,2})(?:\/\d{4})?/)
  if (match) {
    const month = String(match[2]).padStart(2, '0')
    return months[month] || ''
  }
  return ''
}

// Função de busca inteligente
export function matchesSearch(data: WeeklyData, query: string): boolean {
  if (!query) return true
  
  const searchLower = query.toLowerCase().trim()
  
  // Buscar por período (exato ou parcial)
  if (data.period.toLowerCase().includes(searchLower)) return true
  
  // Buscar por valores monetários (permite busca por números)
  const numericQuery = parseFloat(searchLower.replace(/[^\d.]/g, ''))
  if (!isNaN(numericQuery) && numericQuery > 0) {
    // Buscar PA semanal (com margem de 10%)
    if (data.paSemanal >= numericQuery * 0.9 && data.paSemanal <= numericQuery * 1.1) return true
    
    // Buscar N semanal
    if (data.nSemana >= numericQuery * 0.9 && data.nSemana <= numericQuery * 1.1) return true
    
    // Buscar percentual de meta
    if (data.percentualMetaPASemana >= numericQuery * 0.95 && data.percentualMetaPASemana <= numericQuery * 1.05) return true
    if (data.percentualMetaNSemana >= numericQuery * 0.95 && data.percentualMetaNSemana <= numericQuery * 1.05) return true
    
    // Buscar número de apólices
    if (Math.abs(data.apolicesEmitidas - numericQuery) < 0.5) return true
    
    // Buscar OIs
    if (Math.abs(data.oIsAgendadas - numericQuery) < 0.5) return true
    if (Math.abs(data.oIsRealizadas - numericQuery) < 0.5) return true
  }
  
  // Normalizar percentuais para 0–100 (matchesSearch é chamada antes de percentTo100 existir no fluxo; usar lógica equivalente)
  const pPA = (data.percentualMetaPASemana ?? 0) > 2 ? (data.percentualMetaPASemana ?? 0) : (data.percentualMetaPASemana ?? 0) * 100
  const pN = (data.percentualMetaNSemana ?? 0) > 2 ? (data.percentualMetaNSemana ?? 0) : (data.percentualMetaNSemana ?? 0) * 100
  // Buscar por palavras-chave inteligentes
  const keywords: { [key: string]: boolean } = {
    'meta': pPA >= 100 || pN >= 100,
    'acima da meta': pPA > 100 || pN > 100,
    'acima': pPA > 100 || pN > 100,
    'abaixo da meta': pPA < 100 || pN < 100,
    'abaixo': pPA < 100 || pN < 100,
    'alto': data.paSemanal > 150000,
    'alto pa': data.paSemanal > 150000,
    'baixo': data.paSemanal < 80000,
    'baixo pa': data.paSemanal < 80000,
    'excelente': pPA > 150 && pN > 150,
    'bom': pPA >= 100 && pN >= 100,
    'ruim': pPA < 80 || pN < 80,
  }
  
  // Verificar palavras-chave (também busca parcial)
  for (const [key, condition] of Object.entries(keywords)) {
    if (searchLower.includes(key.toLowerCase()) && condition) return true
  }
  
  // Buscar por mês (nome completo ou abreviação)
  const month = getMonthFromPeriod(data.period)
  if (month.toLowerCase().includes(searchLower)) return true
  
  // Buscar por dia (primeiro ou último dia do período)
  const dayMatch = searchLower.match(/\d{1,2}/)
  if (dayMatch) {
    const day = parseInt(dayMatch[0])
    const periodStart = parseInt(data.period.split('/')[0])
    const periodEnd = parseInt(data.period.split('a')[1]?.trim().split('/')[0] || '0')
    if (periodStart === day || periodEnd === day) return true
  }
  
  // Buscar por combinações (ex: "agosto acima")
  if (searchLower.includes('agosto') && month === 'Agosto') return true
  if (searchLower.includes('setembro') && month === 'Setembro') return true
  if (searchLower.includes('outubro') && month === 'Outubro') return true
  if (searchLower.includes('novembro') && month === 'Novembro') return true
  if (searchLower.includes('dezembro') && month === 'Dezembro') return true
  if (searchLower.includes('janeiro') && month === 'Janeiro') return true
  if (searchLower.includes('fevereiro') && month === 'Fevereiro') return true
  
  return false
}

// Função para converter período em data (extrai ano quando presente: DD/MM/YYYY)
export function parsePeriodToDate(period: string): Date | null {
  // Primeiro: tentar extrair ano do formato DD/MM/YYYY
  const matchWithYear = period.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchWithYear) {
    const day = parseInt(matchWithYear[1])
    const month = parseInt(matchWithYear[2]) - 1
    const year = parseInt(matchWithYear[3])
    return new Date(year, month, day)
  }
  
  // Fallback: formato DD/MM sem ano - inferir ano pelo contexto
  const match = period.match(/(\d{1,2})\/(\d{1,2})/)
  if (!match) return null
  
  const day = parseInt(match[1])
  const month = parseInt(match[2]) - 1
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  
  let year = currentYear
  if (month === 11 && currentMonth <= 1) year = currentYear - 1
  else if (month === 0 && currentMonth === 11) year = currentYear + 1
  else if (month > currentMonth) year = currentYear - 1
  
  return new Date(year, month, day)
}

// Função para verificar se período está nos últimos 30 dias (melhorada para transição de ano)
function isWithinLast30Days(period: string): boolean {
  const periodDate = parsePeriodToDate(period)
  if (!periodDate) return false
  
  const today = new Date()
  today.setHours(23, 59, 59, 999) // Fim do dia de hoje
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0) // Início do dia há 30 dias
  
  // Verificar se a data do período está dentro da janela de 30 dias
  // Considerar a data final do período (segunda data no formato "DD/MM a DD/MM" ou "DD/MM A DD/MM")
  const periodEndMatch = period.match(/[aA]\s+(\d{1,2})\/(\d{1,2})/)
  if (periodEndMatch) {
    const endDay = parseInt(periodEndMatch[1])
    const endMonth = parseInt(periodEndMatch[2]) - 1
    
    // Determinar ano da data final (pode ser diferente se cruzar ano)
    let endYear = periodDate.getFullYear()
    if (endMonth < periodDate.getMonth()) {
      // Se o mês final é menor que o inicial, está no próximo ano
      endYear = periodDate.getFullYear() + 1
    } else if (endMonth === 11 && periodDate.getMonth() === 0) {
      // Se vai de janeiro para dezembro, está no mesmo ano
      endYear = periodDate.getFullYear()
    }
    
    const periodEndDate = new Date(endYear, endMonth, endDay)
    periodEndDate.setHours(23, 59, 59, 999)
    
    // Se a data final do período está dentro dos últimos 30 dias, incluir
    return periodEndDate >= thirtyDaysAgo && periodEndDate <= today
  }
  
  // Se não tem data final, usar a data inicial
  return periodDate >= thirtyDaysAgo && periodDate <= today
}

// Normaliza percentual para escala 0–100 (aceita 0–1 ou 0–100 vindos da planilha/Supabase). Exportado para uso na UI.
export function percentTo100(value: number | undefined): number {
  if (value === undefined || value === null) return 0
  if (value > 2 && value <= 10000) return value // já está em 0–100
  if (value >= 0 && value <= 2) return value * 100 // escala 0–1
  return value
}

// Função principal de filtragem
export function filterData(data: WeeklyData[], filters: FilterState): WeeklyData[] {
  let filtered = [...data]
  
  // Filtro por período específico (suporta múltiplos períodos)
  if (filters.period && filters.period !== 'all') {
    if (filters.period === 'last30days') {
      filtered = filtered.filter(d => isWithinLast30Days(d.period))
    } else if (Array.isArray(filters.period) && filters.period.length > 0) {
      const periodSet = new Set(filters.period)
      filtered = filtered.filter(d => periodSet.has(d.period))
    } else if (typeof filters.period === 'string') {
      filtered = filtered.filter(d => d.period === filters.period)
    }
  }
  
  // Filtro por mês (suporta múltiplos meses)
  if (filters.month && filters.month !== 'all') {
    if (Array.isArray(filters.month) && filters.month.length > 0) {
      const monthSet = new Set(filters.month)
      filtered = filtered.filter(d => monthSet.has(getMonthFromPeriod(d.period)))
    } else if (typeof filters.month === 'string') {
      filtered = filtered.filter(d => getMonthFromPeriod(d.period) === filters.month)
    }
  }
  
  // Filtro por faixa de PA
  if (filters.paMin !== undefined) {
    filtered = filtered.filter(d => d.paSemanal >= filters.paMin!)
  }
  if (filters.paMax !== undefined) {
    filtered = filtered.filter(d => d.paSemanal <= filters.paMax!)
  }
  
  // Filtro por faixa de N
  if (filters.nMin !== undefined) {
    filtered = filtered.filter(d => d.nSemana >= filters.nMin!)
  }
  if (filters.nMax !== undefined) {
    filtered = filtered.filter(d => d.nSemana <= filters.nMax!)
  }
  
  // Filtro por performance PA (usa percentual normalizado 0–100)
  if (filters.performancePA && filters.performancePA !== 'all') {
    if (filters.performancePA === 'above') {
      filtered = filtered.filter(d => percentTo100(d.percentualMetaPASemana) > 100)
    } else if (filters.performancePA === 'below') {
      filtered = filtered.filter(d => percentTo100(d.percentualMetaPASemana) < 100)
    } else if (filters.performancePA === 'exact') {
      filtered = filtered.filter(d => {
        const p = percentTo100(d.percentualMetaPASemana)
        return p >= 95 && p <= 105
      })
    }
  }
  
  // Filtro por performance N (usa percentual normalizado 0–100)
  if (filters.performanceN && filters.performanceN !== 'all') {
    if (filters.performanceN === 'above') {
      filtered = filtered.filter(d => percentTo100(d.percentualMetaNSemana) > 100)
    } else if (filters.performanceN === 'below') {
      filtered = filtered.filter(d => percentTo100(d.percentualMetaNSemana) < 100)
    } else if (filters.performanceN === 'exact') {
      filtered = filtered.filter(d => {
        const p = percentTo100(d.percentualMetaNSemana)
        return p >= 95 && p <= 105
      })
    }
  }
  
  // Busca inteligente
  if (filters.searchQuery) {
    filtered = filtered.filter(d => matchesSearch(d, filters.searchQuery || ''))
  }
  
  return filtered
}

// Função para obter estatísticas dos dados filtrados
export function getFilterStats(data: WeeklyData[]) {
  if (data.length === 0) {
    return {
      count: 0,
      avgPA: 0,
      avgN: 0,
      avgPerformancePA: 0,
      avgPerformanceN: 0,
      totalPA: 0,
    }
  }
  
  const avgPA = data.reduce((sum, d) => sum + d.paSemanal, 0) / data.length
  const avgN = data.reduce((sum, d) => sum + d.nSemana, 0) / data.length
  const avgPerformancePA = data.reduce((sum, d) => sum + percentTo100(d.percentualMetaPASemana), 0) / data.length
  const avgPerformanceN = data.reduce((sum, d) => sum + percentTo100(d.percentualMetaNSemana), 0) / data.length
  const totalPA = data.reduce((sum, d) => sum + d.paSemanal, 0)
  
  return {
    count: data.length,
    avgPA,
    avgN,
    avgPerformancePA,
    avgPerformanceN,
    totalPA,
  }
}

