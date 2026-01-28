# KPI Dashboard - Legathon

Dashboard interativo e navegável para visualização de indicadores e KPIs da Legathon com **atualização em tempo real via Google Sheets**.

## 🚀 Funcionalidades

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
- 🔄 **Atualização automática em tempo real** via Google Sheets (a cada 30 segundos)

## 🛠️ Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones
- **Google Sheets API** - Fonte de dados em tempo real

## 📦 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/isabella300f-pixel/Projeto.git
cd Projeto
```

2. Instale as dependências:

```bash
npm install
```

3. Execute o servidor de desenvolvimento:

```bash
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000) no navegador

## 📊 Integração com Google Sheets

O dashboard está conectado diretamente a uma planilha do Google Sheets publicada, permitindo:

- ✅ **Atualização automática**: Dados são atualizados a cada 30 segundos
- ✅ **Sem configuração de banco**: Não precisa de Supabase ou banco de dados
- ✅ **Fácil manutenção**: Basta atualizar a planilha do Google Sheets
- ✅ **Tempo real**: Mudanças aparecem automaticamente no dashboard

### Configuração da Planilha

A URL da planilha está configurada em `app/api/google-sheets/route.ts`. Para usar outra planilha:

1. Publique sua planilha do Google Sheets (Arquivo > Compartilhar > Publicar na Web)
2. Selecione o formato CSV
3. Copie a URL gerada
4. Atualize a constante `GOOGLE_SHEETS_URL` no arquivo `app/api/google-sheets/route.ts`

Veja mais detalhes em [INTEGRACAO_GOOGLE_SHEETS.md](INTEGRACAO_GOOGLE_SHEETS.md)

## 📁 Estrutura do Projeto

```
├── app/
│   ├── api/
│   │   └── google-sheets/
│   │       └── route.ts      # API para buscar dados do Google Sheets
│   ├── layout.tsx            # Layout principal
│   ├── page.tsx              # Página do dashboard
│   └── globals.css           # Estilos globais
├── components/
│   ├── KPICard.tsx           # Card de KPI
│   ├── LineChart.tsx         # Componente de gráfico de linha
│   ├── BarChart.tsx          # Componente de gráfico de barras
│   ├── SearchBar.tsx         # Barra de busca inteligente
│   ├── FilterPanel.tsx       # Painel de filtros avançados
│   └── QuickFilters.tsx      # Filtros rápidos
└── lib/
    ├── data.ts               # Dados locais (fallback)
    ├── filters.ts            # Lógica de filtragem e busca
    └── types.ts              # Tipos TypeScript compartilhados
```

## 🎯 Uso

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

## 📚 Documentação Adicional

- **[GUIA_FILTROS.md](GUIA_FILTROS.md)** - Guia completo de uso dos filtros e busca
- **[INSTALACAO.md](INSTALACAO.md)** - Guia detalhado de instalação
- **[INTEGRACAO_GOOGLE_SHEETS.md](INTEGRACAO_GOOGLE_SHEETS.md)** - Documentação da integração com Google Sheets

## 🚀 Build para Produção

```bash
npm run build
npm start
```

## 🌐 Deploy no Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente (se necessário)
3. Faça o deploy automático

O dashboard funcionará automaticamente com a planilha do Google Sheets configurada.

## 📝 Indicadores Suportados

O dashboard suporta **34 indicadores** organizados em categorias:

- **PA (Prêmio Anual)**: 7 indicadores
- **N (Número de Apólices)**: 7 indicadores
- **OIs (Oportunidades de Inovação)**: 3 indicadores
- **RECS**: 2 indicadores
- **PCs/C2**: 3 indicadores
- **Atrasos**: 2 indicadores
- **Inadimplência**: 2 indicadores
- **Revisitas**: 3 indicadores
- **Produtividade**: 4 indicadores
- **Outros**: 3 indicadores

## 🔧 Desenvolvimento

### Requisitos
- Node.js 18+
- npm ou yarn

### Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Cria build de produção
npm run start    # Inicia servidor de produção
npm run lint     # Executa linter
```

## 📄 Licença

Este projeto é privado e propriedade da Legathon.
