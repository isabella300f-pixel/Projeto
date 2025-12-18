# 📤 Comandos para Fazer Push para o Git

## Se o repositório já estiver conectado:

```bash
git add .
git commit -m "feat: adiciona integração com Supabase e sistema de upload de planilhas

- Integração completa com Supabase para armazenamento de dados
- Sistema de upload de planilhas Excel (.xlsx, .xls)
- Tipos atualizados para incluir todos os indicadores
- Página de importação em /import
- Botão de importação no dashboard principal
- Suporte a extração de URL da connection string DataBase_Key
- Fallback para dados locais quando Supabase não configurado"

git push
```

## Se ainda não tiver configurado o remote:

```bash
# Adicionar remote (se ainda não tiver)
git remote add origin https://github.com/isabella300f-pixel/Projeto.git

# Verificar remote
git remote -v

# Fazer push
git push -u origin main
```

## Se der erro de branch:

```bash
# Renomear branch para main (se necessário)
git branch -M main

# Fazer push
git push -u origin main
```

