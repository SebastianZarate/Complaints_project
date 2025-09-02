const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
    constructor() {
        this.logFile = path.join(__dirname, '../logs/audit.log');
        this.emailConfig = {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER || 'quejasboyaca746@gmail.com',
                pass: process.env.EMAIL_PASSWORD || ''
            }
        };
        this.notificationEmail = process.env.EMAIL_TO || 'quejasboyaca746@gmail.com';
        
        // Crear transporter para emails
        this.transporter = this.createTransporter();
        
        // Asegurar que el directorio de logs existe
        this.ensureLogDirectory();
    }

    createTransporter() {
        try {
            return nodemailer.createTransport(this.emailConfig);
        } catch (error) {
            console.error('❌ Error configurando transporter de email:', error);
            return null;
        }
    }

    async ensureLogDirectory() {
        try {
            const logDir = path.dirname(this.logFile);
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.error('❌ Error creando directorio de logs:', error);
        }
    }

    /**
     * Registra una operación en el sistema de auditoría
     * @param {Object} auditData - Datos de la operación
     * @param {string} auditData.operation - Tipo de operación (NUEVA_QUEJA, CONSULTA_ENTIDAD, REPORTE_GENERAL)
     * @param {string} auditData.ip - IP del cliente
     * @param {string} auditData.userAgent - User Agent del navegador
     * @param {Object} auditData.details - Detalles específicos de la operación
     * @param {Object} req - Request object para obtener información adicional
     */
    async logOperation(auditData, req) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            operation: auditData.operation,
            ip: auditData.ip || this.getClientIP(req),
            userAgent: auditData.userAgent || req.get('User-Agent') || 'unknown',
            details: auditData.details || {},
            url: req.originalUrl,
            method: req.method
        };

        try {
            // Guardar en archivo de log
            await this.saveToLogFile(logEntry);
            
            // Enviar notificación por email
            await this.sendEmailNotification(logEntry);
            
            console.log(`📋 Auditoría registrada: ${auditData.operation} desde IP ${logEntry.ip}`);
            
        } catch (error) {
            console.error('❌ Error en auditoría:', error);
        }
    }

    /**
     * Obtiene la IP real del cliente considerando proxies
     */
    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               'unknown';
    }

    /**
     * Guarda la entrada de auditoría en archivo
     */
    async saveToLogFile(logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.logFile, logLine, 'utf8');
        } catch (error) {
            console.error('❌ Error guardando en archivo de auditoría:', error);
        }
    }

    /**
     * Envía notificación por email
     */
    async sendEmailNotification(logEntry) {
        if (!this.transporter) {
            console.warn('⚠️ Transporter de email no configurado, saltando notificación');
            return;
        }

        try {
            const subject = this.getEmailSubject(logEntry.operation);
            const htmlContent = this.generateEmailContent(logEntry);

            const mailOptions = {
                from: this.emailConfig.auth.user,
                to: this.notificationEmail,
                subject: subject,
                html: htmlContent
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`📧 Email de auditoría enviado para operación: ${logEntry.operation}`);

        } catch (error) {
            console.error('❌ Error enviando email de auditoría:', error);
        }
    }

    /**
     * Genera el asunto del email según el tipo de operación
     */
    getEmailSubject(operation) {
        const subjects = {
            'NUEVA_QUEJA': '🆕 Nueva Queja Registrada - Sistema Boyacá',
            'CONSULTA_ENTIDAD': '🔍 Consulta de Quejas por Entidad - Sistema Boyacá', 
            'REPORTE_GENERAL': '📊 Acceso a Reporte General - Sistema Boyacá'
        };
        return subjects[operation] || '📋 Actividad del Sistema - Boyacá';
    }

    /**
     * Genera el contenido HTML del email
     */
    generateEmailContent(logEntry) {
        const operationNames = {
            'NUEVA_QUEJA': 'Nueva Queja Registrada',
            'CONSULTA_ENTIDAD': 'Consulta de Quejas por Entidad',
            'REPORTE_GENERAL': 'Acceso a Reporte General'
        };

        const operationName = operationNames[logEntry.operation] || 'Operación del Sistema';
        
        // Formatear fecha y hora en zona horaria de Colombia
        const fechaHora = new Date(logEntry.timestamp).toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        let detallesEspecificos = '';
        if (logEntry.operation === 'CONSULTA_ENTIDAD' && logEntry.details.entidad) {
            detallesEspecificos = `<p><strong>🏢 Entidad Consultada:</strong> ${logEntry.details.entidad}</p>`;
        }
        if (logEntry.operation === 'NUEVA_QUEJA' && logEntry.details.quejaId) {
            detallesEspecificos = `<p><strong>🆔 ID de la Queja:</strong> ${logEntry.details.quejaId}</p>`;
        }

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Notificación de Auditoría</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                .footer { background: #eee; padding: 10px; text-align: center; border-radius: 0 0 5px 5px; font-size: 0.9em; }
                .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2c5aa0; }
                .warning { color: #e74c3c; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🚨 Sistema de Quejas Boyacá</h2>
                    <p>Notificación de Auditoría</p>
                </div>
                
                <div class="content">
                    <div class="info-box">
                        <h3>📋 ${operationName}</h3>
                        <p><strong>🕐 Fecha y Hora:</strong> ${fechaHora}</p>
                        <p><strong>🌐 Dirección IP:</strong> <span class="warning">${logEntry.ip}</span></p>
                        <p><strong>🔗 URL Accedida:</strong> ${logEntry.url}</p>
                        <p><strong>📱 Navegador:</strong> ${logEntry.userAgent}</p>
                        ${detallesEspecificos}
                    </div>
                    
                    ${logEntry.operation === 'NUEVA_QUEJA' ? 
                        '<div class="info-box"><p>✅ <strong>Se ha registrado una nueva queja en el sistema.</strong></p></div>' : 
                        ''
                    }
                    
                    ${logEntry.operation === 'CONSULTA_ENTIDAD' ? 
                        '<div class="info-box"><p>🔍 <strong>Alguien ha consultado las quejas de una entidad específica.</strong></p></div>' : 
                        ''
                    }
                    
                    ${logEntry.operation === 'REPORTE_GENERAL' ? 
                        '<div class="info-box"><p>📊 <strong>Alguien ha accedido al reporte general de estadísticas.</strong></p></div>' : 
                        ''
                    }
                </div>
                
                <div class="footer">
                    <p>🤖 Este es un mensaje automático del Sistema de Quejas de Boyacá</p>
                    <p>📧 No responder a este correo</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Obtiene el resumen de auditoría de los últimos días
     */
    async getAuditSummary(days = 7) {
        try {
            const data = await fs.readFile(this.logFile, 'utf8');
            const lines = data.trim().split('\n').filter(line => line);
            const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            
            const recentEntries = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(entry => entry && new Date(entry.timestamp) > cutoffDate);

            return {
                totalOperations: recentEntries.length,
                operationsByType: this.groupByOperation(recentEntries),
                uniqueIPs: [...new Set(recentEntries.map(e => e.ip))].length,
                dateRange: {
                    from: cutoffDate.toISOString(),
                    to: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ Error obteniendo resumen de auditoría:', error);
            return null;
        }
    }

    groupByOperation(entries) {
        return entries.reduce((acc, entry) => {
            acc[entry.operation] = (acc[entry.operation] || 0) + 1;
            return acc;
        }, {});
    }

    // Crear middleware de auditoría para rutas específicas
    createAuditMiddleware(operationType) {
        return async (req, res, next) => {
            try {
                const auditData = {
                    operation: operationType,
                    details: {}
                };

                // Agregar detalles específicos según el tipo de operación
                if (operationType === 'CONSULT_BY_ENTITY' && req.params.entidad) {
                    auditData.details.entidad = req.params.entidad;
                }

                // Log de la operación
                await this.logOperation(auditData, req);
                
                next();
            } catch (error) {
                console.error('❌ Error en middleware de auditoría:', error);
                // Continuar con la request aunque falle la auditoría
                next();
            }
        };
    }
}

module.exports = AuditLogger;
