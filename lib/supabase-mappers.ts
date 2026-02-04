import { WeeklyData } from './types'

/** Registro da tabela kpi_weekly_data (snake_case) */
export interface KpiWeeklyDataRow {
  id?: string
  period: string
  pa_semanal?: number
  pa_acumulado_mes?: number
  pa_acumulado_ano?: number
  meta_pa_semanal?: number
  percentual_meta_pa_semana?: number
  percentual_meta_pa_ano?: number
  pa_emitido?: number
  apolices_emitidas?: number
  meta_n_semanal?: number
  n_semana?: number
  n_acumulado_mes?: number
  n_acumulado_ano?: number
  percentual_meta_n_semana?: number
  percentual_meta_n_ano?: number
  meta_ois_agendadas?: number
  ois_agendadas?: number
  ois_realizadas?: number
  percentual_ois_realizadas?: number
  meta_recs?: number
  novas_recs?: number
  meta_pcs_c2_agendados?: number
  pcs_realizados?: number
  c2_realizados?: number
  apolice_em_atraso?: number
  premio_em_atraso?: number
  taxa_inadimplencia_geral?: number
  taxa_inadimplencia_assistente?: number
  meta_revisitas_agendadas?: number
  revisitas_agendadas?: number
  revisitas_realizadas?: number
  volume_tarefas_trello?: number
  videos_treinamento_gravados?: number
  delivery_apolices?: number
  total_reunioes?: number
  lista_atrasos_raiza?: string
  ticket_medio?: number
  conversao_ois?: number
  created_at?: string
  updated_at?: string
}

/** Converte uma linha do Supabase (snake_case) para WeeklyData (camelCase) */
export function rowToWeeklyData(row: KpiWeeklyDataRow): WeeklyData {
  return {
    id: row.id,
    period: row.period,
    paSemanal: Number(row.pa_semanal ?? 0),
    paAcumuladoMes: Number(row.pa_acumulado_mes ?? 0),
    paAcumuladoAno: Number(row.pa_acumulado_ano ?? 0),
    metaPASemanal: Number(row.meta_pa_semanal ?? 82000),
    percentualMetaPASemana: Number(row.percentual_meta_pa_semana ?? 0),
    percentualMetaPAAno: Number(row.percentual_meta_pa_ano ?? 0),
    paEmitido: Number(row.pa_emitido ?? 0),
    apolicesEmitidas: Number(row.apolices_emitidas ?? 0),
    metaNSemanal: Number(row.meta_n_semanal ?? 5),
    nSemana: Number(row.n_semana ?? 0),
    nAcumuladoMes: Number(row.n_acumulado_mes ?? 0),
    nAcumuladoAno: Number(row.n_acumulado_ano ?? 0),
    percentualMetaNSemana: Number(row.percentual_meta_n_semana ?? 0),
    percentualMetaNAno: Number(row.percentual_meta_n_ano ?? 0),
    metaOIsAgendadas: Number(row.meta_ois_agendadas ?? 8),
    oIsAgendadas: Number(row.ois_agendadas ?? 0),
    oIsRealizadas: Number(row.ois_realizadas ?? 0),
    percentualOIsRealizadas: Number(row.percentual_ois_realizadas ?? 0),
    metaRECS: row.meta_recs !== undefined ? Number(row.meta_recs) : undefined,
    novasRECS: row.novas_recs !== undefined ? Number(row.novas_recs) : undefined,
    metaPCsC2Agendados: row.meta_pcs_c2_agendados !== undefined ? Number(row.meta_pcs_c2_agendados) : undefined,
    pcsRealizados: row.pcs_realizados !== undefined ? Number(row.pcs_realizados) : undefined,
    c2Realizados: row.c2_realizados !== undefined ? Number(row.c2_realizados) : undefined,
    apoliceEmAtraso: row.apolice_em_atraso !== undefined ? Number(row.apolice_em_atraso) : undefined,
    premioEmAtraso: row.premio_em_atraso !== undefined ? Number(row.premio_em_atraso) : undefined,
    taxaInadimplenciaGeral: row.taxa_inadimplencia_geral !== undefined ? Number(row.taxa_inadimplencia_geral) : undefined,
    taxaInadimplenciaAssistente: row.taxa_inadimplencia_assistente !== undefined ? Number(row.taxa_inadimplencia_assistente) : undefined,
    metaRevisitasAgendadas: row.meta_revisitas_agendadas !== undefined ? Number(row.meta_revisitas_agendadas) : undefined,
    revisitasAgendadas: row.revisitas_agendadas !== undefined ? Number(row.revisitas_agendadas) : undefined,
    revisitasRealizadas: row.revisitas_realizadas !== undefined ? Number(row.revisitas_realizadas) : undefined,
    volumeTarefasTrello: row.volume_tarefas_trello !== undefined ? Number(row.volume_tarefas_trello) : undefined,
    videosTreinamentoGravados: row.videos_treinamento_gravados !== undefined ? Number(row.videos_treinamento_gravados) : undefined,
    deliveryApolices: row.delivery_apolices !== undefined ? Number(row.delivery_apolices) : undefined,
    totalReunioes: row.total_reunioes !== undefined ? Number(row.total_reunioes) : undefined,
    listaAtrasosRaiza: row.lista_atrasos_raiza ?? undefined,
    ticketMedio: row.ticket_medio !== undefined ? Number(row.ticket_medio) : undefined,
    conversaoOIs: row.conversao_ois !== undefined ? Number(row.conversao_ois) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Converte WeeklyData para objeto de inserção/upsert no Supabase (snake_case) */
export function weeklyDataToRow(data: WeeklyData): Omit<KpiWeeklyDataRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    period: data.period,
    pa_semanal: data.paSemanal,
    pa_acumulado_mes: data.paAcumuladoMes,
    pa_acumulado_ano: data.paAcumuladoAno,
    meta_pa_semanal: data.metaPASemanal,
    percentual_meta_pa_semana: data.percentualMetaPASemana,
    percentual_meta_pa_ano: data.percentualMetaPAAno,
    pa_emitido: data.paEmitido,
    apolices_emitidas: data.apolicesEmitidas,
    meta_n_semanal: data.metaNSemanal,
    n_semana: data.nSemana,
    n_acumulado_mes: data.nAcumuladoMes,
    n_acumulado_ano: data.nAcumuladoAno,
    percentual_meta_n_semana: data.percentualMetaNSemana,
    percentual_meta_n_ano: data.percentualMetaNAno,
    meta_ois_agendadas: data.metaOIsAgendadas,
    ois_agendadas: data.oIsAgendadas,
    ois_realizadas: data.oIsRealizadas,
    percentual_ois_realizadas: data.percentualOIsRealizadas,
    meta_recs: data.metaRECS,
    novas_recs: data.novasRECS,
    meta_pcs_c2_agendados: data.metaPCsC2Agendados,
    pcs_realizados: data.pcsRealizados,
    c2_realizados: data.c2Realizados,
    apolice_em_atraso: data.apoliceEmAtraso,
    premio_em_atraso: data.premioEmAtraso,
    taxa_inadimplencia_geral: data.taxaInadimplenciaGeral,
    taxa_inadimplencia_assistente: data.taxaInadimplenciaAssistente,
    meta_revisitas_agendadas: data.metaRevisitasAgendadas,
    revisitas_agendadas: data.revisitasAgendadas,
    revisitas_realizadas: data.revisitasRealizadas,
    volume_tarefas_trello: data.volumeTarefasTrello,
    videos_treinamento_gravados: data.videosTreinamentoGravados,
    delivery_apolices: data.deliveryApolices,
    total_reunioes: data.totalReunioes,
    lista_atrasos_raiza: data.listaAtrasosRaiza ?? '',
    ticket_medio: data.ticketMedio,
    conversao_ois: data.conversaoOIs,
  }
}
