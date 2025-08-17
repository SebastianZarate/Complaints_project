require('dotenv').config();
const http = require('http');
const https = require('https');

class HealthChecker {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.results = [];
        this.startTime = Date.now();
    }

    async makeRequest(path, method = 'GET', data = null) {
        const url = new URL(path, this.baseUrl);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                timeout: 30000, // 30 segundos timeout
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'HealthChecker/2.0',
                    'Accept': 'application/json'
                }
            };

            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const req = client.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    
                    try {
                        let jsonResponse;
                        if (res.headers['content-type']?.includes('application/json')) {
                            jsonResponse = JSON.parse(responseData);
                        } else {
                            jsonResponse = responseData;
                        }
                        
                        resolve({
                            statusCode: res.statusCode,
                            data: jsonResponse,
                            responseTime,
                            headers: res.headers,
                            size: Buffer.byteLength(responseData)
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            data: responseData,
                            responseTime,
                            headers: res.headers,
                            parseError: true,
                            size: Buffer.byteLength(responseData)
                        });
                    }
                });
            });

            req.on('error', (err) => {
                reject({
                    error: err.message,
                    code: err.code,
                    responseTime: Date.now() - startTime
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject({
                    error: 'Request timeout',
                    code: 'TIMEOUT',
                    responseTime: Date.now() - startTime
                });
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async checkEndpoint(name, path, expectedStatus = 200, method = 'GET', data = null) {
        console.log(`🔍 Verificando ${name}...`);
        
        try {
            const result = await this.makeRequest(path, method, data);
            const success = result.statusCode === expectedStatus;
            
            this.results.push({
                name,
                path,
                success,
                statusCode: result.statusCode,
                responseTime: result.responseTime,
                expectedStatus,
                size: result.size || 0,
                parseError: result.parseError || false
            });

            const emoji = success ? '✅' : '❌';
            const status = success ? 'PASS' : 'FAIL';
            const sizeKB = Math.round((result.size || 0) / 1024 * 100) / 100;
            
            console.log(`${emoji} ${name}: ${status} (${result.statusCode}) - ${result.responseTime}ms - ${sizeKB}KB`);
            
            if (!success) {
                console.log(`   ⚠️  Esperado: ${expectedStatus}, Recibido: ${result.statusCode}`);
                if (result.data && typeof result.data === 'object' && result.data.message) {
                    console.log(`   📝 Mensaje: ${result.data.message}`);
                }
            }

            // Verificar tiempo de respuesta
            if (result.responseTime > 5000) {
                console.log(`   ⚠️  Advertencia: Tiempo de respuesta alto (${result.responseTime}ms)`);
            }

            return result;
            
        } catch (error) {
            this.results.push({
                name,
                path,
                success: false,
                error: error.error || error.message,
                code: error.code,
                responseTime: error.responseTime || 0
            });

            console.log(`❌ ${name}: ERROR - ${error.error || error.message} (${error.code || 'UNKNOWN'})`);
            return null;
        }
    }

    async runAllChecks() {
        console.log('🚀 ===================================');
        console.log('   VERIFICACIÓN DE SALUD DEL SISTEMA');
        console.log('🚀 ===================================');
        console.log(`📍 URL Base: ${this.baseUrl}`);
        console.log(`⏰ Iniciado: ${new Date().toLocaleString()}\n`);

        // 1. Health Check básico
        await this.checkEndpoint(
            'Health Check',
            '/api/health'
        );

        // 2. API Info
        await this.checkEndpoint(
            'API Info',
            '/api'
        );

        // 3. Obtener entidades
        await this.checkEndpoint(
            'Obtener Entidades',
            '/api/entidades'
        );

        // 4. Crear queja de prueba
        const testQueja = {
            entidad_id: 1, // Alcaldía Municipal
            descripcion: 'Esta es una queja de prueba generada por el health check del sistema. Contiene más de 20 caracteres como se requiere para validar el funcionamiento correcto de la validación de datos.'
        };

        const createResult = await this.checkEndpoint(
            'Crear Queja Anónima',
            '/api/quejas',
            201,
            'POST',
            testQueja
        );

        let testQuejaId = null;
        if (createResult && createResult.data && createResult.data.data) {
            testQuejaId = createResult.data.data.id;
        }

        // 5. Obtener quejas
        await this.checkEndpoint(
            'Listar Quejas',
            '/api/quejas'
        );

        // 6. Obtener queja específica (si se creó correctamente)
        if (testQuejaId) {
            await this.checkEndpoint(
                'Obtener Queja Específica',
                `/api/quejas/${testQuejaId}`
            );

            // 7. Actualizar estado de queja
            await this.checkEndpoint(
                'Actualizar Estado de Queja',
                `/api/quejas/${testQuejaId}/estado`,
                200,
                'PATCH',
                { estado: 'en_proceso' }
            );
        }

        // 8. Obtener estadísticas
        await this.checkEndpoint(
            'Estadísticas del Sistema',
            '/api/estadisticas'
        );

        // 9. Generar reporte CSV
        await this.checkEndpoint(
            'Generar Reporte CSV',
            '/api/reportes/csv'
        );

        // 10. Test de endpoint inexistente
        await this.checkEndpoint(
            'Endpoint Inexistente (404)',
            '/api/nonexistent',
            404
        );

        // 11. Test de rate limiting (crear múltiples quejas rápidamente)
        console.log('\n🛡️  Probando rate limiting...');
        let rateLimitTriggered = false;
        
        for (let i = 0; i < 7; i++) {
            const result = await this.checkEndpoint(
                `Rate Limit Test ${i + 1}`,
                '/api/quejas',
                i < 5 ? 201 : 429, // Primeras 5 deberían pasar, las siguientes ser bloqueadas
                'POST',
                {
                    entidad_id: 1,
                    descripcion: `Test de rate limiting número ${i + 1}. Esta descripción tiene más de 20 caracteres para cumplir con las validaciones.`
                }
            );
            
            if (result && result.statusCode === 429) {
                rateLimitTriggered = true;
                break;
            }
            
            // Pequeña pausa para no saturar
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 12. Limpiar queja de prueba si se creó
        if (testQuejaId) {
            await this.checkEndpoint(
                'Limpiar Queja de Prueba',
                `/api/quejas/${testQuejaId}`,
                200,
                'DELETE'
            );
        }

        this.printSummary();
        return this.results;
    }

    printSummary() {
        const totalTime = Date.now() - this.startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('='.repeat(60));

        const passed = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => !r.success).length;
        const total = this.results.length;

        console.log(`✅ Exitosos: ${passed}/${total}`);
        console.log(`❌ Fallidos: ${failed}/${total}`);
        console.log(`⏱️  Tiempo total: ${totalTime}ms`);

        if (failed > 0) {
            console.log('\n❌ TESTS FALLIDOS:');
            this.results
                .filter(r => !r.success)
                .forEach(r => {
                    const errorMsg = r.error || `Status ${r.statusCode} (esperado ${r.expectedStatus})`;
                    const codeMsg = r.code ? ` [${r.code}]` : '';
                    console.log(`   • ${r.name}: ${errorMsg}${codeMsg}`);
                });
        }

        // Estadísticas de tiempo de respuesta
        const responseTimes = this.results
            .filter(r => r.responseTime && r.success)
            .map(r => r.responseTime);

        if (responseTimes.length > 0) {
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);
            
            console.log('\n⏱️  TIEMPOS DE RESPUESTA:');
            console.log(`   • Promedio: ${Math.round(avgResponseTime)}ms`);
            console.log(`   • Mínimo: ${minResponseTime}ms`);
            console.log(`   • Máximo: ${maxResponseTime}ms`);
            
            if (maxResponseTime > 5000) {
                console.log('   ⚠️  Advertencia: Algunos endpoints superan los 5 segundos');
            } else if (avgResponseTime < 1000) {
                console.log('   🚀 Excelente: Tiempos de respuesta muy buenos');
            }
        }

        // Información del sistema
        console.log('\n🖥️  INFORMACIÓN DEL SISTEMA:');
        console.log(`   • URL: ${this.baseUrl}`);
        console.log(`   • Node.js: ${process.version}`);
        console.log(`   • Plataforma: ${process.platform} ${process.arch}`);
        console.log(`   • Memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);

        console.log('\n' + '='.repeat(60));
        
        if (failed === 0) {
            console.log('🎉 ¡Todos los tests pasaron! El sistema está funcionando correctamente.');
            console.log('💡 El servidor MySQL está respondiendo adecuadamente.');
        } else {
            console.log('⚠️  Algunos tests fallaron. Revisa los errores arriba.');
            console.log('🔧 Verifica la configuración de MySQL y la conectividad.');
            if (failed > total * 0.5) {
                console.log('❌ Más del 50% de los tests fallaron. El sistema podría estar inoperativo.');
                process.exit(1);
            }
        }
        
        console.log('='.repeat(60) + '\n');
    }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    const baseUrl = process.argv[2] || process.env.HEALTH_CHECK_URL || 'http://localhost:3000';
    const checker = new HealthChecker(baseUrl);
    
    checker.runAllChecks().catch(error => {
        console.error('❌ Error crítico ejecutando health check:', error);
        process.exit(1);
    });
}

module.exports = HealthChecker;