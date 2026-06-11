const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getCosmosContainer } = require('../config/azure');

async function register(req, res) {
  const { nombres, apellidoPaterno, apellidoMaterno, email, password } = req.body;
  if (!nombres || !apellidoPaterno || !email || !password)
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
      nombres,
      apellidoPaterno,
      apellidoMaterno: apellidoMaterno || '',
      email,
      password: hash,
      telefono: '',
      empresa: '',
      profesion: '',
      especialidad: '',
      cedula: '',
      ubicacion: '',
      sitioWeb: '',
      biografia: '',
      creadoEn: new Date().toISOString(),
    };

    await getCosmosContainer().items.create(usuario);
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, nombre: `${usuario.nombres} ${usuario.apellidoPaterno}` });
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
    const nombre = usuario.nombre || `${usuario.nombres} ${usuario.apellidoPaterno}`;
    res.json({ token, nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

async function obtenerPerfil(req, res) {
  try {
    const { resource } = await getCosmosContainer().item(req.usuarioId, req.usuarioId).read();
    if (!resource || resource.tipo !== 'usuario')
      return res.status(404).json({ error: 'Usuario no encontrado' });

    const { password, ...perfil } = resource;
    res.json(perfil);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

async function actualizarPerfil(req, res) {
  try {
    const { resource: existente } = await getCosmosContainer().item(req.usuarioId, req.usuarioId).read();
    if (!existente || existente.tipo !== 'usuario')
      return res.status(404).json({ error: 'Usuario no encontrado' });

    const actualizado = {
      ...existente,
      telefono: req.body.telefono || existente.telefono || '',
      empresa: req.body.empresa || existente.empresa || '',
      profesion: req.body.profesion || existente.profesion || '',
      especialidad: req.body.especialidad || existente.especialidad || '',
      cedula: req.body.cedula || existente.cedula || '',
      ubicacion: req.body.ubicacion || existente.ubicacion || '',
      sitioWeb: req.body.sitioWeb || existente.sitioWeb || '',
      biografia: req.body.biografia || existente.biografia || '',
      actualizadoEn: new Date().toISOString(),
    };

    const { resource } = await getCosmosContainer().item(req.usuarioId, req.usuarioId).replace(actualizado);
    const { password, ...perfil } = resource;
    res.json(perfil);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
}

module.exports = { register, login, obtenerPerfil, actualizarPerfil };