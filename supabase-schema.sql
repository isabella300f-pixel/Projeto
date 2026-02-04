-- ============================================================
-- KPI DASH 300 - Schema Supabase
-- Execute este SQL no Supabase: SQL Editor > New query > Cole e Run
-- ============================================================

-- Tabela principal: dados semanais de KPI (um registro por período)
CREATE TABLE IF NOT EXISTS public.kpi_weekly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL UNIQUE,

  -- PA (Prêmio Anual)
  pa_semanal NUMERIC DEFAULT 0,
  pa_acumulado_mes NUMERIC DEFAULT 0,
  pa_acumulado_ano NUMERIC DEFAULT 0,
  meta_pa_semanal NUMERIC DEFAULT 82000,
  percentual_meta_pa_semana NUMERIC DEFAULT 0,
  percentual_meta_pa_ano NUMERIC DEFAULT 0,
  pa_emitido NUMERIC DEFAULT 0,

  -- N (Apólices)
  apolices_emitidas NUMERIC DEFAULT 0,
  meta_n_semanal NUMERIC DEFAULT 5,
  n_semana NUMERIC DEFAULT 0,
  n_acumulado_mes NUMERIC DEFAULT 0,
  n_acumulado_ano NUMERIC DEFAULT 0,
  percentual_meta_n_semana NUMERIC DEFAULT 0,
  percentual_meta_n_ano NUMERIC DEFAULT 0,

  -- OIs
  meta_ois_agendadas NUMERIC DEFAULT 8,
  ois_agendadas NUMERIC DEFAULT 0,
  ois_realizadas NUMERIC DEFAULT 0,
  percentual_ois_realizadas NUMERIC DEFAULT 0,

  -- RECS, PCs/C2
  meta_recs NUMERIC DEFAULT 0,
  novas_recs NUMERIC DEFAULT 0,
  meta_pcs_c2_agendados NUMERIC DEFAULT 0,
  pcs_realizados NUMERIC DEFAULT 0,
  c2_realizados NUMERIC DEFAULT 0,

  -- Atrasos e inadimplência
  apolice_em_atraso NUMERIC DEFAULT 0,
  premio_em_atraso NUMERIC DEFAULT 0,
  taxa_inadimplencia_geral NUMERIC DEFAULT 0,
  taxa_inadimplencia_assistente NUMERIC DEFAULT 0,

  -- Revisitas
  meta_revisitas_agendadas NUMERIC DEFAULT 0,
  revisitas_agendadas NUMERIC DEFAULT 0,
  revisitas_realizadas NUMERIC DEFAULT 0,

  -- Produtividade
  volume_tarefas_trello NUMERIC DEFAULT 0,
  videos_treinamento_gravados NUMERIC DEFAULT 0,
  delivery_apolices NUMERIC DEFAULT 0,
  total_reunioes NUMERIC DEFAULT 0,

  -- Outros
  lista_atrasos_raiza TEXT DEFAULT '',
  ticket_medio NUMERIC DEFAULT 0,
  conversao_ois NUMERIC DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscar por período
CREATE INDEX IF NOT EXISTS idx_kpi_weekly_data_period ON public.kpi_weekly_data (period);

-- RLS: permitir leitura pública (anon) e escrita apenas via service_role
ALTER TABLE public.kpi_weekly_data ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode ler (para o dashboard funcionar com anon key se quiser)
CREATE POLICY "Permitir leitura pública" ON public.kpi_weekly_data
  FOR SELECT USING (true);

-- Política: apenas service_role pode inserir/atualizar (via API com service_role)
-- Inserções/updates pelo backend (service_role) ignoram RLS, então não precisa de policy de INSERT/UPDATE para anon.

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kpi_weekly_data_updated_at ON public.kpi_weekly_data;
CREATE TRIGGER kpi_weekly_data_updated_at
  BEFORE UPDATE ON public.kpi_weekly_data
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
