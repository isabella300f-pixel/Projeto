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

## Scripts

- `npm run dev` – desenvolvimento
- `npm run build` – build de produção
- `npm run start` – servidor de produção
- `npm run lint` – linter
