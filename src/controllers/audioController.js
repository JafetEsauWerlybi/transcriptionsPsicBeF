const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const { subirAudio } = require('../services/blobService');
const { transcribirAudio } = require('../services/assemblyService');
const { crearTranscripcion, actualizarTranscripcion, obtenerTranscripcion } = require('../services/cosmosService');

async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Archivo de audio requerido' });

  try {
    const id = uuidv4();
    console.log(`[UPLOAD] Iniciando upload: ${id}, tamaño: ${req.file.size} bytes, usuario: ${req.usuarioId}`);

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

    console.log(`[UPLOAD] Registro creado en Cosmos: ${id}`);
    res.json({ id, estado: 'procesando' });

    // 2. En background: subir a Azure Blob y transcribir
    setImmediate(async () => {
      try {
        console.log(`[UPLOAD] Leyendo archivo del disco: ${req.file.path}`);
        const fileBuffer = await fs.readFile(req.file.path);
        console.log(`[UPLOAD] Archivo leído: ${fileBuffer.length} bytes`);

        // Subir a Azure Blob
        console.log(`[UPLOAD] Subiendo a Azure Blob...`);
        const audioUrl = await subirAudio(fileBuffer, req.file.mimetype);
        console.log(`[UPLOAD] Guardado en Azure: ${audioUrl}`);
        await actualizarTranscripcion(id, req.usuarioId, { audioUrl });

        // Transcribir (secuencial, no paralelo, para evitar sobrecarga)
        console.log(`[UPLOAD] Transcribiendo con AssemblyAI...`);
        const resultado = await transcribirAudio(fileBuffer);
        console.log(`[UPLOAD] Transcripción completada: ${resultado.textoCompleto.length} caracteres`);
        await actualizarTranscripcion(id, req.usuarioId, {
          estado: 'completado',
          textoCompleto: resultado.textoCompleto,
          locutores: resultado.locutores,
          duracionSegundos: resultado.duracionSegundos,
        });
        console.log(`[UPLOAD] ✅ Proceso completado: ${id}`);
      } catch (err) {
        console.error(`[UPLOAD] ❌ Error en transcripción (${id}):`, err.message);
        console.error(err);
        try {
          await actualizarTranscripcion(id, req.usuarioId, { estado: 'error' });
        } catch (e) {}
      } finally {
        try {
          await fs.unlink(req.file.path);
          console.log(`[UPLOAD] Archivo temporal eliminado`);
        } catch (e) {}
      }
    });

  } catch (err) {
    console.error(`[UPLOAD] ❌ Error inicial:`, err.message);
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
