# 📋 Guia Passo a Passo - Configurar Variável no Vercel

## 🎯 Objetivo
Adicionar a variável `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Vercel para que a aplicação se conecte ao Supabase.

---

## 📍 PASSO 1: Obter a Chave Anônima do Supabase

### 1.1 Acessar o Supabase
1. Abra seu navegador
2. Acesse: **https://supabase.com/dashboard**
3. Faça login se necessário

### 1.2 Selecionar o Projeto
1. Na lista de projetos, clique no projeto que contém `oawpxualdtfozrnqwpna`
2. Ou procure pelo nome do seu projeto

### 1.3 Ir para Settings → API
1. No menu lateral esquerdo, procure por **"Settings"** (ícone de engrenagem ⚙️)
2. Clique em **"Settings"**
3. No submenu que aparece, clique em **"API"**

### 1.4 Copiar a Chave Anônima
1. Na página de API, procure a seção **"Project API keys"**
2. Você verá várias chaves listadas
3. Procure pela chave chamada **"anon public"** ou **"anon"**
4. Ao lado da chave, haverá um ícone de **copiar** (📋)
5. **Clique no ícone de copiar** para copiar a chave
6. A chave será algo como:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hd3B4dWFsZHRmb3pybnF3cG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1Njg5MjMsImV4cCI6MjA1MDE0NDkyM30.abc123def456...
   ```
   (É uma string muito longa)

---

## 📍 PASSO 2: Adicionar no Vercel

### 2.1 Acessar Environment Variables
1. Você já está na tela correta! (Environment Variables)
2. Se não estiver, vá em:
   - **Settings** → **Environment Variables**

### 2.2 Criar Nova Variável
1. Procure o botão **"Add New"** ou **"+"** ou **"Create"**
   - Geralmente está no canto superior direito
   - Ou acima da lista de variáveis existentes

2. **Clique no botão** para criar uma nova variável

### 2.3 Preencher os Campos

#### Campo 1: **Name** (Nome)
```
Digite exatamente: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
⚠️ **IMPORTANTE:** 
- Deve ser EXATAMENTE assim (maiúsculas e minúsculas)
- Não pode ter espaços
- Não pode ter erros de digitação

#### Campo 2: **Value** (Valor)
```
Cole a chave anônima que você copiou do Supabase
```
- Clique no campo
- Cole a chave (Ctrl+V ou Cmd+V)
- A chave será muito longa, isso é normal

#### Campo 3: **Environments** (Ambientes)
```
Selecione: "All Environments"
```
- Ou selecione os ambientes que você quer (Production, Preview, Development)
- Recomendado: "All Environments" para funcionar em todos

#### Campo 4: **Comment** (Comentário) - OPCIONAL
```
Você pode escrever: "Chave anônima do Supabase para conexão com o banco de dados"
```
- Este campo é opcional
- Ajuda a lembrar para que serve a variável

### 2.4 Salvar
1. Verifique se todos os campos estão preenchidos corretamente
2. Clique no botão **"Save"** (geralmente no canto inferior direito)
3. Aguarde alguns segundos

---

## 📍 PASSO 3: Verificar

### 3.1 Verificar se Apareceu na Lista
1. Após salvar, você deve ver duas variáveis na lista:
   - ✅ `DataBase_Key` (já existente)
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (nova)

### 3.2 Verificar o Deploy
1. O Vercel fará um **novo deploy automaticamente**
2. Você pode verificar em:
   - **Deployments** (no menu lateral)
   - Ou aguardar alguns minutos

### 3.3 Testar a Aplicação
1. Após o deploy, acesse sua aplicação
2. Vá para a página `/import`
3. Tente fazer upload de uma planilha
4. Se funcionar, está tudo certo! ✅

---

## 🎨 Visualização dos Campos

Quando você clicar em "Add New", verá algo assim:

```
┌─────────────────────────────────────────┐
│  Add Environment Variable                │
├─────────────────────────────────────────┤
│                                         │
│  Name:                                  │
│  [NEXT_PUBLIC_SUPABASE_ANON_KEY      ] │
│                                         │
│  Value:                                 │
│  [eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 │
│   .eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...] │
│                                         │
│  Environments:                          │
│  [All Environments ▼]                   │
│                                         │
│  Comment: (opcional)                    │
│  [Chave anônima do Supabase...        ] │
│                                         │
│                    [Cancel]  [Save]     │
└─────────────────────────────────────────┘
```

---

## ⚠️ Problemas Comuns

### Problema 1: Não encontro o botão "Add New"
**Solução:** 
- Procure por um botão com ícone de **"+"** ou **"Create"**
- Ou um botão escrito **"Add Variable"**

### Problema 2: A chave não funciona
**Solução:**
- Verifique se copiou a chave **"anon public"** (não a "service_role")
- Verifique se não há espaços extras no início ou fim
- Verifique se o nome está exatamente: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Problema 3: Não sei qual projeto no Supabase
**Solução:**
- O Project ID está na sua connection string: `oawpxualdtfozrnqwpna`
- Procure por um projeto que tenha esse ID no nome ou URL

---

## ✅ Checklist Final

Antes de finalizar, verifique:

- [ ] Copiei a chave **"anon public"** do Supabase
- [ ] O nome da variável está exatamente: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Colei a chave completa no campo Value
- [ ] Selecionei "All Environments"
- [ ] Cliquei em "Save"
- [ ] A variável apareceu na lista
- [ ] O deploy foi iniciado automaticamente

---

## 🎉 Pronto!

Após completar esses passos, sua aplicação estará 100% funcional!

**Tempo estimado:** 5-10 minutos

**Dúvidas?** Verifique se seguiu todos os passos acima.

