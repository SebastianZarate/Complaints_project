const fs = require('fs');
const path = require('path');
const Database = require('../src/database');

async function initializeDatabase() {
    console.log('🔧 Inicializando base de datos...');
    
    try {
        // Limpiar base de datos existente si está corrupta
        const dbPath = path.join(__dirname, '../data/database.db');
        
        if (fs.existsSync(dbPath)) {
            console.log('🗑️  Eliminando base de datos existente...');
            fs.unlinkSync(dbPath);
        }

        // Asegurar que el directorio data existe
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('📁 Directorio data/ creado');
        }

        // Inicializar nueva base de datos
        const db = new Database();
        await db.init();
        
        console.log('✅ Base de datos inicializada correctamente');
        
        // Verificar que las tablas se crearon
        await db.healthCheck();
        console.log('✅ Verificación de salud exitosa');
        
        // Cerrar conexión
        await db.close();
        
        console.log('🎉 Inicialización completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
        process.exit(1);
    }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;