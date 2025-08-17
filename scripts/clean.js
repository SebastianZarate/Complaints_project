const fs = require('fs');
const path = require('path');

function cleanProject() {
    console.log('🧹 ===================================');
    console.log('   LIMPIANDO PROYECTO');
    console.log('🧹 ===================================\n');
    
    // Archivos a eliminar (ya no incluye archivos SQLite)
    const filesToClean = [
        path.join(__dirname, '../logs/app.log'),
        path.join(__dirname, '../logs/error.log'),
        path.join(__dirname, '../logs/access.log')
    ];
    
    console.log('🗑️  Eliminando archivos temporales...');
    filesToClean.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`   ✅ Eliminado: ${path.basename(filePath)}`);
            } catch (error) {
                console.warn(`   ⚠️  No se pudo eliminar ${path.basename(filePath)}: ${error.message}`);
            }
        } else {
            console.log(`   ℹ️  No existe: ${path.basename(filePath)}`);
        }
    });
    
    // Limpiar directorios temporales
    const dirsToClean = [
        path.join(__dirname, '../coverage'),
        path.join(__dirname, '../.nyc_output'),
        path.join(__dirname, '../node_modules/.cache'),
        path.join(__dirname, '../.jest-cache')
    ];
    
    console.log('\n📁 Eliminando directorios temporales...');
    dirsToClean.forEach(dirPath => {
        if (fs.existsSync(dirPath)) {
            try {
                fs.rmSync(dirPath, { recursive: true, force: true });
                console.log(`   ✅ Directorio eliminado: ${path.basename(dirPath)}`);
            } catch (error) {
                console.warn(`   ⚠️  No se pudo eliminar directorio ${path.basename(dirPath)}: ${error.message}`);
            }
        } else {
            console.log(`   ℹ️  No existe: ${path.basename(dirPath)}`);
        }
    });
    
    // Crear directorios necesarios si no existen
    const dirsToCreate = [
        path.join(__dirname, '../logs'),
        path.join(__dirname, '../data')
    ];
    
    console.log('\n📂 Creando directorios necesarios...');
    dirsToCreate.forEach(dirPath => {
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`   ✅ Directorio creado: ${path.basename(dirPath)}`);
            } catch (error) {
                console.warn(`   ⚠️  No se pudo crear directorio ${path.basename(dirPath)}: ${error.message}`);
            }
        } else {
            console.log(`   ℹ️  Ya existe: ${path.basename(dirPath)}`);
        }
    });
    
    console.log('\n✅ ===================================');
    console.log('   LIMPIEZA COMPLETADA');
    console.log('✅ ===================================');
    console.log('💡 Notas importantes:');
    console.log('   • Los datos de MySQL NO se eliminan con este script');
    console.log('   • Para limpiar la base de datos, usa herramientas MySQL');
    console.log('   • Solo se eliminan archivos temporales del proyecto');
    console.log('=====================================\n');
}

// Función para limpiar datos de MySQL (opcional)
async function cleanMySQLData() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('⚠️  ¿Deseas también limpiar los datos de MySQL? (y/N): ', async (answer) => {
            rl.close();
            
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                try {
                    console.log('\n🗄️  Limpiando datos de MySQL...');
                    
                    const DatabaseManager = require('../src/database');
                    const db = new DatabaseManager();
                    
                    await db.init();
                    
                    // Limpiar solo las quejas, mantener entidades
                    await db.connection.execute('DELETE FROM quejas');
                    console.log('   ✅ Quejas eliminadas');
                    
                    // Reiniciar auto-increment
                    await db.connection.execute('ALTER TABLE quejas AUTO_INCREMENT = 1');
                    console.log('   ✅ Contador reiniciado');
                    
                    await db.close();
                    console.log('✅ Datos de MySQL limpiados exitosamente\n');
                    
                } catch (error) {
                    console.error('❌ Error limpiando datos de MySQL:', error.message);
                }
            } else {
                console.log('ℹ️  Datos de MySQL mantenidos intactos\n');
            }
            resolve();
        });
    });
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const includeDatabase = args.includes('--db') || args.includes('--database');
    
    cleanProject();
    
    if (includeDatabase) {
        cleanMySQLData().catch(error => {
            console.error('❌ Error en limpieza de base de datos:', error);
            process.exit(1);
        });
    }
}

module.exports = cleanProject;