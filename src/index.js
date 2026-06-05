require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const authRoutes = require('./routes/auth');
const audioRoutes = require('./routes/audio');
const transcripcionRoutes = require('./routes/transcripciones');
const { iniciarWebSocket } = require('./websocket/transcribeSocket');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/live' });

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/transcripciones', transcripcionRoutes);

app.get('/', (req, res) =>
  res.json({ status: 'ok', mensaje: 'AppPsicoAudios API corriendo 🎙️' })
);

iniciarWebSocket(wss);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
