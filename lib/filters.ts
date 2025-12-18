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
  }
  
  // Extrai o mês da data inicial do período (formato: DD/MM a DD/MM)
  const match = period.match(/(\d{2})\/(\d{2})/)
  if (match) {
    const month = match[2]
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
  
  // Buscar por palavras-chave inteligentes
  const keywords: { [key: string]: boolean } = {
    'meta': data.percentualMetaPASemana >= 100 || data.percentualMetaNSemana >= 100,
    'acima da meta': data.percentualMetaPASemana > 100 || data.percentualMetaNSemana > 100,
    'acima': data.percentualMetaPASemana > 100 || data.percentualMetaNSemana > 100,
    'abaixo da meta': data.percentualMetaPASemana < 100 || data.percentualMetaNSemana < 100,
    'abaixo': data.percentualMetaPASemana < 100 || data.percentualMetaNSemana < 100,
    'alto': data.paSemanal > 150000,
    'alto pa': data.paSemanal > 150000,
    'baixo': data.paSemanal < 80000,
    'baixo pa': data.paSemanal < 80000,
    'excelente': data.percentualMetaPASemana > 150 && data.percentualMetaNSemana > 150,
    'bom': data.percentualMetaPASemana >= 100 && data.percentualMetaNSemana >= 100,
    'ruim': data.percentualMetaPASemana < 80 || data.percentualMetaNSemana < 80,
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

// Função principal de filtragem
export function filterData(data: WeeklyData[], filters: FilterState): WeeklyData[] {
  let filtered = [...data]
  
  // Filtro por período específico
  if (filters.period && filters.period !== 'all') {
    filtered = filtered.filter(d => d.period === filters.period)
  }
  
  // Filtro por mês
  if (filters.month && filters.month !== 'all') {
    filtered = filtered.filter(d => getMonthFromPeriod(d.period) === filters.month)
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
  
  // Filtro por performance PA
  if (filters.performancePA && filters.performancePA !== 'all') {
    if (filters.performancePA === 'above') {
      filtered = filtered.filter(d => d.percentualMetaPASemana > 100)
    } else if (filters.performancePA === 'below') {
      filtered = filtered.filter(d => d.percentualMetaPASemana < 100)
    } else if (filters.performancePA === 'exact') {
      filtered = filtered.filter(d => d.percentualMetaPASemana >= 95 && d.percentualMetaPASemana <= 105)
    }
  }
  
  // Filtro por performance N
  if (filters.performanceN && filters.performanceN !== 'all') {
    if (filters.performanceN === 'above') {
      filtered = filtered.filter(d => d.percentualMetaNSemana > 100)
    } else if (filters.performanceN === 'below') {
      filtered = filtered.filter(d => d.percentualMetaNSemana < 100)
    } else if (filters.performanceN === 'exact') {
      filtered = filtered.filter(d => d.percentualMetaNSemana >= 95 && d.percentualMetaNSemana <= 105)
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
  const avgPerformancePA = data.reduce((sum, d) => sum + d.percentualMetaPASemana, 0) / data.length
  const avgPerformanceN = data.reduce((sum, d) => sum + d.percentualMetaNSemana, 0) / data.length
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

