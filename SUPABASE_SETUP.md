# Configuração do Supabase - KPI Dashboard

## 1. Criar Tabela no Supabase

Execute o seguinte SQL no **SQL Editor** do Supabase:

```sql
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

-- Trigger para atualizar updated_at
CREATE TRIGGER update_weekly_data_updated_at
  BEFORE UPDATE ON weekly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 2. Variáveis de Ambiente no Vercel

Certifique-se de que as seguintes variáveis estão configuradas no Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` - URL do seu projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase

**Nota:** Se você usou `DataBase_Key` no Vercel, você precisará renomeá-la para `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou atualizar o código para usar o nome correto.

## 3. Migrar Dados Existentes

Para migrar os dados existentes da planilha para o Supabase, você pode:

1. Usar a interface de importação em `/import` na aplicação
2. Ou usar um script Node.js (criar conforme necessário)

## 4. Estrutura da Planilha

A planilha Excel deve conter as seguintes colunas:

- Período
- PA Semanal
- PA Acumulado Mês
- PA Acumulado Ano
- Meta PA Semanal
- % Meta PA Semana
- % Meta PA Ano
- PA Emitido
- Apólices Emitidas
- Meta N Semanal
- N Semana
- N Acumulado Mês
- N Acumulado Ano
- % Meta N Semana
- % Meta N Ano
- Meta OIs Agendadas
- OIs Agendadas
- OIs Realizadas

## 5. Como Usar

1. Acesse `/import` na aplicação
2. Faça upload de uma planilha Excel (.xlsx ou .xls)
3. Os dados serão processados e inseridos no banco de dados
4. Períodos duplicados serão automaticamente ignorados

