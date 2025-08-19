const request = require('supertest');
const express = require('express');

// Configurar variables de entorno para testing
require('dotenv').config({ path: '.env.test' });
process.env.NODE_ENV = 'test';

const routes = require('../src/routes');

describe('Funcionalidades Principales del Sistema de Quejas', () => {
    let app;
    let quejaCreada = null;
    let entidadValida = null;

    beforeAll(async () => {
        // Configurar aplicación Express para testing
        app = express();
        app.use(express.json());
        app.use('/api', routes);
        
        // Esperar un poco para que la DB se inicialice
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Obtener una entidad válida para usar en los tests
        const responseEntidades = await request(app)
            .get('/api/entidades')
            .expect(200);
        
        if (responseEntidades.body.data && responseEntidades.body.data.length > 0) {
            entidadValida = responseEntidades.body.data[0];
        }
    });

    describe('1. FUNCIONALIDAD: CONSULTAR QUEJAS', () => {
        
        test('Debe obtener todas las quejas exitosamente', async () => {
            const response = await request(app)
                .get('/api/quejas')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('count');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('responseTime');
            expect(Array.isArray(response.body.data)).toBe(true);
            
            console.log(`✅ Consulta exitosa: ${response.body.count} quejas encontradas`);
        });

        test('Debe obtener quejas por entidad específica', async () => {
            if (!entidadValida) {
                console.log('⚠️  No hay entidades disponibles para testing');
                return;
            }

            const response = await request(app)
                .get(`/api/quejas/entidad/${encodeURIComponent(entidadValida.nombre)}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            
            console.log(`✅ Consulta por entidad "${entidadValida.nombre}": ${response.body.data.length} quejas`);
        });

        test('Debe manejar consulta de queja inexistente', async () => {
            const response = await request(app)
                .get('/api/quejas/99999')
                .expect(404);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Queja no encontrada');
            
            console.log('✅ Manejo correcto de queja inexistente');
        });

        test('Debe obtener entidades disponibles', async () => {
            const response = await request(app)
                .get('/api/entidades')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('count');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.count).toBeGreaterThan(0);
            
            // Verificar estructura de entidades
            if (response.body.data.length > 0) {
                const entidad = response.body.data[0];
                expect(entidad).toHaveProperty('id');
                expect(entidad).toHaveProperty('nombre');
            }
            
            console.log(`✅ Consulta de entidades: ${response.body.count} entidades disponibles`);
        });
    });

    describe('2. FUNCIONALIDAD: ESCRIBIR QUEJAS', () => {
        
        test('Debe crear una nueva queja exitosamente', async () => {
            if (!entidadValida) {
                console.log('⚠️  No hay entidades disponibles para crear queja');
                return;
            }

            const nuevaQueja = {
                entidad_id: entidadValida.id,
                descripcion: 'Esta es una queja de prueba automatizada para verificar el funcionamiento correcto del sistema. La descripción tiene más de 20 caracteres como es requerido por las validaciones del sistema.'
            };

            const response = await request(app)
                .post('/api/quejas')
                .send(nuevaQueja)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'Queja creada exitosamente');
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('entidad_id', entidadValida.id);
            expect(response.body.data).toHaveProperty('descripcion', nuevaQueja.descripcion);
            expect(response.body.data).toHaveProperty('estado', 'pendiente');

            // Guardar la queja creada para tests posteriores
            quejaCreada = response.body.data;
            
            console.log(`✅ Queja creada exitosamente con ID: ${quejaCreada.id}`);
        });

        test('Debe validar campos requeridos al crear queja', async () => {
            const quejaInvalida = {
                descripcion: 'Descripción muy corta'
            };

            const response = await request(app)
                .post('/api/quejas')
                .send(quejaInvalida)
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Datos inválidos');
            expect(response.body).toHaveProperty('errors');
            expect(Array.isArray(response.body.errors)).toBe(true);
            
            console.log('✅ Validación correcta de campos requeridos');
        });

        test('Debe validar longitud mínima de descripción', async () => {
            if (!entidadValida) return;

            const quejaInvalida = {
                entidad_id: entidadValida.id,
                descripcion: 'Muy corta'
            };

            const response = await request(app)
                .post('/api/quejas')
                .send(quejaInvalida)
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.errors).toContain('La descripción debe tener al menos 20 caracteres');
            
            console.log('✅ Validación correcta de longitud mínima de descripción');
        });

        test('Debe validar entidad inexistente', async () => {
            const quejaInvalida = {
                entidad_id: 99999,
                descripcion: 'Esta es una descripción válida con más de 20 caracteres para probar la validación de entidad'
            };

            const response = await request(app)
                .post('/api/quejas')
                .send(quejaInvalida)
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Entidad no válida');
            
            console.log('✅ Validación correcta de entidad inexistente');
        });

        test('Debe verificar que la queja creada se puede consultar', async () => {
            if (!quejaCreada) {
                console.log('⚠️  No hay queja creada para verificar');
                return;
            }

            const response = await request(app)
                .get(`/api/quejas/${quejaCreada.id}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id', quejaCreada.id);
            expect(response.body.data).toHaveProperty('descripcion', quejaCreada.descripcion);
            
            console.log(`✅ Queja creada se puede consultar correctamente: ID ${quejaCreada.id}`);
        });
    });

    describe('3. FUNCIONALIDAD: GENERACIÓN DE REPORTES', () => {
        
        test('Debe generar reporte de quejas por entidad', async () => {
            const response = await request(app)
                .get('/api/reportes')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('count');
            expect(Array.isArray(response.body.data)).toBe(true);

            // Verificar estructura del reporte
            if (response.body.data.length > 0) {
                const reporte = response.body.data[0];
                expect(reporte).toHaveProperty('entidad');
                expect(reporte).toHaveProperty('count');
                expect(typeof reporte.count).toBe('number');
            }
            
            console.log(`✅ Reporte por entidad generado: ${response.body.count} entidades con quejas`);
        });

        test('Debe generar reporte CSV descargable', async () => {
            const response = await request(app)
                .get('/api/reportes/csv')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.headers['content-disposition']).toContain('reporte-quejas-');
            expect(response.headers).toHaveProperty('x-response-time');

            // Verificar que el CSV tiene el formato correcto
            const csvContent = response.text;
            expect(csvContent).toContain('Entidad,Total Quejas,Fecha Reporte');
            
            const lines = csvContent.split('\n').filter(line => line.trim());
            expect(lines.length).toBeGreaterThan(0); // Al menos el header
            
            console.log(`✅ Reporte CSV generado correctamente con ${lines.length - 1} filas de datos`);
        });

        test('Debe verificar rendimiento de generación de reportes', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/api/reportes')
                .expect(200);
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const serverResponseTime = response.body.responseTime;

            expect(responseTime).toBeLessThan(5000); // Menos de 5 segundos
            expect(serverResponseTime).toBeLessThan(2000); // Servidor menos de 2 segundos
            
            console.log(`✅ Rendimiento verificado: ${responseTime}ms total, ${serverResponseTime}ms servidor`);
        });
    });
});
