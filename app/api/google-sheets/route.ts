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

// Função para validar período
const isValidPeriod = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false
  
  const normalized = value.trim().toLowerCase()
  
  if (normalized.length < 5 || normalized.length > 50) return false
  
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
    'unid a de de medid a', 'unidade de medida'
  ]
  
  for (const pattern of invalidPatterns) {
    if (normalized.includes(pattern)) {
      return false
    }
  }
  
  if (!/\d/.test(normalized)) return false
  
  const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(normalized)
  const hasPeriodPattern = /\d{1,2}\/\d{1,2}\s+[aA]\s+\d{1,2}\/\d{1,2}/.test(normalized)
  const hasWeekPattern = /\d{4}-w\d{1,2}/i.test(normalized)
  const hasDateRange = (normalized.includes('a') || normalized.includes('A')) && /\d/.test(normalized) && normalized.includes('/')
  
  return hasDatePattern || hasPeriodPattern || hasWeekPattern || hasDateRange
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

// Função auxiliar para buscar valor com múltiplas variações
const getValue = (rowMap: any, variations: string[]): number | undefined => {
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    
    // Busca exata primeiro
    if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
      const value = parseNumber(rowMap[normalized])
      if (value !== undefined && value !== 0) return value
    }
    
    // Busca parcial (contém a variação)
    for (const key in rowMap) {
      const normalizedKey = normalizeKey(key)
      if (normalizedKey.includes(normalized) || normalized.includes(normalizedKey)) {
        const value = parseNumber(rowMap[key])
        if (value !== undefined && value !== 0) return value
      }
    }
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
    console.log('🔄 Buscando dados do Google Sheets...')
    console.log('📋 URL:', GOOGLE_SHEETS_URL)
    
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
      console.error('❌ CSV vazio retornado do Google Sheets')
      return []
    }
    
    console.log('✅ CSV recebido, tamanho:', csvText.length, 'caracteres')
    
    // Converter CSV para JSON usando XLSX
    const workbook = XLSX.read(csvText, { 
      type: 'string',
      cellDates: false,
      cellNF: false,
      cellText: false
    })
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.error('❌ Nenhuma planilha encontrada no workbook')
      return []
    }
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    console.log('📊 Planilha encontrada:', sheetName)
    
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      dateNF: 'dd/mm/yyyy',
      blankrows: false
    })
    
    console.log('📈 Total de linhas no JSON:', jsonData.length)
    
    if (!jsonData || jsonData.length === 0) {
      console.error('❌ Nenhum dado encontrado após conversão')
      return []
    }
    
    // Log das colunas encontradas (primeira linha)
    if (jsonData.length > 0) {
      const firstRow = jsonData[0]
      const columns = Object.keys(firstRow)
      console.log('📋 Colunas encontradas:', columns.slice(0, 10), '... (total:', columns.length, ')')
    }
    
    // Mapear dados para WeeklyData
    const mappedData: (WeeklyData | null)[] = jsonData.map((row: any, index: number) => {
      const rowMap: any = {}
      Object.keys(row).forEach(key => {
        rowMap[normalizeKey(key)] = row[key]
      })
      
      // Buscar período com múltiplas variações
      let periodRaw = getTextValue(rowMap, [
        'período', 'periodo', 'period', 'semana', 'data',
        'periodo semanal', 'periodo da semana', 'semana de',
        'data inicial', 'data final', 'range', 'intervalo',
        'data periodo', 'periodo data', 'semana periodo'
      ]) || ''
      
      // Se não encontrou, buscar em qualquer coluna que contenha "period", "semana" ou "data"
      if (!periodRaw) {
        for (const key in rowMap) {
          const normalizedKey = normalizeKey(key)
          if (normalizedKey.includes('period') || normalizedKey.includes('semana') || normalizedKey.includes('data')) {
            const value = String(rowMap[key] || '').trim()
            if (value && value.length > 0 && value !== 'undefined' && value !== 'null') {
              if (isValidPeriod(value)) {
                periodRaw = value
                break
              }
            }
          }
        }
      }
      
      // Se ainda não encontrou, usar a primeira coluna que tenha valor válido
      if (!periodRaw) {
        for (const key in rowMap) {
          const value = String(rowMap[key] || '').trim()
          if (value && value.length > 0 && value !== 'undefined' && value !== 'null') {
            if (isValidPeriod(value)) {
              periodRaw = value
              break
            }
          }
        }
      }
      
      // Validar período
      if (!periodRaw || !isValidPeriod(periodRaw)) {
        return null
      }
      
      const periodNormalized = normalizePeriod(periodRaw)
      
      // Mapear TODOS os 34 indicadores com variações completas
      const data: WeeklyData = {
        period: periodNormalized,
        
        // 1. PA Semanal Realizado
        paSemanal: getValue(rowMap, [
          'pa semanal realizado', 'pa semanal', 'pa realizado', 'premio anual semanal',
          'pa semana', 'pa da semana', 'pa realizado semanal', 'pa sem',
          'pa semanal realizado r$', 'pa realizado semana'
        ]) || 0,
        
        // 2. PA Acumulado no Mês
        paAcumuladoMes: getValue(rowMap, [
          'pa acumulado no mes', 'pa acumulado mes', 'pa acumulado do mes', 'pa mes',
          'premio anual acumulado mes', 'pa acum mes', 'pa acumulado no mes r$'
        ]) || 0,
        
        // 3. PA Acumulado no Ano
        paAcumuladoAno: getValue(rowMap, [
          'pa acumulado no ano', 'pa acumulado ano', 'pa acumulado do ano', 'pa ano',
          'premio anual acumulado ano', 'pa acum ano', 'pa acumulado no ano r$'
        ]) || 0,
        
        // 4. Meta de PA Semanal Necessária
        metaPASemanal: getValue(rowMap, [
          'meta de pa semanal necessaria', 'meta pa semanal necessaria', 'meta pa semanal', 'meta pa',
          'meta pa semana', 'meta premio anual semanal', 'meta pa sem', 'meta de pa semanal'
        ]) || 82000,
        
        // 5. % Meta de PA Realizada da Semana
        percentualMetaPASemana: getValue(rowMap, [
          '% meta de pa realizada da semana', '% meta pa realizada da semana', '% meta pa semana',
          '% meta pa semanal', '% meta pa', '% pa semanal', 'percentual meta pa semana',
          'percentual meta pa', '% pa semana', '% meta pa realizada semana'
        ]) || 0,
        
        // 6. % Meta de PA Realizada do Ano
        percentualMetaPAAno: getValue(rowMap, [
          '% meta de pa realizada do ano', '% meta pa realizada do ano', '% meta pa ano',
          '% meta pa anual', '% pa ano', '% pa acumulado ano', 'percentual meta pa ano',
          'percentual meta pa anual', '% pa acum ano', '% meta pa realizada ano'
        ]) || 0,
        
        // 7. PA Emitido na semana
        paEmitido: getValue(rowMap, [
          'pa emitido na semana', 'pa emitido semana', 'pa emitido', 'premio anual emitido',
          'pa emit', 'pa emitido semanal', 'pa emitido na semana r$'
        ]) || 0,
        
        // 8. Apólices emitidas (por semana)
        apolicesEmitidas: getValue(rowMap, [
          'apolices emitidas por semana', 'apolices emitidas', 'apolices', 'numero de apolices',
          'qtd apolices', 'quantidade apolices', 'apolices emit', 'total apolices',
          'apolices emitidas semana', 'apolices por semana'
        ]) || 0,
        
        // 9. Meta de N semanal
        metaNSemanal: getValue(rowMap, [
          'meta de n semanal', 'meta n semanal', 'meta n', 'meta n semana',
          'meta numero apolices', 'meta n sem', 'meta de n semanal necessaria'
        ]) || 5,
        
        // 10. N da Semana
        nSemana: getValue(rowMap, [
          'n da semana', 'n semanal', 'n semana', 'numero apolices semana',
          'n sem', 'n realizado', 'n da sem', 'n realizado semana'
        ]) || 0,
        
        // 11. N Acumulados do Mes
        nAcumuladoMes: getValue(rowMap, [
          'n acumulados do mes', 'n acumulado mes', 'n acumulado do mes', 'n mes',
          'numero apolices acumulado mes', 'n acum mes', 'n acumulados mes'
        ]) || 0,
        
        // 12. N Acumulados do Ano
        nAcumuladoAno: getValue(rowMap, [
          'n acumulados do ano', 'n acumulado ano', 'n acumulado do ano', 'n ano',
          'numero apolices acumulado ano', 'n acum ano', 'n acumulados ano'
        ]) || 0,
        
        // 13. % Meta de N Realizada da Semana
        percentualMetaNSemana: getValue(rowMap, [
          '% meta de n realizada da semana', '% meta n realizada da semana', '% meta n semana',
          '% meta n semanal', '% meta n', '% n semanal', 'percentual meta n semana',
          'percentual meta n', '% n semana', '% meta n realizada semana'
        ]) || 0,
        
        // 14. % Meta de N Realizada do Ano
        percentualMetaNAno: getValue(rowMap, [
          '% meta de n realizada do ano', '% meta n realizada do ano', '% meta n ano',
          '% meta n anual', '% n ano', '% n acumulado ano', 'percentual meta n ano',
          'percentual meta n anual', '% n acum ano', '% meta n realizada ano'
        ]) || 0,
        
        // 15. Meta OIs Agendadas
        metaOIsAgendadas: getValue(rowMap, [
          'meta ois agendadas', 'meta ois', 'meta ois agend', 'meta oportunidades inovacao',
          'meta ois agendadas semana', 'meta oi agendadas', 'meta ois agendadas necessaria'
        ]) || 8,
        
        // 16. OIs agendadas
        oIsAgendadas: getValue(rowMap, [
          'ois agendadas', 'ois agend', 'oIs agendadas', 'ois agendadas semana',
          'oportunidades inovacao agendadas', 'oi agendadas', 'ois agendadas na semana',
          'ois agendadas por semana'
        ]) || 0,
        
        // 17. OIs realizadas na semana
        oIsRealizadas: getValue(rowMap, [
          'ois realizadas na semana', 'ois realizadas semana', 'ois realizadas', 'ois realiz',
          'oIs realizadas', 'oportunidades inovacao realizadas', 'oi realizadas',
          'ois realizadas na semana', 'ois realizadas por semana'
        ]) || 0,
        
        // 18. Meta RECS
        metaRECS: getValue(rowMap, [
          'meta recs', 'meta rec', 'meta recs agendadas', 'meta recs semana',
          'meta recs necessaria'
        ]),
        
        // 19. Novas RECS
        novasRECS: getValue(rowMap, [
          'novas recs', 'novas rec', 'recs novas', 'recs realizadas', 'recs semana',
          'novas recs semana', 'recs novas semana'
        ]),
        
        // 20. Meta de PCs/C2 agendados
        metaPCsC2Agendados: getValue(rowMap, [
          'meta de pcs c2 agendados', 'meta pcs c2 agendados', 'meta pcs c2', 'meta pcs',
          'meta c2', 'meta pcs c2 agend', 'meta pcs c2 semana', 'meta pcs c2 agendados necessaria'
        ]),
        
        // 21. PCs realizados na semana
        pcsRealizados: getValue(rowMap, [
          'pcs realizados na semana', 'pcs realizados semana', 'pcs realizados', 'pcs realiz',
          'pcs semana', 'pcs realizados por semana'
        ]),
        
        // 22. Quantidade de C2 realizados na semana
        c2Realizados: getValue(rowMap, [
          'quantidade de c2 realizados na semana', 'c2 realizados na semana', 'c2 realizados semana',
          'c2 realizados', 'c2 realiz', 'c2 semana', 'quantidade c2 realizados',
          'c2 realizados por semana', 'qtd c2 realizados'
        ]),
        
        // 23. Apólice em atraso (nº)
        apoliceEmAtraso: getValue(rowMap, [
          'apolice em atraso no', 'apolice em atraso', 'apolices em atraso', 'apolice atraso',
          'apolices atraso', 'numero apolices atraso', 'qtd apolices atraso',
          'apolice em atraso numero', 'apolices em atraso no'
        ]),
        
        // 24. Premio em atraso de clientes (R$)
        premioEmAtraso: getValue(rowMap, [
          'premio em atraso de clientes r$', 'premio em atraso de clientes', 'premio em atraso',
          'premio atraso', 'pa em atraso', 'pa atraso', 'valor premio atraso',
          'valor pa atraso', 'premio em atraso r$', 'premio atraso clientes'
        ]),
        
        // 25. Taxa de inadimplência (%) Geral
        taxaInadimplenciaGeral: getValue(rowMap, [
          'taxa de inadimplencia % geral', 'taxa inadimplencia geral', 'taxa inadimplencia',
          'inadimplencia geral', '% inadimplencia geral', 'percentual inadimplencia geral',
          'taxa inadimplencia % geral'
        ]),
        
        // 26. Taxa de inadimplência (%) Assistente
        taxaInadimplenciaAssistente: getValue(rowMap, [
          'taxa de inadimplencia % assistente', 'taxa inadimplencia assistente',
          'inadimplencia assistente', '% inadimplencia assistente',
          'percentual inadimplencia assistente', 'taxa inadimplencia % assistente'
        ]),
        
        // 27. Meta revisitas agendadas
        metaRevisitasAgendadas: getValue(rowMap, [
          'meta revisitas agendadas', 'meta revisitas', 'meta revisitas agend',
          'meta revisitas agendadas semana', 'meta revisitas necessaria'
        ]),
        
        // 28. Revisitas Agendadas na semana
        revisitasAgendadas: getValue(rowMap, [
          'revisitas agendadas na semana', 'revisitas agendadas semana', 'revisitas agendadas',
          'revisitas agend', 'revisitas agendadas na semana', 'revisitas agendadas por semana'
        ]),
        
        // 29. Revisitas realizadas na semana
        revisitasRealizadas: getValue(rowMap, [
          'revisitas realizadas na semana', 'revisitas realizadas semana', 'revisitas realizadas',
          'revisitas realiz', 'revisitas realizadas na semana', 'revisitas realizadas por semana'
        ]),
        
        // 30. Volume de tarefas concluídas no Trello
        volumeTarefasTrello: getValue(rowMap, [
          'volume de tarefas concluidas no trello', 'volume tarefas concluidas trello',
          'volume tarefas trello', 'tarefas trello', 'tarefas trelo',
          'qtd tarefas trello', 'quantidade tarefas trello', 'volume tarefas concluidas',
          'tarefas concluidas trello'
        ]),
        
        // 31. Número de vídeos de treinamento gravados
        videosTreinamentoGravados: getValue(rowMap, [
          'numero de videos de treinamento gravados', 'videos de treinamento gravados',
          'videos treinamento gravados', 'videos treinamento', 'videos gravados',
          'qtd videos treinamento', 'quantidade videos treinamento', 'numero videos treinamento',
          'videos treinamento gravados numero'
        ]),
        
        // 32. Delivery Apólices
        deliveryApolices: getValue(rowMap, [
          'delivery apolices', 'delivery apolices semana', 'delivery apol',
          'qtd delivery apolices', 'quantidade delivery apolices', 'delivery apolices por semana'
        ]),
        
        // 33. Total de reuniões realizadas na semana
        totalReunioes: getValue(rowMap, [
          'total de reunioes realizadas na semana', 'total reunioes realizadas na semana',
          'total reunioes', 'total reunioes realizadas', 'reunioes realizadas',
          'qtd reunioes', 'quantidade reunioes', 'total reunioes semana',
          'reunioes realizadas na semana'
        ]),
        
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
        ]),
        conversaoOIs: getValue(rowMap, [
          'conversao ois', 'conversao oi', '% conversao ois',
          'percentual conversao ois', 'taxa conversao ois'
        ]),
      }
      
      // Calcular % OIs Realizadas se não estiver presente
      if (!data.percentualOIsRealizadas && data.oIsAgendadas > 0) {
        data.percentualOIsRealizadas = (data.oIsRealizadas / data.oIsAgendadas) * 100
      }
      
      // Calcular Ticket Médio se não estiver presente
      if (!data.ticketMedio && data.apolicesEmitidas > 0 && data.paSemanal > 0) {
        data.ticketMedio = data.paSemanal / data.apolicesEmitidas
      }
      
      return data
    })
    
    // Filtrar nulls e ordenar por período
    const validData = mappedData.filter((data): data is WeeklyData => data !== null)
    
    console.log('✅ Dados válidos encontrados:', validData.length, 'de', jsonData.length, 'linhas')
    
    if (validData.length > 0) {
      console.log('📅 Períodos encontrados:', validData.map(d => d.period).slice(0, 5), '...')
    }
    
    // Ordenar por período (melhorado para lidar com anos)
    validData.sort((a, b) => {
      const dateA = a.period.match(/(\d{1,2})\/(\d{1,2})/)
      const dateB = b.period.match(/(\d{1,2})\/(\d{1,2})/)
      
      if (!dateA || !dateB) return 0
      
      const monthA = parseInt(dateA[2])
      const dayA = parseInt(dateA[1])
      const monthB = parseInt(dateB[2])
      const dayB = parseInt(dateB[1])
      
      if (monthA !== monthB) return monthA - monthB
      return dayA - dayB
    })
    
    return validData
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados do Google Sheets:', error)
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
    console.error('❌ Erro na API Google Sheets:', error)
    
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
