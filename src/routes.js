const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ComplaintsController = require('./controllers');

// Crear instancia del controlador
const complaintsController = new ComplaintsController();

// Rate limiting global para la API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 requests por ventana por IP (aumentado para desarrollo)
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP, intente de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting específico para crear quejas
const complaintsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // máximo 50 quejas por ventana por IP (aumentado para desarrollo)
    message: {
        success: false,
        message: 'Límite de quejas alcanzado. Puede enviar máximo 50 quejas cada 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Aplicar rate limiting a todas las rutas
router.use(apiLimiter);

// Middleware de logging
router.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent')?.substring(0, 100) || 'unknown';
    
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip} - UA: ${userAgent}`);
    next();
});

// Ruta de información de la API
router.get('/', (req, res) => complaintsController.getApiInfo(req, res));

// Health check
router.get('/health', (req, res) => complaintsController.healthCheck(req, res));

// Rutas para entidades
router.get('/entidades', (req, res) => complaintsController.getEntidades(req, res));

// Rutas para quejas
router.get('/quejas', (req, res) => complaintsController.getAllQuejas(req, res));
router.get('/quejas/:id', (req, res) => complaintsController.getQuejaById(req, res));

// Crear queja con rate limiting específico (deshabilitado para desarrollo)
router.post('/quejas', 
    // complaintsLimiter,  // Comentado para desarrollo
    // complaintsController.securityMiddleware.bind(complaintsController),  // Comentado para desarrollo
    (req, res) => complaintsController.createQueja(req, res)
);

// Rutas administrativas (requieren autenticación en producción)
router.patch('/quejas/:id/estado', (req, res) => complaintsController.updateQuejaStatus(req, res));
router.delete('/quejas/:id', (req, res) => complaintsController.deleteQueja(req, res));

// Rutas para reportes/estadísticas
router.get('/estadisticas', (req, res) => complaintsController.getEstadisticas(req, res));
router.get('/reportes', (req, res) => complaintsController.getReportes(req, res));
router.get('/reportes/csv', (req, res) => complaintsController.getReporteCSV(req, res));

// Rutas alternativas (compatibilidad)
router.get('/complaints', (req, res) => complaintsController.getAllQuejas(req, res));
router.get('/complaints/:id', (req, res) => complaintsController.getQuejaById(req, res));
router.post('/complaints', 
    complaintsLimiter,
    complaintsController.securityMiddleware.bind(complaintsController), 
    (req, res) => complaintsController.createQueja(req, res)
);
router.get('/entities', (req, res) => complaintsController.getEntidades(req, res));

// Búsqueda de quejas por entidad
router.get('/quejas/entidad/:entidad', (req, res) => complaintsController.getQuejasPorEntidad(req, res));

// Manejo de errores específico de la API
router.use((error, req, res, next) => {
    console.error('Error en la API:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // No exponer detalles del error en producción
    const isDev = process.env.NODE_ENV !== 'production';
    
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        ...(isDev && { stack: error.stack })
    });
});

module.exports = router;