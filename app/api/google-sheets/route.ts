import { NextResponse } from 'next/server'
import { WeeklyData } from '@/lib/types'
import { parsePeriodToDate } from '@/lib/filters'
import * as XLSX from 'xlsx'

// URL do Google Sheets: deve ser exportação CSV (pub?output=csv), não a de visualização (pubhtml).
// Mesmo documento: https://.../pubhtml → para o app use: .../pub?output=csv (ou com &gid=ID_ABA)
const DEFAULT_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQqsDxx9BwfPITN8hF-3AgC_wCXvtVz4A6-avB1mTGDf5AwYQwxUpQNeKWXDjJ5PCBZYDTiLNVIUNa_/pub?output=csv'
const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL || DEFAULT_SHEETS_URL

// Função para normalizar nomes de colunas
const normalizeKey = (key: string) => 
  key.toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[%()]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Função para normalizar período (suporta DD/MM/YYYY a DD/MM/YYYY e DD/MM a DD/MM)
const normalizePeriod = (period: string): string => {
  return period
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*[Aa]\s*/g, ' a ')
}

// Mantém período normalizado COM ANO quando presente (evita perda de ano na transição 2025→2026)
const normalizePeriodKey = (period: string): string => {
  return normalizePeriod(period)
}

// Função para validar período (MUITO MAIS RESTRITIVA)
const isValidPeriod = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false
  
  const normalized = value.trim().toLowerCase()
  
  // Deve ter entre 8 e 35 caracteres (formato: "18/08 a 24/08", "18/08/2025 a 24/08/2025" ou "12/01 A 18/01")
  if (normalized.length < 8 || normalized.length > 35) return false
  
  // Lista expandida de padrões inválidos
  const invalidPatterns = [
    'simples nacional', 'anexo', 'indica', 'célula', 'celula',
    'output', 'input', 'informação', 'informacao', 'permit',
    'alterar', 'conteúdo', 'conteudo', 'fórmula', 'formula',
    'perdida', 'atalho', 'simulação', 'simulacao', 'hipótese',
    'hipotese', 'cartão', 'cartao', 'crédito', 'credito',
    'débito', 'debito', 'vista', 'dinheiro', 'caixa', 'capital',
    'giro', 'ciclo', 'diária', 'diaria', 'franqueado', 'gerenciamento',
    'regime', 'tributário', 'tributario', 'saco', 'unidade', 'medida',
    'taxa', 'retorno', 'irr', 'tir', 'prazo', 'médio', 'medio',
    'estoque', 'pagto', 'recebimento', 'percentual', 'índice', 'indice', 'financeiro',
    'unid a de de medid a', 'unidade de medida', 'p a emitido', 'c2 a gend a dos',
    'meta', 'met a', 'pcs', 'c2', 'agend', 'agendados', 'emitido', 'emit', 'até',
    'premio', 'apolice', 'apolices', 'numero', 'quantidade', 'qtd', 'total',
    'realizado', 'realizada', 'realizados', 'acumulado', 'acumulados',
    'semanal', 'semana', 'mes', 'ano', 'geral', 'assistente', 'raiza',
    'trello', 'video', 'reuniao', 'delivery', 'tarefa', 'treinamento'
  ]
  
  // Se contém qualquer padrão inválido, rejeitar
  for (const pattern of invalidPatterns) {
    if (normalized.includes(pattern)) {
      return false
    }
  }
  
  // DEVE ter pelo menos um padrão de data válido
  // Formato: "DD/MM a DD/MM", "DD/MM/YYYY a DD/MM/YYYY" ou "DD/MM"
  const hasDatePattern = /\d{1,2}\/\d{1,2}(?:\/\d{4})?/.test(normalized)
  const hasPeriodPattern = /\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+[aA]\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?/.test(normalized)
  
  // Se não tem padrão de data, rejeitar
  if (!hasDatePattern && !hasPeriodPattern) {
    return false
  }
  
  // Validar que os números fazem sentido (dia entre 1-31, mês entre 1-12)
  const dateMatches = normalized.match(/(\d{1,2})\/(\d{1,2})/g)
  if (dateMatches) {
    for (const match of dateMatches) {
      const [day, month] = match.split('/').map(Number)
      if (day < 1 || day > 31 || month < 1 || month > 12) {
        return false
      }
    }
  }
  
  // Aceitar TODOS os meses (incluindo dezembro e janeiro)
  // Não rejeitar baseado no mês específico
  
  return true
}

// Função para converter valor para número (melhorada - trata porcentagens e erros da planilha)
const parseNumber = (value: any, isPercentage: boolean = false): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  
  // Tratar erros de fórmula do Excel/Sheets
  if (typeof value === 'string') {
    const s = value.trim().toUpperCase()
    if (s === '#VALUE!' || s === '#DIV/0!' || s === '#N/A' || s === '#REF!' || s === '#NAME?') return undefined
  }
  
  // Verificar se é porcentagem pelo valor original
  const originalString = typeof value === 'string' ? value : String(value)
  const hasPercentSign = originalString.includes('%')
  const shouldDivideBy100 = isPercentage || hasPercentSign
  
  if (typeof value === 'number') {
    const result = isNaN(value) ? undefined : value
    // Se for porcentagem e o valor parece estar em formato inteiro (ex: 13984 ao invés de 139.84)
    // Valores entre 100 e 100000 que são inteiros provavelmente precisam ser divididos por 100
    if (result !== undefined && shouldDivideBy100 && result >= 100 && result < 100000 && Number.isInteger(result)) {
      return result / 100
    }
    return result
  }
  
  if (typeof value === 'string') {
    const originalCleaned = value.trim()
    const hasComma = originalCleaned.includes(',')
    const hasDot = originalCleaned.includes('.')
    // Primeiro isolar dígitos, ponto e vírgula (ex: "R$ 114.668,50" -> "114.668,50")
    let cleaned = originalCleaned.replace(/[^\d.,\-]/g, '')
    // Formato BR: milhar = . decimal = , (ex: 114.668,50 = 114668.50)
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.')
    }
    if (cleaned === '' || cleaned === '-') return undefined
    let parsed = parseFloat(cleaned)
    if (isNaN(parsed)) return undefined
    
    // Se for porcentagem e o valor parece estar em formato inteiro (ex: 13984 ao invés de 139.84)
    // Critérios: valor >= 100, < 100000, não tem vírgula nem ponto no original (ou só tem como separador de milhar)
    const isLikelyIntegerPercentage = shouldDivideBy100 && 
                                      parsed >= 100 && 
                                      parsed < 100000 && 
                                      !cleaned.includes('.') && // Não tem ponto decimal após limpeza
                                      (!hasComma || !hasDot) // Não tinha vírgula ou ponto como decimal no original
    
    if (isLikelyIntegerPercentage) {
      parsed = parsed / 100
      console.log(`📊 [parseNumber] Convertendo porcentagem: ${value} -> ${parsed}%`)
    }
    
    return parsed
  }
  
  return undefined
}

// Função auxiliar para buscar valor com múltiplas variações (MELHORADA - MAIS RESTRITIVA)
const getValue = (rowMap: any, variations: string[], debugKey?: string, isPercentage: boolean = false): number | undefined => {
  // Primeiro: busca exata (mais confiável)
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    
    if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
      const value = parseNumber(rowMap[normalized], isPercentage)
      if (value !== undefined) {
        // Não ignorar zeros para porcentagens ou valores importantes
        if (value !== 0 || isPercentage) {
          if (debugKey) console.log(`✅ [${debugKey}] Encontrado exato: "${variation}" (normalizado: "${normalized}") = ${value}${isPercentage ? '%' : ''}`)
          return value
        }
      }
    }
  }
  
  // Segundo: busca parcial (contém a variação) - mas mais restritiva
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    
    // Extrair palavras-chave principais da variação
    const variationKeywords = normalized.split(' ').filter(w => w.length > 2)
    
    for (const key in rowMap) {
      const normalizedKey = normalizeKey(key)
      
      // Verificar se TODAS as palavras-chave principais estão presentes na coluna
      const allKeywordsMatch = variationKeywords.every(kw => normalizedKey.includes(kw))
      
      if (allKeywordsMatch && normalizedKey.length < 100) { // Evitar colunas muito longas (provavelmente descritivas)
        const value = parseNumber(rowMap[key], isPercentage)
        if (value !== undefined) {
          if (value !== 0 || isPercentage) {
            if (debugKey) console.log(`✅ [${debugKey}] Encontrado parcial: "${variation}" em coluna "${key}" = ${value}${isPercentage ? '%' : ''}`)
            return value
          }
        }
      }
    }
  }
  
  // Terceiro: busca por palavras-chave individuais (apenas se a variação tiver palavras-chave claras)
  const mainKeywords = ['pa semanal', 'pa acumulado', 'n semana', 'n acumulado', 'ois agendadas', 'ois realizadas', 
                       'recs', 'pcs realizados', 'c2 realizados', 'atraso', 'inadimplencia', 'revisita', 
                       'trello', 'video', 'delivery', 'reuniao']
  
  for (const mainKeyword of mainKeywords) {
    if (variations.some(v => normalizeKey(v).includes(mainKeyword))) {
      for (const key in rowMap) {
        const normalizedKey = normalizeKey(key)
        // Match mais específico: a coluna deve conter a palavra-chave principal
        if (normalizedKey.includes(mainKeyword) && normalizedKey.length < 80) {
          const value = parseNumber(rowMap[key], isPercentage)
          if (value !== undefined) {
            if (value !== 0 || isPercentage) {
              if (debugKey) console.log(`✅ [${debugKey}] Encontrado por palavra-chave "${mainKeyword}" em "${key}" = ${value}${isPercentage ? '%' : ''}`)
              return value
            }
          }
        }
      }
    }
  }
  
  if (debugKey) {
    console.log(`⚠️ [${debugKey}] NÃO encontrado. Variações tentadas:`, variations.slice(0, 3))
  }
  return undefined
}

// Função auxiliar para buscar texto
const getTextValue = (rowMap: any, variations: string[]): string | undefined => {
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
      const value = String(rowMap[normalized]).trim()
      if (value && value !== 'undefined' && value !== 'null') return value
    }
    
    // Busca parcial
    for (const key in rowMap) {
      const normalizedKey = normalizeKey(key)
      if (normalizedKey.includes(normalized) || normalized.includes(normalizedKey)) {
        const value = String(rowMap[key] || '').trim()
        if (value && value !== 'undefined' && value !== 'null') return value
      }
    }
  }
  return undefined
}

// Função para buscar dados do Google Sheets (exportada para uso direto na rota KPI, evitando fetch à própria API e 401 por proteção Vercel)
export async function fetchGoogleSheetsData(): Promise<WeeklyData[]> {
  try {
    console.log('🔄 [Google Sheets] Buscando dados...')
    console.log('📋 [Google Sheets] URL:', GOOGLE_SHEETS_URL)
    
    // Buscar CSV do Google Sheets com timeout maior
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
    
    const response = await fetch(GOOGLE_SHEETS_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar Google Sheets: ${response.status} ${response.statusText}`)
    }
    
    const csvText = await response.text()
    
    if (!csvText || csvText.trim().length === 0) {
      console.error('❌ [Google Sheets] CSV vazio retornado')
      return []
    }
    
    console.log('✅ [Google Sheets] CSV recebido, tamanho:', csvText.length, 'caracteres')
    console.log('📄 [Google Sheets] Primeiras 500 caracteres:', csvText.substring(0, 500))
    
    // Converter CSV para JSON usando XLSX
    const workbook = XLSX.read(csvText, { 
      type: 'string',
      cellDates: false,
      cellNF: false,
      cellText: false
    })
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.error('❌ [Google Sheets] Nenhuma planilha encontrada no workbook')
      return []
    }
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    console.log('📊 [Google Sheets] Planilha encontrada:', sheetName)
    
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      dateNF: 'dd/mm/yyyy',
      blankrows: false
    })
    
    console.log('📈 [Google Sheets] Total de linhas no JSON:', jsonData.length)
    
    if (!jsonData || jsonData.length === 0) {
      console.error('❌ [Google Sheets] Nenhum dado encontrado após conversão')
      return []
    }
    
    // Log das colunas encontradas (primeira linha)
    if (jsonData.length > 0) {
      const firstRow = jsonData[0]
      const columns = Object.keys(firstRow)
      console.log('📋 [Google Sheets] Colunas encontradas (primeiras 20):', columns.slice(0, 20))
      console.log('📋 [Google Sheets] Total de colunas:', columns.length)
      console.log('📋 [Google Sheets] TODAS as colunas:', columns)
      console.log('📋 [Google Sheets] Primeira linha completa:', JSON.stringify(firstRow, null, 2).substring(0, 2000))
      
      // Criar mapa de todas as colunas normalizadas para debug
      const normalizedColumns: any = {}
      columns.forEach(col => {
        normalizedColumns[normalizeKey(col)] = col
      })
      console.log('📋 [Google Sheets] Colunas normalizadas (primeiras 30):', Object.keys(normalizedColumns).slice(0, 30))
    }
    
    // NOVA LÓGICA: Os períodos estão nos CABEÇALHOS das colunas, não em uma coluna "período"
    // Estrutura: Coluna A = "Indicador", Colunas O+ = Períodos
    // Cada linha representa um indicador diferente, e cada coluna (período) tem o valor desse indicador
    
    // 1. Identificar quais colunas são períodos válidos
    const firstRow = jsonData[0] || {}
    const allColumns = Object.keys(firstRow)
    const periodColumns: { originalKey: string, normalizedKey: string, period: string }[] = []
    
    console.log('🔍 [Google Sheets] Identificando colunas de período...')
    
    for (const col of allColumns) {
      const normalizedCol = normalizeKey(col)
      // Ignorar a coluna "Indicador"
      if (normalizedCol === 'indicador' || normalizedCol === 'indicator') {
        continue
      }
      
      // Validar se é um período válido
      const periodValue = String(col).trim()
      if (isValidPeriod(periodValue)) {
        const normalizedPeriod = normalizePeriodKey(periodValue)
        periodColumns.push({
          originalKey: col,
          normalizedKey: normalizedCol,
          period: normalizedPeriod
        })
        console.log(`✅ [Período] Coluna identificada: "${col}" -> "${normalizedPeriod}"`)
      }
    }
    
    console.log(`📅 [Google Sheets] Total de colunas de período encontradas: ${periodColumns.length}`)
    console.log(`📅 [Google Sheets] Períodos:`, periodColumns.map(p => p.period))
    
    if (periodColumns.length === 0) {
      console.error('❌ [Google Sheets] NENHUMA coluna de período válida encontrada!')
      console.error('❌ [Google Sheets] Verifique se os cabeçalhos das colunas contêm períodos no formato "DD/MM a DD/MM"')
      return []
    }
    
    // 2. Mapear cada linha (indicador) para cada período (coluna)
    const mappedData: WeeklyData[] = []
    const indicatorFieldMap: { [key: string]: keyof WeeklyData } = {
      // PA - Múltiplas variações
      'pa semanal realizado': 'paSemanal',
      'pa semanal': 'paSemanal',
      'pa realizado': 'paSemanal',
      'premio anual semanal': 'paSemanal',
      'pa acumulado no mes': 'paAcumuladoMes',
      'pa acumulado mes': 'paAcumuladoMes',
      'pa acumulado do mes': 'paAcumuladoMes',
      'pa acumulado no ano': 'paAcumuladoAno',
      'pa acumulado ano': 'paAcumuladoAno',
      'pa acumulado do ano': 'paAcumuladoAno',
      'meta de pa semanal necessaria': 'metaPASemanal',
      'meta pa semanal': 'metaPASemanal',
      'meta pa': 'metaPASemanal',
      '% meta de pa realizada da semana': 'percentualMetaPASemana',
      '% meta pa realizada da semana': 'percentualMetaPASemana',
      '% meta pa semana': 'percentualMetaPASemana',
      '% meta de pa realizada do ano': 'percentualMetaPAAno',
      '% meta pa realizada do ano': 'percentualMetaPAAno',
      '% meta pa ano': 'percentualMetaPAAno',
      'pa emitido na semana': 'paEmitido',
      'pa emitido': 'paEmitido',
      'premio anual emitido': 'paEmitido',
      // Apólices
      'apolices emitidas por semana': 'apolicesEmitidas',
      'apolices emitidas': 'apolicesEmitidas',
      'apolices': 'apolicesEmitidas',
      'numero de apolices': 'apolicesEmitidas',
      // N - Múltiplas variações
      'meta de n semanal': 'metaNSemanal',
      'meta de n semanal necessaria': 'metaNSemanal',
      'meta n semanal': 'metaNSemanal',
      'meta n': 'metaNSemanal',
      'n da semana': 'nSemana',
      'n semanal': 'nSemana',
      'n semana': 'nSemana',
      'numero apolices semana': 'nSemana',
      'n acumulados do mes': 'nAcumuladoMes',
      'n acumulado mes': 'nAcumuladoMes',
      'n acumulado do mes': 'nAcumuladoMes',
      'n mes': 'nAcumuladoMes',
      'n acumulados do ano': 'nAcumuladoAno',
      'n acumulado ano': 'nAcumuladoAno',
      'n acumulado do ano': 'nAcumuladoAno',
      'n ano': 'nAcumuladoAno',
      '% meta de n realizada da semana': 'percentualMetaNSemana',
      '% meta n realizada da semana': 'percentualMetaNSemana',
      '% meta n semana': 'percentualMetaNSemana',
      '% meta n semanal': 'percentualMetaNSemana',
      '% meta de n realizada do ano': 'percentualMetaNAno',
      '% meta n realizada do ano': 'percentualMetaNAno',
      '% meta n ano': 'percentualMetaNAno',
      // OIs
      'meta ois agendadas': 'metaOIsAgendadas',
      'meta ois': 'metaOIsAgendadas',
      'meta oportunidades inovacao': 'metaOIsAgendadas',
      'ois agendadas': 'oIsAgendadas',
      'ois agend': 'oIsAgendadas',
      'oi agendadas': 'oIsAgendadas',
      'oi agend': 'oIsAgendadas',
      'oportunidades inovacao agendadas': 'oIsAgendadas',
      'ois realizadas na semana': 'oIsRealizadas',
      'ois realizadas': 'oIsRealizadas',
      'ois realiz': 'oIsRealizadas',
      'oi realizadas na semana': 'oIsRealizadas',
      'oi realizadas': 'oIsRealizadas',
      'ols realizadas na semana': 'oIsRealizadas',
      'ols realizadas': 'oIsRealizadas',
      'ols realiz': 'oIsRealizadas',
      'oportunidades inovacao realizadas': 'oIsRealizadas',
      // % OIs: não mapear da planilha; sempre calcular a partir de realizadas/meta
      // RECS
      'meta recs': 'metaRECS',
      'meta rec': 'metaRECS',
      'novas recs': 'novasRECS',
      'novas rec': 'novasRECS',
      'recs novas': 'novasRECS',
      // PCs/C2
      'meta de pcs c2 agendados': 'metaPCsC2Agendados',
      'meta pcs c2 agendados': 'metaPCsC2Agendados',
      'meta pcs c2': 'metaPCsC2Agendados',
      'meta pcs': 'metaPCsC2Agendados',
      'pcs realizados na semana': 'pcsRealizados',
      'pcs realizados': 'pcsRealizados',
      'pcs realiz': 'pcsRealizados',
      'pcs semana': 'pcsRealizados',
      'quantidade de c2 realizados na semana': 'c2Realizados',
      'c2 realizados na semana': 'c2Realizados',
      'c2 realizados': 'c2Realizados',
      'c2 realiz': 'c2Realizados',
      'c2 semana': 'c2Realizados',
      // Atrasos
      'apolice em atraso no': 'apoliceEmAtraso',
      'apolice em atraso': 'apoliceEmAtraso',
      'apolices em atraso': 'apoliceEmAtraso',
      'apolice atraso': 'apoliceEmAtraso',
      'premio em atraso de clientes r$': 'premioEmAtraso',
      'premio em atraso de clientes r': 'premioEmAtraso',
      'premio em atraso': 'premioEmAtraso',
      'premio atraso': 'premioEmAtraso',
      'pa em atraso': 'premioEmAtraso',
      // Inadimplência
      'taxa de inadimplencia % geral': 'taxaInadimplenciaGeral',
      'taxa inadimplencia geral': 'taxaInadimplenciaGeral',
      'taxa inadimplencia % geral': 'taxaInadimplenciaGeral',
      'inadimplencia geral': 'taxaInadimplenciaGeral',
      'taxa de inadimplencia % assistente': 'taxaInadimplenciaAssistente',
      'taxa inadimplencia assistente': 'taxaInadimplenciaAssistente',
      'taxa inadimplencia % assistente': 'taxaInadimplenciaAssistente',
      'inadimplencia assistente': 'taxaInadimplenciaAssistente',
      // Revisitas
      'meta revisitas agendadas': 'metaRevisitasAgendadas',
      'meta revisitas': 'metaRevisitasAgendadas',
      'meta revisitas agend': 'metaRevisitasAgendadas',
      'revisitas agendadas na semana': 'revisitasAgendadas',
      'revisitas agendadas': 'revisitasAgendadas',
      'revisitas agend': 'revisitasAgendadas',
      'revisitas realizadas na semana': 'revisitasRealizadas',
      'revisitas realizadas': 'revisitasRealizadas',
      'revisitas realiz': 'revisitasRealizadas',
      // Produtividade
      'delivery apolices': 'deliveryApolices',
      'delivery apolices semana': 'deliveryApolices',
      'total de reunioes realizadas na semana': 'totalReunioes',
      'total reunioes realizadas na semana': 'totalReunioes',
      'total reunioes': 'totalReunioes',
      'reunioes realizadas': 'totalReunioes',
      // Outros
      'lista de atrasos atribuidos raiza': 'listaAtrasosRaiza',
      'lista atrasos atribuidos raiza': 'listaAtrasosRaiza',
      'lista atrasos raiza': 'listaAtrasosRaiza',
      'lista atrasos': 'listaAtrasosRaiza',
      'ticket medio': 'ticketMedio',
      'ticket medio r$': 'ticketMedio',
      'conversao ois': 'conversaoOIs',
      'conversao oi': 'conversaoOIs',
      '% conversao ois': 'conversaoOIs'
    }
    
    // Para cada período, criar um objeto WeeklyData agregando dados de todas as linhas
    for (const periodCol of periodColumns) {
      const periodData: Partial<WeeklyData> = {
        period: periodCol.period
      }
      
      let mappedFieldsCount = 0
      
      // Para cada linha (indicador), buscar o valor correspondente
      for (const row of jsonData) {
        const rowMap: any = {}
        Object.keys(row).forEach(key => {
          rowMap[normalizeKey(key)] = row[key]
        })
        
        // Buscar o nome do indicador
        const indicadorKey = normalizeKey('Indicador')
        const indicadorValue = rowMap[indicadorKey] ? String(rowMap[indicadorKey]).trim() : ''
        const indicadorNormalized = indicadorValue ? normalizeKey(indicadorValue) : ''
        
        if (!indicadorNormalized) continue
        
        // Buscar o valor para este período (fallback: chave normalizada se original não existir)
        let value = row[periodCol.originalKey]
        if (value === undefined || value === null) {
          const key = Object.keys(row).find(k => normalizeKey(k) === periodCol.normalizedKey)
          if (key) value = row[key]
        }
        
        // Ignorar valores vazios, hífens, ou strings vazias
        if (value === null || value === undefined || value === '' || value === '-' || String(value).trim() === '-') {
          continue
        }
        
        // Campos que são porcentagens (precisam ser divididos por 100 se vierem como inteiros)
        const percentageFields = [
          'percentualMetaPASemana', 'percentualMetaPAAno',
          'percentualMetaNSemana', 'percentualMetaNAno',
          'percentualOIsRealizadas', 'taxaInadimplenciaGeral',
          'taxaInadimplenciaAssistente', 'conversaoOIs'
        ]
        
        // Mapear o indicador para o campo correto (buscar o match mais específico primeiro)
        let matched = false
        const sortedEntries = Object.entries(indicatorFieldMap).sort((a, b) => b[0].length - a[0].length) // Mais específico primeiro
        
        for (const [indicatorPattern, fieldName] of sortedEntries) {
          const patternNormalized = normalizeKey(indicatorPattern)
          
          // Match mais preciso: verificar se o indicador normalizado contém o padrão ou vice-versa
          const matchesPattern = indicadorNormalized.includes(patternNormalized) || patternNormalized.includes(indicadorNormalized)
          
          if (matchesPattern) {
            // Verificar se é campo de porcentagem
            const isPercentageField = percentageFields.includes(fieldName as string)
            const numValue = parseNumber(value, isPercentageField)
            
            if (numValue !== null && numValue !== undefined) {
              // Validações de valores razoáveis por tipo de campo
              let finalValue = numValue
              let isValid = true
              
              // Validações específicas por campo
              if (fieldName === 'paSemanal' || fieldName === 'paEmitido') {
                // PA semanal/emitido não deve ser maior que 1 milhão (valores muito altos provavelmente são acumulados)
                if (numValue > 1000000) {
                  console.log(`⚠️ [Validação] ${fieldName} muito alto (${numValue}), possivelmente valor acumulado. Ignorando.`)
                  isValid = false
                }
              } else if (fieldName === 'apolicesEmitidas') {
                // Apólices emitidas não deve ser maior que 1000 por semana
                if (numValue > 1000) {
                  console.log(`⚠️ [Validação] ${fieldName} muito alto (${numValue}), possivelmente valor acumulado. Ignorando.`)
                  isValid = false
                }
              } else if (fieldName === 'nSemana' || fieldName === 'nAcumuladoMes') {
                // N semanal não deve ser maior que 200, acumulado do mês não deve ser maior que 1000
                if ((fieldName === 'nSemana' && numValue > 200) || (fieldName === 'nAcumuladoMes' && numValue > 1000)) {
                  console.log(`⚠️ [Validação] ${fieldName} muito alto (${numValue}), possivelmente valor incorreto. Ignorando.`)
                  isValid = false
                }
              } else if (isPercentageField) {
                // Porcentagens: lógica melhorada para detectar formato correto
                // Valores comuns na planilha:
                // - 1.2 pode ser 1.2% (decimal) ou 120% (se deveria ser inteiro)
                // - 120 pode ser 120% (já correto) ou 1.2% (se deveria ser decimal)
                
                // Se o valor está entre 0 e 10 e não é inteiro, provavelmente está em formato decimal
                // Ex: 1.2 pode ser 1.2% ou 120% - vamos verificar o contexto
                if (numValue > 0 && numValue < 10 && !Number.isInteger(numValue)) {
                  // Valores decimais pequenos (0.012, 1.2, etc.) - verificar se faz sentido
                  // Se for menor que 1, provavelmente precisa multiplicar por 100
                  // Se for entre 1-10, pode ser que precise multiplicar por 100 também (ex: 1.2 -> 120%)
                  if (numValue < 1) {
                    finalValue = numValue * 100
                    console.log(`📊 [Porcentagem] Convertendo ${numValue} para ${finalValue}% (multiplicando por 100 - decimal pequeno)`)
                  } else if (numValue >= 1 && numValue < 10) {
                    // Valores como 1.2 podem ser 1.2% ou 120%
                    // Se o campo é "percentualMetaNSemana" e o valor é 1.2, provavelmente deveria ser 120%
                    // Vamos multiplicar por 100 se o valor original não tinha vírgula/ponto como decimal
                    const originalString = String(value).trim()
                    const hasCommaOrDot = originalString.includes(',') || originalString.includes('.')
                    // Se não tinha vírgula/ponto explícito, provavelmente é um inteiro que foi parseado como decimal
                    if (!hasCommaOrDot || (hasCommaOrDot && numValue < 2)) {
                      finalValue = numValue * 100
                      console.log(`📊 [Porcentagem] Convertendo ${numValue} para ${finalValue}% (multiplicando por 100 - valor entre 1-10)`)
                    }
                  }
                } else if (numValue >= 1 && numValue < 100 && Number.isInteger(numValue)) {
                  // Valores inteiros entre 1-100
                  // Se for muito pequeno (1, 2) e o campo é uma porcentagem de meta, provavelmente precisa multiplicar por 100
                  // Ex: 1 -> 100%, 2 -> 200%
                  if (numValue <= 2 && (fieldName === 'percentualMetaNSemana' || fieldName === 'percentualMetaPASemana' || 
                      fieldName === 'percentualMetaNAno' || fieldName === 'percentualMetaPAAno')) {
                    finalValue = numValue * 100
                    console.log(`📊 [Porcentagem] Convertendo ${numValue} para ${finalValue}% (multiplicando por 100 - valor inteiro pequeno)`)
                  }
                  // Caso contrário, manter como está (ex: 49 = 49%, 120 = 120%)
                } else if (numValue >= 100 && numValue < 10000 && Number.isInteger(numValue)) {
                  // Valores inteiros altos (120, 1200, etc.)
                  // Se for >= 1000, provavelmente precisa dividir por 100
                  if (numValue >= 1000) {
                    finalValue = numValue / 100
                    console.log(`📊 [Porcentagem] Convertendo ${numValue} para ${finalValue}% (dividindo por 100)`)
                  }
                  // Se for entre 100-1000, provavelmente já está correto (120 = 120%)
                }
                
                // Validação: porcentagens não devem ser maiores que 10000%
                if (finalValue > 10000) {
                  console.log(`⚠️ [Validação] ${fieldName} muito alto (${finalValue}%), possivelmente valor incorreto. Ignorando.`)
                  isValid = false
                }
              }
              
              if (isValid) {
                // Não ignorar zeros para campos importantes (porcentagens, metas, etc.)
                const importantFields = ['metaPASemanal', 'metaNSemanal', 'metaOIsAgendadas', 'metaRECS', 
                                       'metaPCsC2Agendados', 'metaRevisitasAgendadas']
                const isImportantField = importantFields.includes(fieldName as string)
                const shouldIgnoreZero = !isPercentageField && !isImportantField && finalValue === 0
                
                if (!shouldIgnoreZero) {
                  // Se já existe um valor, usar o mais recente (última linha encontrada)
                  (periodData as any)[fieldName] = finalValue
                  mappedFieldsCount++
                  
                  // Log apenas para alguns períodos para não poluir muito
                  if (periodCol.period === periodColumns[0].period || periodCol.period === periodColumns[periodColumns.length - 1].period) {
                    console.log(`✅ [Mapeamento] "${indicadorValue}" -> ${fieldName} = ${finalValue}${isPercentageField ? '%' : ''} (período: ${periodCol.period})`)
                  }
                }
              }
            }
            matched = true
            break
          }
        }
        
        if (!matched && indicadorNormalized && value !== null && value !== undefined && value !== '' && value !== '-') {
          // Log apenas indicadores não mapeados que têm valores
          const hasValue = parseNumber(value) !== undefined
          if (hasValue) {
            console.log(`⚠️ [Mapeamento] Indicador não mapeado: "${indicadorValue}" (normalizado: "${indicadorNormalized}") | Valor: ${value} | Período: ${periodCol.period}`)
          }
        }
      }
      
      // Log resumo para cada período
      if (mappedFieldsCount === 0) {
        console.log(`⚠️ [Período] Nenhum campo mapeado para período: ${periodCol.period}`)
      } else {
        console.log(`✅ [Período] ${mappedFieldsCount} campos mapeados para período: ${periodCol.period}`)
      }
      
      // Criar WeeklyData completo com valores padrão
      const weeklyData: WeeklyData = {
        period: periodCol.period,
        paSemanal: periodData.paSemanal ?? 0,
        paAcumuladoMes: periodData.paAcumuladoMes ?? 0,
        paAcumuladoAno: periodData.paAcumuladoAno ?? 0,
        metaPASemanal: periodData.metaPASemanal ?? 82000,
        percentualMetaPASemana: periodData.percentualMetaPASemana ?? 0,
        percentualMetaPAAno: periodData.percentualMetaPAAno ?? 0,
        paEmitido: periodData.paEmitido ?? 0,
        apolicesEmitidas: periodData.apolicesEmitidas ?? 0,
        metaNSemanal: periodData.metaNSemanal ?? 5,
        nSemana: periodData.nSemana ?? 0,
        nAcumuladoMes: periodData.nAcumuladoMes ?? 0,
        nAcumuladoAno: periodData.nAcumuladoAno ?? 0,
        percentualMetaNSemana: periodData.percentualMetaNSemana ?? 0,
        percentualMetaNAno: periodData.percentualMetaNAno ?? 0,
        metaOIsAgendadas: periodData.metaOIsAgendadas ?? 8,
        oIsAgendadas: periodData.oIsAgendadas ?? 0,
        oIsRealizadas: periodData.oIsRealizadas ?? 0,
        metaRECS: periodData.metaRECS ?? 0,
        novasRECS: periodData.novasRECS ?? 0,
        metaPCsC2Agendados: periodData.metaPCsC2Agendados ?? 0,
        pcsRealizados: periodData.pcsRealizados ?? 0,
        c2Realizados: periodData.c2Realizados ?? 0,
        apoliceEmAtraso: periodData.apoliceEmAtraso ?? 0,
        premioEmAtraso: periodData.premioEmAtraso ?? 0,
        taxaInadimplenciaGeral: periodData.taxaInadimplenciaGeral ?? 0,
        taxaInadimplenciaAssistente: periodData.taxaInadimplenciaAssistente ?? 0,
        metaRevisitasAgendadas: periodData.metaRevisitasAgendadas ?? 0,
        revisitasAgendadas: periodData.revisitasAgendadas ?? 0,
        revisitasRealizadas: periodData.revisitasRealizadas ?? 0,
        deliveryApolices: periodData.deliveryApolices ?? 0,
        totalReunioes: periodData.totalReunioes ?? 0,
        listaAtrasosRaiza: periodData.listaAtrasosRaiza ?? '',
        ticketMedio: periodData.ticketMedio ?? 0,
        conversaoOIs: periodData.conversaoOIs ?? 0,
        percentualOIsRealizadas: 0
      }
      // Sempre calcular % OIs (nunca usar valor da planilha para não gravar quantidade como %)
      const den = weeklyData.metaOIsAgendadas > 0 ? weeklyData.metaOIsAgendadas : weeklyData.oIsAgendadas
      if (den > 0 && weeklyData.oIsRealizadas >= 0) {
        weeklyData.percentualOIsRealizadas = Math.round((weeklyData.oIsRealizadas / den) * 1000) / 10
      }
      
      if (!weeklyData.ticketMedio || weeklyData.ticketMedio === 0) {
        if (weeklyData.apolicesEmitidas > 0 && weeklyData.paSemanal > 0) {
          weeklyData.ticketMedio = weeklyData.paSemanal / weeklyData.apolicesEmitidas
        }
      }
      
      // Fallback: quando PA Semanal é 0 mas PA Acumulado Mês = PA Acumulado Ano (ex: primeira semana do ano),
      // usar paAcumuladoMes como paSemanal (planilha pode ter valor em formato diferente que não foi parseado)
      if (weeklyData.paSemanal === 0 && weeklyData.paAcumuladoMes > 0 && 
          weeklyData.paAcumuladoMes === weeklyData.paAcumuladoAno) {
        weeklyData.paSemanal = weeklyData.paAcumuladoMes
        console.log(`📊 [Fallback] PA Semanal inferido de PA Acumulado (${weeklyData.paAcumuladoMes}) para período ${weeklyData.period}`)
      }
      
      // Validações finais de coerência
      // Se PA semanal é muito maior que PA emitido, pode haver erro
      if (weeklyData.paSemanal > 0 && weeklyData.paEmitido > 0 && weeklyData.paSemanal > weeklyData.paEmitido * 10) {
        console.log(`⚠️ [Validação] PA Semanal (${weeklyData.paSemanal}) muito maior que PA Emitido (${weeklyData.paEmitido}) para período ${weeklyData.period}`)
      }
      
      // Se percentual de meta está muito alto, verificar
      if (weeklyData.percentualMetaPASemana > 1000 || weeklyData.percentualMetaNSemana > 1000) {
        console.log(`⚠️ [Validação] Porcentagem de meta muito alta para período ${weeklyData.period}: PA=${weeklyData.percentualMetaPASemana}%, N=${weeklyData.percentualMetaNSemana}%`)
      }
      
      mappedData.push(weeklyData)
    }
    
    // Log dos dados mapeados
    console.log(`✅ [Google Sheets] Total de registros criados: ${mappedData.length}`)
    
    if (mappedData.length === 0) {
      console.error('❌ [Google Sheets] NENHUM dado válido encontrado após mapeamento!')
      return []
    }
    
    // Usar mappedData diretamente (já está completo)
    const validData = mappedData
    
    console.log('✅ [Google Sheets] Dados válidos encontrados:', validData.length, 'de', jsonData.length, 'linhas')
    
    if (validData.length > 0) {
      console.log('📅 [Google Sheets] Períodos encontrados (ANTES da ordenação):', validData.map(d => d.period))
      
      // Verificar se há períodos de dezembro e janeiro
      const dezembroPeriods = validData.filter(d => d.period.includes('/12'))
      const janeiroPeriods = validData.filter(d => d.period.includes('/01') || d.period.includes('/1 '))
      
      if (dezembroPeriods.length > 0) {
        console.log('✅ [Google Sheets] Períodos de DEZEMBRO encontrados:', dezembroPeriods.map(d => d.period))
      } else {
        console.log('⚠️ [Google Sheets] NENHUM período de dezembro encontrado!')
      }
      
      if (janeiroPeriods.length > 0) {
        console.log('✅ [Google Sheets] Períodos de JANEIRO encontrados:', janeiroPeriods.map(d => d.period))
      } else {
        console.log('⚠️ [Google Sheets] NENHUM período de janeiro encontrado!')
      }
      
      // Log de exemplo do primeiro e último registro
      console.log('📊 [Google Sheets] Exemplo de dados (primeiro registro):', {
        period: validData[0].period,
        paSemanal: validData[0].paSemanal,
        nSemana: validData[0].nSemana,
        oIsAgendadas: validData[0].oIsAgendadas,
        apolicesEmitidas: validData[0].apolicesEmitidas
      })
      
      if (validData.length > 1) {
        const lastIndex = validData.length - 1
        console.log('📊 [Google Sheets] Exemplo de dados (último registro):', {
          period: validData[lastIndex].period,
          paSemanal: validData[lastIndex].paSemanal,
          nSemana: validData[lastIndex].nSemana,
          oIsAgendadas: validData[lastIndex].oIsAgendadas,
          apolicesEmitidas: validData[lastIndex].apolicesEmitidas
        })
      }
      
      // Log de resumo de valores não-zero por período
      validData.forEach((data, index) => {
        const nonZeroFields = Object.entries(data).filter(([key, value]) => 
          key !== 'period' && 
          key !== 'listaAtrasosRaiza' && 
          (typeof value === 'number' && value !== 0)
        ).length
        
        if (nonZeroFields === 0) {
          console.log(`⚠️ [Período ${index + 1}] ${data.period}: NENHUM valor não-zero encontrado!`)
        }
      })
    } else {
      console.error('❌ [Google Sheets] NENHUM dado válido encontrado após mapeamento!')
      console.error('❌ [Google Sheets] Verifique se a planilha contém uma coluna "Período" válida')
    }
    
    // Ordenar por período (considerando ano completo - parsePeriodToDate extrai ano quando presente)
    validData.sort((a, b) => {
      const dateA = parsePeriodToDate(a.period)
      const dateB = parsePeriodToDate(b.period)
      
      if (!dateA || !dateB) {
        // Se não conseguir parsear, ordenar alfabeticamente
        return a.period.localeCompare(b.period)
      }
      
      // Ordenar por data completa
      return dateA.getTime() - dateB.getTime()
    })
    
    console.log('📅 [Google Sheets] Períodos ordenados (DEPOIS da ordenação):', validData.map(d => d.period))
    console.log('📅 [Google Sheets] Primeiro período:', validData[0]?.period)
    console.log('📅 [Google Sheets] Último período:', validData[validData.length - 1]?.period)
    
    // Verificar novamente dezembro e janeiro após ordenação
    const dezembroAfterSort = validData.filter(d => d.period.includes('/12'))
    const janeiroAfterSort = validData.filter(d => d.period.includes('/01') || d.period.includes('/1 '))
    console.log('📅 [Google Sheets] Após ordenação - Dezembro:', dezembroAfterSort.length, '| Janeiro:', janeiroAfterSort.length)
    
    return validData
  } catch (error: any) {
    console.error('❌ [Google Sheets] Erro ao buscar dados:', error)
    if (error.name === 'AbortError') {
      throw new Error('Timeout ao buscar dados do Google Sheets. Tente novamente.')
    }
    throw error
  }
}

export async function GET() {
  try {
    const data = await fetchGoogleSheetsData()
    
    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      periods: data.map(d => d.period)
    })
  } catch (error: any) {
    console.error('❌ [API] Erro na API Google Sheets:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao buscar dados do Google Sheets',
        data: []
      },
      { status: 500 }
    )
  }
}
