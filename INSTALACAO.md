# Instalação e deploy

## Desenvolvimento local

**Pré-requisitos:** Node.js 18+, npm.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para o dashboard carregar dados localmente, é preciso configurar as variáveis de ambiente (veja seção Variáveis de ambiente).

## Build para produção

```bash
npm run build
npm start
```

## Deploy (Vercel + Supabase)

1. **Supabase**  
   - Crie um projeto no [Supabase](https://supabase.com).  
   - No SQL Editor, execute o conteúdo do arquivo **`supabase-schema.sql`** do projeto (cria a tabela `kpi_weekly_data`).

2. **Vercel**  
   - Conecte o repositório ao [Vercel](https://vercel.com) e faça o deploy.  
   - Em **Settings → Environment Variables** configure (apenas os **nomes** abaixo; os valores você obtém no Supabase e, se usar, na planilha):
     - `NEXT_PUBLIC_SUPABASE_URL` – URL do projeto Supabase
     - `SUPABASE_SERVICE_ROLE_KEY` – chave **service_role** do Supabase (Settings → API)
     - `GOOGLE_SHEETS_URL` – (opcional) URL pública da planilha em formato CSV (`.../pub?output=csv`)

3. **Planilha (opcional)**  
   - Se a tabela `kpi_weekly_data` estiver vazia, a API tenta buscar da planilha (quando `GOOGLE_SHEETS_URL` está definida).  
   - A planilha deve estar publicada (“Qualquer pessoa com o link” pode ver) e a URL deve ser a de exportação CSV, não a de visualização (pubhtml).

4. **Sync manual (opcional)**  
   - `POST /api/sync-sheets` lê a planilha e grava/atualiza no Supabase. Pode ser chamado manualmente ou por um cron.

## Variáveis de ambiente

- **Local:** crie `.env.local` na raiz (não commitar).  
- **Vercel:** use Settings → Environment Variables.

Nomes usados pelo projeto:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_SHEETS_URL` (opcional)

Nunca commite chaves ou URLs reais. Use os valores no Supabase (API) e, se aplicável, na URL pública da planilha.

## Problemas comuns

- **Porta 3000 em uso:** `PORT=3001 npm run dev` ou altere no script `dev` do `package.json`.
- **Erro ao instalar:** Node 18+, `npm cache clean --force`, remova `node_modules` e `package-lock.json` e rode `npm install` de novo.
