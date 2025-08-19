// Configuración global para Jest
jest.setTimeout(30000);

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';

// Suppresses experimental warning for ES modules
process.env.NODE_NO_WARNINGS = '1';

console.log('🧪 Configuración de testing cargada');
console.log('📊 Base de datos de prueba:', process.env.DB_NAME || 'complaints_boyaca');
