const DatabaseManager = require('./database');

class ComplaintsController {
    constructor() {
        this.db = new DatabaseManager();
        this.rateLimiter = new Map(); // Para control anti-bot
    }

    // Middleware de seguridad
    securityMiddleware(req, res, next) {
        const clientIp = req.ip || req.connection.remoteAddress;
        
        // Verificar rate limiting
        if (!this.checkRateLimit(clientIp)) {
            return res.status(429).json({
                success: false,
                message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.'
            });
        }
        
        next();
    }

    // Control anti-bot simple
    checkRateLimit(ip) {
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutos
        const maxRequests = 10; // máximo 10 requests por ventana

        if (!this.rateLimiter.has(ip)) {
            this.rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
            return true;
        }

        const limit = this.rateLimiter.get(ip);
        if (now > limit.resetTime) {
            // Reset del contador
            this.rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
            return true;
        }

        if (limit.count >= maxRequests) {
            return false; // Excedió el límite
        }

        limit.count++;
        return true;
    }

    // Validación de datos
    validateComplaint(data) {
        const errors = [];

        if (!data.title || data.title.trim().length < 5) {
            errors.push('El título debe tener al menos 5 caracteres');
        }

        if (!data.description || data.description.trim().length < 20) {
            errors.push('La descripción debe tener al menos 20 caracteres');
        }

        if (!data.entity || data.entity.trim().length === 0) {
            errors.push('Debe seleccionar una entidad');
        }

        if (!data.category || data.category.trim().length === 0) {
            errors.push('Debe seleccionar una categoría');
        }

        if (!data.citizen_name || data.citizen_name.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }

        if (!data.citizen_email || !this.isValidEmail(data.citizen_email)) {
            errors.push('Debe proporcionar un email válido');
        }

        // Validar que no contenga contenido spam o malicioso
        const spamKeywords = ['viagra', 'casino', 'lottery', 'winner', 'click here', 'free money'];
        const content = (data.title + ' ' + data.description).toLowerCase();
        
        for (const keyword of spamKeywords) {
            if (content.includes(keyword)) {
                errors.push('El contenido contiene palabras no permitidas');
                break;
            }
        }

        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // CRUD Operations
    async getAllComplaints(req, res) {
        try {
            const complaints = this.db.getAllComplaints();
            res.json({
                success: true,
                data: complaints,
                count: complaints.length
            });
        } catch (error) {
            console.error('Error obteniendo quejas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async getComplaintById(req, res) {
        try {
            const { id } = req.params;
            const complaint = this.db.getComplaintById(id);
            
            if (!complaint) {
                return res.status(404).json({
                    success: false,
                    message: 'Queja no encontrada'
                });
            }

            res.json({
                success: true,
                data: complaint
            });
        } catch (error) {
            console.error('Error obteniendo queja:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async createComplaint(req, res) {
        try {
            const clientIp = req.ip || req.connection.remoteAddress;

            // Verificar rate limiting
            if (!this.checkRateLimit(clientIp)) {
                return res.status(429).json({
                    success: false,
                    message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.'
                });
            }

            // Validar datos
            const errors = this.validateComplaint(req.body);
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: errors
                });
            }

            // Limpiar datos
            const cleanData = {
                title: req.body.title.trim(),
                description: req.body.description.trim(),
                entity: req.body.entity.trim(),
                category: req.body.category.trim(),
                citizen_name: req.body.citizen_name.trim(),
                citizen_email: req.body.citizen_email.trim().toLowerCase(),
                citizen_phone: req.body.citizen_phone ? req.body.citizen_phone.trim() : null
            };

            const result = this.db.createComplaint(cleanData);

            res.status(201).json({
                success: true,
                message: 'Queja creada exitosamente',
                data: {
                    id: result.lastInsertRowid,
                    ...cleanData
                }
            });

        } catch (error) {
            console.error('Error creando queja:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async updateComplaint(req, res) {
        try {
            const { id } = req.params;

            // Verificar que la queja existe
            const existingComplaint = this.db.getComplaintById(id);
            if (!existingComplaint) {
                return res.status(404).json({
                    success: false,
                    message: 'Queja no encontrada'
                });
            }

            // Validar datos
            const errors = this.validateComplaint(req.body);
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: errors
                });
            }

            // Limpiar datos
            const cleanData = {
                title: req.body.title.trim(),
                description: req.body.description.trim(),
                entity: req.body.entity.trim(),
                category: req.body.category.trim(),
                citizen_name: req.body.citizen_name.trim(),
                citizen_email: req.body.citizen_email.trim().toLowerCase(),
                citizen_phone: req.body.citizen_phone ? req.body.citizen_phone.trim() : null
            };

            this.db.updateComplaint(id, cleanData);

            res.json({
                success: true,
                message: 'Queja actualizada exitosamente',
                data: {
                    id: parseInt(id),
                    ...cleanData
                }
            });

        } catch (error) {
            console.error('Error actualizando queja:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async updateComplaintStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            // Verificar que la queja existe
            const existingComplaint = this.db.getComplaintById(id);
            if (!existingComplaint) {
                return res.status(404).json({
                    success: false,
                    message: 'Queja no encontrada'
                });
            }

            this.db.updateComplaintStatus(id, status);

            res.json({
                success: true,
                message: 'Estado actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando estado:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    async deleteComplaint(req, res) {
        try {
            const { id } = req.params;

            // Verificar que la queja existe
            const existingComplaint = this.db.getComplaintById(id);
            if (!existingComplaint) {
                return res.status(404).json({
                    success: false,
                    message: 'Queja no encontrada'
                });
            }

            this.db.deleteComplaint(id);

            res.json({
                success: true,
                message: 'Queja eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando queja:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener entidades
    async getEntities(req, res) {
        try {
            const entities = this.db.getAllEntities();
            res.json({
                success: true,
                data: entities
            });
        } catch (error) {
            console.error('Error obteniendo entidades:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener categorías
    async getCategories(req, res) {
        try {
            const categories = this.db.getAllCategories();
            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Error obteniendo categorías:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Reportes
    async getReports(req, res) {
        try {
            const reports = {
                byStatus: this.db.getComplaintsByStatus(),
                byEntity: this.db.getComplaintsByEntity(),
                byCategory: this.db.getComplaintsByCategory(),
                byMonth: this.db.getComplaintsByMonth()
            };

            res.json({
                success: true,
                data: reports
            });
        } catch (error) {
            console.error('Error generando reportes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = ComplaintsController;