const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
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

    // 2. En paralelo: subir a Azure Blob y transcribir
    setImmediate(async () => {
      try {
        const fileBuffer = await fs.readFile(req.file.path);

        await Promise.all([
          subirAudio(fileBuffer, req.file.mimetype)
            .then(audioUrl => actualizarTranscripcion(id, req.usuarioId, { audioUrl })),
          transcribirAudio(fileBuffer)
            .then(resultado => actualizarTranscripcion(id, req.usuarioId, {
              estado: 'completado',
              textoCompleto: resultado.textoCompleto,
              locutores: resultado.locutores,
              duracionSegundos: resultado.duracionSegundos,
            }))
        ]);
      } catch (err) {
        console.error('Error transcripción:', err);
        await actualizarTranscripcion(id, req.usuarioId, { estado: 'error' });
      } finally {
        try {
          await fs.unlink(req.file.path);
        } catch (e) {}
      }
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

async function descargarAudio(req, res) {
  try {
    const transcripcion = await obtenerTranscripcion(req.params.id, req.usuarioId);
    if (!transcripcion) return res.status(404).json({ error: 'No encontrado' });
    if (!transcripcion.audioUrl) return res.status(404).json({ error: 'Sin audio' });

    const axios = require('axios');
    const response = await axios.get(transcripcion.audioUrl, { responseType: 'arraybuffer' });

    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Content-Disposition', 'inline');
    res.send(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al descargar audio' });
  }
}

module.exports = { upload, obtenerEstado, descargarAudio };
