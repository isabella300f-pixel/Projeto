// API Route para sincronizar dados locais a partir da planilha
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { WeeklyData } from '@/lib/types'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    // Forçar processamento sem cache
    const excelFile = path.join(process.cwd(), 'KPI DASH - Legatum.xlsx')
    
    console.log('🔄 Iniciando sincronização de dados...')
    console.log('📁 Arquivo:', excelFile)
    console.log('✅ Arquivo existe:', fs.existsSync(excelFile))
    
    if (!fs.existsSync(excelFile)) {
      console.error('❌ Planilha não encontrada:', excelFile)
      return NextResponse.json(
        { error: 'Planilha não encontrada: KPI DASH - Legatum.xlsx' },
        { status: 404 }
      )
    }

    // Usar a mesma lógica do upload
    const workbook = XLSX.readFile(excelFile)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      dateNF: 'dd/mm/yyyy',
      blankrows: false
    })

    // Funções de normalização (mesmas do upload)
    const normalizeKey = (key: string) => 
      String(key || '').toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[%()]/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const normalizePeriod = (period: string): string => {
      return String(period || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*[Aa]\s*/g, ' a ') // Aceita "a" ou "A" maiúsculo
        .replace(/\//g, '/')
    }

    const isValidPeriod = (value: string): boolean => {
      if (!value || typeof value !== 'string') return false
      const normalized = value.trim().toLowerCase()
      if (normalized.length < 5 || normalized.length > 50) return false
      if (!/\d/.test(normalized)) return false
      
      // Lista de padrões inválidos (mais permissiva)
      const invalidPatterns = [
        'simples nacional', 'anexo', 'indica', 'célula', 'celula',
        'output', 'input', 'informação', 'informacao', 'permit',
        'alterar', 'conteúdo', 'conteudo', 'fórmula', 'formula',
        'perdida', 'atalho', 'simulação', 'simulacao', 'hipótese',
        'hipotese', 'cartão', 'cartao', 'crédito', 'credito',
        'débito', 'debito', 'vista', 'dinheiro', 'caixa', 'capital',
        'giro', 'ciclo', 'diária', 'diaria', 'franqueado',
        'gerenciamento', 'regime', 'tributário', 'tributario',
        'saco', 'unidade', 'medida', 'taxa', 'retorno', 'irr',
        'tir', 'prazo', 'médio', 'medio', 'estoque', 'pagto',
        'recebimento', 'percentual', 'índice', 'indice', 'financeiro',
        'kpi', 'dashboard', 'legathon', 'modelo', 'planilha', 'base',
        'dados', 'semanal', 'mensal', 'anual', 'geral', 'total', 'meta',
        'realizado', 'acumulado', 'emitido', 'apólices', 'apolices',
        'oportunidades', 'inovação', 'inovacao', 'recs', 'revisitas',
        'atrasos', 'inadimplência', 'inadimplencia', 'produtividade',
        'trello', 'vídeos', 'videos', 'treinamento', 'delivery',
        'reuniões', 'reunioes', 'lista', 'atribuídos', 'atribuidos',
        'raiza', 'ticket', 'conversão', 'conversao', 'pcs', 'c2'
      ]
      
      // Verificar se contém padrões inválidos
      for (const pattern of invalidPatterns) {
        if (normalized.includes(pattern)) {
          return false
        }
      }
      
      const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(normalized)
      const hasPeriodPattern = /\d{1,2}\/\d{1,2}\s+a\s+\d{1,2}\/\d{1,2}/.test(normalized)
      const hasWeekPattern = /\d{4}-w\d{1,2}/i.test(normalized)
      const hasDateRange = normalized.includes('a') && /\d/.test(normalized) && normalized.includes('/')
      
      return hasDatePattern || hasPeriodPattern || hasWeekPattern || hasDateRange
    }

    const parseNumber = (value: any): number | undefined => {
      if (value === null || value === undefined || value === '') return undefined
      if (typeof value === 'number') return isNaN(value) ? undefined : value
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

    // Processar dados (mesma lógica do upload)
    const mappedData: (WeeklyData | null)[] = jsonData.map((row: any) => {
      const rowMap: any = {}
      Object.keys(row).forEach(key => {
        rowMap[normalizeKey(key)] = row[key]
      })

      // Buscar período com MUITAS variações para garantir que encontre
      let periodRaw = getTextValue(rowMap, [
        'período', 'periodo', 'period', 'semana', 'data',
        'periodo semanal', 'periodo da semana', 'semana de',
        'data inicial', 'data final', 'range', 'intervalo',
        'data periodo', 'periodo data', 'semana periodo',
        'periodo semanal realizado', 'periodo realizado',
        'semana de referencia', 'periodo referencia',
        'data inicio', 'data fim', 'periodo inicio', 'periodo fim'
      ]) || ''
      
      // Se não encontrou, buscar em QUALQUER coluna que possa ser período
      if (!periodRaw) {
        for (const key in rowMap) {
          const normalizedKey = normalizeKey(key)
          const value = rowMap[key]
          
          // Se a chave contém palavras relacionadas a período/data
          if (normalizedKey.includes('period') || 
              normalizedKey.includes('semana') || 
              normalizedKey.includes('data') ||
              normalizedKey.includes('referencia') ||
              normalizedKey.includes('intervalo') ||
              normalizedKey.includes('inicio') ||
              normalizedKey.includes('fim')) {
            const strValue = String(value || '').trim()
            if (strValue && strValue.length > 0 && strValue !== 'undefined' && strValue !== 'null') {
              if (isValidPeriod(strValue)) {
                periodRaw = strValue
                break
              }
            }
          }
        }
      }

      if (!periodRaw) {
        for (const key in rowMap) {
          const value = rowMap[key]
          if (value instanceof Date) {
            const dateStr = value.toLocaleDateString('pt-BR')
            if (isValidPeriod(dateStr)) {
              periodRaw = dateStr
              break
            }
          }
        }
      }

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

      if (!periodRaw || !isValidPeriod(periodRaw)) {
        return null
      }

      const periodNormalized = normalizePeriod(periodRaw)

      // Mapear todos os campos (usando EXATAMENTE a mesma lógica do upload)
      const data: WeeklyData = {
        period: periodNormalized,
        paSemanal: getValue(rowMap, [
          'pa semanal realizado',
          'pa semanal',
          'pasemanal',
          'premio anual semanal',
          'pa realizado',
          'pa semanal realizado r$',
          'pa semanal r$',
          'premio anual semanal realizado'
        ]) || 0,
        paAcumuladoMes: getValue(rowMap, ['pa acumulado no mes', 'pa acumulado mes', 'paacumuladomes', 'premio anual acumulado mes', 'pa acum mes', 'pa acumulado mes r$', 'pa acum mes r$']) || 0,
        paAcumuladoAno: getValue(rowMap, ['pa acumulado no ano', 'pa acumulado ano', 'paacumuladoano', 'premio anual acumulado ano', 'pa acum ano', 'pa acumulado ano r$', 'pa acum ano r$', 'pa acumulado total ano']) || 0,
        metaPASemanal: getValue(rowMap, ['meta de pa semanal necessaria', 'meta pa semanal', 'metapasemanal', 'meta pa semanal necessaria']) || 82000,
        percentualMetaPASemana: getValue(rowMap, ['meta de pa realizada da semana', '% meta pa semana', 'meta pa semana', 'percentual meta pa semana', '% meta de pa realizada da semana', 'percentual meta pa realizada semana', '% meta pa realizada semana', 'meta pa realizada semana %']) || 0,
        percentualMetaPAAno: getValue(rowMap, ['meta de pa realizada do ano', '% meta pa ano', 'meta pa ano', 'percentual meta pa ano', '% meta de pa realizada do ano', 'percentual meta pa realizada ano', '% meta pa realizada ano', 'meta pa realizada ano %']) || 0,
        paEmitido: getValue(rowMap, ['pa emitido na semana', 'pa emitido', 'paemitido', 'premio anual emitido', 'pa emitido semana', 'pa emitido r$', 'premio anual emitido semana']) || 0,
        apolicesEmitidas: getValue(rowMap, ['apolices emitidas por semana', 'apolices emitidas', 'apolicesemitidas', 'apolices', 'numero de apolices', 'apolices emitidas semana', 'qtd apolices emitidas', 'quantidade apolices emitidas', 'n apolices emitidas']) || 0,
        metaNSemanal: getValue(rowMap, ['meta de n semanal', 'meta n semanal', 'metansemanal', 'meta n', 'meta n semana', 'meta apolices semanal', 'meta numero apolices semanal']) || 5,
        nSemana: getValue(rowMap, ['n da semana', 'n semana', 'nsemana', 'n semanal', 'n semana realizado', 'numero apolices semana', 'qtd apolices semana']) || 0,
        nAcumuladoMes: getValue(rowMap, ['n acumulados do mes', 'n acumulado mes', 'nacumuladomes', 'n acumulado mes', 'n acum mes', 'apolices acumuladas mes', 'numero apolices acumulado mes']) || 0,
        nAcumuladoAno: getValue(rowMap, ['n acumulados do ano', 'n acumulado ano', 'nacumuladoano', 'n acumulado ano', 'n acum ano', 'apolices acumuladas ano', 'numero apolices acumulado ano', 'n acumulado total ano']) || 0,
        percentualMetaNSemana: getValue(rowMap, ['meta de n realizada da semana', '% meta n semana', 'meta n semana', 'percentual meta n semana', '% meta de n realizada da semana', 'percentual meta n realizada semana', '% meta n realizada semana', 'meta n realizada semana %']) || 0,
        percentualMetaNAno: getValue(rowMap, ['meta de n realizada do ano', '% meta n ano', 'meta n ano', 'percentual meta n ano', '% meta de n realizada do ano', 'percentual meta n realizada ano', '% meta n realizada ano', 'meta n realizada ano %']) || 0,
        metaOIsAgendadas: getValue(rowMap, ['meta ois agendadas', 'metaoisagendadas', 'meta ois', 'meta oportunidades de inovacao agendadas', 'meta ois semana', 'meta ois agendadas semana', 'meta oi agendadas']) || 8,
        oIsAgendadas: getValue(rowMap, [
          'ois agendadas', 'oisagendadas', 
          'oportunidades de inovacao agendadas', 'oportunidades de inovação agendadas',
          'ois agend', 'ois agendadas semana', 
          'qtd ois agendadas', 'quantidade ois agendadas',
          'ols agendadas', 'ols agend' // Variação com "ols" ao invés de "ois"
        ]) || 0,
        oIsRealizadas: getValue(rowMap, [
          'ois realizadas na semana', 'ois realizadas', 'oisrealizadas', 
          'oportunidades de inovacao realizadas', 'oportunidades de inovação realizadas',
          'ois realizadas semana', 
          'qtd ois realizadas', 'quantidade ois realizadas',
          'ols realizadas na semana', 'ols realizadas' // Variação com "ols"
        ]) || 0,
        metaRECS: getValue(rowMap, [
          'meta recs', 'metarecs', 'meta rec', 
          'meta revisao de carteira', 'meta revisão de carteira',
          'meta recs agendadas', 'meta revisoes carteira', 'meta revisões carteira',
          'meta rec semana', 'meta recs semana'
        ]) ?? 0,
        novasRECS: getValue(rowMap, [
          'novas recs', 'novasrecs', 'novas rec', 
          'novas revisoes de carteira', 'novas revisões de carteira',
          'novas recs realizadas', 
          'qtd novas recs', 'quantidade novas recs',
          'novas recs na semana'
        ]) ?? 0,
        metaPCsC2Agendados: getValue(rowMap, ['meta de pcs c2 agendados', 'meta pcs c2 agendados', 'meta pcs/c2 agendados', 'metapcsc2agendados', 'meta pcs agendados', 'meta pcs c2', 'meta pcs e c2 agendados', 'meta pcs c2 semana']) ?? 0,
        pcsRealizados: getValue(rowMap, ['pcs realizados na semana', 'pcs realizados', 'pcsrealizados', 'pcs', 'pcs realizados semana', 'qtd pcs realizados', 'quantidade pcs realizados', 'pcs realiz']) ?? 0,
        c2Realizados: getValue(rowMap, [
          'quantidade de c2 realizados na semana', 'c2 realizados na semana', 
          'c2 realizados', 'c2realizados', 
          'quantidade c2 realizados', 'c2 realizados semana', 
          'qtd c2 realizados', 'quantidade c2', 'c2 realiz',
          'quantidade de c2 realizados na seman' // Variação sem "a" no final
        ]) ?? 0,
        apoliceEmAtraso: getValue(rowMap, ['apolice em atraso', 'apolice em atraso no', 'apoliceematraso', 'apolices em atraso', 'numero de apolices em atraso', 'qtd apolices atraso', 'quantidade apolices atraso', 'apolices atrasadas', 'n apolices atraso']) ?? 0,
        premioEmAtraso: getValue(rowMap, ['premio em atraso de clientes', 'premio em atraso', 'premioematraso', 'premios em atraso', 'valor premio em atraso', 'premio atraso r$', 'valor premio atraso', 'premios atrasados r$', 'pa em atraso']) ?? 0,
        taxaInadimplenciaGeral: getValue(rowMap, ['taxa de inadimplencia geral', 'taxa inadimplencia geral', 'taxainadimplenciageral', 'inadimplencia geral', '% inadimplencia geral', 'taxa inadimplencia %', 'inadimplencia % geral', 'taxa inad geral']) ?? 0,
        taxaInadimplenciaAssistente: getValue(rowMap, ['taxa de inadimplencia assistente', 'taxa inadimplencia assistente', 'taxainadimplenciaassistente', 'inadimplencia assistente', '% inadimplencia assistente', 'taxa inadimplencia % assistente', 'inadimplencia % assistente', 'taxa inad assistente']) ?? 0,
        metaRevisitasAgendadas: getValue(rowMap, ['meta revisitas agendadas', 'metarevisitasagendadas', 'meta revisita', 'meta revisitas', 'meta revisitas semana', 'meta revisitas agendadas semana']) ?? 0,
        revisitasAgendadas: getValue(rowMap, ['revisitas agendadas na semana', 'revisitas agendadas', 'revisitasagendadas', 'revisita agendada', 'revisitas agendadas semana', 'qtd revisitas agendadas', 'quantidade revisitas agendadas']) ?? 0,
        revisitasRealizadas: getValue(rowMap, ['revisitas realizadas na semana', 'revisitas realizadas', 'revisitasrealizadas', 'revisita realizada', 'revisitas realizadas semana', 'qtd revisitas realizadas', 'quantidade revisitas realizadas']) ?? 0,
        volumeTarefasTrello: getValue(rowMap, ['volume de tarefas concluidas no trello', 'volume tarefas trello', 'volumetarefastrello', 'tarefas trello', 'tarefas concluidas trello', 'qtd tarefas trello', 'quantidade tarefas trello', 'tarefas concluidas', 'volume trello']) ?? 0,
        videosTreinamentoGravados: getValue(rowMap, ['numero de videos de treinamento gravados', 'videos treinamento gravados', 'videostreinamentogravados', 'videos treinamento', 'videos gravados', 'qtd videos treinamento', 'quantidade videos treinamento', 'videos treinamento gravados semana', 'numero videos gravados']) ?? 0,
        deliveryApolices: getValue(rowMap, ['delivery apolices', 'deliveryapolices', 'delivery apolices', 'delivery', 'entrega apolices', 'qtd delivery apolices', 'quantidade delivery apolices', 'delivery apolices semana', 'entregas apolices']) ?? 0,
        totalReunioes: getValue(rowMap, [
          'total de reunioes realizadas na semana', 'total de reuniões realizadas na semana',
          'total reunioes', 'total reuniões',
          'totalreunioes', 
          'reunioes realizadas', 'reuniões realizadas',
          'total reunioes semana', 'total reuniões semana',
          'qtd reunioes', 'quantidade reunioes',
          'reunioes realizadas semana', 'reuniões realizadas semana',
          'numero reunioes', 'número reuniões',
          'total de reuniões realizadas na seman' // Variação sem "a" no final
        ]) ?? 0,
        listaAtrasosRaiza: getTextValue(rowMap, ['lista de atrasos atribuidos raiza', 'lista atrasos raiza', 'listaatrasosraiza', 'atrasos raiza', 'lista de atrasos raiza']) || '',
      }

      // Calcular campos derivados
      if (data.oIsAgendadas > 0 && data.oIsRealizadas >= 0) {
        data.percentualOIsRealizadas = (data.oIsRealizadas / data.oIsAgendadas) * 100
      } else {
        data.percentualOIsRealizadas = 0
      }
      
      if (data.apolicesEmitidas > 0 && data.paSemanal > 0) {
        data.ticketMedio = data.paSemanal / data.apolicesEmitidas
      } else {
        data.ticketMedio = 0
      }
      
      if (data.oIsAgendadas > 0 && data.oIsRealizadas >= 0) {
        data.conversaoOIs = (data.oIsRealizadas / data.oIsAgendadas) * 100
      } else {
        data.conversaoOIs = 0
      }

      return data
    }).filter((data): data is WeeklyData => {
      if (!data || !data.period) return false
      return isValidPeriod(data.period)
    })

    // Remover duplicatas
    const seenPeriods = new Map<string, boolean>()
    const uniqueData: WeeklyData[] = []
    for (const data of mappedData) {
      if (!data || !data.period) continue
      const periodKey = data.period.toLowerCase().trim()
      if (!seenPeriods.has(periodKey)) {
        seenPeriods.set(periodKey, true)
        uniqueData.push(data)
      }
    }
    
    console.log('✅ Dados únicos processados:', uniqueData.length)
    console.log('📅 Primeiro período:', uniqueData[0]?.period)
    console.log('📅 Último período:', uniqueData[uniqueData.length - 1]?.period)

    // Ordenar por período (considerando ano corretamente - melhorado para dezembro/janeiro)
    uniqueData.sort((a, b) => {
      const parsePeriodToDate = (period: string): Date => {
        const match = period.match(/(\d{1,2})\/(\d{1,2})/)
        if (!match) return new Date(0)
        
        const day = parseInt(match[1])
        const month = parseInt(match[2]) - 1
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth()
        
        // Determinar ano baseado no mês e contexto
        let year = currentYear
        
        // Se o mês é dezembro (11), pode ser do ano atual ou anterior
        if (month === 11) {
          // Se estamos em janeiro/fevereiro, dezembro é do ano anterior
          if (currentMonth <= 1) {
            year = currentYear - 1
          } else {
            // Caso contrário, é do ano atual
            year = currentYear
          }
        }
        // Se o mês é janeiro (0), pode ser do ano atual ou próximo
        else if (month === 0) {
          // Se estamos em dezembro, janeiro é do próximo ano
          if (currentMonth === 11) {
            year = currentYear + 1
          } else {
            // Caso contrário, é do ano atual
            year = currentYear
          }
        }
        // Se o mês é maior que o mês atual, é do ano anterior
        else if (month > currentMonth) {
          year = currentYear - 1
        }
        // Se o mês é menor que o mês atual, é do ano atual
        else if (month < currentMonth) {
          year = currentYear
        }
        // Se estamos no mesmo mês, é do ano atual
        else {
          year = currentYear
        }
        
        return new Date(year, month, day)
      }
      
      const dateA = parsePeriodToDate(a.period)
      const dateB = parsePeriodToDate(b.period)
      
      return dateA.getTime() - dateB.getTime()
    })

    // Gerar código TypeScript
    const dataCode = `// Dados atualizados automaticamente da planilha KPI DASH - Legatum.xlsx
// Gerado em: ${new Date().toLocaleString('pt-BR')}
import { WeeklyData } from './types'

export const weeklyData: WeeklyData[] = ${JSON.stringify(uniqueData, null, 2).replace(/"(\w+)":/g, '$1:')};

// Função para formatar valores monetários
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Função para formatar percentuais
export function formatPercent(value: number): string {
  return \`\${value.toFixed(2)}%\`;
}

// Função para obter dados de um período específico
export function getDataByPeriod(period: string): WeeklyData | undefined {
  return weeklyData.find(d => d.period === period);
}

// Função para obter todos os períodos
export function getAllPeriods(data?: WeeklyData[]): string[] {
  const dataToUse = data || weeklyData
  return dataToUse.map(d => d.period);
}
`

    // Salvar arquivo (garantir que seja salvo corretamente)
    const dataFilePath = path.join(process.cwd(), 'lib', 'data.ts')
    
    // Verificar se o diretório existe
    const dataDir = path.dirname(dataFilePath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // Salvar arquivo
    fs.writeFileSync(dataFilePath, dataCode, 'utf8')
    
    // Verificar se foi salvo corretamente
    const savedFile = fs.readFileSync(dataFilePath, 'utf8')
    const savedDataMatch = savedFile.match(/export const weeklyData: WeeklyData\[\] = (\[[\s\S]*?\]);/)
    
    console.log('✅ Arquivo salvo:', dataFilePath)
    console.log('📊 Total de registros:', uniqueData.length)
    console.log('📅 Primeiro período:', uniqueData[0]?.period)
    console.log('📅 Último período:', uniqueData[uniqueData.length - 1]?.period)
    console.log('📅 Todos os períodos:', uniqueData.map(d => d.period))
    console.log('✅ Arquivo verificado:', savedDataMatch ? 'OK' : 'ERRO')

    return NextResponse.json({
      success: true,
      message: `Dados locais atualizados com sucesso! ${uniqueData.length} registros processados.`,
      count: uniqueData.length,
      periods: uniqueData.map(d => d.period),
      firstPeriod: uniqueData[0]?.period,
      lastPeriod: uniqueData[uniqueData.length - 1]?.period
    })

  } catch (error: any) {
    console.error('Erro ao sincronizar dados:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao processar planilha',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

