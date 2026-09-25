const { getContainerClient } = require('../config/azure');
const { StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

function datosCuenta() {
  const accountName = process.env.AZURE_STORAGE_CONNECTION_STRING.split('AccountName=')[1].split(';')[0];
  const accountKey = process.env.AZURE_STORAGE_CONNECTION_STRING.split('AccountKey=')[1].split(';')[0];
  const containerName = process.env.AZURE_STORAGE_CONTAINER;
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  return { accountName, containerName, sharedKeyCredential };
}

function generarSasUrl(blobName, permissions, horasExpiracion) {
  const { accountName, containerName, sharedKeyCredential } = datosCuenta();

  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + horasExpiracion);

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

function generarUrlLectura(blobName) {
  return generarSasUrl(blobName, new BlobSASPermissions({ read: true }), 24);
}

function generarNombreBlob(mimetype) {
  const extension = mimetype.split('/')[1].replace('x-m4a', 'm4a').replace('mpeg', 'mp3');
  return `${uuidv4()}.${extension}`;
}

function generarUrlSubida(blobName) {
  const permisos = new BlobSASPermissions({ read: true, write: true, create: true, add: true });
  return generarSasUrl(blobName, permisos, 2);
}

async function subirAudio(buffer, mimetype) {
  const nombre = generarNombreBlob(mimetype);
  const blockBlobClient = getContainerClient().getBlockBlobClient(nombre);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype },
  });
  return generarUrlLectura(nombre);
}

async function eliminarAudio(url) {
  if (!url) return;
  const blobName = url.split('/').pop().split('?')[0];
  const blockBlobClient = getContainerClient().getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

module.exports = { subirAudio, eliminarAudio, generarNombreBlob, generarUrlSubida, generarUrlLectura };