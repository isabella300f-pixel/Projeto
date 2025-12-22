# 🔧 Troubleshooting - Erro 400 no Upload

## ⚠️ Problema: Erro 400 ao fazer upload

O erro 400 pode ter várias causas. Siga este guia para identificar e resolver.

---

## 🔍 Possíveis Causas e Soluções

### 1. Planilha sem coluna "Período"

**Sintoma:** Erro 400 sem mensagem clara

**Solução:**
- Verifique se a planilha tem uma coluna chamada:
  - "Período"
  - "Period"
  - "Semana"
  - Ou qualquer variação desses nomes
- A coluna deve conter valores no formato: "18/08 a 24/08"

### 2. Planilha vazia ou formato incorreto

**Sintoma:** "Planilha vazia ou formato inválido"

**Solução:**
- Verifique se o arquivo é .xlsx ou .xls
- Abra a planilha e verifique se há dados
- Certifique-se de que a primeira linha contém os cabeçalhos das colunas

### 3. Todos os períodos já existem no banco

**Sintoma:** "Nenhum registro novo para inserir"

**Solução:**
- Isso não é um erro! Significa que todos os períodos da planilha já estão no banco
- Se quiser adicionar novos dados, use períodos diferentes
- Ou limpe o banco de dados se quiser reimportar tudo

### 4. Períodos duplicados na planilha

**Sintoma:** "X período(s) duplicado(s) na planilha"

**Solução:**
- Abra a planilha
- Verifique se há linhas com o mesmo período
- Remova as duplicatas, mantendo apenas uma linha por período

### 5. Problema de conexão com Supabase

**Sintoma:** "Erro ao conectar com o banco de dados"

**Solução:**
- Verifique se as variáveis de ambiente estão configuradas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Faça um redeploy após adicionar as variáveis

---

## 📋 Checklist de Verificação

Antes de fazer upload, verifique:

- [ ] O arquivo é .xlsx ou .xls
- [ ] A planilha tem uma coluna "Período" (ou variação)
- [ ] A coluna Período tem valores válidos (ex: "18/08 a 24/08")
- [ ] Não há períodos duplicados na planilha
- [ ] A planilha tem dados (não está vazia)
- [ ] As variáveis de ambiente estão configuradas no Vercel

---

## 🎯 Como Ver a Mensagem de Erro Completa

1. Abra o console do navegador (F12)
2. Vá na aba "Console"
3. Procure por mensagens de erro
4. Ou verifique a mensagem exibida na tela após o upload falhar

---

## ✅ Teste Rápido

Para testar se o upload está funcionando:

1. Crie uma planilha simples com:
   - Coluna A: "Período" (com valor "01/01 a 07/01")
   - Coluna B: "PA Semanal" (com valor 1000)
   - Coluna C: "N Semana" (com valor 1)

2. Salve como .xlsx

3. Tente fazer upload

4. Se funcionar, o problema está na sua planilha original

---

## 🆘 Ainda com Problemas?

Se ainda estiver com erro 400:

1. **Verifique o console do navegador** (F12 → Console)
2. **Verifique os logs do servidor** (Vercel → Deployments → Logs)
3. **Tente com uma planilha menor** (apenas 1-2 linhas)
4. **Verifique o formato da planilha** (deve ser Excel, não CSV)

---

## 📝 Formato Esperado da Planilha

A planilha deve ter pelo menos estas colunas:

- **Período** (obrigatório)
- **PA Semanal** (ou variações)
- **N Semana** (ou variações)

Outras colunas são opcionais e serão mapeadas automaticamente se existirem.

