# Validação de Valores - KPI Dashboard

## Validações Implementadas

### 1. Validação de Valores Muito Altos
O sistema agora valida valores que podem ser acumulados ao invés de semanais:

- **PA Semanal / PA Emitido**: Rejeita valores > 1.000.000 (provavelmente são acumulados)
- **Apólices Emitidas**: Rejeita valores > 1.000 (provavelmente são acumulados)
- **N Semanal**: Rejeita valores > 200 (provavelmente são acumulados)
- **N Acumulado Mês**: Rejeita valores > 1.000 (valores muito altos)

### 2. Correção de Porcentagens
O sistema corrige automaticamente porcentagens que vêm em formatos incorretos:

- **Valores decimais (0.012)**: Multiplica por 100 → 1.2%
- **Valores inteiros altos (12000)**: Divide por 100 → 120%
- **Valores entre 1-100**: Mantém como está (já está em %)

### 3. Validações de Coerência
O sistema verifica relações entre campos:

- **PA Semanal vs PA Emitido**: Alerta se PA Semanal > PA Emitido * 10
- **Porcentagens de Meta**: Alerta se > 1000% (valores suspeitos)

### 4. Cálculo de Campos Derivados
Campos calculados são gerados apenas se não foram fornecidos:

- **% OIs Realizadas**: `(oIsRealizadas / oIsAgendadas) * 100`
- **Ticket Médio**: `paSemanal / apolicesEmitidas`

## Como Verificar os Dados

### 1. Endpoint de Debug
Acesse: `https://seu-dominio.vercel.app/api/google-sheets/debug`

Este endpoint mostra:
- Todos os períodos encontrados
- Todos os indicadores e valores originais para um período exemplo
- Detalhes de mapeamento linha por linha

### 2. Logs do Console do Navegador
Procure por:
- `✅ [Mapeamento]` - Valores mapeados com sucesso
- `⚠️ [Validação]` - Valores rejeitados por validação
- `⚠️ [Mapeamento] Indicador não mapeado` - Indicadores que não foram encontrados
- `✅ [Período] X campos mapeados` - Resumo por período

### 3. Logs do Servidor (Vercel)
No Vercel > Functions > Logs, procure por:
- `📊 [parseNumber] Convertendo porcentagem` - Conversões de porcentagem
- `⚠️ [Validação]` - Valores rejeitados
- `✅ [Período]` - Resumo de mapeamento por período

## Problemas Comuns e Soluções

### Problema: Valores muito altos (ex: paEmitido: 1341000)
**Causa**: Valor acumulado sendo pego como semanal
**Solução**: Sistema agora rejeita valores > 1.000.000 para PA semanal/emitido

### Problema: Porcentagens incorretas (ex: percentualMetaNSemana: 1.2)
**Causa**: Porcentagem vindo como decimal (0.012) ou inteiro (120)
**Solução**: Sistema detecta e corrige automaticamente

### Problema: Valores zerados quando não deveriam
**Causa**: Indicador não está sendo mapeado corretamente
**Solução**: Verificar logs `⚠️ [Mapeamento] Indicador não mapeado` e adicionar variação ao mapeamento

### Problema: Valores de um período aparecendo em outro
**Causa**: Mapeamento pegando coluna errada
**Solução**: Verificar logs de mapeamento para identificar qual coluna está sendo usada

## Próximos Passos

1. **Verificar endpoint de debug**: Acesse `/api/google-sheets/debug` para ver todos os valores originais
2. **Comparar com planilha**: Compare os valores do debug com a planilha do Google Sheets
3. **Verificar logs**: Procure por avisos de validação ou mapeamento
4. **Ajustar mapeamento**: Se necessário, adicione mais variações ao `indicatorFieldMap`

## Estrutura de Dados Esperada

A planilha deve ter:
- **Coluna A**: "Indicador" (nomes dos KPIs)
- **Colunas O+**: Períodos no formato "DD/MM a DD/MM" ou "DD/MM"
- **Células**: Valores numéricos, porcentagens, ou hífens (-) para vazios

## Exemplo de Mapeamento

```
Indicador: "PA semanal realizado"
Período: "18/08 a 24/08"
Valor na planilha: "114.668,50"
Valor mapeado: 114668.5 → paSemanal
```

Se o valor não estiver sendo mapeado corretamente, verifique:
1. O nome do indicador na planilha
2. Se há variações no nome (ex: "PA semanal" vs "PA Semanal Realizado")
3. Se o valor está na coluna correta do período
