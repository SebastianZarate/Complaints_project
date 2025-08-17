const request = require('supertest');
const Server = require('../server');

describe('Application Integration Tests', () => {
    let server;
    let app;

    beforeAll(async () => {
        server = new Server();
        app = server.app;
        await server.database.init();
    });

    afterAll(async () => {
        await server.database.close();
    });

    describe('Static Files', () => {
        test('Should serve static files from public directory', async () => {
            // Test que el servidor sirva archivos estáticos
            const response = await request(app)
                .get('/style.css')
                .expect(200);
            
            expect(response.headers['content-type']).toContain('text/css');
        });

        test('Should serve index.html for SPA routes', async () => {
            const response = await request(app)
                .get('/any-route')
                .expect(200);
            
            expect(response.headers['content-type']).toContain('text/html');
        });
    });

    describe('Security Middleware', () => {
        test('Should include security headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            // Verificar que helmet está configurado
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers).toHaveProperty('x-frame-options');
        });

        test('Should handle CORS properly', async () => {
            const response = await request(app)
                .options('/api/health')
                .set('Origin', 'http://localhost:3000')
                .expect(204);

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    describe('Full Workflow Test', () => {
        test('Complete complaint submission workflow', async () => {
            // 1. Obtener entidades disponibles
            const entitiesResponse = await request(app)
                .get('/api/entities')
                .expect(200);

            expect(entitiesResponse.body.success).toBe(true);

            // 2. Crear una nueva queja
            const complaintData = {
                entityName: 'Alcaldía de Tunja',
                complainantName: 'Integration Test User',
                complainantEmail: 'integration@test.com',
                complainantPhone: '3001234567',
                description: 'Esta es una queja de prueba de integración completa',
                category: 'Integración',
                captchaToken: 'integration-test-token-456'
            };

            const createResponse = await request(app)
                .post('/api/complaints')
                .send(complaintData)
                .expect(201);

            expect(createResponse.body.success).toBe(true);
            const complaintId = createResponse.body.complaintId;

            // 3. Buscar las quejas de esa entidad
            const searchResponse = await request(app)
                .get('/api/complaints/entity/Alcaldía de Tunja')
                .expect(200);

            expect(searchResponse.body.success).toBe(true);
            expect(searchResponse.body.data.length).toBeGreaterThan(0);

            // 4. Generar reporte
            const reportResponse = await request(app)
                .get('/api/complaints/report')
                .expect(200);

            expect(reportResponse.body.success).toBe(true);
            expect(reportResponse.body.metadata.totalComplaints).toBeGreaterThan(0);
        });
    });

    describe('Error Recovery', () => {
        test('Should handle database errors gracefully', async () => {
            // Simular error cerrando la base de datos temporalmente
            await server.database.close();

            const response = await request(app)
                .get('/api/entities')
                .expect(500);

            expect(response.body.error).toBeDefined();

            // Reconectar para otros tests
            await server.database.init();
        });
    });

    describe('Performance Under Load', () => {
        test('Should handle multiple simultaneous complaint submissions', async () => {
            const complaints = [];
            
            for (let i = 0; i < 5; i++) {
                complaints.push({
                    entityName: `Entidad Test ${i}`,
                    complainantName: `Usuario Test ${i}`,
                    complainantEmail: `user${i}@test.com`,
                    description: `Descripción de prueba ${i}`,
                    captchaToken: `test-token-${i}-${Date.now()}`
                });
            }

            const promises = complaints.map(complaint => 
                request(app)
                    .post('/api/complaints')
                    .send(complaint)
                    .expect(201)
            );

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.body.success).toBe(true);
                expect(response.body.complaintId).toBeDefined();
            });
        });
    });
});