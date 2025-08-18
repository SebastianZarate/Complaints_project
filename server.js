require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad
app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitado para permitir inline scripts
    crossOriginEmbedderPolicy: false
}));

// Configuración de CORS
app.use(cors({
    origin: true, // Permite cualquier origen en desarrollo
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware para parsear JSON
app.use(express.json({ 
    limit: '1mb',
    strict: true 
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb' 
}));

// Middleware para obtener IP real del cliente
// app.set('trust proxy', true); // Comentado temporalmente para evitar conflicto con rate limiting

// Middleware para agregar headers de seguridad adicionales
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: false
}));

// Rutas de la API
app.use('/api', routes);

// Ruta principal que sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para SPA (Single Page Application) - sirve index.html para rutas del frontend
app.get('/app/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    // Si la ruta solicita JSON, devolver error JSON
    if (req.accepts('json')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint no encontrado',
            path: req.originalUrl
        });
    }
    
    // Para otras solicitudes, servir página de error o index.html
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo global de errores
app.use((error, req, res, next) => {
    console.error('Error global del servidor:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Si ya se enviaron headers, delegar al error handler por defecto de Express
    if (res.headersSent) {
        return next(error);
    }

    const isDev = process.env.NODE_ENV !== 'production';
    
    res.status(error.status || 500).json({
        success: false,
        message: isDev ? error.message : 'Error interno del servidor',
        ...(isDev && { stack: error.stack })
    });
});

// Función para iniciar el servidor
async function startServer() {
    try {
        // El servidor se inicia independientemente de la conexión a la base de datos
        // La conexión a la base de datos se maneja en cada controlador
        
        const server = app.listen(PORT, () => {
            console.log('\n🚀 ===================================');
            console.log('   SERVIDOR INICIADO CORRECTAMENTE');
            console.log('🚀 ===================================');
            console.log(`📍 Servidor corriendo en: http://localhost:${PORT}`);
            console.log(`📱 API disponible en: http://localhost:${PORT}/api`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📈 Estadísticas: http://localhost:${PORT}/api/estadisticas`);
            console.log(`🏢 Entidades: http://localhost:${PORT}/api/entidades`);
            console.log(`📝 Quejas: http://localhost:${PORT}/api/quejas`);
            console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log('=====================================\n');
        });

        // Manejo de cierre graceful
        process.on('SIGINT', () => {
            console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
            gracefulShutdown(server);
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
            gracefulShutdown(server);
        });

        // Manejo de errores no capturados
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection en:', promise, 'razón:', reason);
        });

        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown(server);
        });

    } catch (error) {
        console.error('❌ Error iniciando el servidor:', error);
        process.exit(1);
    }
}

// Función para cierre graceful del servidor
function gracefulShutdown(server) {
    console.log('⏳ Iniciando cierre graceful...');
    
    server.close(() => {
        console.log('✅ Servidor HTTP cerrado');
        
        // Aquí podrías cerrar conexiones adicionales como base de datos
        // if (database) database.close();
        
        console.log('👋 Proceso terminado exitosamente');
        process.exit(0);
    });

    // Forzar cierre después de 30 segundos
    setTimeout(() => {
        console.error('❌ Forzando cierre del servidor después de 30s');
        process.exit(1);
    }, 30000);
}

// Iniciar el servidor
startServer();