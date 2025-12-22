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

    // Função para normalizar nomes de colunas
    const normalizeKey = (key: string) => 
      key.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[%]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Função para normalizar período (remove espaços extras, padroniza formato)
    const normalizePeriod = (period: string): string => {
      return period
        .trim()
        .replace(/\s+/g, ' ') // Remove múltiplos espaços
        .replace(/\s*a\s*/g, ' a ') // Normaliza "a" entre datas
        .replace(/\//g, '/') // Garante formato consistente
    }

    const mappedData: WeeklyData[] = jsonData
      .map((row: any) => {
        const rowMap: any = {}
        Object.keys(row).forEach(key => {
          rowMap[normalizeKey(key)] = row[key]
        })

        const paSemanal = parseFloat(rowMap['pa semanal'] || rowMap['pasemanal'] || 0)
        const apolicesEmitidas = parseFloat(rowMap['apolices emitidas'] || rowMap['apolicesemitidas'] || 0)
        const oIsAgendadas = parseFloat(rowMap['ois agendadas'] || rowMap['oisagendadas'] || 0)
        const oIsRealizadas = parseFloat(rowMap['ois realizadas'] || rowMap['oisrealizadas'] || 0)

        const periodRaw = rowMap['periodo'] || rowMap['period'] || ''
        const periodNormalized = normalizePeriod(periodRaw)

        const data: WeeklyData = {
          period: periodNormalized,
          paSemanal: paSemanal,
          paAcumuladoMes: parseFloat(rowMap['pa acumulado mes'] || rowMap['paacumuladomes'] || 0),
          paAcumuladoAno: parseFloat(rowMap['pa acumulado ano'] || rowMap['paacumuladoano'] || 0),
          metaPASemanal: parseFloat(rowMap['meta pa semanal'] || rowMap['metapasemanal'] || 82000),
          percentualMetaPASemana: parseFloat(rowMap['meta pa semana'] || rowMap['metapasemana'] || rowMap['% meta pa semana'] || 0),
          percentualMetaPAAno: parseFloat(rowMap['meta pa ano'] || rowMap['metapaano'] || rowMap['% meta pa ano'] || 0),
          paEmitido: parseFloat(rowMap['pa emitido'] || rowMap['paemitido'] || 0),
          apolicesEmitidas: apolicesEmitidas,
          metaNSemanal: parseFloat(rowMap['meta n semanal'] || rowMap['metansemanal'] || 5),
          nSemana: parseFloat(rowMap['n semana'] || rowMap['nsemana'] || 0),
          nAcumuladoMes: parseFloat(rowMap['n acumulado mes'] || rowMap['nacumuladomes'] || 0),
          nAcumuladoAno: parseFloat(rowMap['n acumulado ano'] || rowMap['nacumuladoano'] || 0),
          percentualMetaNSemana: parseFloat(rowMap['meta n semana'] || rowMap['metansemana'] || rowMap['% meta n semana'] || 0),
          percentualMetaNAno: parseFloat(rowMap['meta n ano'] || rowMap['metano'] || rowMap['% meta n ano'] || 0),
          metaOIsAgendadas: parseFloat(rowMap['meta ois agendadas'] || rowMap['metaoisagendadas'] || 8),
          oIsAgendadas: oIsAgendadas,
          oIsRealizadas: oIsRealizadas,
          // Novos indicadores
          metaRECS: parseFloat(rowMap['meta recs'] || rowMap['metarecs'] || 0) || undefined,
          novasRECS: parseFloat(rowMap['novas recs'] || rowMap['novasrecs'] || 0) || undefined,
          metaPCsC2Agendados: parseFloat(rowMap['meta pcs c2 agendados'] || rowMap['meta pcs/c2 agendados'] || rowMap['metapcsc2agendados'] || 0) || undefined,
          pcsRealizados: parseFloat(rowMap['pcs realizados'] || rowMap['pcsrealizados'] || 0) || undefined,
          c2Realizados: parseFloat(rowMap['c2 realizados'] || rowMap['quantidade c2 realizados'] || rowMap['c2realizados'] || 0) || undefined,
          apoliceEmAtraso: parseFloat(rowMap['apólice em atraso'] || rowMap['apolice em atraso'] || rowMap['apoliceematraso'] || 0) || undefined,
          premioEmAtraso: parseFloat(rowMap['prêmio em atraso'] || rowMap['premio em atraso'] || rowMap['premioematraso'] || 0) || undefined,
          taxaInadimplenciaGeral: parseFloat(rowMap['taxa inadimplência geral'] || rowMap['taxa inadimplencia geral'] || rowMap['taxainadimplenciageral'] || 0) || undefined,
          taxaInadimplenciaAssistente: parseFloat(rowMap['taxa inadimplência assistente'] || rowMap['taxa inadimplencia assistente'] || rowMap['taxainadimplenciaassistente'] || 0) || undefined,
          metaRevisitasAgendadas: parseFloat(rowMap['meta revisitas agendadas'] || rowMap['metarevisitasagendadas'] || 0) || undefined,
          revisitasAgendadas: parseFloat(rowMap['revisitas agendadas'] || rowMap['revisitasagendadas'] || 0) || undefined,
          revisitasRealizadas: parseFloat(rowMap['revisitas realizadas'] || rowMap['revisitasrealizadas'] || 0) || undefined,
          volumeTarefasTrello: parseFloat(rowMap['volume tarefas trello'] || rowMap['volumetarefastrello'] || 0) || undefined,
          videosTreinamentoGravados: parseFloat(rowMap['vídeos treinamento gravados'] || rowMap['videos treinamento gravados'] || rowMap['videostreinamentogravados'] || 0) || undefined,
          deliveryApolices: parseFloat(rowMap['delivery apólices'] || rowMap['delivery apolices'] || rowMap['deliveryapolices'] || 0) || undefined,
          totalReunioes: parseFloat(rowMap['total reuniões'] || rowMap['total reunioes'] || rowMap['totalreunioes'] || 0) || undefined,
          listaAtrasosRaiza: rowMap['lista atrasos raiza'] || rowMap['listaatrasosraiza'] || undefined,
        }

        // Calcular campos derivados
        if (oIsAgendadas > 0) {
          data.percentualOIsRealizadas = (oIsRealizadas / oIsAgendadas) * 100
        }
        
        if (apolicesEmitidas > 0 && paSemanal > 0) {
          data.ticketMedio = paSemanal / apolicesEmitidas
        }

        return data
      })
      .filter(data => data.period) // Filtrar linhas sem período

    if (mappedData.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado válido encontrado na planilha' },
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
    return NextResponse.json(
      { error: 'Erro ao processar arquivo: ' + error.message },
      { status: 500 }
    )
  }
}

