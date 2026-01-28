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

// Função para converter valor para número (melhorada)
const parseNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value
  }
  
  if (typeof value === 'string') {
    const cleaned = value.trim()
      .replace(/\./g, '') // Remove pontos (separadores de milhar)
      .replace(/,/g, '.') // Substitui vírgula por ponto (decimal)
      .replace(/[^\d.-]/g, '') // Remove tudo exceto dígitos, ponto e sinal negativo
    
    if (cleaned === '' || cleaned === '-') return undefined
    
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }
  
  return undefined
}

// Função auxiliar para buscar valor com múltiplas variações (MELHORADA - MAIS RESTRITIVA)
const getValue = (rowMap: any, variations: string[], debugKey?: string): number | undefined => {
  // Primeiro: busca exata (mais confiável)
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    
    if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
      const value = parseNumber(rowMap[normalized])
      if (value !== undefined && value !== 0) { // Ignorar zeros também
        if (debugKey) console.log(`✅ [${debugKey}] Encontrado exato: "${variation}" (normalizado: "${normalized}") = ${value}`)
        return value
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
        const value = parseNumber(rowMap[key])
        if (value !== undefined && value !== 0) {
          if (debugKey) console.log(`✅ [${debugKey}] Encontrado parcial: "${variation}" em coluna "${key}" = ${value}`)
          return value
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
          const value = parseNumber(rowMap[key])
          if (value !== undefined && value !== 0) {
            if (debugKey) console.log(`✅ [${debugKey}] Encontrado por palavra-chave "${mainKeyword}" em "${key}" = ${value}`)
            return value
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
    
    // Mapear dados para WeeklyData
    let validCount = 0
    const mappedData: (WeeklyData | null)[] = jsonData.map((row: any, index: number) => {
      const rowMap: any = {}
      Object.keys(row).forEach(key => {
        rowMap[normalizeKey(key)] = row[key]
      })
      
      // Buscar período APENAS em colunas específicas (mais restritivo)
      let periodRaw = ''
      
      // Primeiro: buscar em colunas que claramente são de período
      const periodColumns = [
        'período', 'periodo', 'period', 'semana', 'data',
        'periodo semanal', 'periodo da semana', 'semana de',
        'data inicial', 'data final', 'range', 'intervalo'
      ]
      
      for (const colName of periodColumns) {
        const normalized = normalizeKey(colName)
        if (rowMap[normalized] !== undefined && rowMap[normalized] !== null) {
          const value = String(rowMap[normalized]).trim()
          if (value && isValidPeriod(value)) {
            periodRaw = value
            console.log(`✅ [Período] Encontrado em coluna "${colName}": ${periodRaw}`)
            break
          }
        }
      }
      
      // Se não encontrou, NÃO buscar em outras colunas (muito perigoso - pode pegar valores errados)
      // Apenas retornar null se não encontrou em colunas específicas de período
      if (!periodRaw) {
        console.log(`⚠️ [Período] Nenhum período válido encontrado na linha ${index + 1}`)
        console.log(`⚠️ [Período] Colunas disponíveis:`, Object.keys(rowMap).slice(0, 10))
        return null
      }
      
      // Validar período novamente (dupla validação)
      if (!isValidPeriod(periodRaw)) {
        console.log(`❌ [Período] Período "${periodRaw}" não passou na validação`)
        console.log(`❌ [Período] Detalhes: length=${periodRaw.length}, hasDate=${/\d{1,2}\/\d{1,2}/.test(periodRaw.toLowerCase())}`)
        return null
      }
      
      const periodNormalized = normalizePeriod(periodRaw)
      console.log(`\n📅 [Google Sheets] Processando período: ${periodNormalized}`)
      
      // Verificar se é dezembro ou janeiro
      const monthMatch = periodNormalized.match(/\/(\d{1,2})/)
      if (monthMatch) {
        const month = parseInt(monthMatch[1])
        if (month === 12) {
          console.log(`📅 [Google Sheets] Período de DEZEMBRO detectado: ${periodNormalized}`)
        } else if (month === 1) {
          console.log(`📅 [Google Sheets] Período de JANEIRO detectado: ${periodNormalized}`)
        }
      }
      
      console.log(`📋 [Google Sheets] Colunas disponíveis nesta linha:`, Object.keys(rowMap).slice(0, 15))
      
      // Mapear TODOS os 34 indicadores com variações completas
      // IMPORTANTE: Não usar || 0, usar undefined para valores não encontrados
      const data: WeeklyData = {
        period: periodNormalized,
        
        // 1. PA Semanal Realizado
        paSemanal: getValue(rowMap, [
          'pa semanal realizado', 'pa semanal', 'pa realizado', 'premio anual semanal',
          'pa semana', 'pa da semana', 'pa realizado semanal', 'pa sem',
          'pa semanal realizado r$', 'pa realizado semana'
        ], 'paSemanal') ?? 0,
        
        // 2. PA Acumulado no Mês
        paAcumuladoMes: getValue(rowMap, [
          'pa acumulado no mes', 'pa acumulado mes', 'pa acumulado do mes', 'pa mes',
          'premio anual acumulado mes', 'pa acum mes', 'pa acumulado no mes r$'
        ], 'paAcumuladoMes') ?? 0,
        
        // 3. PA Acumulado no Ano
        paAcumuladoAno: getValue(rowMap, [
          'pa acumulado no ano', 'pa acumulado ano', 'pa acumulado do ano', 'pa ano',
          'premio anual acumulado ano', 'pa acum ano', 'pa acumulado no ano r$'
        ], 'paAcumuladoAno') ?? 0,
        
        // 4. Meta de PA Semanal Necessária
        metaPASemanal: getValue(rowMap, [
          'meta de pa semanal necessaria', 'meta pa semanal necessaria', 'meta pa semanal', 'meta pa',
          'meta pa semana', 'meta premio anual semanal', 'meta pa sem', 'meta de pa semanal'
        ], 'metaPASemanal') ?? 82000,
        
        // 5. % Meta de PA Realizada da Semana
        percentualMetaPASemana: getValue(rowMap, [
          '% meta de pa realizada da semana', '% meta pa realizada da semana', '% meta pa semana',
          '% meta pa semanal', '% meta pa', '% pa semanal', 'percentual meta pa semana',
          'percentual meta pa', '% pa semana', '% meta pa realizada semana'
        ], 'percentualMetaPASemana') ?? 0,
        
        // 6. % Meta de PA Realizada do Ano
        percentualMetaPAAno: getValue(rowMap, [
          '% meta de pa realizada do ano', '% meta pa realizada do ano', '% meta pa ano',
          '% meta pa anual', '% pa ano', '% pa acumulado ano', 'percentual meta pa ano',
          'percentual meta pa anual', '% pa acum ano', '% meta pa realizada ano'
        ], 'percentualMetaPAAno') ?? 0,
        
        // 7. PA Emitido na semana
        paEmitido: getValue(rowMap, [
          'pa emitido na semana', 'pa emitido semana', 'pa emitido', 'premio anual emitido',
          'pa emit', 'pa emitido semanal', 'pa emitido na semana r$'
        ], 'paEmitido') ?? 0,
        
        // 8. Apólices emitidas (por semana)
        apolicesEmitidas: getValue(rowMap, [
          'apolices emitidas por semana', 'apolices emitidas', 'apolices', 'numero de apolices',
          'qtd apolices', 'quantidade apolices', 'apolices emit', 'total apolices',
          'apolices emitidas semana', 'apolices por semana'
        ], 'apolicesEmitidas') ?? 0,
        
        // 9. Meta de N semanal
        metaNSemanal: getValue(rowMap, [
          'meta de n semanal', 'meta n semanal', 'meta n', 'meta n semana',
          'meta numero apolices', 'meta n sem', 'meta de n semanal necessaria'
        ], 'metaNSemanal') ?? 5,
        
        // 10. N da Semana
        nSemana: getValue(rowMap, [
          'n da semana', 'n semanal', 'n semana', 'numero apolices semana',
          'n sem', 'n realizado', 'n da sem', 'n realizado semana'
        ], 'nSemana') ?? 0,
        
        // 11. N Acumulados do Mes
        nAcumuladoMes: getValue(rowMap, [
          'n acumulados do mes', 'n acumulado mes', 'n acumulado do mes', 'n mes',
          'numero apolices acumulado mes', 'n acum mes', 'n acumulados mes'
        ], 'nAcumuladoMes') ?? 0,
        
        // 12. N Acumulados do Ano
        nAcumuladoAno: getValue(rowMap, [
          'n acumulados do ano', 'n acumulado ano', 'n acumulado do ano', 'n ano',
          'numero apolices acumulado ano', 'n acum ano', 'n acumulados ano'
        ], 'nAcumuladoAno') ?? 0,
        
        // 13. % Meta de N Realizada da Semana
        percentualMetaNSemana: getValue(rowMap, [
          '% meta de n realizada da semana', '% meta n realizada da semana', '% meta n semana',
          '% meta n semanal', '% meta n', '% n semanal', 'percentual meta n semana',
          'percentual meta n', '% n semana', '% meta n realizada semana'
        ], 'percentualMetaNSemana') ?? 0,
        
        // 14. % Meta de N Realizada do Ano
        percentualMetaNAno: getValue(rowMap, [
          '% meta de n realizada do ano', '% meta n realizada do ano', '% meta n ano',
          '% meta n anual', '% n ano', '% n acumulado ano', 'percentual meta n ano',
          'percentual meta n anual', '% n acum ano', '% meta n realizada ano'
        ], 'percentualMetaNAno') ?? 0,
        
        // 15. Meta OIs Agendadas
        metaOIsAgendadas: getValue(rowMap, [
          'meta ois agendadas', 'meta ois', 'meta ois agend', 'meta oportunidades inovacao',
          'meta ois agendadas semana', 'meta oi agendadas', 'meta ois agendadas necessaria'
        ], 'metaOIsAgendadas') ?? 8,
        
        // 16. OIs agendadas
        oIsAgendadas: getValue(rowMap, [
          'ois agendadas', 'ois agend', 'oIs agendadas', 'ois agendadas semana',
          'oportunidades inovacao agendadas', 'oi agendadas', 'ois agendadas na semana',
          'ois agendadas por semana'
        ], 'oIsAgendadas') ?? 0,
        
        // 17. OIs realizadas na semana
        oIsRealizadas: getValue(rowMap, [
          'ois realizadas na semana', 'ois realizadas semana', 'ois realizadas', 'ois realiz',
          'oIs realizadas', 'oportunidades inovacao realizadas', 'oi realizadas',
          'ois realizadas na semana', 'ois realizadas por semana'
        ], 'oIsRealizadas') ?? 0,
        
        // 18. Meta RECS
        metaRECS: getValue(rowMap, [
          'meta recs', 'meta rec', 'meta recs agendadas', 'meta recs semana',
          'meta recs necessaria'
        ], 'metaRECS'),
        
        // 19. Novas RECS
        novasRECS: getValue(rowMap, [
          'novas recs', 'novas rec', 'recs novas', 'recs realizadas', 'recs semana',
          'novas recs semana', 'recs novas semana'
        ], 'novasRECS'),
        
        // 20. Meta de PCs/C2 agendados
        metaPCsC2Agendados: getValue(rowMap, [
          'meta de pcs c2 agendados', 'meta pcs c2 agendados', 'meta pcs c2', 'meta pcs',
          'meta c2', 'meta pcs c2 agend', 'meta pcs c2 semana', 'meta pcs c2 agendados necessaria'
        ], 'metaPCsC2Agendados'),
        
        // 21. PCs realizados na semana
        pcsRealizados: getValue(rowMap, [
          'pcs realizados na semana', 'pcs realizados semana', 'pcs realizados', 'pcs realiz',
          'pcs semana', 'pcs realizados por semana'
        ], 'pcsRealizados'),
        
        // 22. Quantidade de C2 realizados na semana
        c2Realizados: getValue(rowMap, [
          'quantidade de c2 realizados na semana', 'c2 realizados na semana', 'c2 realizados semana',
          'c2 realizados', 'c2 realiz', 'c2 semana', 'quantidade c2 realizados',
          'c2 realizados por semana', 'qtd c2 realizados'
        ], 'c2Realizados'),
        
        // 23. Apólice em atraso (nº)
        apoliceEmAtraso: getValue(rowMap, [
          'apolice em atraso no', 'apolice em atraso', 'apolices em atraso', 'apolice atraso',
          'apolices atraso', 'numero apolices atraso', 'qtd apolices atraso',
          'apolice em atraso numero', 'apolices em atraso no'
        ], 'apoliceEmAtraso'),
        
        // 24. Premio em atraso de clientes (R$)
        premioEmAtraso: getValue(rowMap, [
          'premio em atraso de clientes r$', 'premio em atraso de clientes', 'premio em atraso',
          'premio atraso', 'pa em atraso', 'pa atraso', 'valor premio atraso',
          'valor pa atraso', 'premio em atraso r$', 'premio atraso clientes'
        ], 'premioEmAtraso'),
        
        // 25. Taxa de inadimplência (%) Geral
        taxaInadimplenciaGeral: getValue(rowMap, [
          'taxa de inadimplencia % geral', 'taxa inadimplencia geral', 'taxa inadimplencia',
          'inadimplencia geral', '% inadimplencia geral', 'percentual inadimplencia geral',
          'taxa inadimplencia % geral'
        ], 'taxaInadimplenciaGeral'),
        
        // 26. Taxa de inadimplência (%) Assistente
        taxaInadimplenciaAssistente: getValue(rowMap, [
          'taxa de inadimplencia % assistente', 'taxa inadimplencia assistente',
          'inadimplencia assistente', '% inadimplencia assistente',
          'percentual inadimplencia assistente', 'taxa inadimplencia % assistente'
        ], 'taxaInadimplenciaAssistente'),
        
        // 27. Meta revisitas agendadas
        metaRevisitasAgendadas: getValue(rowMap, [
          'meta revisitas agendadas', 'meta revisitas', 'meta revisitas agend',
          'meta revisitas agendadas semana', 'meta revisitas necessaria'
        ], 'metaRevisitasAgendadas'),
        
        // 28. Revisitas Agendadas na semana
        revisitasAgendadas: getValue(rowMap, [
          'revisitas agendadas na semana', 'revisitas agendadas semana', 'revisitas agendadas',
          'revisitas agend', 'revisitas agendadas na semana', 'revisitas agendadas por semana'
        ], 'revisitasAgendadas'),
        
        // 29. Revisitas realizadas na semana
        revisitasRealizadas: getValue(rowMap, [
          'revisitas realizadas na semana', 'revisitas realizadas semana', 'revisitas realizadas',
          'revisitas realiz', 'revisitas realizadas na semana', 'revisitas realizadas por semana'
        ], 'revisitasRealizadas'),
        
        // 30. Volume de tarefas concluídas no Trello
        volumeTarefasTrello: getValue(rowMap, [
          'volume de tarefas concluidas no trello', 'volume tarefas concluidas trello',
          'volume tarefas trello', 'tarefas trello', 'tarefas trelo',
          'qtd tarefas trello', 'quantidade tarefas trello', 'volume tarefas concluidas',
          'tarefas concluidas trello'
        ], 'volumeTarefasTrello'),
        
        // 31. Número de vídeos de treinamento gravados
        videosTreinamentoGravados: getValue(rowMap, [
          'numero de videos de treinamento gravados', 'videos de treinamento gravados',
          'videos treinamento gravados', 'videos treinamento', 'videos gravados',
          'qtd videos treinamento', 'quantidade videos treinamento', 'numero videos treinamento',
          'videos treinamento gravados numero'
        ], 'videosTreinamentoGravados'),
        
        // 32. Delivery Apólices
        deliveryApolices: getValue(rowMap, [
          'delivery apolices', 'delivery apolices semana', 'delivery apol',
          'qtd delivery apolices', 'quantidade delivery apolices', 'delivery apolices por semana'
        ], 'deliveryApolices'),
        
        // 33. Total de reuniões realizadas na semana
        totalReunioes: getValue(rowMap, [
          'total de reunioes realizadas na semana', 'total reunioes realizadas na semana',
          'total reunioes', 'total reunioes realizadas', 'reunioes realizadas',
          'qtd reunioes', 'quantidade reunioes', 'total reunioes semana',
          'reunioes realizadas na semana'
        ], 'totalReunioes'),
        
        // 34. Lista de Atrasos - atribuídos Raiza
        listaAtrasosRaiza: getTextValue(rowMap, [
          'lista de atrasos atribuidos raiza', 'lista atrasos atribuidos raiza',
          'lista atrasos raiza', 'lista atrasos', 'atrasos raiza',
          'lista de atrasos raiza', 'atrasos lista raiza', 'atrasos atribuidos raiza'
        ]),
        
        // Campos calculados
        ticketMedio: getValue(rowMap, [
          'ticket medio', 'ticket medio r$', 'ticket medio rs',
          'ticket medio realizado', 'ticket medio semana'
        ], 'ticketMedio'),
        conversaoOIs: getValue(rowMap, [
          'conversao ois', 'conversao oi', '% conversao ois',
          'percentual conversao ois', 'taxa conversao ois'
        ], 'conversaoOIs'),
      }
      
      // Calcular % OIs Realizadas se não estiver presente
      if (!data.percentualOIsRealizadas && data.oIsAgendadas > 0) {
        data.percentualOIsRealizadas = (data.oIsRealizadas / data.oIsAgendadas) * 100
      }
      
      // Calcular Ticket Médio se não estiver presente
      if (!data.ticketMedio && data.apolicesEmitidas > 0 && data.paSemanal > 0) {
        data.ticketMedio = data.paSemanal / data.apolicesEmitidas
      }
      
      // Log do primeiro registro completo para debug
      if (validCount === 0) {
        console.log('📊 [Google Sheets] Primeiro registro completo:', JSON.stringify(data, null, 2))
      }
      
      validCount++
      return data
    })
    
    // Filtrar nulls e ordenar por período
    const validData = mappedData.filter((data): data is WeeklyData => data !== null)
    
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
