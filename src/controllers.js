const DatabaseManager = require('./database');

class ComplaintsController {
    constructor() {
        this.db = new DatabaseManager();
        this.rateLimiter = new Map();
    }

    // Middleware de seguridad mejorado
    async securityMiddleware(req, res, next) {
        const clientIp = req.ip || req.connection.remoteAddress;
        
        // Verificar rate limiting
        if (!this.checkRateLimit(clientIp)) {
            return res.status(429).json({
                success: false,
                message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.',
                retry_after: 900 // 15 minutos en segundos
            });
        }
        
        next();
    }

    // Control anti-bot mejorado
    checkRateLimit(ip) {
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutos
        const maxRequests = 10;

        if (!this.rateLimiter.has(ip)) {
            this.rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
            return true;
        }

        const limit = this.rateLimiter.get(ip);
        if (now > limit.resetTime) {
            this.rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
            return true;
        }

        if (limit.count >= maxRequests) {
            return false;
        }

        limit.count++;
        return true;
    }

    // Validaciones para MySQL
    validateQueja(data) {
        const errors = [];

        if (!data.entidad_id || isNaN(data.entidad_id)) {
            errors.push('Debe seleccionar una entidad válida');
        }

        if (!data.descripcion || data.descripcion.trim().length < 20) {
            errors.push('La descripción debe tener al menos 20 caracteres');
        }

        if (data.descripcion && data.descripcion.length > 5000) {
            errors.push('La descripción no puede exceder 5000 caracteres');
        }

        // Validar contenido spam
        const spamKeywords = ['viagra', 'casino', 'lottery', 'winner', 'click here', 'free money'];
        const content = data.descripcion.toLowerCase();
        
        for (const keyword of spamKeywords) {
            if (content.includes(keyword)) {
                errors.push('El contenido contiene palabras no permitidas');
                break;
            }
        }

        return errors;
    }

    // ==================== API INFO Y HEALTH ====================

    async getApiInfo(req, res) {
        try {
            const startTime = Date.now();
            
            res.json({
                success: true,
                name: 'Sistema de Quejas - Boyacá API',
                version: '2.0.0',
                description: 'API para gestión de quejas ciudadanas en Boyacá',
                database: 'MySQL',
                endpoints: {
                    health: 'GET /api/health',
                    entidades: 'GET /api/entidades',
                    quejas: {
                        listar: 'GET /api/quejas',
                        obtener: 'GET /api/quejas/:id',
                        crear: 'POST /api/quejas',
                        actualizar_estado: 'PATCH /api/quejas/:id/estado',
                        eliminar: 'DELETE /api/quejas/:id',
                        por_entidad: 'GET /api/quejas/entidad/:entidad'
                    },
                    reportes: {
                        estadisticas: 'GET /api/estadisticas',
                        csv: 'GET /api/reportes/csv'
                    }
                },
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error obteniendo información de la API'
            });
        }
    }

    async healthCheck(req, res) {
        try {
            const startTime = Date.now();
            
            // Verificar conexión a base de datos
            await this.db.init();
            const isHealthy = await this.db.healthCheck();
            const connectionInfo = await this.db.getConnectionInfo();
            
            const responseTime = Date.now() - startTime;
            
            if (isHealthy) {
                res.json({
                    success: true,
                    status: 'healthy',
                    database: {
                        status: 'connected',
                        type: 'MySQL',
                        ...connectionInfo
                    },
                    server: {
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        version: process.version
                    },
                    timestamp: new Date().toISOString(),
                    responseTime
                });
            } else {
                res.status(503).json({
                    success: false,
                    status: 'unhealthy',
                    message: 'Base de datos no disponible',
                    responseTime
                });
            }
        } catch (error) {
            console.error('Health check error:', error);
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                message: 'Error de conectividad',
                error: error.message,
                responseTime: Date.now() - process.hrtime.bigint()
            });
        }
    }

    // ==================== ENTIDADES ====================

    async getEntidades(req, res) {
        try {
            const startTime = Date.now();
            await this.db.init();
            
            const entidades = await this.db.getAllEntidades();
            
            res.json({
                success: true,
                data: entidades,
                count: entidades.length,
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime
            });
        } catch (error) {
            console.error('Error obteniendo entidades:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo entidades',
                error: error.message
            });
        }
    }

    // ==================== QUEJAS ====================

    async getAllQuejas(req, res) {
        try {
            const startTime = Date.now();
            await this.db.init();
            
            const quejas = await this.db.getAllQuejas();
            
            res.json({
                success: true,
                data: quejas,
                count: quejas.length,
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime
            });
        } catch (error) {
            console.error('Error obteniendo quejas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo quejas',
                error: error.message
            });
        }
    }

    async getQuejaById(req, res) {
        try {
            const startTime = Date.now();
            const { id } = req.params;
            
            await this.db.init();
            const queja = await this.db.getQuejaById(id);
            
            if (!queja) {
                return res.status(404).json({
                    success: false,
                    message: 'Queja no encontrada'
                });
            }

            res.json({
                success: true,
                data: queja,
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime
            });
        } catch (error) {
            console.error('Error obteniendo queja:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo queja',
                error: error.message
            });
        }
    }

    async createQueja(req, res) {
        try {
            const startTime = Date.now();
            const clientIp = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            // Validar datos
            const errors = this.validateQueja(req.body);
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: errors
                });
            }

            await this.db.init();
            
            // Verificar que la entidad existe
            const entidad = await this.db.getEntidadById(req.body.entidad_id);
            if (!entidad) {
                return res.status(400).json({
                    success: false,
                    message: 'Entidad no válida'
                });
            }

            const quejaData = {
                entidad_id: parseInt(req.body.entidad_id),
                descripcion: req.body.descripcion.trim(),
                ip_origen: clientIp,
                user_agent: userAgent
            };

            const result = await this.db.createQueja(quejaData);

            res.status(201).json({
                success: true,
                message: 'Queja creada exitosamente',
                data: {
                    id: result.insertId,
                    entidad_id: quejaData.entidad_id,
                    entidad_nombre: entidad.nombre,
                    descripcion: quejaData.descripcion,
                    estado: 'pendiente'
                },
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime
            });

        } catch (error) {
            console.error('Error creando queja:', error);
            res.status(500).json({
                success: false,
                message: 'Error creando queja',
                error: error.message
            });
        }
    }

    async updateQuejaStatus(req, res) {
        try {
            const startTime = Date.now();
            const { id } = req.params;
            const { estado } = req.body;

            const validStatuses = ['pendiente', 'en_proceso', 'resuelto', 'rechazado'];
            if (!validStatuses.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido',
                    validStates: validStatuses
                });
            }

            await this.db.init();
            
            // Verificar que la queja existe
            const existingQueja = await this.db.getQuejaById(id);
            if (!existingQueja) {
                return res.status(404).json({
                    success: false,
                    message: 'Queja no encontrada'
                });
            }

            const updated = await this.db.updateQuejaStatus(id, estado);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Estado actualizado exitosamente',
                    data: {
                        id: parseInt(id),
                        estado_anterior: existingQueja.estado,
                        estado_nuevo: estado
                    },
                    responseTime: Date.now() - startTime
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'No se pudo actualizar el estado'
                });
            }

        } catch (error) {
            console.error('Error actualizando estado:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando estado',
                error: error.message
            });
        }
    }

    async deleteQueja(req, res) {
        try {
            const startTime = Date.now();
            const { id } = req.params;

            await this.db.init();
            
            // Verificar que la queja existe
            const existingQueja = await this.db.getQuejaById(id);
            if (!existingQueja) {
                return res.status(404).json({
                    success: false,
                    message: 'Queja no encontrada'
                });
            }

            const deleted = await this.db.deleteQueja(id);
            
            if (deleted) {
                res.json({
                    success: true,
                    message: 'Queja eliminada exitosamente',
                    responseTime: Date.now() - startTime
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'No se pudo eliminar la queja'
                });
            }

        } catch (error) {
            console.error('Error eliminando queja:', error);
            res.status(500).json({
                success: false,
                message: 'Error eliminando queja',
                error: error.message
            });
        }
    }

    // ==================== BÚSQUEDAS Y FILTROS ====================

    async getQuejasPorEntidad(req, res) {
        try {
            const startTime = Date.now();
            const { entidad } = req.params;

            await this.db.init();
            
            // Buscar por ID o nombre
            let entidadId = null;
            
            if (!isNaN(entidad)) {
                // Es un ID numérico
                entidadId = parseInt(entidad);
            } else {
                // Es un nombre, buscar la entidad
                const entidadEncontrada = await this.db.getEntidadByNombre(entidad);
                if (!entidadEncontrada) {
                    return res.status(404).json({
                        success: false,
                        message: 'Entidad no encontrada'
                    });
                }
                entidadId = entidadEncontrada.id;
            }

            const quejas = await this.db.getQuejasByEntidad(entidadId);
            const entidadInfo = await this.db.getEntidadById(entidadId);

            res.json({
                success: true,
                data: quejas,
                entidad: entidadInfo,
                count: quejas.length,
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime
            });

        } catch (error) {
            console.error('Error obteniendo quejas por entidad:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo quejas por entidad',
                error: error.message
            });
        }
    }

    // ==================== ESTADÍSTICAS Y REPORTES ====================

    async getEstadisticas(req, res) {
        try {
            const startTime = Date.now();
            await this.db.init();

            const [
                estadisticasGenerales,
                quejasPorEstado,
                quejasPorEntidad,
                quejasPorMes
            ] = await Promise.all([
                this.db.getEstadisticasGenerales(),
                this.db.getQuejasPorEstado(),
                this.db.getQuejasPorEntidad(),
                this.db.getQuejasPorMes(12)
            ]);

            res.json({
                success: true,
                data: {
                    generales: estadisticasGenerales,
                    por_estado: quejasPorEstado,
                    por_entidad: quejasPorEntidad,
                    por_mes: quejasPorMes
                },
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas',
                error: error.message
            });
        }
    }

    async getReporteCSV(req, res) {
        try {
            const startTime = Date.now();
            await this.db.init();

            const quejasPorEntidad = await this.db.getQuejasPorEntidad();
            
            // Generar CSV
            let csv = 'Entidad,Total Quejas,Fecha Reporte\n';
            
            quejasPorEntidad.forEach(row => {
                csv += `"${row.entidad}",${row.count},"${new Date().toLocaleDateString()}"\n`;
            });

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="reporte-quejas-${new Date().toISOString().split('T')[0]}.csv"`);
            res.setHeader('X-Response-Time', Date.now() - startTime);

            res.send(csv);

        } catch (error) {
            console.error('Error generando reporte CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando reporte CSV',
                error: error.message
            });
        }
    }
}

module.exports = ComplaintsController;