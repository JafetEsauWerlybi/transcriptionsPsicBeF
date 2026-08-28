const axios = require('axios');

async function generarResumen(transcripcion) {
  const locutoresTexto = transcripcion.locutores
    .map(l => `Locutor ${l.id}:\n${l.segmentos.map(s => s.texto).join(' ')}`)
    .join('\n\n');

  const prompt = `Analiza esta transcripción desde perspectiva clínica y psicológica:

**1. INDICADORES PSICOPATOLÓGICOS:**
- Identificar síntomas de trastornos mentales según criterios diagnósticos contemporáneos (depresión, ansiedad, TEPT, trastornos de personalidad, etc.)
- Mecanismos de defensa psicológica (represión, proyección, racionalización, disociación, etc.)
- Patrones cognitivos distorsionados (catastrofismo, generalización excesiva, pensamiento dicotómico, rumiación)
- Síntomas específicos mencionados con frecuencia e intensidad

**2. ANÁLISIS DE PATRONES DE LENGUAJE:**
- Palabras/frases que se repiten (indicar cuántas veces)
- Temas que evita, minimiza o esquiva
- Fluctuaciones de tono emocional durante la conversación
- Inconsistencias o contradicciones en el relato
- Patrones de culpa, vergüenza, baja autoestima, autosabotaje
- Quejas somáticas que sugieren somatización

**3. DINÁMICA RELACIONAL:**
- Patrones en relaciones interpersonales
- Estilos de apego (ansioso, evitativo, desorganizado)
- Grado de introspección y autoconciencia
- Nivel de resistencia o aceptación de problemas

**4. FACTORES DE RIESGO INMEDIATOS:**
- Ideación o intención autolesiva/suicida
- Consumo de sustancias
- Aislamiento extremo
- Trauma reciente o estrés severo

**5. EVALUACIÓN CLÍNICA:**
- Congruencia emocional y afectiva
- Severidad del sufrimiento psicológico
- Recursos y estrategias de afrontamiento
- Nivel de urgencia de intervención

Transcripción:

${locutoresTexto}

Proporciona análisis específico citando ejemplos del texto.`;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-opus-5-20250805',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2024-06-01',
          'content-type': 'application/json',
        },
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error('=== ANTHROPIC API ERROR ===');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);

    // Log everything we can about the error
    if (error.response?.data) {
      console.error('Response Type:', error.response.data.type);
      if (error.response.data.error) {
        console.error('Error Object:', JSON.stringify(error.response.data.error, null, 2));
      }
    }
    console.error('========================');
    throw error;
  }
}

module.exports = { generarResumen };
