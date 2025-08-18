require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Configuración de seguridad avanzada para producción
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Configuración de CORS para producción
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
}));

// Comprimir respuestas
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    threshold: 1024 // Solo comprimir si es mayor a 1KB
}));

// Middleware para parsear JSON con límites de seguridad
app.use(express.json({ 
    limit: '1mb',
    strict: true,
    type: 'application/json'
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb',
    parameterLimit: 100
}));

// Configuración de confianza en proxies (importante para obtener IP real)
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
}

// Middleware de seguridad adicional
app.use((req, res, next) => {
    // Headers de seguridad personalizados
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Remover header que expone tecnología
    res.removeHeader('X-Powered-By');
    
    // Logging mejorado para producción
    if (NODE_ENV === 'production') {
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = (req.get('User-Agent') || 'unknown').substring(0, 100);
        const method = req.method;
        const url = req.originalUrl;
        
        // Solo loggear requests importantes en producción
        if (method !== 'GET' || url.includes('/api/')) {
            console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);
        }
    }
    
    next();
});

// Middleware para detectar y bloquear bots maliciosos
app.use((req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const suspiciousBots = [
        'sqlmap', 'nikto', 'dirb', 'dirbuster', 'nessus', 
        'openvas', 'w3af', 'skipfish', 'arachni'
    ];
    
    if (suspiciousBots.some(bot => userAgent.toLowerCase().includes(bot))) {
        console.warn(`Blocked suspicious bot: ${userAgent} from ${req.ip}`);
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }
    
    next();
});

// Servir archivos estáticos con configuración optimizada
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Cache más agresivo para assets
        if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Sin cache para HTML
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// Rate limiting más estricto para producción
const rateLimit = require('express-rate-limit');

const createRateLimit = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: {
        success: false,
        message,
        retry_after: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            message,
            retry_after: Math.ceil(windowMs / 1000)
        });
    }
});

// Rate limiting global
app.use('/api', createRateLimit(
    15 * 60 * 1000, // 15 minutos
    NODE_ENV === 'production' ? 50 : 100,
    'Demasiadas solicitudes desde esta IP'
));

// Rate limiting específico para quejas
app.use('/api/quejas', createRateLimit(
    15 * 60 * 1000, // 15 minutos
    NODE_ENV === 'production' ? 3 : 10,
    'Límite de quejas alcanzado'
));

// Rutas de la API
app.use('/api', routes);

// Health check especial para balanceadores de carga
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: NODE_ENV
    });
});

// Ruta principal que sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para SPA - sirve index.html para rutas del frontend
app.get('/app/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    // Log de rutas no encontradas para detectar intentos de exploit
    if (NODE_ENV === 'production') {
        console.warn(`404 - Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
    }
    
    if (req.accepts('json') || req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint no encontrado',
            path: req.originalUrl
        });
    }
    
    // Para otras solicitudes, servir la SPA
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo global de errores mejorado para producción
app.use((error, req, res, next) => {
    const timestamp = new Date().toISOString();
    const errorId = Math.random().toString(36).substring(2, 15);
    
    // Log completo del error
    console.error(`[${timestamp}] ERROR ${errorId}:`, {
        message: error.message,
        stack: NODE_ENV !== 'production' ? error.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method !== 'GET' ? req.body : undefined
    });

    // Si ya se enviaron headers, delegar al error handler por defecto
    if (res.headersSent) {
        return next(error);
    }

    const statusCode = error.status || error.statusCode || 500;
    
    // Respuesta segura para producción
    const errorResponse = {
        success: false,
        message: NODE_ENV === 'production' 
            ? 'Error interno del servidor' 
            : error.message,
        errorId: errorId,
        timestamp: timestamp
    };

    // Incluir stack trace solo en desarrollo
    if (NODE_ENV !== 'production') {
        errorResponse.stack = error.stack;
        errorResponse.details = {
            name: error.name,
            code: error.code
        };
    }

    res.status(statusCode).json(errorResponse);
});

// Función para iniciar el servidor con manejo robusto de errores
async function startServer() {
    try {
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n🚀 ===================================');
            console.log('   SERVIDOR EN PRODUCCIÓN INICIADO');
            console.log('🚀 ===================================');
            console.log(`📍 Servidor: http://0.0.0.0:${PORT}`);
            console.log(`🔧 Entorno: ${NODE_ENV}`);
            console.log(`📱 API: http://0.0.0.0:${PORT}/api`);
            console.log(`💓 Health: http://0.0.0.0:${PORT}/health`);
            console.log(`🛡️  Seguridad: Habilitada`);
            console.log(`📦 Compresión: Habilitada`);
            console.log(`⏱️  Iniciado: ${new Date().toISOString()}`);
            console.log('=====================================\n');
        });

        // Configurar keep-alive
        server.keepAliveTimeout = 120000;
        server.headersTimeout = 120000;

        // Manejo de cierre graceful
        const gracefulShutdown = (signal) => {
            console.log(`\n🛑 Recibida señal ${signal}, iniciando cierre graceful...`);
            
            server.close(() => {
                console.log('✅ Servidor HTTP cerrado');
                console.log('💾 Cerrando conexiones de base de datos...');
                
                // Aquí cerrarías conexiones de DB si fueran persistentes
                setTimeout(() => {
                    console.log('👋 Proceso terminado exitosamente');
                    process.exit(0);
                }, 5000);
            });

            // Forzar cierre después de 30 segundos
            setTimeout(() => {
                console.error('❌ Forzando cierre después de 30 segundos');
                process.exit(1);
            }, 30000);
        };

        // Registrar señales de cierre
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Manejo de errores no capturados
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection:', {
                reason,
                promise,
                timestamp: new Date().toISOString()
            });
        });

        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            // En producción, mejor reiniciar el proceso
            if (NODE_ENV === 'production') {
                gracefulShutdown('UNCAUGHT_EXCEPTION');
            }
        });

        return server;

    } catch (error) {
        console.error('❌ Error crítico iniciando el servidor:', error);
        process.exit(1);
    }
}

// Iniciar el servidor
if (require.main === module) {
    startServer();
}

module.exports = app;