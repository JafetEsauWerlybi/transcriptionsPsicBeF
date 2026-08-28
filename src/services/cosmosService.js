const { getCosmosContainer } = require('../config/azure');

async function crearTranscripcion(data) {
  const { resource } = await getCosmosContainer().items.create(data);
  return resource;
}

async function obtenerTranscripcion(id, usuarioId) {
  const { resource } = await getCosmosContainer().item(id, id).read();
  return resource;
}

async function listarTranscripciones(usuarioId) {
  const query = {
    query: 'SELECT * FROM c WHERE c.usuarioId = @uid ORDER BY c.creadoEn DESC',
    parameters: [{ name: '@uid', value: usuarioId }],
  };
  const { resources } = await getCosmosContainer().items.query(query).fetchAll();
  return resources;
}

async function actualizarTranscripcion(id, usuarioId, campos) {
  const { resource: existente } = await getCosmosContainer().item(id, id).read();
  const actualizado = { ...existente, ...campos };
  const { resource } = await getCosmosContainer().item(id, id).replace(actualizado);
  return resource;
}

async function eliminarTranscripcion(id, usuarioId) {
  await getCosmosContainer().item(id, id).delete();
}

module.exports = {
  crearTranscripcion,
  obtenerTranscripcion,
  listarTranscripciones,
  actualizarTranscripcion,
  eliminarTranscripcion,
};