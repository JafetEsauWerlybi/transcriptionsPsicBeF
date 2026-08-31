const multer = require('multer');
const path = require('path');
const os = require('os');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB máx
  fileFilter: (req, file, cb) => {
    const permitidos = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg'];
    if (permitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de audio no soportado'));
    }
  },
});

module.exports = upload;
