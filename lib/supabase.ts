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
  if (typeof window === 'undefined') {
    // Server-side logging
    console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas completamente')
    if (databaseKey) {
      console.warn('⚠️ DataBase_Key encontrada, mas é necessária também a chave anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    } else {
      console.warn('⚠️ Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel')
    }
    console.warn('⚠️ Usando dados locais como fallback')
  }
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
    metaRECS: row.meta_recs ? parseFloat(row.meta_recs) : undefined,
    novasRECS: row.novas_recs ? parseFloat(row.novas_recs) : undefined,
    metaPCsC2Agendados: row.meta_pcs_c2_agendados ? parseFloat(row.meta_pcs_c2_agendados) : undefined,
    pcsRealizados: row.pcs_realizados ? parseFloat(row.pcs_realizados) : undefined,
    c2Realizados: row.c2_realizados ? parseFloat(row.c2_realizados) : undefined,
    apoliceEmAtraso: row.apolice_em_atraso ? parseFloat(row.apolice_em_atraso) : undefined,
    premioEmAtraso: row.premio_em_atraso ? parseFloat(row.premio_em_atraso) : undefined,
    taxaInadimplenciaGeral: row.taxa_inadimplencia_geral ? parseFloat(row.taxa_inadimplencia_geral) : undefined,
    taxaInadimplenciaAssistente: row.taxa_inadimplencia_assistente ? parseFloat(row.taxa_inadimplencia_assistente) : undefined,
    metaRevisitasAgendadas: row.meta_revisitas_agendadas ? parseFloat(row.meta_revisitas_agendadas) : undefined,
    revisitasAgendadas: row.revisitas_agendadas ? parseFloat(row.revisitas_agendadas) : undefined,
    revisitasRealizadas: row.revisitas_realizadas ? parseFloat(row.revisitas_realizadas) : undefined,
    volumeTarefasTrello: row.volume_tarefas_trello ? parseFloat(row.volume_tarefas_trello) : undefined,
    videosTreinamentoGravados: row.videos_treinamento_gravados ? parseFloat(row.videos_treinamento_gravados) : undefined,
    deliveryApolices: row.delivery_apolices ? parseFloat(row.delivery_apolices) : undefined,
    totalReunioes: row.total_reunioes ? parseFloat(row.total_reunioes) : undefined,
    listaAtrasosRaiza: row.lista_atrasos_raiza || undefined,
    ticketMedio: row.ticket_medio ? parseFloat(row.ticket_medio) : undefined,
    conversaoOIs: row.conversao_ois ? parseFloat(row.conversao_ois) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Buscar todos os dados
export async function getAllWeeklyData(): Promise<WeeklyData[]> {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      console.warn('Supabase não configurado, retornando array vazio')
    }
    return []
  }

  if (!supabase) {
    if (typeof window === 'undefined') {
      console.warn('Cliente Supabase não inicializado')
    }
    return []
  }

  try {
    const { data, error } = await (supabase as any)
      .from('weekly_data')
      .select('*')
      .order('period', { ascending: true })

    if (error) {
      // Log detalhado apenas no servidor
      if (typeof window === 'undefined') {
        console.error('Erro ao buscar dados do Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
      }
      return []
    }

    return (data || []).map(mapFromSupabase)
  } catch (error: any) {
    // Log detalhado apenas no servidor
    if (typeof window === 'undefined') {
      console.error('Erro ao conectar com Supabase:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      })
    }
    return []
  }
}

// Função auxiliar para mapear dados para o formato do banco
function mapToDatabaseFormat(item: WeeklyData) {
  return {
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
    meta_recs: item.metaRECS,
    novas_recs: item.novasRECS,
    meta_pcs_c2_agendados: item.metaPCsC2Agendados,
    pcs_realizados: item.pcsRealizados,
    c2_realizados: item.c2Realizados,
    apolice_em_atraso: item.apoliceEmAtraso,
    premio_em_atraso: item.premioEmAtraso,
    taxa_inadimplencia_geral: item.taxaInadimplenciaGeral,
    taxa_inadimplencia_assistente: item.taxaInadimplenciaAssistente,
    meta_revisitas_agendadas: item.metaRevisitasAgendadas,
    revisitas_agendadas: item.revisitasAgendadas,
    revisitas_realizadas: item.revisitasRealizadas,
    volume_tarefas_trello: item.volumeTarefasTrello,
    videos_treinamento_gravados: item.videosTreinamentoGravados,
    delivery_apolices: item.deliveryApolices,
    total_reunioes: item.totalReunioes,
    lista_atrasos_raiza: item.listaAtrasosRaiza,
    ticket_medio: item.ticketMedio,
    conversao_ois: item.conversaoOIs,
  }
}

// Inserir ou atualizar dados (UPSERT)
export async function upsertWeeklyData(data: WeeklyData[]): Promise<{ 
  success: boolean
  error?: string
  inserted?: number
  updated?: number
  total?: number
}> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase não configurado. Configure as variáveis de ambiente.' }
  }

  if (!supabase) {
    return { success: false, error: 'Cliente Supabase não inicializado' }
  }

  try {
    // Verificar quais períodos já existem ANTES do upsert
    const periods = data.map(d => d.period)
    const existingPeriodsChecks = await Promise.all(
      periods.map(period => periodExists(period))
    )
    
    // Criar mapa de períodos existentes
    const existingPeriodsMap = new Map<string, boolean>()
    for (let i = 0; i < periods.length; i++) {
      existingPeriodsMap.set(periods[i], existingPeriodsChecks[i])
    }

    const dataToUpsert = data.map(mapToDatabaseFormat)

    // Usar upsert com onConflict no campo 'period' (que é único)
    const { data: upsertedData, error } = await (supabase as any)
      .from('weekly_data')
      .upsert(dataToUpsert, {
        onConflict: 'period',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Erro ao fazer upsert dos dados:', error)
      return { success: false, error: error.message }
    }

    // Contar inseridos vs atualizados baseado no que existia antes
    let inserted = 0
    let updated = 0
    
    for (const period of periods) {
      if (existingPeriodsMap.get(period)) {
        updated++
      } else {
        inserted++
      }
    }

    return { 
      success: true, 
      inserted,
      updated,
      total: upsertedData?.length || 0
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Inserir dados (mantido para compatibilidade)
export async function insertWeeklyData(data: WeeklyData[]): Promise<{ success: boolean; error?: string; count?: number }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase não configurado. Configure as variáveis de ambiente.' }
  }

  if (!supabase) {
    return { success: false, error: 'Cliente Supabase não inicializado' }
  }

  try {
    const dataToInsert = data.map(mapToDatabaseFormat)

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

