# Mapeamento de Indicadores - MODELAGEM_FINANCEIRA

## Planilha Base
**MODELAGEM_FINANCEIRA - LIMPEZACA HOME OFFICE V01.1 - Lages SC - Franqueado (1)**

## Estrutura do Banco de Dados

### Tabela Única: `weekly_data`

A aplicação utiliza **apenas uma tabela** no Supabase chamada `weekly_data` que armazena todos os indicadores semanais.

## Todos os 34 Indicadores Mapeados

### 1. Indicadores de PA (Prêmio Anual) - 7 indicadores
- ✅ PA Semanal Realizado
- ✅ PA Acumulado no Mês
- ✅ PA Acumulado no Ano
- ✅ Meta de PA Semanal Necessária
- ✅ % Meta de PA Realizada da Semana
- ✅ % Meta de PA Realizada do Ano
- ✅ PA Emitido na Semana

### 2. Indicadores de N (Número de Apólices) - 7 indicadores
- ✅ Apólices Emitidas (por semana)
- ✅ Meta de N Semanal
- ✅ N da Semana
- ✅ N Acumulados do Mês
- ✅ N Acumulados do Ano
- ✅ % Meta de N Realizada da Semana
- ✅ % Meta de N Realizada do Ano

### 3. Indicadores de OIs (Oportunidades de Inovação) - 3 indicadores
- ✅ Meta OIs Agendadas
- ✅ OIs Agendadas
- ✅ OIs Realizadas na Semana

### 4. Indicadores de RECS - 2 indicadores
- ✅ Meta RECS
- ✅ Novas RECS

### 5. Indicadores de PCs/C2 - 3 indicadores
- ✅ Meta de PCs/C2 Agendados
- ✅ PCs Realizados na Semana
- ✅ Quantidade de C2 Realizados na Semana

### 6. Indicadores de Atrasos - 2 indicadores
- ✅ Apólice em Atraso (nº)
- ✅ Prêmio em Atraso de Clientes (R$)

### 7. Indicadores de Inadimplência - 2 indicadores
- ✅ Taxa de Inadimplência (%) Geral
- ✅ Taxa de Inadimplência (%) Assistente

### 8. Indicadores de Revisitas - 3 indicadores
- ✅ Meta Revisitas Agendadas
- ✅ Revisitas Agendadas na Semana
- ✅ Revisitas Realizadas na Semana

### 9. Indicadores de Produtividade - 4 indicadores
- ✅ Volume de Tarefas Concluídas no Trello
- ✅ Número de Vídeos de Treinamento Gravados
- ✅ Delivery Apólices
- ✅ Total de Reuniões Realizadas na Semana

### 10. Outros - 1 indicador
- ✅ Lista de Atrasos - Atribuídos Raiza

## Campos Calculados Automáticos

O sistema calcula automaticamente:
- **% OIs Realizadas**: (OIs Realizadas / OIs Agendadas) × 100
- **Ticket Médio**: PA Semanal / Apólices Emitidas
- **Conversão OIs**: (OIs Realizadas / OIs Agendadas) × 100

## Mapeamento Inteligente de Colunas

O sistema reconhece **múltiplas variações** dos nomes das colunas, incluindo:
- Com ou sem acentos (ex: "inadimplência" ou "inadimplencia")
- Com ou sem espaços (ex: "PA Semanal" ou "PASemanal")
- Com ou sem caracteres especiais (ex: "PCs/C2" ou "PCs C2")
- Variações de nomenclatura (ex: "Prêmio Anual" ou "PA")

### Exemplos de Variações Aceitas:

**PA Semanal:**
- "PA Semanal Realizado"
- "PA Semanal"
- "PASemanal"
- "Premio Anual Semanal"
- "PA Realizado"

**OIs:**
- "OIs Agendadas"
- "OIS Agendadas"
- "Oportunidades de Inovação Agendadas"
- "OIs Agend"

**Inadimplência:**
- "Taxa de Inadimplência (%) Geral"
- "Taxa Inadimplencia Geral"
- "Inadimplencia Geral"
- "% Inadimplencia Geral"

## Estrutura da Tabela no Supabase

Execute o script `criar-tabela-supabase.sql` no SQL Editor do Supabase para criar/atualizar a tabela com todos os campos.

### Colunas da Tabela:

```sql
-- Indicadores de PA
pa_semanal
pa_acumulado_mes
pa_acumulado_ano
meta_pa_semanal
percentual_meta_pa_semana
percentual_meta_pa_ano
pa_emitido

-- Indicadores de N
apolices_emitidas
meta_n_semanal
n_semana
n_acumulado_mes
n_acumulado_ano
percentual_meta_n_semana
percentual_meta_n_ano

-- Indicadores de OIs
meta_ois_agendadas
ois_agendadas
ois_realizadas
percentual_ois_realizadas

-- Indicadores de RECS
meta_recs
novas_recs

-- Indicadores de PCs/C2
meta_pcs_c2_agendados
pcs_realizados
c2_realizados

-- Indicadores de Atrasos
apolice_em_atraso
premio_em_atraso

-- Indicadores de Inadimplência
taxa_inadimplencia_geral
taxa_inadimplencia_assistente

-- Indicadores de Revisitas
meta_revisitas_agendadas
revisitas_agendadas
revisitas_realizadas

-- Indicadores de Produtividade
volume_tarefas_trello
videos_treinamento_gravados
delivery_apolices
total_reunioes

-- Lista de Atrasos
lista_atrasos_raiza

-- Campos Calculados
ticket_medio
conversao_ois

-- Metadados
id (UUID, Primary Key)
period (TEXT, UNIQUE)
created_at
updated_at
```

## Validações Implementadas

1. **Validação de Duplicatas na Planilha**: Remove períodos duplicados dentro do próprio arquivo
2. **Validação de Duplicatas no Banco**: Verifica se o período já existe antes de inserir
3. **Normalização de Períodos**: Padroniza o formato de períodos (ex: "18/08 a 24/08")
4. **Normalização de Nomes**: Remove acentos, espaços extras e caracteres especiais para melhor matching

## Próximos Passos

1. ✅ Execute `criar-tabela-supabase.sql` no Supabase SQL Editor
2. ✅ Faça upload da planilha MODELAGEM_FINANCEIRA através da página `/import`
3. ✅ Verifique se todos os indicadores foram importados corretamente
4. ✅ Confira os dados no dashboard principal

## Observações Importantes

- A tabela `weekly_data` é a **única tabela** utilizada no sistema
- Todos os indicadores são armazenados em uma única linha por período
- O campo `period` é único e serve como identificador principal
- Campos opcionais podem ser `NULL` se não estiverem presentes na planilha
- O sistema calcula automaticamente campos derivados quando possível

