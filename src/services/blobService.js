const { getContainerClient } = require('../config/azure');
const { StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

function generarSasUrl(blobName) {
  const accountName = process.env.AZURE_STORAGE_CONNECTION_STRING.split('AccountName=')[1].split(';')[0];
  const accountKey = process.env.AZURE_STORAGE_CONNECTION_STRING.split('AccountKey=')[1].split(';')[0];
  const containerName = process.env.AZURE_BLOB_CONTAINER_NAME;

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  const permissions = new BlobSASPermissions({ read: true });
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);

  const sasQueryParams = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions,
      expiresOn: expiryDate,
    },
    sharedKeyCredential
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
  const blobName = url.split('/').pop().split('?')[0];
  const blockBlobClient = getContainerClient().getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

module.exports = { subirAudio, eliminarAudio };