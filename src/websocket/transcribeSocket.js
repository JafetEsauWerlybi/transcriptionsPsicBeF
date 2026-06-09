const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { crearTranscripcion, actualizarTranscripcion } = require('../services/cosmosService');
const { v4: uuidv4 } = require('uuid');

function iniciarWebSocket(wss) {
  wss.on('connection', async (ws, req) => {
    // Verificar token desde query param: /ws/live?token=xxx
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let usuarioId;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      usuarioId = payload.id;
    } catch {
      ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Token inválido' }));
      return ws.close();
    }

    const transcripcionId = uuidv4();
    const segmentos = [];

    // Crear registro en Cosmos DB
    await crearTranscripcion({
      id: transcripcionId,
      usuarioId,
      tipo: 'tiempo_real',
      estado: 'procesando',
      audioUrl: null,
      duracionSegundos: null,
      locutores: [],
      textoCompleto: null,
      resumen: null,
      puntosClave: [],
      creadoEn: new Date().toISOString(),
    });

    ws.send(JSON.stringify({ tipo: 'inicio', transcripcionId }));

    // Acumular chunks de audio del cliente
    const audioChunks = [];

    ws.on('message', (data) => {
      if (Buffer.isBuffer(data)) {
        audioChunks.push(data);
        // Enviar confirmación al cliente
        ws.send(JSON.stringify({ tipo: 'parcial', texto: '...' }));
      }
    });

    ws.on('close', async () => {
      try {
        // Cuando cliente cierra, procesar todo el audio acumulado
        if (audioChunks.length === 0) {
          await actualizarTranscripcion(transcripcionId, usuarioId, {
            estado: 'completado',
            textoCompleto: '',
            locutores: [],
          });
          return;
        }

        const audioBuffer = Buffer.concat(audioChunks);
        const { transcribirAudio } = require('../services/assemblyService');

        const resultado = await transcribirAudio(audioBuffer);

        await actualizarTranscripcion(transcripcionId, usuarioId, {
          estado: 'completado',
          textoCompleto: resultado.textoCompleto,
          locutores: resultado.locutores,
          duracionSegundos: resultado.duracionSegundos,
        });
      } catch (err) {
        console.error('Error procesando audio tiempo real:', err);
        await actualizarTranscripcion(transcripcionId, usuarioId, { estado: 'error' });
      }
    });
  });
}

module.exports = { iniciarWebSocket };
