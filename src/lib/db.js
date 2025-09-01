import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.DATABASE_URL || "mongodb://localhost:27017";
if (!MONGODB_URI) throw new Error("Missing DATABASE_URL env var");

const DEFAULT_DB = process.env.MONGODB_DB || "Queue";
const MAX_POOL = parseInt(process.env.MONGODB_MAX_POOL_SIZE || "5", 10);

const options = {
  maxPoolSize: MAX_POOL,
  minPoolSize: 0,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
};

let cached = globalThis._mongo;
if (!cached) {
  const client = new MongoClient(MONGODB_URI, options);
  cached = { client, promise: client.connect() };
  globalThis._mongo = cached;
}

export async function getClient() {
  const { client, promise } = cached;
  await promise;
  return client;
}

export async function getDb() {
  const client = await getClient();
  return client.db(DEFAULT_DB);
}

export async function closeClient() {
  const { client } = cached || {};
  if (client) {
    await client.close();
    globalThis._mongo = null;
  }
}

export default { getClient, getDb, closeClient };
