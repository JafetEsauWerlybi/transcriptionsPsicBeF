const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { listar, detalle, eliminar, resumir, actualizarNombresLocutores } = require('../controllers/transcripcionController');

router.get('/', authMiddleware, listar);
router.get('/:id', authMiddleware, detalle);
router.delete('/:id', authMiddleware, eliminar);
router.post('/:id/resumir', authMiddleware, resumir);
router.put('/:id/nombres-locutores', authMiddleware, actualizarNombresLocutores);

module.exports = router;
