# 🔧 Configuração das Variáveis de Ambiente no Vercel

## ⚠️ Importante sobre DataBase_Key

Se você já configurou `DataBase_Key` com a connection string do PostgreSQL, o código tentará extrair a URL do projeto automaticamente. Porém, você **ainda precisa** da chave anônima (anon key) para que tudo funcione completamente.

## ✅ Configuração Recomendada

### Opção 1: Usar apenas DataBase_Key (Funcionalidade Limitada)

Se você quer usar apenas a variável `DataBase_Key`:

1. No Vercel, adicione também:
   - **Nome:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Valor:** A chave anônima do Supabase (veja como obter abaixo)

2. A `DataBase_Key` será usada para extrair a URL do projeto automaticamente

### Opção 2: Usar Variáveis Específicas (Recomendado)

Configure estas 2 variáveis no Vercel:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Valor: `https://oawpxualdtfozrnqwpna.supabase.co` (extraído da sua connection string)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Valor: A chave anônima do Supabase (veja como obter abaixo)

## 📋 Como Obter a Chave Anônima (anon key)

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Settings** → **API**
3. Na seção **Project API keys**, copie a chave **anon public**
4. Cole no Vercel como `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🔄 Como Funciona com DataBase_Key

O código agora:
- Detecta automaticamente se `DataBase_Key` é uma connection string
- Extrai a URL do projeto (ex: `oawpxualdtfozrnqwpna` → `https://oawpxualdtfozrnqwpna.supabase.co`)
- Usa essa URL se `NEXT_PUBLIC_SUPABASE_URL` não estiver configurada
- Ainda precisa da `NEXT_PUBLIC_SUPABASE_ANON_KEY` para funcionar completamente

## ⚠️ Limitações

A connection string do PostgreSQL (`postgresql://...`) é para conexões diretas ao banco de dados, não para o cliente JavaScript do Supabase. Por isso:
- Podemos extrair a URL do projeto dela
- Mas ainda precisamos da chave anônima separadamente
- Sem a chave anônima, o sistema usará dados locais como fallback

## ✅ Verificação

Após configurar:
1. Faça um novo deploy no Vercel
2. Verifique os logs do build
3. Se ainda aparecer avisos, adicione a `NEXT_PUBLIC_SUPABASE_ANON_KEY`
