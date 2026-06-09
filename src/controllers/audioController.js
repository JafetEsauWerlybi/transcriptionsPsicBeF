const { v4: uuidv4 } = require('uuid');
const { subirAudio } = require('../services/blobService');
const { transcribirAudio } = require('../services/assemblyService');
const { crearTranscripcion, actualizarTranscripcion, obtenerTranscripcion } = require('../services/cosmosService');

async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Archivo de audio requerido' });

  try {
    const id = uuidv4();

    // 1. Crear registro en Cosmos DB con estado "procesando"
    await crearTranscripcion({
      id,
      usuarioId: req.usuarioId,
      tipo: 'archivo',
      estado: 'procesando',
      audioUrl: null,
      duracionSegundos: null,
      locutores: [],
      textoCompleto: null,
      resumen: null,
      puntosClave: [],
      creadoEn: new Date().toISOString(),
    });

    res.json({ id, estado: 'procesando' });

    // 2. En paralelo: subir a Azure Blob y transcribir directamente
    Promise.all([
      subirAudio(req.file.buffer, req.file.mimetype)
        .then(audioUrl => actualizarTranscripcion(id, req.usuarioId, { audioUrl })),
      transcribirAudio(req.file.buffer)
        .then(resultado => actualizarTranscripcion(id, req.usuarioId, {
          estado: 'completado',
          textoCompleto: resultado.textoCompleto,
          locutores: resultado.locutores,
          duracionSegundos: resultado.duracionSegundos,
        }))
    ]).catch(err => {
      console.error('Error transcripción:', err);
      actualizarTranscripcion(id, req.usuarioId, { estado: 'error' });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar el audio' });
  }
}

async function obtenerEstado(req, res) {
  try {
    const transcripcion = await obtenerTranscripcion(req.params.id, req.usuarioId);
    if (!transcripcion) return res.status(404).json({ error: 'No encontrado' });
    res.json({ estado: transcripcion.estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
}

module.exports = { upload, obtenerEstado };
