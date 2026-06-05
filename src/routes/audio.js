const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const { upload: uploadAudio, obtenerEstado } = require('../controllers/audioController');

router.post('/upload', authMiddleware, upload.single('audio'), uploadAudio);
router.get('/:id/estado', authMiddleware, obtenerEstado);

module.exports = router;
