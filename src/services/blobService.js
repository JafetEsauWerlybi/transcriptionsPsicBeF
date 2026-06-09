const { getContainerClient } = require('../config/azure');
const { BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

function generarSasUrl(blobName) {
  const accountName = process.env.AZURE_STORAGE_CONNECTION_STRING.split('AccountName=')[1].split(';')[0];
  const accountKey = process.env.AZURE_STORAGE_CONNECTION_STRING.split('AccountKey=')[1].split(';')[0];
  const containerName = process.env.AZURE_STORAGE_CONTAINER;

  const permissions = new BlobSASPermissions({ read: true });
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24); // 24 horas válido

  const sasQueryParams = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions,
      expiresOn: expiryDate,
    },
    { accountName, accountKey }
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasQueryParams}`;
}

async function subirAudio(buffer, mimetype) {
  const extension = mimetype.split('/')[1].replace('x-m4a', 'm4a').replace('mpeg', 'mp3');
  const nombre = `${uuidv4()}.${extension}`;
  const blockBlobClient = getContainerClient().getBlockBlobClient(nombre);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype },
  });
  return generarSasUrl(nombre);
}

async function eliminarAudio(url) {
  const nombre = url.split('/')[0].split('.')[url.split('/')[0].split('.').length - 1];
  const blobName = url.split('/').pop().split('?')[0];
  const blockBlobClient = getContainerClient().getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

module.exports = { subirAudio, eliminarAudio };