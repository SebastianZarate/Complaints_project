const fs = require('fs');
const path = require('path');

function cleanProject() {
    console.log('🧹 Limpiando proyecto...');
    
    const filesToClean = [
        path.join(__dirname, '../data/database.db'),
        path.join(__dirname, '../data/database.db-wal'),
        path.join(__dirname, '../data/database.db-shm'),
        path.join(__dirname, '../logs/app.log')
    ];
    
    filesToClean.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`🗑️  Eliminado: ${path.basename(filePath)}`);
            } catch (error) {
                console.warn(`⚠️  No se pudo eliminar ${path.basename(filePath)}: ${error.message}`);
            }
        }
    });
    
    // Limpiar directorios temporales
    const dirsToClean = [
        path.join(__dirname, '../coverage'),
        path.join(__dirname, '../.nyc_output')
    ];
    
    dirsToClean.forEach(dirPath => {
        if (fs.existsSync(dirPath)) {
            try {
                fs.rmSync(dirPath, { recursive: true, force: true });
                console.log(`📁 Directorio eliminado: ${path.basename(dirPath)}`);
            } catch (error) {
                console.warn(`⚠️  No se pudo eliminar directorio ${path.basename(dirPath)}: ${error.message}`);
            }
        }
    });
    
    console.log('✅ Limpieza completada');
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    cleanProject();
}

module.exports = cleanProject;