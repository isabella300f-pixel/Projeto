# 🔧 Correção - Variável de Ambiente

## ⚠️ Problema Identificado

Você adicionou a variável `NEXT_PUBLIC_SUPABASE_ANON_KEY`, mas parece que usou a chave **"service_role"** ao invés da chave **"anon public"**.

### Como Identificar:

A chave que você colou contém `"service_role"` no meio dela. Isso está **ERRADO** para uso no frontend!

A chave correta deve conter `"anon"` ou `"role":"anon"` no meio.

---

## ✅ SOLUÇÃO: Usar a Chave Correta

### Passo 1: Obter a Chave CORRETA do Supabase

1. Acesse: **https://supabase.com/dashboard**
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Na seção **"Project API keys"**, procure por:
   - ✅ **"anon"** ou **"anon public"** ← ESTA É A CORRETA
   - ❌ **"service_role"** ← NÃO USE ESTA (é para backend apenas)

5. **Copie a chave "anon public"**

### Passo 2: Atualizar no Vercel

1. No Vercel, vá em **Settings** → **Environment Variables**
2. Clique na variável `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. No campo **Value**, **APAGUE** a chave antiga
4. **COLE** a chave **"anon public"** correta
5. Clique em **Save**

### Passo 3: Fazer Novo Deploy

Após salvar, o Vercel fará um novo deploy automaticamente. Aguarde alguns minutos.

---

## 🔍 Como Verificar se a Chave Está Correta

### Chave CORRETA (anon public):
- Contém `"role":"anon"` quando decodificada
- É segura para usar no frontend
- Começa com `eyJhbGc...` (normal)

### Chave ERRADA (service_role):
- Contém `"role":"service_role"` quando decodificada
- ⚠️ **NUNCA** deve ser usada no frontend
- É apenas para operações no backend

---

## 📋 Checklist de Verificação

Após atualizar, verifique:

- [ ] Usei a chave **"anon public"** (não "service_role")
- [ ] A variável está salva no Vercel
- [ ] O deploy foi concluído
- [ ] A aplicação não mostra mais os avisos no console

---

## 🎯 Resultado Esperado

Após corrigir, você deve ver:
- ✅ Sem avisos no console
- ✅ Dados carregando do Supabase
- ✅ Upload de planilhas funcionando

