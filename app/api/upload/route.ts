import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { upsertWeeklyData, periodExists } from '@/lib/supabase'
import { WeeklyData } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    // Verificar se Supabase está configurado antes de processar
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { 
          error: 'Supabase não configurado. Configure as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.',
          details: 'Acesse Settings > Environment Variables no Vercel e adicione as variáveis necessárias.'
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Ler arquivo Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Pegar primeira planilha
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Converter para JSON com opções para melhor compatibilidade
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null, // Valor padrão para células vazias
      raw: false, // Converter números e datas para strings primeiro (melhor para processamento)
      dateNF: 'dd/mm/yyyy', // Formato de data esperado
      blankrows: false // Ignorar linhas completamente vazias
    })

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Planilha vazia ou formato inválido' },
        { status: 400 }
      )
    }

    // Função para normalizar nomes de colunas (remove acentos, espaços, caracteres especiais)
    const normalizeKey = (key: string) => 
      key.toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
        .replace(/[%()]/g, '') // Remove % e parênteses
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/g, ' ') // Remove caracteres especiais, mantém apenas letras, números e espaços
        .replace(/\s+/g, ' ') // Normaliza espaços novamente
        .trim()

    // Função para normalizar período (remove espaços extras, padroniza formato)
    const normalizePeriod = (period: string): string => {
      return period
        .trim()
        .replace(/\s+/g, ' ') // Remove múltiplos espaços
        .replace(/\s*a\s*/g, ' a ') // Normaliza "a" entre datas
        .replace(/\//g, '/') // Garante formato consistente
    }

    // Função para validar se um valor parece ser um período válido
    const isValidPeriod = (value: string): boolean => {
      if (!value || typeof value !== 'string') return false
      
      const normalized = value.trim().toLowerCase()
      
      // Ignorar valores muito curtos ou muito longos
      if (normalized.length < 5 || normalized.length > 50) return false
      
      // Ignorar textos descritivos conhecidos
      const invalidPatterns = [
        'simples nacional',
        'anexo',
        'indica',
        'célula',
        'celula',
        'output',
        'input',
        'informação',
        'informacao',
        'permit',
        'alterar',
        'conteúdo',
        'conteudo',
        'fórmula',
        'formula',
        'perdida',
        'atalho',
        'simulação',
        'simulacao',
        'hipótese',
        'hipotese',
        'cartão',
        'cartao',
        'crédito',
        'credito',
        'débito',
        'debito',
        'vista',
        'dinheiro',
        'caixa',
        'capital',
        'giro',
        'ciclo',
        'diária',
        'diaria',
        'franqueado',
        'gerenciamento',
        'regime',
        'tributário',
        'tributario',
        'saco',
        'unidade',
        'medida',
        'taxa',
        'retorno',
        'irr',
        'tir',
        'prazo',
        'médio',
        'medio',
        'estoque',
        'pagto',
        'recebimento',
        'percentual',
        'índice',
        'indice',
        'financeiro'
      ]
      
      // Se contém algum padrão inválido, não é um período válido
      for (const pattern of invalidPatterns) {
        if (normalized.includes(pattern)) {
          return false
        }
      }
      
      // Deve conter pelo menos um número
      if (!/\d/.test(normalized)) return false
      
      // Deve ter formato de data/período:
      // - Contém "/" (ex: "18/08", "18/08/2024")
      // - OU contém "a" com números e "/" (ex: "18/08 a 24/08")
      // - OU formato de semana (ex: "2023-W34")
      const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(normalized) // DD/MM ou DD/MM/YYYY
      const hasPeriodPattern = /\d{1,2}\/\d{1,2}\s+[aA]\s+\d{1,2}\/\d{1,2}/.test(normalized) // "DD/MM a DD/MM" ou "DD/MM A DD/MM"
      const hasWeekPattern = /\d{4}-w\d{1,2}/i.test(normalized) // "2023-W34"
      const hasDateRange = (normalized.includes('a') || normalized.includes('A')) && /\d/.test(normalized) && normalized.includes('/')
      
      return hasDatePattern || hasPeriodPattern || hasWeekPattern || hasDateRange
    }

    // Função auxiliar para converter valor para número (mais robusta)
    const parseNumber = (value: any): number | undefined => {
      if (value === null || value === undefined || value === '') return undefined
      
      // Se já é número, retornar
      if (typeof value === 'number') {
        return isNaN(value) ? undefined : value
      }
      
      // Converter string para número
      if (typeof value === 'string') {
        // Remove espaços, vírgulas (formato brasileiro), e outros caracteres
        const cleaned = value.trim()
          .replace(/\./g, '') // Remove pontos (separadores de milhar)
          .replace(/,/g, '.') // Substitui vírgula por ponto (decimal)
          .replace(/[^\d.-]/g, '') // Remove tudo exceto dígitos, ponto e sinal negativo
        
        const parsed = parseFloat(cleaned)
        return isNaN(parsed) ? undefined : parsed
      }
      
      return undefined
    }

    // Função auxiliar para buscar valor com múltiplas variações de nome
    const getValue = (rowMap: any, variations: string[]): number | undefined => {
      for (const variation of variations) {
        const normalized = normalizeKey(variation)
        
        // Tentar busca exata primeiro
        if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
          const value = parseNumber(rowMap[normalized])
          if (value !== undefined) return value
        }
        
        // Tentar busca parcial (contém a variação)
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

    const mappedData: (WeeklyData | null)[] = jsonData
      .map((row: any) => {
        const rowMap: any = {}
        Object.keys(row).forEach(key => {
          rowMap[normalizeKey(key)] = row[key]
        })

        // Buscar período com múltiplas variações (mais flexível)
        let periodRaw = getTextValue(rowMap, [
          'período', 'periodo', 'period', 'semana', 'data',
          'periodo semanal', 'periodo da semana', 'semana de',
          'data inicial', 'data final', 'range', 'intervalo',
          'data periodo', 'periodo data', 'semana periodo'
        ]) || ''
        
        // Se período vier como Date object, converter para string
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
        
        // Se não encontrou, tentar buscar em qualquer coluna que contenha "period", "semana" ou "data"
        if (!periodRaw) {
          for (const key in rowMap) {
            const normalizedKey = normalizeKey(key)
            if (normalizedKey.includes('period') || normalizedKey.includes('semana') || normalizedKey.includes('data')) {
              const value = String(rowMap[key] || '').trim()
              if (value && value.length > 0 && value !== 'undefined' && value !== 'null') {
                // Validar antes de usar
                if (isValidPeriod(value)) {
                  periodRaw = value
                  break
                }
              }
            }
          }
        }
        
        // Se ainda não encontrou, usar a primeira coluna que tenha valor de texto válido
        if (!periodRaw) {
          for (const key in rowMap) {
            const value = String(rowMap[key] || '').trim()
            if (value && value.length > 0 && value !== 'undefined' && value !== 'null') {
              // Validar se parece com um período válido
              if (isValidPeriod(value)) {
                periodRaw = value
                break
              }
            }
          }
        }
        
        // Validar o período encontrado antes de normalizar
        if (!periodRaw || !isValidPeriod(periodRaw)) {
          // Se não for um período válido, pular esta linha
          return null
        }
        
        const periodNormalized = normalizePeriod(periodRaw)

        // Mapear todos os indicadores com suas variações possíveis
        const data: WeeklyData = {
          period: periodNormalized,
          
          // PA Semanal Realizado
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
          
          // PA Acumulado no Mês
          paAcumuladoMes: getValue(rowMap, [
            'pa acumulado no mes',
            'pa acumulado mes',
            'paacumuladomes',
            'premio anual acumulado mes',
            'pa acum mes',
            'pa acumulado mes r$',
            'pa acum mes r$'
          ]) || 0,
          
          // PA Acumulado no Ano
          paAcumuladoAno: getValue(rowMap, [
            'pa acumulado no ano',
            'pa acumulado ano',
            'paacumuladoano',
            'premio anual acumulado ano',
            'pa acum ano',
            'pa acumulado ano r$',
            'pa acum ano r$',
            'pa acumulado total ano'
          ]) || 0,
          
          // Meta de PA Semanal Necessária
          metaPASemanal: getValue(rowMap, [
            'meta de pa semanal necessaria',
            'meta pa semanal',
            'metapasemanal',
            'meta pa semanal necessaria'
          ]) || 82000,
          
          // % Meta de PA Realizada da Semana
          percentualMetaPASemana: getValue(rowMap, [
            'meta de pa realizada da semana',
            '% meta pa semana',
            'meta pa semana',
            'percentual meta pa semana',
            '% meta de pa realizada da semana',
            'percentual meta pa realizada semana',
            '% meta pa realizada semana',
            'meta pa realizada semana %'
          ]) || 0,
          
          // % Meta de PA Realizada do Ano
          percentualMetaPAAno: getValue(rowMap, [
            'meta de pa realizada do ano',
            '% meta pa ano',
            'meta pa ano',
            'percentual meta pa ano',
            '% meta de pa realizada do ano',
            'percentual meta pa realizada ano',
            '% meta pa realizada ano',
            'meta pa realizada ano %'
          ]) || 0,
          
          // PA Emitido na Semana
          paEmitido: getValue(rowMap, [
            'pa emitido na semana',
            'pa emitido',
            'paemitido',
            'premio anual emitido',
            'pa emitido semana',
            'pa emitido r$',
            'premio anual emitido semana'
          ]) || 0,
          
          // Apólices Emitidas (por semana)
          apolicesEmitidas: getValue(rowMap, [
            'apolices emitidas por semana',
            'apolices emitidas',
            'apolicesemitidas',
            'apolices',
            'numero de apolices',
            'apolices emitidas semana',
            'qtd apolices emitidas',
            'quantidade apolices emitidas',
            'n apolices emitidas'
          ]) || 0,
          
          // Meta de N Semanal
          metaNSemanal: getValue(rowMap, [
            'meta de n semanal',
            'meta n semanal',
            'metansemanal',
            'meta n',
            'meta n semana',
            'meta apolices semanal',
            'meta numero apolices semanal'
          ]) || 5,
          
          // N da Semana
          nSemana: getValue(rowMap, [
            'n da semana',
            'n semana',
            'nsemana',
            'n semanal',
            'n semana realizado',
            'numero apolices semana',
            'qtd apolices semana'
          ]) || 0,
          
          // N Acumulados do Mês
          nAcumuladoMes: getValue(rowMap, [
            'n acumulados do mes',
            'n acumulado mes',
            'nacumuladomes',
            'n acumulado mes',
            'n acum mes',
            'apolices acumuladas mes',
            'numero apolices acumulado mes'
          ]) || 0,
          
          // N Acumulados do Ano
          nAcumuladoAno: getValue(rowMap, [
            'n acumulados do ano',
            'n acumulado ano',
            'nacumuladoano',
            'n acumulado ano',
            'n acum ano',
            'apolices acumuladas ano',
            'numero apolices acumulado ano',
            'n acumulado total ano'
          ]) || 0,
          
          // % Meta de N Realizada da Semana
          percentualMetaNSemana: getValue(rowMap, [
            'meta de n realizada da semana',
            '% meta n semana',
            'meta n semana',
            'percentual meta n semana',
            '% meta de n realizada da semana',
            'percentual meta n realizada semana',
            '% meta n realizada semana',
            'meta n realizada semana %'
          ]) || 0,
          
          // % Meta de N Realizada do Ano
          percentualMetaNAno: getValue(rowMap, [
            'meta de n realizada do ano',
            '% meta n ano',
            'meta n ano',
            'percentual meta n ano',
            '% meta de n realizada do ano',
            'percentual meta n realizada ano',
            '% meta n realizada ano',
            'meta n realizada ano %'
          ]) || 0,
          
          // Meta OIs Agendadas
          metaOIsAgendadas: getValue(rowMap, [
            'meta ois agendadas',
            'metaoisagendadas',
            'meta ois',
            'meta oportunidades de inovacao agendadas',
            'meta ois semana',
            'meta ois agendadas semana',
            'meta oi agendadas'
          ]) || 8,
          
          // OIs Agendadas
          oIsAgendadas: getValue(rowMap, [
            'ois agendadas',
            'oisagendadas',
            'oportunidades de inovacao agendadas',
            'ois agend',
            'ois agendadas semana',
            'qtd ois agendadas',
            'quantidade ois agendadas'
          ]) || 0,
          
          // OIs Realizadas na Semana
          oIsRealizadas: getValue(rowMap, [
            'ois realizadas na semana',
            'ois realizadas',
            'oisrealizadas',
            'oportunidades de inovacao realizadas',
            'ois realizadas semana',
            'qtd ois realizadas',
            'quantidade ois realizadas'
          ]) || 0,
          
          // Meta RECS
          metaRECS: getValue(rowMap, [
            'meta recs',
            'metarecs',
            'meta rec',
            'meta revisao de carteira',
            'meta recs agendadas',
            'meta revisoes carteira',
            'meta rec semana'
          ]),
          
          // Novas RECS
          novasRECS: getValue(rowMap, [
            'novas recs',
            'novasrecs',
            'novas rec',
            'novas revisoes de carteira',
            'novas recs realizadas',
            'qtd novas recs',
            'quantidade novas recs'
          ]),
          
          // Meta de PCs/C2 Agendados
          metaPCsC2Agendados: getValue(rowMap, [
            'meta de pcs c2 agendados',
            'meta pcs c2 agendados',
            'meta pcs/c2 agendados',
            'metapcsc2agendados',
            'meta pcs agendados',
            'meta pcs c2',
            'meta pcs e c2 agendados',
            'meta pcs c2 semana'
          ]),
          
          // PCs Realizados na Semana
          pcsRealizados: getValue(rowMap, [
            'pcs realizados na semana',
            'pcs realizados',
            'pcsrealizados',
            'pcs',
            'pcs realizados semana',
            'qtd pcs realizados',
            'quantidade pcs realizados',
            'pcs realiz'
          ]),
          
          // Quantidade de C2 Realizados na Semana
          c2Realizados: getValue(rowMap, [
            'quantidade de c2 realizados na semana',
            'c2 realizados na semana',
            'c2 realizados',
            'c2realizados',
            'quantidade c2 realizados',
            'c2 realizados semana',
            'qtd c2 realizados',
            'quantidade c2',
            'c2 realiz'
          ]),
          
          // Apólice em Atraso (nº)
          apoliceEmAtraso: getValue(rowMap, [
            'apolice em atraso',
            'apolice em atraso no',
            'apoliceematraso',
            'apolices em atraso',
            'numero de apolices em atraso',
            'qtd apolices atraso',
            'quantidade apolices atraso',
            'apolices atrasadas',
            'n apolices atraso'
          ]),
          
          // Prêmio em Atraso de Clientes (R$)
          premioEmAtraso: getValue(rowMap, [
            'premio em atraso de clientes',
            'premio em atraso',
            'premioematraso',
            'premios em atraso',
            'valor premio em atraso',
            'premio atraso r$',
            'valor premio atraso',
            'premios atrasados r$',
            'pa em atraso'
          ]),
          
          // Taxa de Inadimplência (%) Geral
          taxaInadimplenciaGeral: getValue(rowMap, [
            'taxa de inadimplencia geral',
            'taxa inadimplencia geral',
            'taxainadimplenciageral',
            'inadimplencia geral',
            '% inadimplencia geral',
            'taxa inadimplencia %',
            'inadimplencia % geral',
            'taxa inad geral'
          ]),
          
          // Taxa de Inadimplência (%) Assistente
          taxaInadimplenciaAssistente: getValue(rowMap, [
            'taxa de inadimplencia assistente',
            'taxa inadimplencia assistente',
            'taxainadimplenciaassistente',
            'inadimplencia assistente',
            '% inadimplencia assistente',
            'taxa inadimplencia % assistente',
            'inadimplencia % assistente',
            'taxa inad assistente'
          ]),
          
          // Meta Revisitas Agendadas
          metaRevisitasAgendadas: getValue(rowMap, [
            'meta revisitas agendadas',
            'metarevisitasagendadas',
            'meta revisita',
            'meta revisitas',
            'meta revisitas semana',
            'meta revisitas agendadas semana'
          ]),
          
          // Revisitas Agendadas na Semana
          revisitasAgendadas: getValue(rowMap, [
            'revisitas agendadas na semana',
            'revisitas agendadas',
            'revisitasagendadas',
            'revisita agendada',
            'revisitas agendadas semana',
            'qtd revisitas agendadas',
            'quantidade revisitas agendadas'
          ]),
          
          // Revisitas Realizadas na Semana
          revisitasRealizadas: getValue(rowMap, [
            'revisitas realizadas na semana',
            'revisitas realizadas',
            'revisitasrealizadas',
            'revisita realizada',
            'revisitas realizadas semana',
            'qtd revisitas realizadas',
            'quantidade revisitas realizadas'
          ]),
          
          // Volume de Tarefas Concluídas no Trello
          volumeTarefasTrello: getValue(rowMap, [
            'volume de tarefas concluidas no trello',
            'volume tarefas trello',
            'volumetarefastrello',
            'tarefas trello',
            'tarefas concluidas trello',
            'qtd tarefas trello',
            'quantidade tarefas trello',
            'tarefas concluidas',
            'volume trello'
          ]),
          
          // Número de Vídeos de Treinamento Gravados
          videosTreinamentoGravados: getValue(rowMap, [
            'numero de videos de treinamento gravados',
            'videos treinamento gravados',
            'videostreinamentogravados',
            'videos treinamento',
            'videos gravados',
            'qtd videos treinamento',
            'quantidade videos treinamento',
            'videos treinamento gravados semana',
            'numero videos gravados'
          ]),
          
          // Delivery Apólices
          deliveryApolices: getValue(rowMap, [
            'delivery apolices',
            'deliveryapolices',
            'delivery apolices',
            'delivery',
            'entrega apolices',
            'qtd delivery apolices',
            'quantidade delivery apolices',
            'delivery apolices semana',
            'entregas apolices'
          ]),
          
          // Total de Reuniões Realizadas na Semana
          totalReunioes: getValue(rowMap, [
            'total de reunioes realizadas na semana',
            'total reunioes',
            'totalreunioes',
            'reunioes realizadas',
            'total reunioes semana',
            'qtd reunioes',
            'quantidade reunioes',
            'reunioes realizadas semana',
            'numero reunioes'
          ]),
          
          // Lista de Atrasos - Atribuídos Raiza
          listaAtrasosRaiza: getTextValue(rowMap, [
            'lista de atrasos atribuidos raiza',
            'lista atrasos raiza',
            'listaatrasosraiza',
            'atrasos raiza',
            'lista de atrasos raiza'
          ]),
        }

        // Calcular campos derivados
        if (data.oIsAgendadas > 0 && data.oIsRealizadas !== undefined && data.oIsRealizadas >= 0) {
          data.percentualOIsRealizadas = (data.oIsRealizadas / data.oIsAgendadas) * 100
        }
        
        if (data.apolicesEmitidas > 0 && data.paSemanal > 0) {
          data.ticketMedio = data.paSemanal / data.apolicesEmitidas
        }
        
        if (data.oIsAgendadas > 0 && data.oIsRealizadas !== undefined && data.oIsRealizadas >= 0) {
          data.conversaoOIs = (data.oIsRealizadas / data.oIsAgendadas) * 100
        }

            return data
          })
          .filter((data): data is WeeklyData => {
            if (!data || !data.period) return false
            const isValid = isValidPeriod(data.period)
            return typeof isValid === 'boolean' ? isValid : false
          }) // Filtrar linhas sem período

    if (mappedData.length === 0) {
      // Tentar identificar quais colunas existem na planilha para ajudar no debug
      const firstRow = jsonData[0] || {}
      const availableColumns = Object.keys(firstRow).map(key => {
        const value = firstRow[key]
        return `"${key}" (valor exemplo: ${value !== undefined && value !== null ? String(value).substring(0, 30) : 'vazio'})`
      }).join(', ')
      
      // Verificar se há alguma coluna que pode ser período
      const possiblePeriodColumns = Object.keys(firstRow).filter(key => {
        const normalized = normalizeKey(key)
        const value = String(firstRow[key] || '').trim()
        return (normalized.includes('period') || normalized.includes('semana') || normalized.includes('data')) && value.length > 0
      })
      
      let detailsMessage = `Verifique se a planilha contém uma coluna "Período" ou "Period" com valores válidos.\n\n`
      detailsMessage += `Colunas encontradas na planilha:\n${availableColumns || 'Nenhuma coluna encontrada'}\n\n`
      
      if (possiblePeriodColumns.length > 0) {
        detailsMessage += `Colunas que podem ser período: ${possiblePeriodColumns.join(', ')}\n`
        detailsMessage += `Mas não foram encontrados valores válidos nessas colunas.`
      } else {
        detailsMessage += `Nenhuma coluna com nome similar a "Período" foi encontrada.`
      }
      
      return NextResponse.json(
        { 
          error: 'Nenhum dado válido encontrado na planilha',
          details: detailsMessage
        },
        { status: 400 }
      )
    }

    // Verificar duplicatas dentro da própria planilha primeiro
    const seenPeriods = new Map<string, number>()
    const duplicatesInFile: string[] = []
    const uniqueMappedData: WeeklyData[] = []

    for (const data of mappedData) {
      if (!data || !data.period) continue
      const periodKey = data.period.toLowerCase().trim()
      if (seenPeriods.has(periodKey)) {
        // Período duplicado dentro da planilha
        const firstIndex = seenPeriods.get(periodKey)!
        if (!duplicatesInFile.includes(data.period)) {
          duplicatesInFile.push(data.period)
        }
        // Manter apenas o primeiro registro encontrado
        continue
      }
      seenPeriods.set(periodKey, uniqueMappedData.length)
      uniqueMappedData.push(data)
    }

    // Verificar quais períodos já existem no banco (para relatório)
    const periodsToCheck = uniqueMappedData.map(d => d.period)
    const existingPeriodsMap = new Map<string, boolean>()
    
    for (const period of periodsToCheck) {
      const exists = await periodExists(period)
      existingPeriodsMap.set(period, exists)
    }

    const existingPeriods = Array.from(existingPeriodsMap.entries())
      .filter(([_, exists]) => exists)
      .map(([period, _]) => period)

    // Usar upsert para inserir ou atualizar todos os dados
    const result = await upsertWeeklyData(uniqueMappedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Montar mensagem detalhada
    const parts: string[] = []
    if (result.inserted && result.inserted > 0) {
      parts.push(`${result.inserted} registro(s) inserido(s)`)
    }
    if (result.updated && result.updated > 0) {
      parts.push(`${result.updated} registro(s) atualizado(s)`)
    }
    
    let message = parts.length > 0 
      ? parts.join(' e ') + ' com sucesso.'
      : 'Nenhum dado processado.'

    // Adicionar informações sobre duplicatas na planilha (se houver)
    if (duplicatesInFile.length > 0) {
      message += ` ${duplicatesInFile.length} período(s) duplicado(s) na planilha foram ignorado(s) (mantido apenas o primeiro).`
    }

    return NextResponse.json({
      success: true,
      inserted: result.inserted || 0,
      updated: result.updated || 0,
      total: result.total || 0,
      duplicatesInFile: duplicatesInFile.length > 0 ? duplicatesInFile : undefined,
      updatedPeriods: existingPeriods.length > 0 ? existingPeriods : undefined,
      message: message
    })

  } catch (error: any) {
    console.error('Erro ao processar upload:', error)
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // Mensagens de erro mais específicas
    let errorMessage = 'Erro ao processar arquivo'
    let statusCode = 500
    
    if (error.message?.includes('Cannot read') || error.message?.includes('Unexpected')) {
      errorMessage = 'Erro ao ler o arquivo. Verifique se o formato está correto (.xlsx ou .xls)'
      statusCode = 400
    } else if (error.message?.includes('Supabase') || error.message?.includes('database')) {
      errorMessage = 'Erro ao conectar com o banco de dados. Verifique as variáveis de ambiente.'
      statusCode = 500
    } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
      errorMessage = 'Erro de conexão. Tente novamente em alguns instantes.'
      statusCode = 503
    } else if (error.message) {
      errorMessage = `Erro: ${error.message}`
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    )
  }
}

