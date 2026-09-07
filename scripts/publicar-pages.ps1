# Publica la demo en GitHub Pages: compila y sube la carpeta dist a la rama gh-pages.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\publicar-pages.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
npm run build
if ($LASTEXITCODE -ne 0) { throw "La compilación falló" }
New-Item -ItemType File -Force "dist\.nojekyll" | Out-Null
$remote = (git remote get-url origin)
Push-Location dist
git init -q -b gh-pages
git add -A
git -c user.email=minsait.business.consulting.pe@gmail.com -c user.name="nebernal" commit -q -m "Publicar demo"
git push -f $remote gh-pages
Pop-Location
Remove-Item -Recurse -Force "dist\.git"
Write-Host "Demo publicada en la rama gh-pages."
