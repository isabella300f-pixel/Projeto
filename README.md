# KPI Dash - Legatum

Dashboard de indicadores e KPIs (PA, N, OIs, RECS, revisitas, produtividade, etc.) com dados vindos do **Supabase** e, quando a base está vazia, da **planilha Google Sheets** (exportação CSV).

## Resumo da aplicação

- **Cards** de PA acumulado no ano, N acumulado, média PA semanal, média N semanal
- **Gráficos** de linha e barras por período (PA, N, OIs, RECS, atrasos, inadimplência, revisitas, produtividade)
- **Filtros rápidos** (acima/abaixo da meta PA e N, últimos 30 dias) e **painel de filtros** (período, mês, faixas)
- **Busca** por texto, valores e palavras-chave
- **Tabela** “Dados Detalhados” com todos os indicadores por período
- **Atualização**: dados carregados do Supabase; se a tabela estiver vazia, a API busca da planilha (CSV), grava no Supabase e devolve. Botão “Atualizar dados” e refresh a cada 30 s.

## Tecnologias

- Next.js 14, TypeScript, Tailwind CSS, Recharts, Lucide React
- Supabase (armazenamento), Google Sheets (fonte opcional via CSV)

## Instalação

```bash
git clone <url-do-repositorio>
cd Projeto
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

Para produção (Supabase + Vercel e opcionalmente planilha), veja [INSTALACAO.md](INSTALACAO.md).

## Estrutura principal

- `app/page.tsx` – página do dashboard
- `app/api/kpi/route.ts` – API que lê do Supabase (ou da planilha se vazio)
- `app/api/google-sheets/route.ts` – leitura da planilha em CSV
- `lib/filters.ts` – filtros e busca
- `lib/types.ts` – tipos compartilhados
- `supabase-schema.sql` – script da tabela `kpi_weekly_data`

## Validação de dados (Planilha ↔ Supabase ↔ Dashboard)

- **Fonte**: Dashboard usa apenas dados da API `/api/kpi`, que lê do **Supabase** (`kpi_weekly_data`). Se a tabela estiver vazia, a API puxa da planilha (CSV), calcula campos derivados, grava no Supabase e devolve.
- **Colunas da planilha**: Cada **linha** é um indicador (ex.: "PA semanal realizado", "OIs realizadas na semana"); cada **coluna** é um período ("18/08 a 24/08", etc.). O mapeamento nome-do-indicador → campo está em `app/api/google-sheets/route.ts` (`indicatorFieldMap`).
- **% OIs Realizadas**: Não existe linha na planilha com esse nome; o valor é **calculado** como `(OIs realizadas / Meta OIs agendadas) * 100` (ou, se meta não estiver preenchida, `OIs realizadas / OIs agendadas`). Esse cálculo é feito ao ler da planilha e ao ler do Supabase (mapper e API), para que o gráfico "% OIs Realizadas" mostre valores corretos mesmo quando `percentual_ois_realizadas` estiver zerado na base.
- **Novas colunas (semanas)**: Ao adicionar novas colunas de período na planilha (ex.: "02/02 a 08/02"), a leitura da planilha já detecta **todas** as colunas cujo cabeçalho está no formato "DD/MM a DD/MM". O botão **"Atualizar dados"** no dashboard sincroniza a planilha com o Supabase e recarrega os dados (incluindo novas semanas); use-o após alterar a planilha.

## Scripts

- `npm run dev` – desenvolvimento
- `npm run build` – build de produção
- `npm run start` – servidor de produção
- `npm run lint` – linter
