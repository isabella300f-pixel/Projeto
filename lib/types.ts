export interface FilterState {
  period: string | 'all'
  paMin?: number
  paMax?: number
  nMin?: number
  nMax?: number
  performancePA?: 'all' | 'above' | 'below' | 'exact'
  performanceN?: 'all' | 'above' | 'below' | 'exact'
  month?: string | 'all'
  searchQuery?: string
}

// Interface estendida com todos os campos possíveis
export interface WeeklyData {
  id?: string
  period: string
  
  // Indicadores de PA (Prêmio Anual)
  paSemanal: number
  paAcumuladoMes: number
  paAcumuladoAno: number
  metaPASemanal: number
  percentualMetaPASemana: number
  percentualMetaPAAno: number
  paEmitido: number
  
  // Indicadores de N (Número de apólices)
  apolicesEmitidas: number
  metaNSemanal: number
  nSemana: number
  nAcumuladoMes: number
  nAcumuladoAno: number
  percentualMetaNSemana: number
  percentualMetaNAno: number
  
  // Indicadores de OIs (Oportunidades de Inovação)
  metaOIsAgendadas: number
  oIsAgendadas: number
  oIsRealizadas: number
  percentualOIsRealizadas?: number
  
  // Indicadores de RECS
  metaRECS?: number
  novasRECS?: number
  
  // Indicadores de PCs/C2
  metaPCsC2Agendados?: number
  pcsRealizados?: number
  c2Realizados?: number
  
  // Indicadores de Atrasos
  apoliceEmAtraso?: number
  premioEmAtraso?: number
  
  // Indicadores de Inadimplência
  taxaInadimplenciaGeral?: number
  taxaInadimplenciaAssistente?: number
  
  // Indicadores de Revisitas
  metaRevisitasAgendadas?: number
  revisitasAgendadas?: number
  revisitasRealizadas?: number
  
  // Indicadores de Produtividade
  volumeTarefasTrello?: number
  videosTreinamentoGravados?: number
  deliveryApolices?: number
  totalReunioes?: number
  
  // Lista de Atrasos
  listaAtrasosRaiza?: string
  
  // Campos calculados
  ticketMedio?: number
  conversaoOIs?: number
  
  // Metadados
  created_at?: string
  updated_at?: string
}
