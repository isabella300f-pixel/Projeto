import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { insertWeeklyData, periodExists } from '@/lib/supabase'
import { WeeklyData } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
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
    
    // Converter para JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

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

    // Função auxiliar para buscar valor com múltiplas variações de nome
    const getValue = (rowMap: any, variations: string[]): number | undefined => {
      for (const variation of variations) {
        const normalized = normalizeKey(variation)
        if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
          const value = parseFloat(rowMap[normalized])
          if (!isNaN(value)) return value
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

    const mappedData: WeeklyData[] = jsonData
      .map((row: any) => {
        const rowMap: any = {}
        Object.keys(row).forEach(key => {
          rowMap[normalizeKey(key)] = row[key]
        })

        // Buscar período com múltiplas variações
        const periodRaw = getTextValue(rowMap, [
          'período', 'periodo', 'period', 'semana', 'data'
        ]) || ''
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
            'pa realizado'
          ]) || 0,
          
          // PA Acumulado no Mês
          paAcumuladoMes: getValue(rowMap, [
            'pa acumulado no mes',
            'pa acumulado mes',
            'paacumuladomes',
            'premio anual acumulado mes'
          ]) || 0,
          
          // PA Acumulado no Ano
          paAcumuladoAno: getValue(rowMap, [
            'pa acumulado no ano',
            'pa acumulado ano',
            'paacumuladoano',
            'premio anual acumulado ano'
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
            '% meta de pa realizada da semana'
          ]) || 0,
          
          // % Meta de PA Realizada do Ano
          percentualMetaPAAno: getValue(rowMap, [
            'meta de pa realizada do ano',
            '% meta pa ano',
            'meta pa ano',
            'percentual meta pa ano',
            '% meta de pa realizada do ano'
          ]) || 0,
          
          // PA Emitido na Semana
          paEmitido: getValue(rowMap, [
            'pa emitido na semana',
            'pa emitido',
            'paemitido',
            'premio anual emitido'
          ]) || 0,
          
          // Apólices Emitidas (por semana)
          apolicesEmitidas: getValue(rowMap, [
            'apolices emitidas por semana',
            'apolices emitidas',
            'apolicesemitidas',
            'apolices',
            'numero de apolices'
          ]) || 0,
          
          // Meta de N Semanal
          metaNSemanal: getValue(rowMap, [
            'meta de n semanal',
            'meta n semanal',
            'metansemanal',
            'meta n'
          ]) || 5,
          
          // N da Semana
          nSemana: getValue(rowMap, [
            'n da semana',
            'n semana',
            'nsemana',
            'n semanal'
          ]) || 0,
          
          // N Acumulados do Mês
          nAcumuladoMes: getValue(rowMap, [
            'n acumulados do mes',
            'n acumulado mes',
            'nacumuladomes',
            'n acumulado mes'
          ]) || 0,
          
          // N Acumulados do Ano
          nAcumuladoAno: getValue(rowMap, [
            'n acumulados do ano',
            'n acumulado ano',
            'nacumuladoano',
            'n acumulado ano'
          ]) || 0,
          
          // % Meta de N Realizada da Semana
          percentualMetaNSemana: getValue(rowMap, [
            'meta de n realizada da semana',
            '% meta n semana',
            'meta n semana',
            'percentual meta n semana',
            '% meta de n realizada da semana'
          ]) || 0,
          
          // % Meta de N Realizada do Ano
          percentualMetaNAno: getValue(rowMap, [
            'meta de n realizada do ano',
            '% meta n ano',
            'meta n ano',
            'percentual meta n ano',
            '% meta de n realizada do ano'
          ]) || 0,
          
          // Meta OIs Agendadas
          metaOIsAgendadas: getValue(rowMap, [
            'meta ois agendadas',
            'metaoisagendadas',
            'meta ois',
            'meta oportunidades de inovacao agendadas'
          ]) || 8,
          
          // OIs Agendadas
          oIsAgendadas: getValue(rowMap, [
            'ois agendadas',
            'oisagendadas',
            'oportunidades de inovacao agendadas',
            'ois agend'
          ]) || 0,
          
          // OIs Realizadas na Semana
          oIsRealizadas: getValue(rowMap, [
            'ois realizadas na semana',
            'ois realizadas',
            'oisrealizadas',
            'oportunidades de inovacao realizadas'
          ]) || 0,
          
          // Meta RECS
          metaRECS: getValue(rowMap, [
            'meta recs',
            'metarecs',
            'meta rec',
            'meta revisao de carteira'
          ]),
          
          // Novas RECS
          novasRECS: getValue(rowMap, [
            'novas recs',
            'novasrecs',
            'novas rec',
            'novas revisoes de carteira'
          ]),
          
          // Meta de PCs/C2 Agendados
          metaPCsC2Agendados: getValue(rowMap, [
            'meta de pcs c2 agendados',
            'meta pcs c2 agendados',
            'meta pcs/c2 agendados',
            'metapcsc2agendados',
            'meta pcs agendados'
          ]),
          
          // PCs Realizados na Semana
          pcsRealizados: getValue(rowMap, [
            'pcs realizados na semana',
            'pcs realizados',
            'pcsrealizados',
            'pcs'
          ]),
          
          // Quantidade de C2 Realizados na Semana
          c2Realizados: getValue(rowMap, [
            'quantidade de c2 realizados na semana',
            'c2 realizados na semana',
            'c2 realizados',
            'c2realizados',
            'quantidade c2 realizados'
          ]),
          
          // Apólice em Atraso (nº)
          apoliceEmAtraso: getValue(rowMap, [
            'apolice em atraso',
            'apolice em atraso no',
            'apoliceematraso',
            'apolices em atraso',
            'numero de apolices em atraso'
          ]),
          
          // Prêmio em Atraso de Clientes (R$)
          premioEmAtraso: getValue(rowMap, [
            'premio em atraso de clientes',
            'premio em atraso',
            'premioematraso',
            'premios em atraso',
            'valor premio em atraso'
          ]),
          
          // Taxa de Inadimplência (%) Geral
          taxaInadimplenciaGeral: getValue(rowMap, [
            'taxa de inadimplencia geral',
            'taxa inadimplencia geral',
            'taxainadimplenciageral',
            'inadimplencia geral',
            '% inadimplencia geral'
          ]),
          
          // Taxa de Inadimplência (%) Assistente
          taxaInadimplenciaAssistente: getValue(rowMap, [
            'taxa de inadimplencia assistente',
            'taxa inadimplencia assistente',
            'taxainadimplenciaassistente',
            'inadimplencia assistente',
            '% inadimplencia assistente'
          ]),
          
          // Meta Revisitas Agendadas
          metaRevisitasAgendadas: getValue(rowMap, [
            'meta revisitas agendadas',
            'metarevisitasagendadas',
            'meta revisita',
            'meta revisitas'
          ]),
          
          // Revisitas Agendadas na Semana
          revisitasAgendadas: getValue(rowMap, [
            'revisitas agendadas na semana',
            'revisitas agendadas',
            'revisitasagendadas',
            'revisita agendada'
          ]),
          
          // Revisitas Realizadas na Semana
          revisitasRealizadas: getValue(rowMap, [
            'revisitas realizadas na semana',
            'revisitas realizadas',
            'revisitasrealizadas',
            'revisita realizada'
          ]),
          
          // Volume de Tarefas Concluídas no Trello
          volumeTarefasTrello: getValue(rowMap, [
            'volume de tarefas concluidas no trello',
            'volume tarefas trello',
            'volumetarefastrello',
            'tarefas trello',
            'tarefas concluidas trello'
          ]),
          
          // Número de Vídeos de Treinamento Gravados
          videosTreinamentoGravados: getValue(rowMap, [
            'numero de videos de treinamento gravados',
            'videos treinamento gravados',
            'videostreinamentogravados',
            'videos treinamento',
            'videos gravados'
          ]),
          
          // Delivery Apólices
          deliveryApolices: getValue(rowMap, [
            'delivery apolices',
            'deliveryapolices',
            'delivery apolices',
            'delivery',
            'entrega apolices'
          ]),
          
          // Total de Reuniões Realizadas na Semana
          totalReunioes: getValue(rowMap, [
            'total de reunioes realizadas na semana',
            'total reunioes',
            'totalreunioes',
            'reunioes realizadas',
            'total reunioes semana'
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
        if (data.oIsAgendadas > 0 && data.oIsRealizadas !== undefined) {
          data.percentualOIsRealizadas = (data.oIsRealizadas / data.oIsAgendadas) * 100
        }
        
        if (data.apolicesEmitidas > 0 && data.paSemanal > 0) {
          data.ticketMedio = data.paSemanal / data.apolicesEmitidas
        }
        
        if (data.oIsAgendadas > 0 && data.oIsRealizadas !== undefined) {
          data.conversaoOIs = (data.oIsRealizadas / data.oIsAgendadas) * 100
        }

        return data
      })
      .filter(data => data.period) // Filtrar linhas sem período

    if (mappedData.length === 0) {
      return NextResponse.json(
        { 
          error: 'Nenhum dado válido encontrado na planilha',
          details: 'Verifique se a planilha contém uma coluna "Período" ou "Period" com valores válidos'
        },
        { status: 400 }
      )
    }

    // Verificar duplicatas dentro da própria planilha primeiro
    const seenPeriods = new Map<string, number>()
    const duplicatesInFile: string[] = []
    const uniqueMappedData: WeeklyData[] = []

    for (const data of mappedData) {
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

    // Verificar duplicatas no banco de dados
    const newData: WeeklyData[] = []
    const duplicatesInDatabase: string[] = []

    for (const data of uniqueMappedData) {
      const exists = await periodExists(data.period)
      if (exists) {
        duplicatesInDatabase.push(data.period)
      } else {
        newData.push(data)
      }
    }

    // Combinar todas as duplicatas encontradas (removendo duplicatas)
    const allDuplicates = Array.from(new Set([...duplicatesInFile, ...duplicatesInDatabase]))

    if (newData.length === 0) {
      let message = 'Nenhum registro novo para inserir. '
      if (duplicatesInFile.length > 0 && duplicatesInDatabase.length > 0) {
        message += `${duplicatesInFile.length} período(s) duplicado(s) na planilha e ${duplicatesInDatabase.length} período(s) já existem no banco de dados.`
      } else if (duplicatesInFile.length > 0) {
        message += `${duplicatesInFile.length} período(s) duplicado(s) encontrado(s) na planilha.`
      } else {
        message += 'Todos os períodos já existem no banco de dados.'
      }
      
      return NextResponse.json({
        success: false,
        message: message,
        duplicates: allDuplicates,
        duplicatesInFile: duplicatesInFile.length > 0 ? duplicatesInFile : undefined,
        duplicatesInDatabase: duplicatesInDatabase.length > 0 ? duplicatesInDatabase : undefined
      }, { status: 400 })
    }

    // Inserir novos dados
    const result = await insertWeeklyData(newData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Montar mensagem detalhada
    let message = `${result.count} registro(s) inserido(s) com sucesso.`
    if (duplicatesInFile.length > 0 || duplicatesInDatabase.length > 0) {
      message += ' '
      const parts: string[] = []
      if (duplicatesInFile.length > 0) {
        parts.push(`${duplicatesInFile.length} período(s) duplicado(s) na planilha ignorado(s)`)
      }
      if (duplicatesInDatabase.length > 0) {
        parts.push(`${duplicatesInDatabase.length} período(s) já existente(s) no banco ignorado(s)`)
      }
      message += parts.join(' e ') + '.'
    }

    return NextResponse.json({
      success: true,
      inserted: result.count,
      duplicates: allDuplicates.length > 0 ? allDuplicates : undefined,
      duplicatesInFile: duplicatesInFile.length > 0 ? duplicatesInFile : undefined,
      duplicatesInDatabase: duplicatesInDatabase.length > 0 ? duplicatesInDatabase : undefined,
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
    
    if (error.message?.includes('Cannot read')) {
      errorMessage = 'Erro ao ler o arquivo. Verifique se o formato está correto (.xlsx ou .xls)'
    } else if (error.message?.includes('Supabase')) {
      errorMessage = 'Erro ao conectar com o banco de dados. Verifique as variáveis de ambiente.'
    } else if (error.message) {
      errorMessage = `Erro: ${error.message}`
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

