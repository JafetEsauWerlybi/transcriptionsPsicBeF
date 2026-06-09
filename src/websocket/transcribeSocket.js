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

    // Conectar al WebSocket de AssemblyAI
    const aaiWs = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${process.env.ASSEMBLYAI_API_KEY}`);

    aaiWs.on('open', () => {
      ws.send(JSON.stringify({ tipo: 'conectado' }));
    });

    aaiWs.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.message_type === 'FinalTranscript' && msg.text) {
        const segmento = {
          texto: msg.text,
          locutor: msg.words?.[0]?.speaker || 'A',
          inicio: msg.audio_start / 1000,
          fin: msg.audio_end / 1000,
        };
        segmentos.push(segmento);
        ws.send(JSON.stringify({ tipo: 'segmento', ...segmento }));
      } else if (msg.message_type === 'PartialTranscript') {
        ws.send(JSON.stringify({ tipo: 'parcial', texto: msg.text }));
      }
    });

    // Recibir audio del cliente y reenviar a AssemblyAI
    ws.on('message', (data) => {
      if (aaiWs.readyState === WebSocket.OPEN) {
        if (Buffer.isBuffer(data)) {
          aaiWs.send(JSON.stringify({ audio_data: data.toString('base64') }));
        }
      }
    });

    ws.on('close', async () => {
      aaiWs.close();

      // Guardar transcripción completa
      const locutoresMap = {};
      for (const seg of segmentos) {
        if (!locutoresMap[seg.locutor]) locutoresMap[seg.locutor] = { id: seg.locutor, segmentos: [] };
        locutoresMap[seg.locutor].segmentos.push({ inicio: seg.inicio, fin: seg.fin, texto: seg.texto });
      }

      await actualizarTranscripcion(transcripcionId, usuarioId, {
        estado: 'completado',
        textoCompleto: segmentos.map(s => s.texto).join(' '),
        locutores: Object.values(locutoresMap),
      });
    });

    aaiWs.on('error', (err) => {
      console.error('AssemblyAI WS error:', err);
      ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Error en transcripción en tiempo real' }));
    });
  });
}

module.exports = { iniciarWebSocket };
