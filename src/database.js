const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseManager {
    constructor() {
        this.connection = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'complaints_boyaca',
            charset: 'utf8mb4',
            timezone: 'Z',
            multipleStatements: true,
            // Configuraciones válidas para mysql2
            connectTimeout: 60000,
            dateStrings: true
        };
    }

    async init() {
        try {
            console.log('🔧 Conectando a MySQL...');
            console.log(`   Host: ${this.config.host}:${this.config.port}`);
            console.log(`   Base de datos: ${this.config.database}`);
            console.log(`   Usuario: ${this.config.user}`);
            
            // Intentar conectar directamente a la base de datos
            try {
                this.connection = await mysql.createConnection(this.config);
                await this.connection.ping();
                console.log('✅ Conexión a MySQL establecida correctamente');
            } catch (error) {
                if (error.code === 'ER_BAD_DB_ERROR') {
                    console.log('🔄 Base de datos no existe, creándola...');
                    await this.createDatabase();
                } else {
                    throw error;
                }
            }
            
            // Verificar y crear tablas si es necesario
            await this.verifyAndCreateTables();
            
        } catch (error) {
            console.error('❌ Error inicializando la base de datos:', error.message);
            
            if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error('❌ Error de acceso: Verifica las credenciales de MySQL en el archivo .env');
            } else if (error.code === 'ECONNREFUSED') {
                console.error('❌ Error de conexión: Verifica que MySQL esté ejecutándose');
            }
            
            throw error;
        }
    }

    async createDatabase() {
        let tempConnection = null;
        try {
            // Conectar sin especificar base de datos
            const tempConfig = { ...this.config };
            delete tempConfig.database;
            
            tempConnection = await mysql.createConnection(tempConfig);
            
            // Crear base de datos
            await tempConnection.execute(
                `CREATE DATABASE IF NOT EXISTS ${this.config.database} 
                 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            console.log('✅ Base de datos creada exitosamente');
            
            await tempConnection.end();
            
            // Reconectar con la base de datos específica
            this.connection = await mysql.createConnection(this.config);
            
        } catch (error) {
            if (tempConnection) {
                await tempConnection.end();
            }
            console.error('❌ Error creando la base de datos:', error);
            throw error;
        }
    }

    async verifyAndCreateTables() {
        try {
            // Verificar si las tablas existen
            const [tables] = await this.connection.execute(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = ? AND table_name IN ('entidades', 'quejas')
            `, [this.config.database]);

            const existingTables = tables.map(row => row.table_name || row.TABLE_NAME);
            const needsEntidades = !existingTables.includes('entidades');
            const needsQuejas = !existingTables.includes('quejas');

            if (needsEntidades || needsQuejas) {
                console.log('📝 Creando tablas faltantes...');
                await this.createTables();
            } else {
                console.log('✅ Todas las tablas existen');
                // Verificar si necesita datos iniciales
                await this.insertInitialDataIfNeeded();
            }
        } catch (error) {
            console.error('❌ Error verificando tablas:', error);
            throw error;
        }
    }

    async createTables() {
        try {
            // Crear tabla de entidades
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS entidades (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nombre VARCHAR(255) NOT NULL UNIQUE,
                    descripcion TEXT,
                    contacto_email VARCHAR(255),
                    contacto_telefono VARCHAR(50),
                    direccion TEXT,
                    activo BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_nombre (nombre),
                    INDEX idx_activo (activo)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Tabla "entidades" creada');

            // Crear tabla de quejas
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS quejas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    entidad_id INT NOT NULL,
                    descripcion TEXT NOT NULL,
                    estado ENUM('pendiente', 'en_proceso', 'resuelto', 'rechazado') DEFAULT 'pendiente',
                    ip_origen VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (entidad_id) REFERENCES entidades(id) ON DELETE CASCADE,
                    INDEX idx_entidad (entidad_id),
                    INDEX idx_estado (estado),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Tabla "quejas" creada');

            // Insertar datos iniciales
            await this.insertInitialDataIfNeeded();

        } catch (error) {
            console.error('❌ Error creando tablas:', error);
            throw error;
        }
    }

    async insertInitialDataIfNeeded() {
        try {
            // Verificar si ya hay entidades
            const [existingEntities] = await this.connection.execute(
                'SELECT COUNT(*) as count FROM entidades'
            );
            
            if (existingEntities[0].count === 0) {
                console.log('📝 Insertando datos iniciales de entidades...');
                
                const entidades = [
                    ['CORPOBOYACA', 'Corporación Autónoma Regional de Boyacá', 'quejas@corpoboyaca.gov.co', '+57 8 740 7476', 'Tunja, Boyacá', true],
                    ['Lotería de Boyacá', 'Empresa de Lotería de Boyacá', 'atencion@loteriadeboyaca.gov.co', '+57 8 742 4949', 'Tunja, Boyacá', true],
                    ['EBSA', 'Electrificadora de Boyacá S.A. E.S.P.', 'atencion@ebsa.com.co', '+57 8 745 6000', 'Tunja, Boyacá', true],
                    ['ITBOY', 'Instituto de Tránsito de Boyacá', 'contacto@itboy.gov.co', '+57 8 742 7070', 'Tunja, Boyacá', true],
                    ['INDEPORTES', 'Instituto Departamental de Deportes de Boyacá', 'info@indeportesboyaca.gov.co', '+57 8 740 8080', 'Tunja, Boyacá', true],
                    ['Alcaldía Municipal', 'Administración municipal principal', 'quejas@alcaldia.gov.co', '+57 1 234 5678', 'Carrera 10 #15-20, Centro', true],
                    ['Secretaría de Salud', 'Gestión de servicios de salud municipal', 'salud@alcaldia.gov.co', '+57 1 234 5679', 'Carrera 8 #12-15, Centro', true],
                    ['Secretaría de Educación', 'Administración del sistema educativo local', 'educacion@alcaldia.gov.co', '+57 1 234 5680', 'Calle 19 #9-45, Centro', true],
                    ['Secretaría de Tránsito', 'Control y regulación del tránsito vehicular', 'transito@alcaldia.gov.co', '+57 1 234 5681', 'Avenida Norte #25-30', true],
                    ['Empresas Públicas', 'Servicios públicos domiciliarios', 'atencion@empresaspublicas.gov.co', '+57 1 234 5682', 'Carrera 15 #20-10, Industrial', true]
                ];

                const insertQuery = `
                    INSERT INTO entidades (nombre, descripcion, contacto_email, contacto_telefono, direccion, activo) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                for (const entidad of entidades) {
                    await this.connection.execute(insertQuery, entidad);
                }

                console.log(`✅ ${entidades.length} entidades insertadas exitosamente`);
            }
        } catch (error) {
            console.error('❌ Error insertando datos iniciales:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA QUEJAS ====================

    async getAllQuejas() {
        try {
            const [rows] = await this.connection.execute(`
                SELECT 
                    q.id,
                    q.entidad_id,
                    e.nombre as entidad_nombre,
                    q.descripcion,
                    q.estado,
                    q.created_at,
                    q.updated_at
                FROM quejas q 
                INNER JOIN entidades e ON q.entidad_id = e.id 
                ORDER BY q.created_at DESC
            `);
            return rows;
        } catch (error) {
            console.error('Error obteniendo todas las quejas:', error);
            throw error;
        }
    }

    async getQuejaById(id) {
        try {
            const [rows] = await this.connection.execute(`
                SELECT 
                    q.id,
                    q.entidad_id,
                    e.nombre as entidad_nombre,
                    e.descripcion as entidad_descripcion,
                    e.contacto_email,
                    e.contacto_telefono,
                    e.direccion,
                    q.descripcion,
                    q.estado,
                    q.created_at,
                    q.updated_at
                FROM quejas q 
                INNER JOIN entidades e ON q.entidad_id = e.id 
                WHERE q.id = ?
            `, [id]);
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error obteniendo queja por ID:', error);
            throw error;
        }
    }

    async createQueja(queja) {
        try {
            const [result] = await this.connection.execute(`
                INSERT INTO quejas (entidad_id, descripcion, ip_origen, user_agent)
                VALUES (?, ?, ?, ?)
            `, [
                queja.entidad_id,
                queja.descripcion,
                queja.ip_origen || null,
                queja.user_agent || null
            ]);
            
            return { insertId: result.insertId };
        } catch (error) {
            console.error('Error creando queja:', error);
            throw error;
        }
    }

    async updateQuejaStatus(id, estado) {
        try {
            const [result] = await this.connection.execute(`
                UPDATE quejas 
                SET estado = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [estado, id]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando estado de queja:', error);
            throw error;
        }
    }

    async deleteQueja(id) {
        try {
            const [result] = await this.connection.execute(
                'DELETE FROM quejas WHERE id = ?', 
                [id]
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error eliminando queja:', error);
            throw error;
        }
    }

    async getQuejasByEntidad(entidadId) {
        try {
            const [rows] = await this.connection.execute(`
                SELECT 
                    q.id,
                    q.entidad_id,
                    e.nombre as entidad_nombre,
                    q.descripcion,
                    q.estado,
                    q.created_at,
                    q.updated_at
                FROM quejas q 
                INNER JOIN entidades e ON q.entidad_id = e.id 
                WHERE q.entidad_id = ?
                ORDER BY q.created_at DESC
            `, [entidadId]);
            
            return rows;
        } catch (error) {
            console.error('Error obteniendo quejas por entidad:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA ENTIDADES ====================

    async getAllEntidades() {
        try {
            const [rows] = await this.connection.execute(`
                SELECT * FROM entidades 
                WHERE activo = TRUE 
                ORDER BY nombre
            `);
            return rows;
        } catch (error) {
            console.error('Error obteniendo entidades:', error);
            throw error;
        }
    }

    async getEntidadById(id) {
        try {
            const [rows] = await this.connection.execute(
                'SELECT * FROM entidades WHERE id = ?', 
                [id]
            );
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error obteniendo entidad por ID:', error);
            throw error;
        }
    }

    async getEntidadByNombre(nombre) {
        try {
            const [rows] = await this.connection.execute(`
                SELECT * FROM entidades 
                WHERE nombre LIKE ? AND activo = TRUE
                LIMIT 1
            `, [`%${nombre}%`]);
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error obteniendo entidad por nombre:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA REPORTES ====================

    async getQuejasPorEstado() {
        try {
            const [rows] = await this.connection.execute(`
                SELECT estado, COUNT(*) as count 
                FROM quejas 
                GROUP BY estado
                ORDER BY count DESC
            `);
            return rows;
        } catch (error) {
            console.error('Error obteniendo quejas por estado:', error);
            throw error;
        }
    }

    async getQuejasPorEntidad() {
        try {
            const [rows] = await this.connection.execute(`
                SELECT 
                    e.id,
                    e.nombre as entidad, 
                    COUNT(q.id) as count 
                FROM entidades e 
                LEFT JOIN quejas q ON e.id = q.entidad_id 
                WHERE e.activo = TRUE
                GROUP BY e.id, e.nombre 
                ORDER BY count DESC
            `);
            return rows;
        } catch (error) {
            console.error('Error obteniendo quejas por entidad:', error);
            throw error;
        }
    }

    async getQuejasPorMes(limite = 12) {
        try {
            const [rows] = await this.connection.execute(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as mes,
                    COUNT(*) as count 
                FROM quejas 
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY mes DESC
                LIMIT ?
            `, [limite]);
            return rows;
        } catch (error) {
            console.error('Error obteniendo quejas por mes:', error);
            throw error;
        }
    }

    async getEstadisticasGenerales() {
        try {
            const [totalQuejas] = await this.connection.execute(
                'SELECT COUNT(*) as total FROM quejas'
            );
            
            const [totalEntidades] = await this.connection.execute(
                'SELECT COUNT(*) as total FROM entidades WHERE activo = TRUE'
            );
            
            const [quejasHoy] = await this.connection.execute(`
                SELECT COUNT(*) as total 
                FROM quejas 
                WHERE DATE(created_at) = CURDATE()
            `);
            
            const [quejasMes] = await this.connection.execute(`
                SELECT COUNT(*) as total 
                FROM quejas 
                WHERE MONTH(created_at) = MONTH(CURDATE()) 
                AND YEAR(created_at) = YEAR(CURDATE())
            `);

            return {
                total_quejas: totalQuejas[0].total,
                total_entidades: totalEntidades[0].total,
                quejas_hoy: quejasHoy[0].total,
                quejas_mes_actual: quejasMes[0].total
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas generales:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS UTILITARIOS ====================

    async healthCheck() {
        try {
            await this.connection.ping();
            const [result] = await this.connection.execute('SELECT 1 as test');
            return result[0].test === 1;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    async getConnectionInfo() {
        try {
            const [result] = await this.connection.execute(`
                SELECT 
                    DATABASE() as current_database,
                    USER() as db_user,
                    VERSION() as mysql_version,
                    NOW() as server_time
            `);
            return result[0];
        } catch (error) {
            console.error('Error obteniendo información de conexión:', error);
            throw error;
        }
    }

    async executeQuery(query, params = []) {
        try {
            const [rows] = await this.connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error ejecutando consulta personalizada:', error);
            throw error;
        }
    }

    // ==================== GESTIÓN DE CONEXIÓN ====================

    async reconnect() {
        try {
            if (this.connection) {
                await this.connection.end();
            }
            await this.init();
            console.log('✅ Reconexión exitosa');
        } catch (error) {
            console.error('❌ Error en reconexión:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            try {
                await this.connection.end();
                this.connection = null;
                console.log('📫 Conexión a MySQL cerrada correctamente');
            } catch (error) {
                console.error('Error cerrando conexión:', error);
            }
        }
    }

    // Verificar si la conexión está activa
    isConnected() {
        return this.connection !== null;
    }
}

module.exports = DatabaseManager;