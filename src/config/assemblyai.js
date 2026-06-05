const { AssemblyAI } = require('assemblyai');

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

module.exports = client;
