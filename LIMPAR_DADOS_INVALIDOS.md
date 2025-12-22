# Como Limpar Dados Inválidos do Banco

O problema é que textos descritivos da planilha (como "Simples Nacional - Anexo 4", "Indica células", etc.) foram salvos como períodos no banco de dados, resultando em registros com valores zerados.

## Solução 1: Endpoint de Limpeza (Recomendado)

Após o deploy, você pode limpar os dados inválidos acessando o endpoint de limpeza:

### Opção A: Usando curl (Terminal/CMD)

```bash
curl -X POST https://seu-projeto.vercel.app/api/cleanup
```

### Opção B: Usando o navegador (navegação direta não funciona para POST)

Você precisará usar um cliente HTTP como Postman, ou criar uma página temporária.

### Opção C: Criar botão na página de importação

Já foi adicionado um endpoint `/api/cleanup` que você pode chamar.

## Solução 2: Limpar Manualmente no Supabase

1. Acesse o Supabase Dashboard
2. Vá em "Table Editor" → `weekly_data`
3. Procure por registros com períodos como:
   - "Simples Nacional - Anexo 4"
   - "Simples Nacional - Anexo 5"
   - "Indica células de Output de Informações"
   - "Unidade de Medida"
   - "Cartão de Crédito"
   - Etc.
4. Delete esses registros manualmente

## Validação Implementada

Agora o sistema valida períodos antes de salvar. Um período válido deve:

1. Ter entre 5 e 50 caracteres
2. Conter pelo menos um número
3. Ter formato de data/período:
   - DD/MM (ex: "18/08")
   - DD/MM a DD/MM (ex: "18/08 a 24/08")
   - YYYY-WXX (ex: "2023-W34")
4. **NÃO** conter palavras descritivas como:
   - "Simples Nacional", "Anexo"
   - "Indica", "célula", "células"
   - "Output", "Input"
   - "Cartão", "Crédito", "Débito"
   - "Caixa", "Capital", "Giro"
   - E outras palavras descritivas da planilha

## Após a Limpeza

1. Aguarde o deploy completar (2-3 minutos)
2. Acesse o endpoint de limpeza ou limpe manualmente no Supabase
3. Faça upload novamente da planilha com os dados reais
4. Os dados válidos serão salvos corretamente

## Verificação

Para verificar se há dados inválidos no banco, você pode executar no SQL Editor do Supabase:

```sql
SELECT id, period 
FROM weekly_data 
WHERE period NOT SIMILAR TO '%[0-9]{1,2}/[0-9]{1,2}%'
  AND period NOT SIMILAR TO '%[0-9]{4}-W[0-9]{1,2}%'
ORDER BY period;
```

Isso mostrará todos os períodos que não seguem o padrão esperado.

