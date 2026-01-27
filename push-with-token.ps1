# Script para fazer push usando Personal Access Token
# Uso: .\push-with-token.ps1

Write-Host "=== Push para GitHub usando Token ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para usar este script, você precisa de um Personal Access Token do GitHub." -ForegroundColor Yellow
Write-Host ""
Write-Host "Como criar um token:" -ForegroundColor Green
Write-Host "1. Acesse: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "2. Clique em 'Generate new token (classic)'" -ForegroundColor White
Write-Host "3. Dê um nome (ex: 'Legatum Push')" -ForegroundColor White
Write-Host "4. Selecione a permissão 'repo'" -ForegroundColor White
Write-Host "5. Clique em 'Generate token'" -ForegroundColor White
Write-Host "6. COPIE o token (você só verá uma vez!)" -ForegroundColor Red
Write-Host ""

$token = Read-Host "Cole seu Personal Access Token aqui"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Token não fornecido. Cancelando..." -ForegroundColor Red
    exit 1
}

# Configurar remote temporariamente com token
$remoteUrl = "https://$token@github.com/isabella300f-pixel/Projeto.git"
git remote set-url origin $remoteUrl

Write-Host ""
Write-Host "Fazendo push..." -ForegroundColor Cyan
git push origin main

# Restaurar remote original (sem token)
git remote set-url origin https://github.com/isabella300f-pixel/Projeto.git

Write-Host ""
Write-Host "Push concluído!" -ForegroundColor Green

