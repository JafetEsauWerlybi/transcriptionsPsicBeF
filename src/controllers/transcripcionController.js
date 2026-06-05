const {
  listarTranscripciones,
  obtenerTranscripcion,
  eliminarTranscripcion,
  actualizarTranscripcion,
} = require('../services/cosmosService');
const { eliminarAudio } = require('../services/blobService');
const { generarResumen } = require('../services/claudeService');

async function listar(req, res) {
  try {
    const lista = await listarTranscripciones(req.usuarioId);
    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar transcripciones' });
  }
}

async function detalle(req, res) {
  try {
    const t = await obtenerTranscripcion(req.params.id, req.usuarioId);
    if (!t) return res.status(404).json({ error: 'No encontrada' });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener transcripción' });
  }
}

async function eliminar(req, res) {
  try {
    const t = await obtenerTranscripcion(req.params.id, req.usuarioId);
    if (!t) return res.status(404).json({ error: 'No encontrada' });
    await eliminarAudio(t.audioUrl);
    await eliminarTranscripcion(req.params.id, req.usuarioId);
    res.json({ mensaje: 'Eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar' });
  }
}

async function resumir(req, res) {
  try {
    const t = await obtenerTranscripcion(req.params.id, req.usuarioId);
    if (!t) return res.status(404).json({ error: 'No encontrada' });
    if (t.estado !== 'completado') return res.status(400).json({ error: 'Transcripción no completada aún' });

    const resumen = await generarResumen(t);
    await actualizarTranscripcion(req.params.id, req.usuarioId, { resumen });
    res.json({ resumen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar resumen' });
  }
}

module.exports = { listar, detalle, eliminar, resumir };
