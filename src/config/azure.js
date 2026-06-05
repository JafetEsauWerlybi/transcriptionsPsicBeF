const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');

// Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_STORAGE_CONTAINER
);

// Cosmos DB
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});
const cosmosContainer = cosmosClient
  .database(process.env.COSMOS_DATABASE)
  .container(process.env.COSMOS_CONTAINER);

module.exports = { containerClient, cosmosContainer };
