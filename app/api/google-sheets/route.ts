import { NextResponse } from 'next/server'
import { WeeklyData } from '@/lib/types'
import * as XLSX from 'xlsx'

// URL do Google Sheets (formato CSV)
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQk309WH9kRymm3yLfzMluGJLRgAjMtWiil22Du0UGwdS55YOafE0C-EVCNiKKkw/pub?gid=1893200293&single=true&output=csv'

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

// Função para normalizar período
const normalizePeriod = (period: string): string => {
  return period
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*[Aa]\s*/g, ' a ')
    .replace(/\//g, '/')
}

// Função para validar período (MUITO MAIS RESTRITIVA)
const isValidPeriod = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false
  
  const normalized = value.trim().toLowerCase()
  
  // Deve ter entre 8 e 20 caracteres (formato típico: "18/08 a 24/08")
  if (normalized.length < 8 || normalized.length > 20) return false
  
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
  // Formato esperado: "DD/MM a DD/MM" ou "DD/MM"
  const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(normalized)
  const hasPeriodPattern = /\d{1,2}\/\d{1,2}\s+[aA]\s+\d{1,2}\/\d{1,2}/.test(normalized)
  
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

// Função para converter valor para número (melhorada - trata porcentagens)
const parseNumber = (value: any, isPercentage: boolean = false): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  
  // Verificar se é porcentagem pelo valor original
  const originalString = typeof value === 'string' ? value : String(value)
  const hasPercentSign = originalString.includes('%')
  const shouldDivideBy100 = isPercentage || hasPercentSign
  
  if (typeof value === 'number') {
    const result = isNaN(value) ? undefined : value
    // Se for porcentagem e o valor parece estar em formato inteiro (ex: 13984 ao invés de 139.84)
    if (result !== undefined && shouldDivideBy100 && result > 100 && result < 100000) {
      return result / 100
    }
    return result
  }
  
  if (typeof value === 'string') {
    const cleaned = value.trim()
      .replace(/\./g, '') // Remove pontos (separadores de milhar)
      .replace(/,/g, '.') // Substitui vírgula por ponto (decimal)
      .replace(/[^\d.-]/g, '') // Remove tudo exceto dígitos, ponto e sinal negativo
    
    if (cleaned === '' || cleaned === '-') return undefined
    
    let parsed = parseFloat(cleaned)
    if (isNaN(parsed)) return undefined
    
    // Se for porcentagem e o valor parece estar em formato inteiro (ex: 13984 ao invés de 139.84)
    if (shouldDivideBy100 && parsed > 100 && parsed < 100000 && !cleaned.includes('.')) {
      parsed = parsed / 100
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

// Função para buscar dados do Google Sheets
async function fetchGoogleSheetsData(): Promise<WeeklyData[]> {
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
        'Accept': 'text/csv',
        'User-Agent': 'Mozilla/5.0'
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
        const normalizedPeriod = normalizePeriod(periodValue)
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
      // PA
      'pa semanal realizado': 'paSemanal',
      'pa acumulado no mes': 'paAcumuladoMes',
      'pa acumulado no ano': 'paAcumuladoAno',
      'meta de pa semanal necessaria': 'metaPASemanal',
      '% meta de pa realizada da semana': 'percentualMetaPASemana',
      '% meta de pa realizada do ano': 'percentualMetaPAAno',
      'pa emitido na semana': 'paEmitido',
      // Apólices
      'apolices emitidas por semana': 'apolicesEmitidas',
      'apolices emitidas': 'apolicesEmitidas',
      // N
      'meta de n semanal': 'metaNSemanal',
      'meta de n semanal necessaria': 'metaNSemanal',
      'n da semana': 'nSemana',
      'n semanal': 'nSemana',
      'n acumulados do mes': 'nAcumuladoMes',
      'n acumulado mes': 'nAcumuladoMes',
      'n acumulados do ano': 'nAcumuladoAno',
      'n acumulado ano': 'nAcumuladoAno',
      '% meta de n realizada da semana': 'percentualMetaNSemana',
      '% meta de n realizada do ano': 'percentualMetaNAno',
      // OIs
      'meta ois agendadas': 'metaOIsAgendadas',
      'meta ois': 'metaOIsAgendadas',
      'ois agendadas': 'oIsAgendadas',
      'ois realizadas na semana': 'oIsRealizadas',
      'ois realizadas': 'oIsRealizadas',
      // RECS
      'meta recs': 'metaRECS',
      'novas recs': 'novasRECS',
      // PCs/C2
      'meta de pcs c2 agendados': 'metaPCsC2Agendados',
      'meta pcs c2 agendados': 'metaPCsC2Agendados',
      'pcs realizados na semana': 'pcsRealizados',
      'pcs realizados': 'pcsRealizados',
      'quantidade de c2 realizados na semana': 'c2Realizados',
      'c2 realizados na semana': 'c2Realizados',
      'c2 realizados': 'c2Realizados',
      // Atrasos
      'apolice em atraso no': 'apoliceEmAtraso',
      'apolice em atraso': 'apoliceEmAtraso',
      'premio em atraso de clientes r$': 'premioEmAtraso',
      'premio em atraso': 'premioEmAtraso',
      // Inadimplência
      'taxa de inadimplencia % geral': 'taxaInadimplenciaGeral',
      'taxa inadimplencia geral': 'taxaInadimplenciaGeral',
      'taxa de inadimplencia % assistente': 'taxaInadimplenciaAssistente',
      'taxa inadimplencia assistente': 'taxaInadimplenciaAssistente',
      // Revisitas
      'meta revisitas agendadas': 'metaRevisitasAgendadas',
      'meta revisitas': 'metaRevisitasAgendadas',
      'revisitas agendadas na semana': 'revisitasAgendadas',
      'revisitas agendadas': 'revisitasAgendadas',
      'revisitas realizadas na semana': 'revisitasRealizadas',
      'revisitas realizadas': 'revisitasRealizadas',
      // Produtividade
      'volume de tarefas concluidas no trello': 'volumeTarefasTrello',
      'volume tarefas trello': 'volumeTarefasTrello',
      'numero de videos de treinamento gravados': 'videosTreinamentoGravados',
      'videos treinamento gravados': 'videosTreinamentoGravados',
      'delivery apolices': 'deliveryApolices',
      'total de reunioes realizadas na semana': 'totalReunioes',
      'total reunioes': 'totalReunioes',
      // Outros
      'lista de atrasos atribuidos raiza': 'listaAtrasosRaiza',
      'lista atrasos raiza': 'listaAtrasosRaiza',
      'ticket medio': 'ticketMedio',
      'conversao ois': 'conversaoOIs'
    }
    
    // Para cada período, criar um objeto WeeklyData agregando dados de todas as linhas
    for (const periodCol of periodColumns) {
      const periodData: Partial<WeeklyData> = {
        period: periodCol.period
      }
      
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
        
        // Buscar o valor para este período
        const value = row[periodCol.originalKey]
        
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
          if (indicadorNormalized.includes(patternNormalized) || patternNormalized.includes(indicadorNormalized)) {
            // Verificar se é campo de porcentagem
            const isPercentageField = percentageFields.includes(fieldName as string)
            const numValue = parseNumber(value, isPercentageField)
            
            if (numValue !== null && numValue !== undefined) {
              // Não ignorar zeros para campos importantes (porcentagens, metas, etc.)
              const importantFields = ['metaPASemanal', 'metaNSemanal', 'metaOIsAgendadas', 'metaRECS', 
                                     'metaPCsC2Agendados', 'metaRevisitasAgendadas']
              const isImportantField = importantFields.includes(fieldName as string)
              const shouldIgnoreZero = !isPercentageField && !isImportantField && numValue === 0
              
              if (!shouldIgnoreZero) {
                (periodData as any)[fieldName] = numValue
                console.log(`✅ [Mapeamento] "${indicadorValue}" -> ${fieldName} = ${numValue}${isPercentageField ? '%' : ''} (período: ${periodCol.period})`)
              } else {
                console.log(`⚠️ [Mapeamento] Ignorando zero para "${indicadorValue}" -> ${fieldName} (período: ${periodCol.period})`)
              }
            }
            matched = true
            break
          }
        }
        
        if (!matched && indicadorNormalized) {
          console.log(`⚠️ [Mapeamento] Indicador não mapeado: "${indicadorValue}" (normalizado: "${indicadorNormalized}")`)
        }
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
        volumeTarefasTrello: periodData.volumeTarefasTrello ?? 0,
        videosTreinamentoGravados: periodData.videosTreinamentoGravados ?? 0,
        deliveryApolices: periodData.deliveryApolices ?? 0,
        totalReunioes: periodData.totalReunioes ?? 0,
        listaAtrasosRaiza: periodData.listaAtrasosRaiza ?? '',
        ticketMedio: periodData.ticketMedio ?? 0,
        conversaoOIs: periodData.conversaoOIs ?? 0,
        percentualOIsRealizadas: periodData.percentualOIsRealizadas ?? 0
      }
      
      // Calcular campos derivados
      if (!weeklyData.percentualOIsRealizadas && weeklyData.oIsAgendadas > 0) {
        weeklyData.percentualOIsRealizadas = (weeklyData.oIsRealizadas / weeklyData.oIsAgendadas) * 100
      }
      if (!weeklyData.ticketMedio && weeklyData.apolicesEmitidas > 0 && weeklyData.paSemanal > 0) {
        weeklyData.ticketMedio = weeklyData.paSemanal / weeklyData.apolicesEmitidas
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
      
      console.log('📊 [Google Sheets] Exemplo de dados (primeiro registro):', {
        period: validData[0].period,
        paSemanal: validData[0].paSemanal,
        nSemana: validData[0].nSemana,
        oIsAgendadas: validData[0].oIsAgendadas
      })
    } else {
      console.error('❌ [Google Sheets] NENHUM dado válido encontrado após mapeamento!')
      console.error('❌ [Google Sheets] Verifique se a planilha contém uma coluna "Período" válida')
    }
    
    // Função para converter período em data completa (considerando ano)
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
    
    // Ordenar por período (considerando ano completo)
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
