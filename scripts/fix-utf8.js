#!/usr/bin/env node

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixUTF8Encoding() {
    console.log('🔧 =======================================');
    console.log('   CORRIGIENDO CODIFICACIÓN UTF-8');
    console.log('🔧 =======================================\n');
    
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3307, // Puerto externo de Docker
        user: process.env.DB_USER || 'complaints_user',
        password: process.env.DB_PASSWORD || 'secure_password_2024',
        database: process.env.DB_NAME || 'complaints_boyaca',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci'
    };

    let connection;
    
    try {
        console.log('📡 Conectando a MySQL...');
        connection = await mysql.createConnection(config);
        
        console.log('🔧 Configurando codificación de sesión...');
        await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
        await connection.execute('SET CHARACTER SET utf8mb4');
        
        console.log('🔧 Corrigiendo codificación de la base de datos...');
        await connection.execute(`ALTER DATABASE ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        
        console.log('🔧 Corrigiendo codificación de la tabla entidades...');
        await connection.execute('ALTER TABLE entidades CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        
        console.log('🔧 Corrigiendo codificación de la tabla quejas...');
        await connection.execute('ALTER TABLE quejas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        
        console.log('🔍 Verificando entidades...');
        const [entidades] = await connection.execute('SELECT id, nombre FROM entidades ORDER BY id');
        
        console.log('✅ Entidades en la base de datos:');
        entidades.forEach((entidad, index) => {
            console.log(`   ${index + 1}. ${entidad.nombre} (ID: ${entidad.id})`);
        });
        
        console.log('\n✅ Codificación UTF-8 corregida exitosamente!');
        console.log('💡 Reinicia tu aplicación para ver los cambios.');
        
    } catch (error) {
        console.error('❌ Error corrigiendo codificación:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('💡 Verifica las credenciales en el archivo .env');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('💡 Verifica que MySQL esté corriendo: docker-compose ps');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar el script
fixUTF8Encoding();
