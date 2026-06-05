const { cosmosContainer } = require('../config/azure');

async function crearTranscripcion(data) {
  const { resource } = await cosmosContainer.items.create(data);
  return resource;
}

async function obtenerTranscripcion(id, usuarioId) {
  const { resource } = await cosmosContainer.item(id, usuarioId).read();
  return resource;
}

async function listarTranscripciones(usuarioId) {
  const query = {
    query: 'SELECT * FROM c WHERE c.usuarioId = @uid ORDER BY c.creadoEn DESC',
    parameters: [{ name: '@uid', value: usuarioId }],
  };
  const { resources } = await cosmosContainer.items.query(query).fetchAll();
  return resources;
}

async function actualizarTranscripcion(id, usuarioId, campos) {
  const { resource: existente } = await cosmosContainer.item(id, usuarioId).read();
  const actualizado = { ...existente, ...campos };
  const { resource } = await cosmosContainer.item(id, usuarioId).replace(actualizado);
  return resource;
}

async function eliminarTranscripcion(id, usuarioId) {
  await cosmosContainer.item(id, usuarioId).delete();
}

module.exports = {
  crearTranscripcion,
  obtenerTranscripcion,
  listarTranscripciones,
  actualizarTranscripcion,
  eliminarTranscripcion,
};
