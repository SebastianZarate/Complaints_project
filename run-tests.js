#!/usr/bin/env node

console.log('🧪 Iniciando Tests de Funcionalidades del Sistema de Quejas');
console.log('================================================');
console.log('');

const { spawn } = require('child_process');

// Configurar variables de entorno
process.env.NODE_ENV = 'test';

// Verificar que Docker esté corriendo (para la base de datos)
console.log('🔍 Verificando estado del sistema...');

const testProcess = spawn('npm', ['run', 'test:funcionalidades'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
});

testProcess.on('close', (code) => {
    console.log('');
    console.log('================================================');
    if (code === 0) {
        console.log('✅ Tests completados exitosamente');
        console.log('📊 Revisa los resultados arriba para ver el estado de cada funcionalidad');
    } else {
        console.log('❌ Tests fallaron con código:', code);
        console.log('💡 Verifica que:');
        console.log('   - Docker esté corriendo con: docker-compose ps');
        console.log('   - La base de datos esté disponible');
        console.log('   - Las dependencias estén instaladas: npm install');
    }
    console.log('');
});

testProcess.on('error', (error) => {
    console.error('❌ Error ejecutando tests:', error.message);
});
