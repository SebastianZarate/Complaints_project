require('dotenv').config();
const DatabaseManager = require('../src/database');

async function initializeDatabase() {
    console.log('🔧 ===================================');
    console.log('   INICIALIZANDO BASE DE DATOS MYSQL');
    console.log('🔧 ===================================\n');
    
    const db = new DatabaseManager();
    
    try {
        console.log('📡 Conectando a MySQL...');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Puerto: ${process.env.DB_PORT || 3306}`);
        console.log(`   Base de datos: ${process.env.DB_NAME || 'complaints_boyaca'}`);
        console.log(`   Usuario: ${process.env.DB_USER || 'root'}\n`);

        // Inicializar conexión y crear tablas
        await db.init();
        
        console.log('✅ Base de datos inicializada correctamente');
        
        // Verificar que las tablas se crearon correctamente
        console.log('🔍 Verificando estructura de la base de datos...');
        
        const entidades = await db.getAllEntidades();
        console.log(`✅ Tabla 'entidades' creada con ${entidades.length} registros`);
        
        const quejas = await db.getAllQuejas();
        console.log(`✅ Tabla 'quejas' creada con ${quejas.length} registros`);
        
        // Mostrar algunas entidades de ejemplo
        if (entidades.length > 0) {
            console.log('\n📋 Entidades disponibles:');
            entidades.slice(0, 5).forEach(entidad => {
                console.log(`   • ${entidad.nombre}`);
            });
            if (entidades.length > 5) {
                console.log(`   • ... y ${entidades.length - 5} más`);
            }
        }
        
        // Verificación de salud
        console.log('\n🏥 Ejecutando verificación de salud...');
        const healthStatus = await db.healthCheck();
        
        if (healthStatus) {
            console.log('✅ Verificación de salud exitosa');
        } else {
            console.log('❌ Verificación de salud falló');
        }
        
        console.log('\n🎉 ===================================');
        console.log('   INICIALIZACIÓN COMPLETADA EXITOSAMENTE');
        console.log('🎉 ===================================');
        console.log('💡 Consejos:');
        console.log('   • Ejecuta "npm start" para iniciar el servidor');
        console.log('   • Visita http://localhost:3000/api/health para verificar el estado');
        console.log('   • Usa MySQL Workbench para administrar la base de datos');
        console.log('   • Las quejas son completamente anónimas');
        console.log('=====================================\n');
        
    } catch (error) {
        console.error('\n❌ ===================================');
        console.error('   ERROR DURANTE LA INICIALIZACIÓN');
        console.error('❌ ===================================');
        console.error(`Error: ${error.message}`);
        
        if (error.code) {
            console.error(`Código: ${error.code}`);
        }
        
        console.error('\n🔧 Posibles soluciones:');
        
        switch (error.code) {
            case 'ER_ACCESS_DENIED_ERROR':
                console.error('   • Verifica las credenciales de MySQL en el archivo .env');
                console.error('   • Asegúrate de que el usuario tenga permisos suficientes');
                break;
            case 'ECONNREFUSED':
                console.error('   • Verifica que MySQL esté ejecutándose');
                console.error('   • Revisa la configuración de host y puerto');
                break;
            case 'ER_BAD_DB_ERROR':
                console.error('   • La base de datos no existe, se intentará crear automáticamente');
                break;
            default:
                console.error('   • Revisa la configuración en el archivo .env');
                console.error('   • Verifica que MySQL esté instalado y funcionando');
                console.error('   • Consulta los logs para más detalles');
        }
        
        console.error('\n📋 Configuración requerida en .env:');
        console.error('   DB_HOST=localhost');
        console.error('   DB_PORT=3306');
        console.error('   DB_NAME=complaints_boyaca');
        console.error('   DB_USER=root');
        console.error('   DB_PASSWORD=tu_password_aqui');
        console.error('=====================================\n');
        
        process.exit(1);
    } finally {
        // Cerrar conexión
        await db.close();
    }
}

// Función para mostrar información del sistema
function showSystemInfo() {
    console.log('ℹ️  Información del sistema:');
    console.log(`   • Node.js: ${process.version}`);
    console.log(`   • Plataforma: ${process.platform}`);
    console.log(`   • Arquitectura: ${process.arch}`);
    console.log(`   • Memoria disponible: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`);
    console.log(`   • Directorio: ${process.cwd()}`);
    console.log('');
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    // Mostrar información del sistema
    showSystemInfo();
    
    // Inicializar base de datos
    initializeDatabase().catch(error => {
        console.error('❌ Error crítico:', error);
        process.exit(1);
    });
}

module.exports = initializeDatabase;