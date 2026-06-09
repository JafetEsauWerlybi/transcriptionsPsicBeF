const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');

let _containerClient = null;
let _cosmosContainer = null;

function getContainerClient() {
  if (!_containerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    _containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER
    );
  }
  return _containerClient;
}

function getCosmosContainer() {
  if (!_cosmosContainer) {
    const cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });
    _cosmosContainer = cosmosClient
      .database(process.env.COSMOS_DATABASE)
      .container(process.env.COSMOS_CONTAINER);
  }
  return _cosmosContainer;
}

module.exports = { getContainerClient, getCosmosContainer };