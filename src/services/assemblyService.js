const client = require('../config/assemblyai');

async function transcribirAudio(audioBuffer) {
  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,
    speaker_labels: true,
    language_code: 'es',
  });

  if (transcript.status === 'error') {
    throw new Error(`AssemblyAI error: ${transcript.error}`);
  }

  const locutoresMap = {};
  for (const utterance of transcript.utterances || []) {
    const id = utterance.speaker;
    if (!locutoresMap[id]) locutoresMap[id] = { id, segmentos: [] };
    locutoresMap[id].segmentos.push({
      inicio: utterance.start / 1000,
      fin: utterance.end / 1000,
      texto: utterance.text,
    });
  }

  return {
    textoCompleto: transcript.text,
    locutores: Object.values(locutoresMap),
    duracionSegundos: transcript.audio_duration,
  };
}

async function obtenerEstado(transcriptId) {
  const transcript = await client.transcripts.get(transcriptId);
  return transcript.status;
}

module.exports = { transcribirAudio, obtenerEstado };
