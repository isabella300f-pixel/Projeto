# Guia de Instalação - KPI Dashboard

## Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn instalado

## Passo a Passo

### 1. Instalar Dependências

No terminal, na pasta do projeto, execute:

```bash
npm install
```

Isso instalará todas as dependências necessárias:
- Next.js (framework React)
- React
- Recharts (gráficos)
- Tailwind CSS (estilização)
- TypeScript
- E outras dependências de desenvolvimento

### 2. Executar o Projeto em Modo de Desenvolvimento

```bash
npm run dev
```

O dashboard estará disponível em: **http://localhost:3000**

### 3. Construir para Produção

Para criar uma versão otimizada para produção:

```bash
npm run build
npm start
```

## Estrutura de Dados

Os dados estão localizados em `lib/data.ts`. Para atualizar os dados:

1. Abra o arquivo `lib/data.ts`
2. Atualize o array `weeklyData` com os novos valores
3. Mantenha a estrutura `WeeklyData` conforme definida no arquivo

## Atualizando Dados da Planilha do Google Sheets

Atualmente os dados estão hardcoded. Para integrar com a planilha do Google Sheets:

1. Configure a API do Google Sheets
2. Crie uma função para buscar dados automaticamente
3. Atualize `lib/data.ts` para buscar dados dinamicamente

Ou você pode exportar os dados da planilha como CSV/JSON e importá-los no código.

## Personalização

- **Cores**: Edite `tailwind.config.js` para personalizar as cores do tema
- **Gráficos**: Modifique os componentes em `components/` para alterar estilos e tipos de gráficos
- **Layout**: Edite `app/page.tsx` para reorganizar os componentes

## Problemas Comuns

### Erro ao instalar dependências
- Certifique-se de estar usando Node.js 18+
- Tente limpar o cache: `npm cache clean --force`
- Delete `node_modules` e `package-lock.json` e tente novamente

### Porta 3000 já em uso
- Altere a porta: `PORT=3001 npm run dev`
- Ou configure no `package.json`: `"dev": "next dev -p 3001"`

## Suporte

Para dúvidas ou problemas, consulte a documentação do Next.js: https://nextjs.org/docs

