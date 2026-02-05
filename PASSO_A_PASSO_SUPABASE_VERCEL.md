# Passo a passo: Supabase + Vercel + Google Sheets

Depois das alterações no código, siga estes passos para o dashboard atualizar automaticamente pelo Supabase e conectar com o Google Sheets.

---

## 1. Instalar dependência do Supabase (local)

No projeto, rode:

```bash
npm install
```

Isso instala `@supabase/supabase-js` já adicionado no `package.json`.

---

## 2. Criar a tabela no Supabase

1. Acesse o [Supabase](https://supabase.com) e abra o projeto (URL: `https://ficdejjcoiwfogotisxv.supabase.co`).
2. No menu lateral: **SQL Editor** → **New query**.
3. Abra o arquivo **`supabase-schema.sql`** na raiz do projeto, copie todo o conteúdo e cole no editor do Supabase.
4. Clique em **Run** (ou Ctrl+Enter).
5. Confirme que a tabela **`kpi_weekly_data`** aparece em **Table Editor**.

---

## 3. Popular a tabela (só com dados da planilha)

**Toda a população do Supabase vem da planilha do Google Sheets.** Não há dados de exemplo.

### Como popular

1. **Publique a planilha** no Google Sheets: Arquivo → Compartilhar → “Qualquer pessoa com o link” (pelo menos “Ver”) e use a aba que tem os indicadores nas linhas e os períodos nas colunas.
2. **Configure a URL da planilha** em **`app/api/google-sheets/route.ts`** (variável `GOOGLE_SHEETS_URL`) ou defina a variável **`GOOGLE_SHEETS_URL`** no Vercel. Use a **exportação em CSV**, não a de visualização: se o link for `.../pubhtml`, use `.../pub?output=csv` (mesmo ID do documento). Exemplo: `https://docs.google.com/spreadsheets/d/e/2PACX-xxx/pub?output=csv`.
3. Quando a tabela **kpi_weekly_data** estiver vazia, ao **abrir o dashboard** ou clicar em **Atualizar dados**, a API:
   - Busca os dados da planilha (GET /api/google-sheets),
   - Grava/atualiza no Supabase (upsert por período),
   - Devolve os dados para o dashboard.
4. **Alternativa (sync manual):** chame **POST** `https://seu-app.vercel.app/api/sync-sheets` (ou `/api/sync-sheets` em local). Isso lê o Google Sheets e faz upsert na tabela **kpi_weekly_data**.

Se a planilha não carregar (ex.: URL errada ou planilha não publicada), a mensagem abaixo do header mostrará o erro. **Nota:** O app não chama a própria API por HTTP; a rota KPI chama a lógica do Google Sheets diretamente, evitando 401 por proteção de deploy na Vercel.

**Garantia:** Todos os gráficos e toda a aplicação populam **apenas** com dados atualizados da base (Supabase). Não há dados de exemplo ou fallback: cards, indicadores, tabela e gráficos vêm exclusivamente do `GET /api/kpi` (Supabase ou, se vazio, Google Sheets → upsert no Supabase).

---

## 4. Variáveis de ambiente no Vercel

No [Vercel](https://vercel.com): projeto → **Settings** → **Environment Variables**. Adicione:

| Nome | Valor | Observação |
|------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ficdejjcoiwfogotisxv.supabase.co` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | *(sua chave **service_role**)* | Em Supabase: **Settings** → **API** → **Project API keys** → **service_role** (reveal e copie) |

- **NÃO** use a chave **anon public** no lugar da **service_role** para essa API.
- Se você já expôs a **service_role** em algum lugar, troque ela no Supabase (**Settings** → **API** → **Reset** da service_role) e atualize no Vercel.

Opcional, só se for usar sync em produção:

| Nome | Valor |
|------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://seu-dominio.vercel.app` |

Depois de salvar, faça um novo **Deploy** para as variáveis valerem.

---

## 5. Variáveis de ambiente local (`.env.local`)

Na raiz do projeto, crie **`.env.local`** (não commitar):

```env
NEXT_PUBLIC_SUPABASE_URL=https://ficdejjcoiwfogotisxv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
```

Use a **service_role** do Supabase (Settings → API → service_role). Assim o `npm run dev` consegue ler/gravar no Supabase.

---

## 6. Fluxo do dashboard e do Sheets

- **Ao abrir ou atualizar a página**  
  O front chama **GET /api/kpi**, que lê da tabela **kpi_weekly_data** no Supabase. Os gráficos e KPIs passam a usar esses dados.

- **Quando quiser atualizar a partir do Google Sheets**  
  1. Atualize a planilha no Google Sheets.  
  2. Chame **POST /api/sync-sheets** (local: `http://localhost:3000/api/sync-sheets` ou em produção: `https://seu-app.vercel.app/api/sync-sheets`).  
  3. Na próxima abertura ou atualização da página, o dashboard já mostra os dados novos do Supabase.

Você pode automatizar o **POST /api/sync-sheets** com um cron (ex.: Vercel Cron) ou rodar manualmente quando atualizar a planilha.

---

## 7. Resumo do que fazer após as alterações no código

1. Rodar **`npm install`** (instala Supabase).
2. No Supabase: executar o **`supabase-schema.sql`** no SQL Editor.
3. Popular **kpi_weekly_data** (manual ou via **POST /api/sync-sheets** depois de configurar `.env.local`).
4. Configurar **Vercel**: `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
5. Configurar **`.env.local`** com as mesmas chaves para desenvolvimento.
6. Fazer deploy no Vercel e testar abrindo/atualizando a página; os gráficos devem atualizar sozinhos a partir do Supabase.

---

## Segurança

- **Nunca** commite **`.env.local`** nem coloque a **service_role** no front-end.
- Se a **service_role** tiver sido exposta, troque-a no Supabase e atualize no Vercel e no `.env.local`.
