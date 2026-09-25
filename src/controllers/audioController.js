const { v4: uuidv4 } = require('uuid');
const { generarNombreBlob, generarUrlSubida, generarUrlLectura } = require('../services/blobService');
const { transcribirAudio } = require('../services/assemblyService');
const { crearTranscripcion, actualizarTranscripcion, obtenerTranscripcion } = require('../services/cosmosService');

const MIME_PERMITIDOS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg'];

async function iniciarUpload(req, res) {
  try {
    const { mimetype } = req.body;
    if (!mimetype) return res.status(400).json({ error: 'mimetype requerido' });
    if (!MIME_PERMITIDOS.includes(mimetype)) return res.status(400).json({ error: 'Formato de audio no soportado' });

    const id = uuidv4();
    const blobName = generarNombreBlob(mimetype);
    console.log(`[UPLOAD-INIT] ${id}, blob: ${blobName}, usuario: ${req.usuarioId}`);

    await crearTranscripcion({
      id,
      usuarioId: req.usuarioId,
      tipo: 'archivo',
      estado: 'subiendo',
      audioUrl: null,
      duracionSegundos: null,
      locutores: [],
      textoCompleto: null,
      resumen: null,
      puntosClave: [],
      creadoEn: new Date().toISOString(),
    });

    res.json({ id, blobName, sasUrl: generarUrlSubida(blobName) });
  } catch (err) {
    console.error('[UPLOAD-INIT] ❌ Error:', err);
    res.status(500).json({ error: 'Error al iniciar la subida' });
  }
}

async function confirmarUpload(req, res) {
  try {
    const { id } = req.params;
    const { blobName } = req.body;
    if (!blobName) return res.status(400).json({ error: 'blobName requerido' });

    const t = await obtenerTranscripcion(id, req.usuarioId);
    if (!t) return res.status(404).json({ error: 'No encontrada' });

    await actualizarTranscripcion(id, req.usuarioId, { estado: 'procesando' });
    res.json({ id, estado: 'procesando' });

    // En background: leer de Azure Blob y transcribir
    setImmediate(async () => {
      try {
        const audioUrl = generarUrlLectura(blobName);
        console.log(`[UPLOAD-COMMIT] Guardado en Azure: ${audioUrl}`);
        await actualizarTranscripcion(id, req.usuarioId, { audioUrl });

        console.log(`[UPLOAD-COMMIT] Transcribiendo con AssemblyAI...`);
        const resultado = await transcribirAudio(audioUrl);
        console.log(`[UPLOAD-COMMIT] Transcripción completada: ${resultado.textoCompleto.length} caracteres`);
        await actualizarTranscripcion(id, req.usuarioId, {
          estado: 'completado',
          textoCompleto: resultado.textoCompleto,
          locutores: resultado.locutores,
          duracionSegundos: resultado.duracionSegundos,
        });
        console.log(`[UPLOAD-COMMIT] ✅ Proceso completado: ${id}`);
      } catch (err) {
        console.error(`[UPLOAD-COMMIT] ❌ Error en transcripción (${id}):`, err.message);
        try {
          await actualizarTranscripcion(id, req.usuarioId, { estado: 'error' });
        } catch (e) {}
      }
    });
  } catch (err) {
    console.error('[UPLOAD-COMMIT] ❌ Error:', err);
    res.status(500).json({ error: 'Error al confirmar la subida' });
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

module.exports = { iniciarUpload, confirmarUpload, obtenerEstado, descargarAudio };
