const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { iniciarUpload, confirmarUpload, obtenerEstado, descargarAudio } = require('../controllers/audioController');

router.post('/upload/init', authMiddleware, iniciarUpload);
router.post('/upload/:id/commit', authMiddleware, confirmarUpload);
router.get('/:id/estado', authMiddleware, obtenerEstado);
router.get('/:id/download', authMiddleware, descargarAudio);

module.exports = router;
