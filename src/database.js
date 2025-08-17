const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'database.db');
        this.db = null;
        this.init();
    }

    init() {
        try {
            // Verificar si el directorio data existe
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Verificar si el archivo existe y si es válido
            if (fs.existsSync(this.dbPath)) {
                try {
                    // Intentar abrir la base de datos existente
                    this.db = new Database(this.dbPath);
                    // Verificar si es una base de datos válida haciendo una consulta simple
                    this.db.pragma('journal_mode = WAL');
                } catch (error) {
                    console.log('⚠️ Archivo de base de datos corrupto, intentando recrear...');
                    
                    // Cerrar la conexión si existe
                    if (this.db) {
                        try {
                            this.db.close();
                        } catch (closeError) {
                            console.log('Error cerrando conexión:', closeError.message);
                        }
                        this.db = null;
                    }

                    // Intentar eliminar el archivo corrupto con reintentos
                    this.removeCorruptedFile();
                    
                    // Crear nueva base de datos
                    this.db = new Database(this.dbPath);
                }
            } else {
                // Crear nueva base de datos
                console.log('📝 Creando nueva base de datos...');
                this.db = new Database(this.dbPath);
            }

            // Configurar SQLite
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');

            // Crear tablas
            this.createTables();
            console.log('✅ Base de datos inicializada correctamente');

        } catch (error) {
            console.error('❌ Error inicializando la base de datos:', error);
            throw error;
        }
    }

    removeCorruptedFile() {
        const maxRetries = 5;
        const retryDelay = 1000; // 1 segundo

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Crear un nombre temporal para el archivo
                const tempPath = this.dbPath + '.corrupted.' + Date.now();
                
                // Intentar renombrar en lugar de eliminar directamente
                fs.renameSync(this.dbPath, tempPath);
                
                // Intentar eliminar el archivo renombrado
                setTimeout(() => {
                    try {
                        fs.unlinkSync(tempPath);
                        console.log('✅ Archivo corrupto eliminado exitosamente');
                    } catch (deleteError) {
                        console.log(`⚠️ No se pudo eliminar el archivo temporal: ${tempPath}`);
                    }
                }, 100);
                
                console.log(`✅ Archivo corrupto movido exitosamente (intento ${attempt})`);
                return;
                
            } catch (error) {
                console.log(`❌ Intento ${attempt} fallido: ${error.message}`);
                
                if (attempt === maxRetries) {
                    // Si todos los intentos fallan, crear con un nombre diferente
                    console.log('⚠️ No se pudo eliminar el archivo corrupto, usando nombre alternativo...');
                    this.dbPath = this.dbPath.replace('.db', '_new.db');
                    return;
                }
                
                // Esperar antes del siguiente intento
                this.sleep(retryDelay * attempt);
            }
        }
    }

    sleep(ms) {
        const start = Date.now();
        while (Date.now() - start < ms) {
            // Espera sincrónica
        }
    }

    createTables() {
        // Tabla de quejas
        const createComplaintsTable = `
            CREATE TABLE IF NOT EXISTS complaints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                entity TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                citizen_name TEXT NOT NULL,
                citizen_email TEXT NOT NULL,
                citizen_phone TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Tabla de entidades
        const createEntitiesTable = `
            CREATE TABLE IF NOT EXISTS entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                contact_email TEXT,
                contact_phone TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Tabla de categorías
        const createCategoriesTable = `
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Ejecutar creación de tablas
        this.db.exec(createComplaintsTable);
        this.db.exec(createEntitiesTable);
        this.db.exec(createCategoriesTable);

        // Insertar datos iniciales si las tablas están vacías
        this.insertInitialData();
    }

    insertInitialData() {
        // Verificar si ya hay datos
        const entitiesCount = this.db.prepare('SELECT COUNT(*) as count FROM entities').get().count;
        const categoriesCount = this.db.prepare('SELECT COUNT(*) as count FROM categories').get().count;

        if (entitiesCount === 0) {
            // Insertar entidades de ejemplo
            const insertEntity = this.db.prepare(`
                INSERT INTO entities (name, type, contact_email, contact_phone, address) 
                VALUES (?, ?, ?, ?, ?)
            `);

            const entities = [
                ['Alcaldía de Tunja', 'Municipal', 'alcaldia@tunja.gov.co', '3001234567', 'Plaza de Bolívar'],
                ['Gobernación de Boyacá', 'Departamental', 'info@boyaca.gov.co', '3007654321', 'Carrera 10 No. 18-35'],
                ['UPTC', 'Educativa', 'rectoria@uptc.edu.co', '3009876543', 'Avenida Central del Norte'],
                ['Hospital San Rafael', 'Salud', 'info@hsr.gov.co', '3005551234', 'Calle 15 No. 10-50'],
                ['Policía Nacional', 'Seguridad', 'policia@gov.co', '3008887777', 'Carrera 9 No. 20-40']
            ];

            entities.forEach(entity => insertEntity.run(...entity));
        }

        if (categoriesCount === 0) {
            // Insertar categorías de ejemplo
            const insertCategory = this.db.prepare(`
                INSERT INTO categories (name, description) 
                VALUES (?, ?)
            `);

            const categories = [
                ['Servicios Públicos', 'Quejas relacionadas con agua, luz, gas, etc.'],
                ['Vías y Transporte', 'Problemas de infraestructura vial y transporte público'],
                ['Seguridad', 'Temas de seguridad ciudadana y orden público'],
                ['Salud', 'Servicios de salud pública y hospitales'],
                ['Educación', 'Instituciones educativas y servicios académicos'],
                ['Medio Ambiente', 'Contaminación y cuidado ambiental'],
                ['Atención al Ciudadano', 'Calidad en la atención y trámites']
            ];

            categories.forEach(category => insertCategory.run(...category));
        }
    }

    // Métodos para operaciones CRUD de quejas
    getAllComplaints() {
        return this.db.prepare('SELECT * FROM complaints ORDER BY created_at DESC').all();
    }

    getComplaintById(id) {
        return this.db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    }

    createComplaint(complaint) {
        const stmt = this.db.prepare(`
            INSERT INTO complaints (title, description, entity, category, citizen_name, citizen_email, citizen_phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            complaint.title,
            complaint.description,
            complaint.entity,
            complaint.category,
            complaint.citizen_name,
            complaint.citizen_email,
            complaint.citizen_phone
        );
    }

    updateComplaint(id, complaint) {
        const stmt = this.db.prepare(`
            UPDATE complaints 
            SET title = ?, description = ?, entity = ?, category = ?, 
                citizen_name = ?, citizen_email = ?, citizen_phone = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        return stmt.run(
            complaint.title,
            complaint.description,
            complaint.entity,
            complaint.category,
            complaint.citizen_name,
            complaint.citizen_email,
            complaint.citizen_phone,
            id
        );
    }

    updateComplaintStatus(id, status) {
        const stmt = this.db.prepare(`
            UPDATE complaints 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        return stmt.run(status, id);
    }

    deleteComplaint(id) {
        return this.db.prepare('DELETE FROM complaints WHERE id = ?').run(id);
    }

    // Métodos para entidades
    getAllEntities() {
        return this.db.prepare('SELECT * FROM entities ORDER BY name').all();
    }

    // Métodos para categorías
    getAllCategories() {
        return this.db.prepare('SELECT * FROM categories ORDER BY name').all();
    }

    // Métodos para reportes
    getComplaintsByStatus() {
        return this.db.prepare(`
            SELECT status, COUNT(*) as count 
            FROM complaints 
            GROUP BY status
        `).all();
    }

    getComplaintsByEntity() {
        return this.db.prepare(`
            SELECT entity, COUNT(*) as count 
            FROM complaints 
            GROUP BY entity 
            ORDER BY count DESC
        `).all();
    }

    getComplaintsByCategory() {
        return this.db.prepare(`
            SELECT category, COUNT(*) as count 
            FROM complaints 
            GROUP BY category 
            ORDER BY count DESC
        `).all();
    }

    getComplaintsByMonth() {
        return this.db.prepare(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                COUNT(*) as count 
            FROM complaints 
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC
        `).all();
    }

    // Cerrar conexión
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;