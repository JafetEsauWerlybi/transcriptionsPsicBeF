const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB máx
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
