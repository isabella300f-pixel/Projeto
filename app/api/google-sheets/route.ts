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
    'estoque', 'pagto', 'recebimento', 'percentual', 'índice', 'indice', 'financeiro'
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

// Função para converter valor para número
const parseNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value
  }
  
  if (typeof value === 'string') {
    const cleaned = value.trim()
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.-]/g, '')
    
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }
  
  return undefined
}

// Função auxiliar para buscar valor
const getValue = (rowMap: any, variations: string[]): number | undefined => {
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    
    if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
      const value = parseNumber(rowMap[normalized])
      if (value !== undefined) return value
    }
    
    for (const key in rowMap) {
      if (key.includes(normalized) || normalized.includes(key)) {
        const value = parseNumber(rowMap[key])
        if (value !== undefined) return value
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
      if (value) return value
    }
  }
  return undefined
}

// Função para buscar dados do Google Sheets
async function fetchGoogleSheetsData(): Promise<WeeklyData[]> {
  try {
    // Buscar CSV do Google Sheets
    const response = await fetch(GOOGLE_SHEETS_URL, {
      next: { revalidate: 0 }, // Sempre buscar dados atualizados
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar Google Sheets: ${response.statusText}`)
    }
    
    const csvText = await response.text()
    
    // Converter CSV para JSON usando XLSX
    const workbook = XLSX.read(csvText, { type: 'string' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      dateNF: 'dd/mm/yyyy',
      blankrows: false
    })
    
    if (!jsonData || jsonData.length === 0) {
      return []
    }
    
    // Mapear dados para WeeklyData
    const mappedData: (WeeklyData | null)[] = jsonData.map((row: any) => {
      const rowMap: any = {}
      Object.keys(row).forEach(key => {
        rowMap[normalizeKey(key)] = row[key]
      })
      
      // Buscar período
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
      
      // Mapear todos os indicadores
      const data: WeeklyData = {
        period: periodNormalized,
        
        // PA Semanal Realizado
        paSemanal: getValue(rowMap, [
          'pa semanal', 'pa semanal realizado', 'pa realizado', 'premio anual semanal',
          'pa semana', 'pa da semana', 'pa realizado semanal', 'pa sem'
        ]) || 0,
        
        // PA Acumulado Mês
        paAcumuladoMes: getValue(rowMap, [
          'pa acumulado mes', 'pa acumulado do mes', 'pa mes', 'pa acumulado mes',
          'premio anual acumulado mes', 'pa acum mes'
        ]) || 0,
        
        // PA Acumulado Ano
        paAcumuladoAno: getValue(rowMap, [
          'pa acumulado ano', 'pa acumulado do ano', 'pa ano', 'pa acumulado ano',
          'premio anual acumulado ano', 'pa acum ano'
        ]) || 0,
        
        // Meta PA Semanal
        metaPASemanal: getValue(rowMap, [
          'meta pa semanal', 'meta pa', 'meta pa semana', 'meta premio anual semanal',
          'meta pa sem', 'meta de pa semanal'
        ]) || 82000,
        
        // % Meta PA Semana
        percentualMetaPASemana: getValue(rowMap, [
          '% meta pa semana', '% meta pa semanal', '% meta pa', '% pa semanal',
          'percentual meta pa semana', 'percentual meta pa', '% pa semana'
        ]) || 0,
        
        // % Meta PA Ano
        percentualMetaPAAno: getValue(rowMap, [
          '% meta pa ano', '% meta pa anual', '% pa ano', '% pa acumulado ano',
          'percentual meta pa ano', 'percentual meta pa anual', '% pa acum ano'
        ]) || 0,
        
        // PA Emitido
        paEmitido: getValue(rowMap, [
          'pa emitido', 'pa emitido na semana', 'pa emitido semana', 'premio anual emitido',
          'pa emit', 'pa emitido semanal'
        ]) || 0,
        
        // Apólices Emitidas
        apolicesEmitidas: getValue(rowMap, [
          'apolices emitidas', 'apolices', 'numero de apolices', 'qtd apolices',
          'quantidade apolices', 'apolices emit', 'total apolices'
        ]) || 0,
        
        // Meta N Semanal
        metaNSemanal: getValue(rowMap, [
          'meta n semanal', 'meta n', 'meta n semana', 'meta numero apolices',
          'meta n sem', 'meta de n semanal'
        ]) || 5,
        
        // N da Semana
        nSemana: getValue(rowMap, [
          'n da semana', 'n semanal', 'n semana', 'numero apolices semana',
          'n sem', 'n realizado', 'n da sem'
        ]) || 0,
        
        // N Acumulado Mês
        nAcumuladoMes: getValue(rowMap, [
          'n acumulado mes', 'n acumulado do mes', 'n mes', 'n acumulado mes',
          'numero apolices acumulado mes', 'n acum mes'
        ]) || 0,
        
        // N Acumulado Ano
        nAcumuladoAno: getValue(rowMap, [
          'n acumulado ano', 'n acumulado do ano', 'n ano', 'n acumulado ano',
          'numero apolices acumulado ano', 'n acum ano'
        ]) || 0,
        
        // % Meta N Semana
        percentualMetaNSemana: getValue(rowMap, [
          '% meta n semana', '% meta n semanal', '% meta n', '% n semanal',
          'percentual meta n semana', 'percentual meta n', '% n semana'
        ]) || 0,
        
        // % Meta N Ano
        percentualMetaNAno: getValue(rowMap, [
          '% meta n ano', '% meta n anual', '% n ano', '% n acumulado ano',
          'percentual meta n ano', 'percentual meta n anual', '% n acum ano'
        ]) || 0,
        
        // Meta OIs Agendadas
        metaOIsAgendadas: getValue(rowMap, [
          'meta ois agendadas', 'meta ois', 'meta ois agend', 'meta oportunidades inovacao',
          'meta ois agendadas semana', 'meta oi agendadas'
        ]) || 8,
        
        // OIs Agendadas
        oIsAgendadas: getValue(rowMap, [
          'ois agendadas', 'ois agend', 'oIs agendadas', 'ois agendadas semana',
          'oportunidades inovacao agendadas', 'oi agendadas', 'ois agendadas na semana'
        ]) || 0,
        
        // OIs Realizadas
        oIsRealizadas: getValue(rowMap, [
          'ois realizadas', 'ois realiz', 'oIs realizadas', 'ois realizadas semana',
          'oportunidades inovacao realizadas', 'oi realizadas', 'ois realizadas na semana'
        ]) || 0,
        
        // % OIs Realizadas
        percentualOIsRealizadas: getValue(rowMap, [
          '% ois realizadas', '% ois realiz', '% oIs realizadas', '% ois',
          'percentual ois realizadas', 'percentual ois', '% oi realizadas'
        ]),
        
        // RECS
        metaRECS: getValue(rowMap, [
          'meta recs', 'meta rec', 'meta recs agendadas', 'meta recs semana'
        ]),
        novasRECS: getValue(rowMap, [
          'novas recs', 'novas rec', 'recs novas', 'recs realizadas', 'recs semana'
        ]),
        
        // PCs/C2
        metaPCsC2Agendados: getValue(rowMap, [
          'meta pcs c2 agendados', 'meta pcs c2', 'meta pcs', 'meta c2',
          'meta pcs c2 agend', 'meta pcs c2 semana'
        ]),
        pcsRealizados: getValue(rowMap, [
          'pcs realizados', 'pcs realiz', 'pcs realizados semana', 'pcs semana'
        ]),
        c2Realizados: getValue(rowMap, [
          'c2 realizados', 'c2 realiz', 'c2 realizados semana', 'c2 semana'
        ]),
        
        // Atrasos
        apoliceEmAtraso: getValue(rowMap, [
          'apolice em atraso', 'apolices em atraso', 'apolice atraso', 'apolices atraso',
          'numero apolices atraso', 'qtd apolices atraso'
        ]),
        premioEmAtraso: getValue(rowMap, [
          'premio em atraso', 'premio atraso', 'pa em atraso', 'pa atraso',
          'valor premio atraso', 'valor pa atraso'
        ]),
        
        // Inadimplência
        taxaInadimplenciaGeral: getValue(rowMap, [
          'taxa inadimplencia geral', 'taxa inadimplencia', 'inadimplencia geral',
          '% inadimplencia geral', 'percentual inadimplencia geral'
        ]),
        taxaInadimplenciaAssistente: getValue(rowMap, [
          'taxa inadimplencia assistente', 'inadimplencia assistente',
          '% inadimplencia assistente', 'percentual inadimplencia assistente'
        ]),
        
        // Revisitas
        metaRevisitasAgendadas: getValue(rowMap, [
          'meta revisitas agendadas', 'meta revisitas', 'meta revisitas agend',
          'meta revisitas agendadas semana'
        ]),
        revisitasAgendadas: getValue(rowMap, [
          'revisitas agendadas', 'revisitas agend', 'revisitas agendadas semana',
          'revisitas agendadas na semana'
        ]),
        revisitasRealizadas: getValue(rowMap, [
          'revisitas realizadas', 'revisitas realiz', 'revisitas realizadas semana',
          'revisitas realizadas na semana'
        ]),
        
        // Produtividade
        volumeTarefasTrello: getValue(rowMap, [
          'volume tarefas trello', 'tarefas trello', 'tarefas trelo',
          'qtd tarefas trello', 'quantidade tarefas trello'
        ]),
        videosTreinamentoGravados: getValue(rowMap, [
          'videos treinamento gravados', 'videos treinamento', 'videos gravados',
          'qtd videos treinamento', 'quantidade videos treinamento'
        ]),
        deliveryApolices: getValue(rowMap, [
          'delivery apolices', 'delivery apolices semana', 'delivery apol',
          'qtd delivery apolices', 'quantidade delivery apolices'
        ]),
        totalReunioes: getValue(rowMap, [
          'total reunioes', 'total reunioes realizadas', 'reunioes realizadas',
          'qtd reunioes', 'quantidade reunioes', 'total reunioes semana'
        ]),
        
        // Lista de Atrasos Raiza
        listaAtrasosRaiza: getTextValue(rowMap, [
          'lista atrasos raiza', 'lista atrasos', 'atrasos raiza',
          'lista de atrasos raiza', 'atrasos lista raiza'
        ]),
        
        // Calculados
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
    
    // Ordenar por período (assumindo formato "DD/MM a DD/MM")
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
    console.error('Erro ao buscar dados do Google Sheets:', error)
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
    console.error('Erro na API Google Sheets:', error)
    
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
