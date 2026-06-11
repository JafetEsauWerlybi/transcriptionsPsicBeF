const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getCosmosContainer } = require('../config/azure');

async function register(req, res) {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Nombre, email y password son requeridos' });

  try {
    const query = {
      query: 'SELECT * FROM c WHERE c.email = @email AND c.tipo = "usuario"',
      parameters: [{ name: '@email', value: email }],
    };
    const { resources } = await getCosmosContainer().items.query(query).fetchAll();
    if (resources.length > 0)
      return res.status(409).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const usuarioId = uuidv4();
    const usuario = {
      id: usuarioId,
      usuarioId: usuarioId,
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
    console.error('Error register:', err);
    res.status(500).json({ error: err.message || 'Error al registrar usuario' });
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
    console.error('Error login:', err);
    res.status(500).json({ error: err.message || 'Error al iniciar sesión' });
  }
}

async function obtenerPerfil(req, res) {
  try {
    console.log('obtenerPerfil - usuarioId:', req.usuarioId);

    if (!req.usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const query = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.tipo = "usuario"',
      parameters: [{ name: '@id', value: req.usuarioId }],
    };

    const { resources } = await getCosmosContainer().items.query(query).fetchAll();
    const usuario = resources[0];

    console.log('Usuario encontrado:', usuario?.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { password, ...perfil } = usuario;
    res.json(perfil);
  } catch (err) {
    console.error('Error obtenerPerfil:', err.message);
    res.status(500).json({ error: err.message || 'Error al obtener perfil' });
  }
}

async function actualizarPerfil(req, res) {
  try {
    if (!req.usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const query = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.tipo = "usuario"',
      parameters: [{ name: '@id', value: req.usuarioId }],
    };
    const { resources } = await getCosmosContainer().items.query(query).fetchAll();
    const existente = resources[0];

    if (!existente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const actualizado = {
      ...existente,
      usuarioId: existente.usuarioId || existente.id,
      nombre: req.body.nombre || existente.nombre || '',
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

    // Usar la partition key correcta: usuarioId
    const { resource } = await getCosmosContainer().item(existente.id, existente.usuarioId || existente.id).replace(actualizado);
    const { password, ...perfil } = resource;
    res.json(perfil);
  } catch (err) {
    console.error('Error actualizarPerfil:', err);
    res.status(500).json({ error: err.message || 'Error al actualizar perfil' });
  }
}

async function fixUsuarios(req, res) {
  try {
    const query = {
      query: 'SELECT * FROM c WHERE c.tipo = "usuario"'
    };

    const { resources } = await getCosmosContainer().items.query(query).fetchAll();
    let actualizados = 0;
    let errores = [];

    for (const usuario of resources) {
      if (!usuario.usuarioId) {
        try {
          usuario.usuarioId = usuario.id;
          // Usar la partition key correcta
          await getCosmosContainer().item(usuario.id, usuario.id).replace(usuario);
          actualizados++;
          console.log(`Actualizado: ${usuario.id}`);
        } catch (itemErr) {
          console.log(`Intento fallido con id como partition key, intentando con delete+create para ${usuario.id}`);
          try {
            // Si falla replace, intenta borrar y recrear
            await getCosmosContainer().item(usuario.id, usuario.id).delete();
          } catch (delErr) {
            console.log(`No se pudo borrar ${usuario.id}`);
          }
          // Crear de nuevo con usuarioId
          usuario.usuarioId = usuario.id;
          await getCosmosContainer().items.create(usuario);
          actualizados++;
          console.log(`Recreado: ${usuario.id}`);
        }
      }
    }

    res.json({
      mensaje: `✅ ${actualizados} usuarios actualizados con usuarioId`,
      total: resources.length,
      actualizados,
      sinActualizar: resources.length - actualizados
    });
  } catch (err) {
    console.error('Error fixUsuarios:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, obtenerPerfil, actualizarPerfil, fixUsuarios };