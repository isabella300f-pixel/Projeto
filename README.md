# KPI Dashboard - Legathon

Dashboard interativo e navegável para visualização de indicadores e KPIs da Legathon.

## Funcionalidades

- 📊 Visualização de KPIs principais em cards interativos
- 📈 Gráficos de linha e barras para análise temporal
- 🔍 **Busca inteligente** por texto, valores, palavras-chave e datas
- 🎯 **Filtros avançados** por período, mês, performance, faixas de valores
- ⚡ **Filtros rápidos** para acesso rápido a filtros comuns
- 📋 Tabela detalhada com todos os dados e contagem de resultados
- 💰 Indicadores de PA (Prêmio Anual)
- 🎯 Indicadores de N (número de apólices)
- 📅 Visualização de OIs (Oportunidades de Inovação)
- 📊 Estatísticas dos dados filtrados em tempo real

## Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones

## Instalação

1. Instale as dependências:

```bash
npm install
```

2. Execute o servidor de desenvolvimento:

```bash
npm run dev
```

3. Abra [http://localhost:3000](http://localhost:3000) no navegador

## Estrutura do Projeto

```
├── app/
│   ├── layout.tsx       # Layout principal
│   ├── page.tsx         # Página do dashboard
│   └── globals.css      # Estilos globais
├── components/
│   ├── KPICard.tsx      # Card de KPI
│   ├── LineChart.tsx    # Componente de gráfico de linha
│   ├── BarChart.tsx     # Componente de gráfico de barras
│   ├── SearchBar.tsx    # Barra de busca inteligente
│   ├── FilterPanel.tsx  # Painel de filtros avançados
│   └── QuickFilters.tsx # Filtros rápidos
└── lib/
    ├── data.ts          # Dados e funções utilitárias
    ├── filters.ts       # Lógica de filtragem e busca
    └── types.ts         # Tipos TypeScript compartilhados
```

## Uso

### Busca Inteligente
- Clique no ícone de busca no header para abrir a barra de busca
- Digite palavras-chave como: "acima da meta", "agosto", "150000", etc.
- Veja o guia completo em [GUIA_FILTROS.md](GUIA_FILTROS.md)

### Filtros Avançados
- Clique em "Filtros" no header para abrir o painel de filtros
- Filtre por período, mês, performance, faixas de valores
- Combine múltiplos filtros para análises específicas

### Filtros Rápidos
- Use os botões de filtros rápidos para acesso imediato a filtros comuns
- Filtre por performance acima/abaixo da meta com um clique

### Navegação
- Selecione um período específico para ver detalhes de uma semana
- Use "Todos os Períodos" para ver a evolução completa ao longo do tempo
- Navegue pelos gráficos interativos para ver detalhes ao passar o mouse
- Consulte a tabela no final para dados detalhados

## Documentação Adicional

- **[GUIA_FILTROS.md](GUIA_FILTROS.md)** - Guia completo de uso dos filtros e busca
- **[INSTALACAO.md](INSTALACAO.md)** - Guia detalhado de instalação

## Build para Produção

```bash
npm run build
npm start
```

