# Guia de Diagnóstico - Google Sheets

## Problema: Dados não estão sendo atualizados

Se os dados estão aparecendo zerados no dashboard, siga este guia de diagnóstico:

## 1. Verificar o Endpoint de Debug

Acesse no navegador (após o deploy):
```
https://seu-dominio.vercel.app/api/google-sheets/debug
```

Ou localmente:
```
http://localhost:3000/api/google-sheets/debug
```

Este endpoint retorna:
- ✅ Tamanho do CSV recebido
- ✅ Preview do CSV (primeiros 1000 caracteres)
- ✅ Nome da planilha
- ✅ Total de linhas e colunas
- ✅ Lista de todas as colunas encontradas
- ✅ Primeira linha completa
- ✅ Primeiras 5 linhas de exemplo

## 2. Verificar o Console do Navegador

Abra o Console (F12) e procure por:

### Logs de Sucesso:
- `🔄 [Frontend] Carregando dados do Google Sheets...`
- `✅ [Frontend] Dados carregados do Google Sheets: X registros`
- `📅 [Frontend] Períodos: [...]`
- `📈 [Frontend] Primeiro registro completo: {...}`

### Logs de Erro:
- `❌ [Frontend] Erro ao carregar dados do Google Sheets`
- `⚠️ [Frontend] Nenhum dado válido encontrado`

## 3. Verificar os Logs do Servidor (Vercel)

No dashboard do Vercel:
1. Vá em **Functions** > **Logs**
2. Procure por logs que começam com `[Google Sheets]`
3. Verifique se há erros ou avisos

## 4. Verificar a URL do Google Sheets

A URL configurada é:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSQk309WH9kRymm3yLfzMluGJLRgAjMtWiil22Du0UGwdS55YOafE0C-EVCNiKKkw/pub?gid=1893200293&single=true&output=csv
```

**Teste a URL diretamente no navegador:**
- Deve abrir um arquivo CSV
- Deve mostrar os dados da planilha
- Se não abrir, a planilha pode não estar publicada corretamente

## 5. Verificar a Estrutura da Planilha

A planilha deve ter:

### Coluna de Período (OBRIGATÓRIA):
- Nome: "Período", "Periodo", "Period", "Semana", "Data"
- Formato: "DD/MM a DD/MM" (ex: "18/08 a 24/08")
- Deve estar na primeira linha (cabeçalho)

### Colunas de Indicadores:
Todas as 34 colunas devem estar presentes. O sistema busca por variações como:
- "PA Semanal Realizado", "PA Semanal", "PA Realizado"
- "N da Semana", "N Semanal", "N Semana"
- "OIs Agendadas", "OIs Agend", "Oportunidades Inovação Agendadas"
- etc.

## 6. Problemas Comuns e Soluções

### Problema: CSV vazio
**Solução**: Verifique se a planilha está publicada corretamente no Google Sheets

### Problema: Nenhum período encontrado
**Solução**: 
- Verifique se há uma coluna "Período" na planilha
- Verifique se os períodos estão no formato correto (DD/MM a DD/MM)
- Verifique se não há linhas descritivas sendo interpretadas como períodos

### Problema: Dados encontrados mas valores zerados
**Solução**:
- Verifique os logs do servidor para ver quais colunas estão sendo encontradas
- Compare os nomes das colunas na planilha com as variações no código
- Use o endpoint `/api/google-sheets/debug` para ver a primeira linha completa

### Problema: Timeout
**Solução**:
- A planilha pode estar muito grande
- Verifique a conexão com o Google Sheets
- Tente novamente após alguns segundos

## 7. Como Adicionar Novas Variações de Nomes

Se uma coluna não está sendo encontrada, adicione a variação em `app/api/google-sheets/route.ts`:

```typescript
paSemanal: getValue(rowMap, [
  'pa semanal realizado', // Adicione aqui novas variações
  'pa semanal',
  // ... outras variações
], 'paSemanal') || 0,
```

## 8. Teste Manual

1. Abra o endpoint de debug: `/api/google-sheets/debug`
2. Verifique se retorna dados
3. Compare os nomes das colunas retornadas com os nomes na planilha
4. Verifique se há correspondência

## 9. Contato para Suporte

Se após seguir todos os passos o problema persistir:
1. Capture os logs do console do navegador
2. Capture os logs do servidor (Vercel)
3. Capture o resultado do endpoint de debug
4. Verifique se a planilha está acessível publicamente
