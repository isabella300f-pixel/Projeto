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

        const data: WeeklyData = {
          period: rowMap['periodo'] || rowMap['period'] || '',
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

    // Verificar duplicatas
    const newData: WeeklyData[] = []
    const duplicates: string[] = []

    for (const data of mappedData) {
      const exists = await periodExists(data.period)
      if (exists) {
        duplicates.push(data.period)
      } else {
        newData.push(data)
      }
    }

    if (newData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Todos os períodos já existem no banco de dados',
        duplicates: duplicates
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

    return NextResponse.json({
      success: true,
      inserted: result.count,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      message: `${result.count} registro(s) inserido(s) com sucesso${duplicates.length > 0 ? `. ${duplicates.length} período(s) duplicado(s) ignorado(s).` : ''}`
    })

  } catch (error: any) {
    console.error('Erro ao processar upload:', error)
    return NextResponse.json(
      { error: 'Erro ao processar arquivo: ' + error.message },
      { status: 500 }
    )
  }
}

