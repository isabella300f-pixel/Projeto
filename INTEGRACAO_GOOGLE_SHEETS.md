# Integração com Google Sheets - Atualização em Tempo Real

## Visão Geral

A aplicação agora está conectada diretamente com uma planilha do Google Sheets publicada, permitindo atualizações em tempo real sem necessidade de Supabase ou arquivos locais.

## Como Funciona

### 1. Fonte de Dados
- **URL do Google Sheets**: A aplicação busca dados diretamente de uma planilha do Google Sheets publicada
- **Formato**: CSV (Comma-Separated Values) exportado automaticamente pelo Google Sheets
- **Atualização**: Dados são atualizados automaticamente a cada 30 segundos

### 2. API Route
- **Endpoint**: `/api/google-sheets`
- **Método**: GET
- **Função**: Busca dados do Google Sheets, parseia o CSV e retorna no formato `WeeklyData[]`

### 3. Mapeamento de Dados
A API reconhece automaticamente múltiplas variações de nomes de colunas:
- **PA (Prêmio Anual)**: "pa semanal", "pa realizado", "premio anual semanal", etc.
- **N (Número de Apólices)**: "n da semana", "n semanal", "numero apolices semana", etc.
- **OIs (Oportunidades de Inovação)**: "ois agendadas", "ois realizadas", "oportunidades inovacao", etc.
- E todos os outros 34 indicadores com suas variações

### 4. Atualização Automática
- **Carregamento Inicial**: Dados são carregados imediatamente ao abrir o dashboard
- **Polling Automático**: Atualização a cada 30 segundos
- **Indicador Visual**: Mostra o horário da última atualização no header

## Estrutura da Planilha

A planilha do Google Sheets deve conter:
1. **Coluna de Período**: Uma coluna identificando o período (ex: "18/08 a 24/08")
2. **Colunas de Indicadores**: Todas as colunas com os 34 indicadores mapeados

### Exemplo de Estrutura Esperada

| Período | PA Semanal | PA Acumulado Mês | N da Semana | OIs Agendadas | ... |
|---------|------------|------------------|-------------|---------------|-----|
| 18/08 a 24/08 | 114668.50 | 114668.50 | 6 | 5 | ... |
| 25/08 a 31/08 | 96714.60 | 211383.10 | 3 | 2 | ... |

## Vantagens

✅ **Atualização em Tempo Real**: Mudanças na planilha aparecem automaticamente no dashboard
✅ **Sem Configuração de Banco**: Não precisa configurar Supabase ou banco de dados
✅ **Fácil Manutenção**: Basta atualizar a planilha do Google Sheets
✅ **Acesso Público**: Qualquer pessoa com acesso à planilha pode atualizar os dados
✅ **Sem Upload Manual**: Não precisa fazer upload de arquivos Excel

## Configuração

### URL do Google Sheets

A URL está configurada em `app/api/google-sheets/route.ts`:

```typescript
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQk309WH9kRymm3yLfzMluGJLRgAjMtWiil22Du0UGwdS55YOafE0C-EVCNiKKkw/pub?gid=1893200293&single=true&output=csv'
```

### Para Usar Outra Planilha

1. Publique sua planilha do Google Sheets (Arquivo > Compartilhar > Publicar na Web)
2. Selecione o formato CSV
3. Copie a URL gerada
4. Atualize a constante `GOOGLE_SHEETS_URL` no arquivo `app/api/google-sheets/route.ts`

## Fallback

Se houver erro ao carregar dados do Google Sheets, a aplicação usa automaticamente os dados locais (`lib/data.ts`) como fallback, garantindo que o dashboard sempre funcione.

## Monitoramento

- **Console do Navegador**: Mostra logs de sucesso/erro ao carregar dados
- **Header do Dashboard**: Exibe o horário da última atualização bem-sucedida
- **Indicador de Loading**: Mostra quando os dados estão sendo carregados

## Troubleshooting

### Dados não aparecem
1. Verifique se a planilha está publicada corretamente
2. Verifique se a URL está correta no código
3. Verifique o console do navegador para erros
4. Certifique-se de que a planilha contém uma coluna "Período" ou similar

### Atualização não funciona
1. Verifique se a planilha foi realmente atualizada
2. Aguarde até 30 segundos para a próxima atualização automática
3. Recarregue a página manualmente (F5)

### Erro de CORS
- O Google Sheets permite acesso público via CSV, então não deve haver problemas de CORS
- Se houver, verifique se a planilha está publicada corretamente

## Próximos Passos

- [ ] Adicionar botão manual de atualização
- [ ] Configurar intervalo de atualização via variável de ambiente
- [ ] Adicionar cache para melhorar performance
- [ ] Suportar múltiplas planilhas/abas
