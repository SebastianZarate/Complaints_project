const request = require('supertest');
const Server = require('../server');

describe('Complaints API Tests', () => {
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

    describe('Health Check', () => {
        test('GET /api/health should return healthy status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body.status).toBe('healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('responseTime');
        });
    });

    describe('API Info', () => {
        test('GET /api should return API information', async () => {
            const response = await request(app)
                .get('/api')
                .expect(200);

            expect(response.body.name).toBe('Sistema de Quejas - Boyacá API');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body).toHaveProperty('version');
        });
    });

    describe('Complaints Management', () => {
        test('POST /api/complaints should create a new complaint', async () => {
            const newComplaint = {
                entityName: 'Alcaldía de Tunja',
                complainantName: 'Test User',
                complainantEmail: 'test@example.com',
                complainantPhone: '3101234567',
                description: 'Esta es una queja de prueba',
                category: 'Test',
                captchaToken: 'test-captcha-token-123'
            };

            const response = await request(app)
                .post('/api/complaints')
                .send(newComplaint)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Queja registrada exitosamente');
            expect(response.body).toHaveProperty('complaintId');
            expect(response.body).toHaveProperty('responseTime');
        });

        test('POST /api/complaints should fail with missing required fields', async () => {
            const incompleteComplaint = {
                entityName: 'Alcaldía de Tunja',
                // Falta complainantName, complainantEmail, description
                captchaToken: 'test-captcha-token-123'
            };

            const response = await request(app)
                .post('/api/complaints')
                .send(incompleteComplaint)
                .expect(400);

            expect(response.body.error).toBe('Campos requeridos faltantes');
            expect(response.body).toHaveProperty('required');
        });

        test('POST /api/complaints should fail with invalid email', async () => {
            const invalidEmailComplaint = {
                entityName: 'Alcaldía de Tunja',
                complainantName: 'Test User',
                complainantEmail: 'invalid-email',
                description: 'Esta es una queja de prueba',
                captchaToken: 'test-captcha-token-123'
            };

            const response = await request(app)
                .post('/api/complaints')
                .send(invalidEmailComplaint)
                .expect(400);

            expect(response.body.error).toBe('Email inválido');
        });

        test('POST /api/complaints should fail without captcha token', async () => {
            const noCaptchaComplaint = {
                entityName: 'Alcaldía de Tunja',
                complainantName: 'Test User',
                complainantEmail: 'test@example.com',
                description: 'Esta es una queja de prueba'
                // Sin captchaToken
            };

            const response = await request(app)
                .post('/api/complaints')
                .send(noCaptchaComplaint)
                .expect(400);

            expect(response.body.error).toBe('Verificación de captcha requerida');
        });

        test('GET /api/complaints/entity/:entityName should return complaints for entity', async () => {
            const response = await request(app)
                .get('/api/complaints/entity/Alcaldía de Tunja')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');
            expect(response.body).toHaveProperty('responseTime');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('GET /api/complaints/entity/:entityName should handle pagination', async () => {
            const response = await request(app)
                .get('/api/complaints/entity/Alcaldía de Tunja?page=1&limit=5')
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(5);
        });

        test('GET /api/complaints/entity/:entityName should filter by category', async () => {
            const response = await request(app)
                .get('/api/complaints/entity/Alcaldía de Tunja?category=Test')
                .expect(200);

            expect(response.body.success).toBe(true);
            // Si hay datos, verificar que tengan la categoría correcta
            if (response.body.data.length > 0) {
                expect(response.body.data[0].category).toBe('Test');
            }
        });

        test('GET /api/complaints/entity without entity name should fail', async () => {
            const response = await request(app)
                .get('/api/complaints/entity/')
                .expect(404); // La ruta no existe sin parámetro
        });
    });

    describe('Reports', () => {
        test('GET /api/complaints/report should return complaints report', async () => {
            const response = await request(app)
                .get('/api/complaints/report')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('metadata');
            expect(response.body).toHaveProperty('responseTime');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.metadata).toHaveProperty('totalEntities');
            expect(response.body.metadata).toHaveProperty('totalComplaints');
        });

        test('GET /api/complaints/report should return CSV format when requested', async () => {
            const response = await request(app)
                .get('/api/complaints/report?format=csv')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.text).toContain('Entidad,Total Quejas,Fecha Reporte');
        });

        test('GET /api/complaints/report should handle date filters', async () => {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            
            const response = await request(app)
                .get(`/api/complaints/report?startDate=${startDate}&endDate=${endDate}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('data');
        });
    });

    describe('Entities', () => {
        test('GET /api/entities should return list of entities', async () => {
            const response = await request(app)
                .get('/api/entities')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('responseTime');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('GET /api/nonexistent should return 404', async () => {
            const response = await request(app)
                .get('/api/nonexistent')
                .expect(404);

            expect(response.body.error).toBe('Endpoint de API no encontrado');
            expect(response.body).toHaveProperty('availableEndpoints');
        });
    });

    describe('Performance Tests', () => {
        test('API responses should be under 10 seconds', async () => {
            const startTime = Date.now();
            
            await request(app)
                .get('/api/health')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(10000); // 10 segundos
        });

        test('Multiple concurrent requests should handle properly', async () => {
            const promises = [];
            
            for (let i = 0; i < 5; i++) {
                promises.push(
                    request(app)
                        .get('/api/entities')
                        .expect(200)
                );
            }
            
            const responses = await Promise.all(promises);
            responses.forEach(response => {
                expect(response.body.success).toBe(true);
            });
        });
    });

    describe('Rate Limiting', () => {
        test('Should handle rate limiting gracefully', async () => {
            // Este test simula muchas requests rápidas
            const promises = [];
            
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .get('/api/health')
                );
            }
            
            const responses = await Promise.all(promises);
            
            // Verificar que al menos algunas respondan correctamente
            const successfulResponses = responses.filter(r => r.status === 200);
            expect(successfulResponses.length).toBeGreaterThan(0);
        });
    });
});