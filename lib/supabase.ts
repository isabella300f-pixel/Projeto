import { createClient } from '@supabase/supabase-js'
import { WeeklyData } from './types'

// Suporta múltiplos nomes de variáveis para compatibilidade
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.DataBase_Key || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Mapear dados do Supabase para interface WeeklyData
function mapFromSupabase(row: any): WeeklyData {
  return {
    id: row.id,
    period: row.period,
    paSemanal: parseFloat(row.pa_semanal) || 0,
    paAcumuladoMes: parseFloat(row.pa_acumulado_mes) || 0,
    paAcumuladoAno: parseFloat(row.pa_acumulado_ano) || 0,
    metaPASemanal: parseFloat(row.meta_pa_semanal) || 82000,
    percentualMetaPASemana: parseFloat(row.percentual_meta_pa_semana) || 0,
    percentualMetaPAAno: parseFloat(row.percentual_meta_pa_ano) || 0,
    paEmitido: parseFloat(row.pa_emitido) || 0,
    apolicesEmitidas: parseFloat(row.apolices_emitidas) || 0,
    metaNSemanal: parseFloat(row.meta_n_semanal) || 5,
    nSemana: parseFloat(row.n_semana) || 0,
    nAcumuladoMes: parseFloat(row.n_acumulado_mes) || 0,
    nAcumuladoAno: parseFloat(row.n_acumulado_ano) || 0,
    percentualMetaNSemana: parseFloat(row.percentual_meta_n_semana) || 0,
    percentualMetaNAno: parseFloat(row.percentual_meta_n_ano) || 0,
    metaOIsAgendadas: parseFloat(row.meta_ois_agendadas) || 8,
    oIsAgendadas: parseFloat(row.ois_agendadas) || 0,
    oIsRealizadas: parseFloat(row.ois_realizadas) || 0,
    percentualOIsRealizadas: row.percentual_ois_realizadas ? parseFloat(row.percentual_ois_realizadas) : undefined,
    ticketMedio: row.ticket_medio ? parseFloat(row.ticket_medio) : undefined,
    conversaoOIs: row.conversao_ois ? parseFloat(row.conversao_ois) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Buscar todos os dados
export async function getAllWeeklyData(): Promise<WeeklyData[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_data')
      .select('*')
      .order('period', { ascending: true })

    if (error) {
      console.error('Erro ao buscar dados do Supabase:', error)
      return []
    }

    return (data || []).map(mapFromSupabase)
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error)
    return []
  }
}

// Inserir dados
export async function insertWeeklyData(data: WeeklyData[]): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const dataToInsert = data.map(item => ({
      period: item.period,
      pa_semanal: item.paSemanal,
      pa_acumulado_mes: item.paAcumuladoMes,
      pa_acumulado_ano: item.paAcumuladoAno,
      meta_pa_semanal: item.metaPASemanal,
      percentual_meta_pa_semana: item.percentualMetaPASemana,
      percentual_meta_pa_ano: item.percentualMetaPAAno,
      pa_emitido: item.paEmitido,
      apolices_emitidas: item.apolicesEmitidas,
      meta_n_semanal: item.metaNSemanal,
      n_semana: item.nSemana,
      n_acumulado_mes: item.nAcumuladoMes,
      n_acumulado_ano: item.nAcumuladoAno,
      percentual_meta_n_semana: item.percentualMetaNSemana,
      percentual_meta_n_ano: item.percentualMetaNAno,
      meta_ois_agendadas: item.metaOIsAgendadas,
      ois_agendadas: item.oIsAgendadas,
      ois_realizadas: item.oIsRealizadas,
      percentual_ois_realizadas: item.percentualOIsRealizadas,
      ticket_medio: item.ticketMedio,
      conversao_ois: item.conversaoOIs,
    }))

    const { data: insertedData, error } = await supabase
      .from('weekly_data')
      .insert(dataToInsert)
      .select()

    if (error) {
      console.error('Erro ao inserir dados:', error)
      return { success: false, error: error.message }
    }

    return { success: true, count: insertedData?.length || 0 }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Verificar se período existe
export async function periodExists(period: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('weekly_data')
      .select('id')
      .eq('period', period)
      .single()

    return !error && data !== null
  } catch {
    return false
  }
}

