const express = require('express');
const router = express.Router();
const ComplaintsController = require('./controllers');

// Crear instancia del controlador
const complaintsController = new ComplaintsController();

// Middleware de logging
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip} - UA: ${req.get('User-Agent')?.substring(0, 80)}`);
    next();
});

// Rutas para quejas
router.get('/quejas', (req, res) => complaintsController.getAllComplaints(req, res));
router.get('/quejas/:id', (req, res) => complaintsController.getComplaintById(req, res));
router.post('/quejas', complaintsController.securityMiddleware.bind(complaintsController), (req, res) => complaintsController.createComplaint(req, res));
router.put('/quejas/:id', (req, res) => complaintsController.updateComplaint(req, res));
router.patch('/quejas/:id/estado', (req, res) => complaintsController.updateComplaintStatus(req, res));
router.delete('/quejas/:id', (req, res) => complaintsController.deleteComplaint(req, res));

// Rutas para entidades y categorías
router.get('/entidades', (req, res) => complaintsController.getEntities(req, res));
router.get('/categorias', (req, res) => complaintsController.getCategories(req, res));

// Rutas para reportes/estadísticas
router.get('/estadisticas', (req, res) => complaintsController.getReports(req, res));

// Manejo de errores
router.use((error, req, res, next) => {
    console.error('Error en la API:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

module.exports = router;