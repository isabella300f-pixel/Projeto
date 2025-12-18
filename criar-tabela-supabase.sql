-- ============================================
-- Script SQL para criar tabela no Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela weekly_data com todos os campos
CREATE TABLE IF NOT EXISTS weekly_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period TEXT NOT NULL UNIQUE,
  
  -- Indicadores de PA (Prêmio Anual)
  pa_semanal DECIMAL(15, 2),
  pa_acumulado_mes DECIMAL(15, 2),
  pa_acumulado_ano DECIMAL(15, 2),
  meta_pa_semanal DECIMAL(15, 2) DEFAULT 82000,
  percentual_meta_pa_semana DECIMAL(10, 2),
  percentual_meta_pa_ano DECIMAL(10, 2),
  pa_emitido DECIMAL(15, 2),
  
  -- Indicadores de N (Número de apólices)
  apolices_emitidas DECIMAL(10, 2),
  meta_n_semanal DECIMAL(10, 2) DEFAULT 5,
  n_semana DECIMAL(10, 2),
  n_acumulado_mes DECIMAL(10, 2),
  n_acumulado_ano DECIMAL(10, 2),
  percentual_meta_n_semana DECIMAL(10, 2),
  percentual_meta_n_ano DECIMAL(10, 2),
  
  -- Indicadores de OIs (Oportunidades de Inovação)
  meta_ois_agendadas DECIMAL(10, 2) DEFAULT 8,
  ois_agendadas DECIMAL(10, 2),
  ois_realizadas DECIMAL(10, 2),
  percentual_ois_realizadas DECIMAL(10, 2),
  
  -- Campos calculados
  ticket_medio DECIMAL(15, 2),
  conversao_ois DECIMAL(10, 2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_weekly_data_period ON weekly_data(period);
CREATE INDEX IF NOT EXISTS idx_weekly_data_created_at ON weekly_data(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE weekly_data ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Permitir leitura pública" ON weekly_data;
DROP POLICY IF EXISTS "Permitir inserção pública" ON weekly_data;
DROP POLICY IF EXISTS "Permitir atualização pública" ON weekly_data;

-- Política para permitir leitura pública
CREATE POLICY "Permitir leitura pública" ON weekly_data
  FOR SELECT USING (true);

-- Política para permitir inserção
CREATE POLICY "Permitir inserção pública" ON weekly_data
  FOR INSERT WITH CHECK (true);

-- Política para permitir atualização
CREATE POLICY "Permitir atualização pública" ON weekly_data
  FOR UPDATE USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir (para evitar conflitos)
DROP TRIGGER IF EXISTS update_weekly_data_updated_at ON weekly_data;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_weekly_data_updated_at
  BEFORE UPDATE ON weekly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verificar se a tabela foi criada
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'weekly_data'
ORDER BY ordinal_position;

