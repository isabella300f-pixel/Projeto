import { createClient } from '@supabase/supabase-js'
import { WeeklyData } from './types'

// Função para extrair URL do projeto da connection string
function extractUrlFromConnectionString(connectionString: string): string {
  try {
    // Formato: postgresql://postgres.PROJECT_REF:password@host:port/db
    const match = connectionString.match(/postgresql:\/\/postgres\.([^:]+)/)
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`
    }
  } catch (e) {
    // Ignorar erros
  }
  return ''
}

// Suporta múltiplos nomes de variáveis para compatibilidade
// Se DataBase_Key for uma connection string, extrair URL dela
const databaseKey = process.env.DataBase_Key || process.env.DATABASE_KEY || ''
let extractedUrl = ''

if (databaseKey && databaseKey.startsWith('postgresql://')) {
  extractedUrl = extractUrlFromConnectionString(databaseKey)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || extractedUrl || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas completamente')
  if (databaseKey) {
    console.warn('⚠️ DataBase_Key encontrada, mas é necessária também a chave anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  } else {
    console.warn('⚠️ Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel')
  }
  console.warn('⚠️ Usando dados locais como fallback')
}

// Criar cliente Supabase apenas se as variáveis estiverem configuradas
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key') as any
  }
} else {
  // Criar um cliente placeholder para evitar erros em tempo de execução
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key') as any
}

export { supabase }

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
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase não configurado, retornando array vazio')
    return []
  }

  if (!supabase) {
    console.warn('Cliente Supabase não inicializado')
    return []
  }

  try {
    const { data, error } = await (supabase as any)
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
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase não configurado. Configure as variáveis de ambiente.' }
  }

  if (!supabase) {
    return { success: false, error: 'Cliente Supabase não inicializado' }
  }

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

    const { data: insertedData, error } = await (supabase as any)
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
  if (!supabaseUrl || !supabaseAnonKey || !supabase) {
    return false
  }

  try {
    const { data, error } = await (supabase as any)
      .from('weekly_data')
      .select('id')
      .eq('period', period)
      .single()

    return !error && data !== null
  } catch {
    return false
  }
}

