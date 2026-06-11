const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader ? 'presente' : 'ausente');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token válido, payload:', payload);
    req.usuarioId = payload.id;
    next();
  } catch (err) {
    console.error('Error verificando token:', err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};
