# Script para ejecutar tests de funcionalidades en Windows
Write-Host "🧪 Iniciando Tests de Funcionalidades del Sistema de Quejas" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configurar variables de entorno
$env:NODE_ENV = "test"

# Verificar que Node.js esté disponible
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no encontrado. Por favor instala Node.js" -ForegroundColor Red
    exit 1
}

# Verificar que npm esté disponible
try {
    $npmVersion = npm --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Verificando dependencias..." -ForegroundColor Yellow

# Verificar que las dependencias estén instaladas
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "🚀 Ejecutando tests de funcionalidades..." -ForegroundColor Green
Write-Host ""

# Ejecutar los tests
try {
    npm run test:funcionalidades
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Tests completados exitosamente" -ForegroundColor Green
        Write-Host "📊 Revisa los resultados arriba para ver el estado de cada funcionalidad" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Tests fallaron con código: $exitCode" -ForegroundColor Red
        Write-Host "💡 Verifica que:" -ForegroundColor Yellow
        Write-Host "   - Docker esté corriendo con: docker-compose ps" -ForegroundColor White
        Write-Host "   - La base de datos esté disponible" -ForegroundColor White
        Write-Host "   - Las dependencias estén instaladas: npm install" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Error ejecutando tests: $_" -ForegroundColor Red
}

Write-Host ""
