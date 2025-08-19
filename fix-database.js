require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDatabase() {
    console.log('🔧 ARREGLANDO PROBLEMAS DE BASE DE DATOS');
    console.log('==========================================');
    
    // Conectar como root para arreglar permisos
    const rootConfig = {
        host: 'localhost',
        port: 3307,
        user: 'root',
        password: process.env.MYSQL_ROOT_PASSWORD || 'root_password_2024',
        database: process.env.DB_NAME || 'complaints_boyaca',
        multipleStatements: true
    };
    
    try {
        console.log('🔌 Conectando como root...');
        const connection = await mysql.createConnection(rootConfig);
        console.log('✅ Conexión exitosa como root');
        
        // 1. Arreglar permisos del usuario complaints_user
        console.log('\n🔐 Arreglando permisos de usuario...');
        
        const dbUser = process.env.DB_USER || 'complaints_user';
        const dbPassword = process.env.DB_PASSWORD || 'secure_password_2024';
        const dbName = process.env.DB_NAME || 'complaints_boyaca';
        
        // Eliminar usuario si existe y recrearlo
        await connection.execute(`DROP USER IF EXISTS '${dbUser}'@'%'`);
        await connection.execute(`DROP USER IF EXISTS '${dbUser}'@'localhost'`);
        
        // Crear usuario con permisos desde cualquier host
        await connection.execute(`CREATE USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`);
        await connection.execute(`GRANT ALL PRIVILEGES ON ${dbName}.* TO '${dbUser}'@'%'`);
        await connection.execute(`FLUSH PRIVILEGES`);
        
        console.log(`✅ Usuario '${dbUser}' creado con permisos completos`);
        
        // 2. Verificar estructura de tablas
        console.log('\n📋 Verificando estructura de tablas...');
        
        const [tables] = await connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
        `, [dbName]);
        
        console.log('Tablas encontradas:', tables.map(t => t.table_name || t.TABLE_NAME));
        
        // 3. Verificar que la tabla quejas tenga la estructura correcta
        const [columns] = await connection.execute(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = ? AND table_name = 'quejas'
            ORDER BY ordinal_position
        `, [dbName]);
        
        console.log('\n📝 Estructura de tabla quejas:');
        columns.forEach(col => {
            console.log(`   • ${col.column_name || col.COLUMN_NAME}: ${col.data_type || col.DATA_TYPE}`);
        });
        
        // 4. Insertar una queja de prueba para verificar funcionamiento
        console.log('\n🧪 Insertando queja de prueba...');
        
        const [insertResult] = await connection.execute(`
            INSERT INTO quejas (entidad_id, descripcion, estado, ip_origen, user_agent) 
            VALUES (1, 'Queja de prueba insertada directamente en MySQL para verificar funcionamiento', 'pendiente', '127.0.0.1', 'Debug Script')
        `);
        
        console.log(`✅ Queja de prueba insertada con ID: ${insertResult.insertId}`);
        
        // 5. Verificar que se insertó correctamente
        const [testQuejas] = await connection.execute('SELECT COUNT(*) as total FROM quejas');
        console.log(`📊 Total de quejas después de inserción: ${testQuejas[0].total}`);
        
        // 6. Mostrar la queja insertada
        const [nuevaQueja] = await connection.execute(`
            SELECT q.id, e.nombre as entidad, q.descripcion, q.estado, q.created_at
            FROM quejas q 
            INNER JOIN entidades e ON q.entidad_id = e.id 
            ORDER BY q.created_at DESC 
            LIMIT 1
        `);
        
        if (nuevaQueja.length > 0) {
            console.log('\n📄 Última queja insertada:');
            const queja = nuevaQueja[0];
            console.log(`   • ID: ${queja.id}`);
            console.log(`   • Entidad: ${queja.entidad}`);
            console.log(`   • Estado: ${queja.estado}`);
            console.log(`   • Fecha: ${queja.created_at}`);
        }
        
        await connection.end();
        
        console.log('\n✅ PROBLEMAS SOLUCIONADOS:');
        console.log('==========================================');
        console.log('1. ✅ Usuario complaints_user recreado con permisos completos');
        console.log('2. ✅ Tabla quejas verificada y funcionando');
        console.log('3. ✅ Queja de prueba insertada exitosamente');
        console.log('\n🔄 PRÓXIMOS PASOS:');
        console.log('1. Reinicia tu aplicación Docker');
        console.log('2. Prueba crear una nueva queja desde la web');
        console.log('3. Verifica en MySQL Workbench con usuario root');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Código:', error.code);
    }
}

async function testApplicationConnection() {
    console.log('\n🧪 PROBANDO CONEXIÓN DESDE LA APLICACIÓN');
    console.log('==========================================');
    
    // Usar la misma configuración que usa tu aplicación
    const appConfig = {
        host: 'localhost',  // Para prueba externa
        port: 3307,         // Puerto externo
        user: process.env.DB_USER || 'complaints_user',
        password: process.env.DB_PASSWORD || 'secure_password_2024',
        database: process.env.DB_NAME || 'complaints_boyaca'
    };
    
    try {
        console.log('🔌 Probando conexión con credenciales de aplicación...');
        console.log(`   Host: ${appConfig.host}:${appConfig.port}`);
        console.log(`   Usuario: ${appConfig.user}`);
        console.log(`   Base de datos: ${appConfig.database}`);
        
        const connection = await mysql.createConnection(appConfig);
        console.log('✅ Conexión exitosa con credenciales de aplicación');
        
        // Probar inserción como lo hace la aplicación
        const testData = {
            entidad_id: 1,
            descripcion: 'Queja de prueba desde script - simulando aplicación Node.js',
            ip_origen: '192.168.1.100',
            user_agent: 'Test Script Mozilla/5.0'
        };
        
        const [result] = await connection.execute(`
            INSERT INTO quejas (entidad_id, descripcion, ip_origen, user_agent)
            VALUES (?, ?, ?, ?)
        `, [
            testData.entidad_id,
            testData.descripcion,
            testData.ip_origen,
            testData.user_agent
        ]);
        
        console.log(`✅ Queja de prueba insertada con ID: ${result.insertId}`);
        
        // Verificar inserción
        const [verificacion] = await connection.execute(`
            SELECT q.id, e.nombre as entidad, q.descripcion, q.estado 
            FROM quejas q 
            INNER JOIN entidades e ON q.entidad_id = e.id 
            WHERE q.id = ?
        `, [result.insertId]);
        
        if (verificacion.length > 0) {
            console.log('✅ Queja verificada en base de datos');
            console.log(`   ID: ${verificacion[0].id}`);
            console.log(`   Entidad: ${verificacion[0].entidad}`);
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error probando conexión de aplicación:', error.message);
        console.error('Código:', error.code);
    }
}

if (require.main === module) {
    (async () => {
        await fixDatabase();
        await testApplicationConnection();
    })().catch(console.error);
}

module.exports = { fixDatabase, testApplicationConnection };