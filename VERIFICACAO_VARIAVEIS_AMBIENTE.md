# 🔍 Verificação de Variáveis de Ambiente - Erro 500

## ⚠️ Erros Encontrados

1. `ERR_NAME_NOT_RESOLVED` - URL do Supabase não resolvida
2. `Erro ao buscar dados do Supabase` - Cliente não configurado
3. `Erro 500 na rota /api/upload` - Supabase não configurado

## ✅ SOLUÇÃO: Configurar Variáveis no Vercel

### Passo 1: Acessar Configurações do Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**

### Passo 2: Adicionar/Verificar Variáveis

Você **DEVE** ter estas 2 variáveis configuradas:

#### 1. `NEXT_PUBLIC_SUPABASE_URL`
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://oawpxualdtfozrnqwpna.supabase.co` (ou sua URL do Supabase)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

#### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** A chave **anon public** do Supabase (NÃO use service_role!)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

### Passo 3: Como Obter a Chave Anônima

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Na seção **"Project API keys"**, copie a chave **"anon public"**
5. ⚠️ **NÃO** use a chave "service_role" (ela é apenas para backend)

### Passo 4: Fazer Redeploy

Após adicionar/atualizar as variáveis:

1. Vá em **Deployments**
2. Clique nos **três pontos** (⋯) do último deploy
3. Selecione **"Redeploy"**
4. Aguarde o deploy concluir (2-3 minutos)

## 🔍 Verificação

Após o redeploy, verifique:

1. ✅ Console do navegador não mostra mais erros de Supabase
2. ✅ A aplicação carrega dados do Supabase
3. ✅ Upload de planilha funciona sem erro 500

## 📋 Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada no Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada no Vercel (chave anon public)
- [ ] Variáveis estão marcadas para todos os ambientes (Production, Preview, Development)
- [ ] Redeploy foi feito após adicionar/atualizar variáveis
- [ ] Aplicação está funcionando sem erros

## 🎯 Resultado Esperado

Após configurar corretamente:

- ✅ Dados carregam do Supabase
- ✅ Upload de planilha funciona
- ✅ Sem erros no console
- ✅ Sem erro 500 na API

