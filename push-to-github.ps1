# Script para fazer push usando Personal Access Token
# Este script configura o remote temporariamente com token e faz o push

Write-Host "=== Push para GitHub usando Token ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este repositório pertence a: isabella300f-pixel" -ForegroundColor Yellow
Write-Host "Você precisa de um Personal Access Token dessa conta." -ForegroundColor Yellow
Write-Host ""
Write-Host "Como criar um token:" -ForegroundColor Green
Write-Host "1. Acesse: https://github.com/settings/tokens/new" -ForegroundColor White
Write-Host "   (Faça login como isabella300f-pixel)" -ForegroundColor Gray
Write-Host "2. Nome: 'Legatum Push'" -ForegroundColor White
Write-Host "3. Expiração: escolha (ex: 90 dias)" -ForegroundColor White
Write-Host "4. Permissões: marque 'repo' (todas as permissões)" -ForegroundColor White
Write-Host "5. Clique em 'Generate token'" -ForegroundColor White
Write-Host "6. COPIE o token (começa com 'ghp_')" -ForegroundColor Red
Write-Host ""

$token = Read-Host "Cole o Personal Access Token aqui"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Token não fornecido. Cancelando..." -ForegroundColor Red
    exit 1
}

# Verificar se o token parece válido
if (-not $token.StartsWith("ghp_")) {
    Write-Host "Aviso: O token geralmente começa com 'ghp_'. Continuando mesmo assim..." -ForegroundColor Yellow
}

# Configurar remote temporariamente com token
$remoteUrl = "https://$token@github.com/isabella300f-pixel/Projeto.git"
Write-Host ""
Write-Host "Configurando remote com token..." -ForegroundColor Cyan
git remote set-url origin $remoteUrl

Write-Host ""
Write-Host "Fazendo push..." -ForegroundColor Cyan
$pushResult = git push origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Push concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Restaurando remote original (sem token)..." -ForegroundColor Cyan
    git remote set-url origin https://github.com/isabella300f-pixel/Projeto.git
    Write-Host "✅ Remote restaurado!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push:" -ForegroundColor Red
    Write-Host $pushResult -ForegroundColor Red
    Write-Host ""
    Write-Host "Restaurando remote original..." -ForegroundColor Cyan
    git remote set-url origin https://github.com/isabella300f-pixel/Projeto.git
    exit 1
}

