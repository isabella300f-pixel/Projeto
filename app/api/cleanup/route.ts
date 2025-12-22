import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Função para validar se um período é válido
const isValidPeriod = (period: string): boolean => {
  if (!period || typeof period !== 'string') return false
  
  const normalized = period.trim().toLowerCase()
  
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
  const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(normalized) // DD/MM ou DD/MM/YYYY
  const hasPeriodPattern = /\d{1,2}\/\d{1,2}\s+a\s+\d{1,2}\/\d{1,2}/.test(normalized) // "DD/MM a DD/MM"
  const hasWeekPattern = /\d{4}-w\d{1,2}/i.test(normalized) // "2023-W34"
  const hasDateRange = normalized.includes('a') && /\d/.test(normalized) && normalized.includes('/')
  
  return hasDatePattern || hasPeriodPattern || hasWeekPattern || hasDateRange
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }

    // Buscar todos os registros
    const { data: allData, error: fetchError } = await (supabase as any)
      .from('weekly_data')
      .select('id, period')

    if (fetchError) {
      return NextResponse.json(
        { error: 'Erro ao buscar dados: ' + fetchError.message },
        { status: 500 }
      )
    }

    if (!allData || allData.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum dado encontrado no banco', deleted: 0 },
        { status: 200 }
      )
    }

    // Identificar registros inválidos
    const invalidIds: string[] = []
    const validPeriods: string[] = []

    for (const record of allData) {
      if (!isValidPeriod(record.period)) {
        invalidIds.push(record.id)
      } else {
        validPeriods.push(record.period)
      }
    }

    if (invalidIds.length === 0) {
      return NextResponse.json(
        { 
          message: 'Nenhum registro inválido encontrado',
          total: allData.length,
          deleted: 0,
          valid: validPeriods.length
        },
        { status: 200 }
      )
    }

    // Deletar registros inválidos
    const { error: deleteError } = await (supabase as any)
      .from('weekly_data')
      .delete()
      .in('id', invalidIds)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erro ao deletar registros: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: `Limpeza concluída com sucesso`,
        total: allData.length,
        deleted: invalidIds.length,
        valid: validPeriods.length,
        deletedPeriods: allData
          .filter((r: any) => invalidIds.includes(r.id))
          .map((r: any) => r.period)
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Erro ao limpar dados:', error)
    return NextResponse.json(
      { error: 'Erro ao processar limpeza: ' + error.message },
      { status: 500 }
    )
  }
}

