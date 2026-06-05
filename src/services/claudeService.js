const axios = require('axios');

async function generarResumen(transcripcion) {
  const locutoresTexto = transcripcion.locutores
    .map(l => `Locutor ${l.id}:\n${l.segmentos.map(s => s.texto).join(' ')}`)
    .join('\n\n');

  const prompt = `Eres un asistente especializado en analizar transcripciones de audio con múltiples locutores.

Aquí está la transcripción:

${locutoresTexto}

Por favor genera:
1. Un resumen general de la conversación (3-5 oraciones)
2. Los puntos clave mencionados
3. Tareas o compromisos mencionados por cada locutor (si los hay)

Responde en español y de forma clara y estructurada.`;

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  return response.data.content[0].text;
}

module.exports = { generarResumen };
