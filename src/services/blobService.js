const { containerClient } = require('../config/azure');
const { v4: uuidv4 } = require('uuid');

async function subirAudio(buffer, mimetype) {
  const extension = mimetype.split('/')[1].replace('x-m4a', 'm4a').replace('mpeg', 'mp3');
  const nombre = `${uuidv4()}.${extension}`;
  const blockBlobClient = containerClient.getBlockBlobClient(nombre);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype },
  });

  return blockBlobClient.url;
}

async function eliminarAudio(url) {
  const nombre = url.split('/').pop();
  const blockBlobClient = containerClient.getBlockBlobClient(nombre);
  await blockBlobClient.deleteIfExists();
}

module.exports = { subirAudio, eliminarAudio };
