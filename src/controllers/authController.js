const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getCosmosContainer } = require('../config/azure');

async function register(req, res) {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  try {
    const query = {
      query: 'SELECT * FROM c WHERE c.email = @email AND c.tipo = "usuario"',
      parameters: [{ name: '@email', value: email }],
    };
    const { resources } = await getCosmosContainer().items.query(query).fetchAll();
    if (resources.length > 0)
      return res.status(409).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const usuario = {
      id: uuidv4(),
      tipo: 'usuario',
      nombre,
      email,
      password: hash,
      creadoEn: new Date().toISOString(),
    };

    await getCosmosContainer().items.create(usuario);
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, nombre: usuario.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y password requeridos' });

  try {
    const query = {
      query: 'SELECT * FROM c WHERE c.email = @email AND c.tipo = "usuario"',
      parameters: [{ name: '@email', value: email }],
    };
    const { resources } = await getCosmosContainer().items.query(query).fetchAll();
    const usuario = resources[0];

    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, nombre: usuario.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

module.exports = { register, login };