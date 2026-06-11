const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { register, login, obtenerPerfil, actualizarPerfil, fixUsuarios } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/perfil', authMiddleware, obtenerPerfil);
router.put('/perfil', authMiddleware, actualizarPerfil);
router.post('/fix-usuarios', fixUsuarios); // Endpoint temporal para arreglar usuarios

module.exports = router;
