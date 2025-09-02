const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
    constructor() {
        this.auditEnabled = process.env.ENABLE_AUDIT === 'true';
        this.emailEnabled = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
        this.auditFile = path.join(__dirname, '../logs/audit.log');
        this.emailConfig = {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        };
        this.emailFrom = process.env.EMAIL_FROM || 'Sistema Quejas Boyacá <noreply@boyaca.gov.co>';
        this.emailTo = process.env.EMAIL_TO || 'quejasboyaca746@gmail.com';
        
        // Inicializar transporter de email
        if (this.emailEnabled && this.emailConfig.auth.user && this.emailConfig.auth.pass) {
            this.transporter = nodemailer.createTransport(this.emailConfig);
        }
        
        // Asegurar que el directorio de logs existe
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        try {
            const logDir = path.dirname(this.auditFile);
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.error('Error creando directorio de logs:', error);
        }
    }

    /**
     * Registra una operación en el sistema de auditoría
     * @param {Object} auditData - Datos de la operación
     * @param {string} auditData.operationType - Tipo de operación (CREATE_COMPLAINT, CONSULT_COMPLAINTS, CONSULT_BY_ENTITY, GENERAL_REPORT)
     * @param {string} auditData.ip - Dirección IP del cliente
     * @param {string} auditData.userAgent - User Agent del navegador
     * @param {Object} auditData.details - Detalles específicos de la operación
     * @param {string} auditData.entityName - Nombre de la entidad (solo para consultas por entidad)
     */
    async logOperation(auditData) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                operationType: auditData.operationType,
                ip: auditData.ip,
                userAgent: auditData.userAgent?.substring(0, 200) || 'unknown',
                details: auditData.details || {},
                entityName: auditData.entityName || null,
                location: await this.getLocationFromIP(auditData.ip)
            };

            // Guardar en archivo de log
            if (this.auditEnabled) {
                await this.saveToFile(logEntry);
            }

            // Enviar notificación por email
            if (this.emailEnabled && this.transporter) {
                await this.sendEmailNotification(logEntry);
            }

            console.log(`[AUDIT] ${logEntry.operationType} from ${logEntry.ip}`);
            
        } catch (error) {
            console.error('Error en sistema de auditoría:', error);
        }
    }

    async saveToFile(logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.auditFile, logLine, 'utf8');
        } catch (error) {
            console.error('Error guardando en archivo de auditoría:', error);
        }
    }

    async sendEmailNotification(logEntry) {
        try {
            const subject = this.getEmailSubject(logEntry.operationType);
            const htmlContent = this.generateEmailHTML(logEntry);

            const mailOptions = {
                from: this.emailFrom,
                to: this.emailTo,
                subject: subject,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email de auditoría enviado:', info.messageId);
            
        } catch (error) {
            console.error('Error enviando email de auditoría:', error);
        }
    }

    getEmailSubject(operationType) {
        const subjects = {
            'CREATE_COMPLAINT': '🚨 Nueva Queja Registrada - Sistema Boyacá',
            'CONSULT_COMPLAINTS': '📋 Consulta General de Quejas - Sistema Boyacá',
            'CONSULT_BY_ENTITY': '🏢 Consulta por Entidad - Sistema Boyacá',
            'GENERAL_REPORT': '📊 Reporte General Consultado - Sistema Boyacá'
        };
        return subjects[operationType] || '📝 Actividad en Sistema Boyacá';
    }

    generateEmailHTML(logEntry) {
        const date = new Date(logEntry.timestamp);
        const formattedDate = date.toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const operationNames = {
            'CREATE_COMPLAINT': 'Ingreso de Nueva Queja',
            'CONSULT_COMPLAINTS': 'Consulta General de Quejas',
            'CONSULT_BY_ENTITY': 'Consulta de Quejas por Entidad',
            'GENERAL_REPORT': 'Consulta de Reporte General'
        };

        const operationName = operationNames[logEntry.operationType] || 'Operación Desconocida';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background-color: #2c5282; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { padding: 30px; }
                .info-row { margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #2c5282; }
                .label { font-weight: bold; color: #2c5282; }
                .value { margin-top: 5px; color: #333; }
                .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
                .icon { font-size: 24px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">${this.getOperationIcon(logEntry.operationType)}</div>
                    <h2>Sistema de Quejas - Boyacá</h2>
                    <p>Notificación de Actividad</p>
                </div>
                <div class="content">
                    <div class="info-row">
                        <div class="label">🔧 Tipo de Operación:</div>
                        <div class="value">${operationName}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="label">📅 Fecha y Hora:</div>
                        <div class="value">${formattedDate} (Hora Colombia)</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="label">🌐 Dirección IP:</div>
                        <div class="value">${logEntry.ip}</div>
                    </div>
                    
                    ${logEntry.location ? `
                    <div class="info-row">
                        <div class="label">📍 Ubicación Aproximada:</div>
                        <div class="value">${logEntry.location}</div>
                    </div>
                    ` : ''}
                    
                    ${logEntry.entityName ? `
                    <div class="info-row">
                        <div class="label">🏢 Entidad Consultada:</div>
                        <div class="value">${logEntry.entityName}</div>
                    </div>
                    ` : ''}
                    
                    <div class="info-row">
                        <div class="label">💻 Navegador:</div>
                        <div class="value">${logEntry.userAgent}</div>
                    </div>
                    
                    ${logEntry.details && Object.keys(logEntry.details).length > 0 ? `
                    <div class="info-row">
                        <div class="label">📋 Detalles Adicionales:</div>
                        <div class="value">${this.formatDetails(logEntry.details)}</div>
                    </div>
                    ` : ''}
                </div>
                <div class="footer">
                    <p>📧 Sistema Automático de Notificaciones - Gobierno de Boyacá</p>
                    <p>🕒 Generado automáticamente el ${formattedDate}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getOperationIcon(operationType) {
        const icons = {
            'CREATE_COMPLAINT': '📝',
            'CONSULT_COMPLAINTS': '📋',
            'CONSULT_BY_ENTITY': '🏢',
            'GENERAL_REPORT': '📊'
        };
        return icons[operationType] || '📄';
    }

    formatDetails(details) {
        return Object.entries(details)
            .map(([key, value]) => `${key}: ${value}`)
            .join('<br>');
    }

    async getLocationFromIP(ip) {
        // Para IPs locales o de desarrollo
        if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1' || ip?.startsWith('192.168.') || ip?.startsWith('10.')) {
            return 'Conexión Local';
        }

        // Aquí podrías integrar un servicio de geolocalización como ipapi.co
        // Por ahora retornamos Colombia como ubicación por defecto
        return 'Colombia';
    }

    /**
     * Middleware para registrar automáticamente las operaciones
     */
    createAuditMiddleware(operationType) {
        return async (req, res, next) => {
            try {
                // Obtener IP real del cliente
                const ip = req.ip || 
                          req.connection.remoteAddress || 
                          req.socket.remoteAddress ||
                          (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                          req.headers['x-forwarded-for']?.split(',')[0] ||
                          'unknown';

                const userAgent = req.get('User-Agent') || 'unknown';
                
                let auditData = {
                    operationType,
                    ip,
                    userAgent,
                    details: {}
                };

                // Agregar detalles específicos según el tipo de operación
                if (operationType === 'CREATE_COMPLAINT' && req.body) {
                    auditData.details = {
                        entidad: req.body.entidad,
                        tipo_queja: req.body.tipo_queja,
                        asunto: req.body.asunto?.substring(0, 50) + '...' || 'Sin asunto'
                    };
                } else if (operationType === 'CONSULT_BY_ENTITY' && req.params.entidad) {
                    auditData.entityName = req.params.entidad;
                } else if (req.query) {
                    // Agregar parámetros de consulta relevantes
                    const relevantParams = ['entidad', 'estado', 'fecha_desde', 'fecha_hasta'];
                    relevantParams.forEach(param => {
                        if (req.query[param]) {
                            auditData.details[param] = req.query[param];
                        }
                    });
                }

                // Registrar la operación de forma asíncrona
                this.logOperation(auditData).catch(error => {
                    console.error('Error en auditoría:', error);
                });

                next();
            } catch (error) {
                console.error('Error en middleware de auditoría:', error);
                next(); // Continuar aunque falle la auditoría
            }
        };
    }

    /**
     * Método para obtener estadísticas de auditoría
     */
    async getAuditStats(days = 30) {
        try {
            const auditLog = await fs.readFile(this.auditFile, 'utf8');
            const lines = auditLog.trim().split('\n').filter(line => line);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const recentEntries = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(entry => entry && new Date(entry.timestamp) > cutoffDate);

            const stats = {
                totalOperations: recentEntries.length,
                operationsByType: {},
                uniqueIPs: new Set(),
                topEntities: {}
            };

            recentEntries.forEach(entry => {
                // Contar por tipo de operación
                stats.operationsByType[entry.operationType] = (stats.operationsByType[entry.operationType] || 0) + 1;
                
                // Contar IPs únicas
                stats.uniqueIPs.add(entry.ip);
                
                // Contar entidades más consultadas
                if (entry.entityName) {
                    stats.topEntities[entry.entityName] = (stats.topEntities[entry.entityName] || 0) + 1;
                }
            });

            stats.uniqueIPs = stats.uniqueIPs.size;
            
            return stats;
        } catch (error) {
            console.error('Error obteniendo estadísticas de auditoría:', error);
            return null;
        }
    }
}

module.exports = AuditLogger;
