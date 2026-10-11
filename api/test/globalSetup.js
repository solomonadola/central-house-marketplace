import { MongoMemoryServer } from 'mongodb-memory-server';

// One in-memory MongoDB for the whole run; each test file uses its own
// database on it (see setup.js).
let mongo;

export async function setup({ provide }) {
  mongo = await MongoMemoryServer.create();
  provide('mongoUri', mongo.getUri());
}

export async function teardown() {
  await mongo?.stop();
}
