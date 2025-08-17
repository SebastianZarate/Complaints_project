const http = require('http');
const https = require('https');

class HealthChecker {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.results = [];
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
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'HealthChecker/1.0'
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
                        const jsonResponse = JSON.parse(responseData);
                        resolve({
                            statusCode: res.statusCode,
                            data: jsonResponse,
                            responseTime,
                            headers: res.headers
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            data: responseData,
                            responseTime,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', (err) => {
                reject({
                    error: err.message,
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
                expectedStatus
            });

            const emoji = success ? '✅' : '❌';
            const status = success ? 'PASS' : 'FAIL';
            
            console.log(`${emoji} ${name}: ${status} (${result.statusCode}) - ${result.responseTime}ms`);
            
            if (!success) {
                console.log(`   Esperado: ${expectedStatus}, Recibido: ${result.statusCode}`);
            }

            // Verificar tiempo de respuesta
            if (result.responseTime > 10000) {
                console.log(`⚠️  Advertencia: Tiempo de respuesta alto (${result.responseTime}ms)`);
            }

            return result;
            
        } catch (error) {
            this.results.push({
                name,
                path,
                success: false,
                error: error.error || error.message,
                responseTime: error.responseTime || 0
            });

            console.log(`❌ ${name}: ERROR - ${error.error || error.message}`);
            return null;
        }
    }

    async runAllChecks() {
        console.log('🚀 Iniciando verificación de salud del servidor...\n');
        console.log(`📍 URL Base: ${this.baseUrl}\n`);

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
            '/api/entities'
        );

        // 4. Crear queja de prueba
        const testComplaint = {
            entityName: 'Test Entity Health Check',
            complainantName: 'Health Check User',
            complainantEmail: 'healthcheck@test.com',
            description: 'Esta es una queja de prueba del health check',
            category: 'Test',
            captchaToken: 'health-check-token-' + Date.now()
        };

        await this.checkEndpoint(
            'Crear Queja',
            '/api/complaints',
            201,
            'POST',
            testComplaint
        );

        // 5. Buscar quejas por entidad
        await this.checkEndpoint(
            'Buscar Quejas por Entidad',
            '/api/complaints/entity/Test Entity Health Check'
        );

        // 6. Generar reporte
        await this.checkEndpoint(
            'Generar Reporte',
            '/api/complaints/report'
        );

        // 7. Generar reporte CSV
        await this.checkEndpoint(
            'Generar Reporte CSV',
            '/api/complaints/report?format=csv'
        );

        // 8. Test de endpoint inexistente
        await this.checkEndpoint(
            'Endpoint Inexistente (404)',
            '/api/nonexistent',
            404
        );

        // 9. Test de archivo estático
        await this.checkEndpoint(
            'Archivo Estático',
            '/style.css'
        );

        // 10. Test de SPA routing
        await this.checkEndpoint(
            'SPA Routing',
            '/app'
        );

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('='.repeat(50));

        const passed = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => !r.success).length;
        const total = this.results.length;

        console.log(`✅ Exitosos: ${passed}/${total}`);
        console.log(`❌ Fallidos: ${failed}/${total}`);

        if (failed > 0) {
            console.log('\n❌ TESTS FALLIDOS:');
            this.results
                .filter(r => !r.success)
                .forEach(r => {
                    console.log(`   • ${r.name}: ${r.error || `Status ${r.statusCode} (esperado ${r.expectedStatus})`}`);
                });
        }

        // Estadísticas de tiempo de respuesta
        const responseTimes = this.results
            .filter(r => r.responseTime)
            .map(r => r.responseTime);

        if (responseTimes.length > 0) {
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            
            console.log('\n⏱️  TIEMPOS DE RESPUESTA:');
            console.log(`   • Promedio: ${Math.round(avgResponseTime)}ms`);
            console.log(`   • Máximo: ${maxResponseTime}ms`);
            
            if (maxResponseTime > 10000) {
                console.log('   ⚠️  Advertencia: Algunos endpoints superan los 10 segundos');
            }
        }

        console.log('\n' + '='.repeat(50));
        
        if (failed === 0) {
            console.log('🎉 ¡Todos los tests pasaron! El servidor está funcionando correctamente.');
        } else {
            console.log('⚠️  Algunos tests fallaron. Revisa los errores arriba.');
            process.exit(1);
        }
    }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    const checker = new HealthChecker(baseUrl);
    
    checker.runAllChecks().catch(error => {
        console.error('❌ Error ejecutando health check:', error);
        process.exit(1);
    });
}

module.exports = HealthChecker;