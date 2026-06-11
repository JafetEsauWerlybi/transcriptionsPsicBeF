const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { register, login, obtenerPerfil, actualizarPerfil } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/perfil', authMiddleware, obtenerPerfil);
router.put('/perfil', authMiddleware, actualizarPerfil);

module.exports = router;
