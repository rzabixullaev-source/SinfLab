import { ObjectId } from "mongodb";
import { createApp } from "../src/app.js";

function equalValue(a, b) {
  if (a instanceof ObjectId || b instanceof ObjectId) return String(a) === String(b);
  if (a instanceof Date || b instanceof Date) return +a === +b;
  return a === b;
}

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    const actual = document[key];
    if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !(expected instanceof Date)) {
      if ("$in" in expected) return expected.$in.some((item) => equalValue(actual, item));
      if ("$gt" in expected) return actual > expected.$gt;
      if ("$lt" in expected) return actual < expected.$lt;
    }
    return equalValue(actual, expected);
  });
}

class MemoryCollection {
  constructor() {
    this.documents = [];
  }
  async createIndex() {}
  async findOne(query) {
    return this.documents.find((item) => matches(item, query)) ?? null;
  }
  find(query) {
    let rows = this.documents.filter((item) => matches(item, query));
    const cursor = {
      sort(spec) {
        const [field, direction] = Object.entries(spec)[0];
        rows.sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * direction);
        return cursor;
      },
      limit(count) {
        rows = rows.slice(0, count);
        return cursor;
      },
      async toArray() { return [...rows]; },
    };
    return cursor;
  }
  async insertOne(document) {
    if ("emailLower" in document && this.documents.some((item) => item.emailLower === document.emailLower)) {
      const error = new Error("duplicate");
      error.code = 11000;
      throw error;
    }
    this.documents.push(document);
    return { insertedId: document._id };
  }
  async updateOne(query, update) {
    const item = this.documents.find((value) => matches(value, query));
    if (!item) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) Object.assign(item, update.$set);
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) item[key] += value;
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async deleteOne(query) {
    const index = this.documents.findIndex((item) => matches(item, query));
    if (index < 0) return { deletedCount: 0 };
    this.documents.splice(index, 1);
    return { deletedCount: 1 };
  }
}

export function memoryDb() {
  const collections = new Map();
  const files = new Map();
  return {
    command: async () => ({ ok: 1 }),
    withTransaction: async (work) => work(undefined),
    uploadFile: async (id, buffer) => { files.set(String(id), Buffer.from(buffer)); },
    readFile: async (id) => files.get(String(id)) ?? null,
    deleteFile: async (id) => { files.delete(String(id)); },
    collection(name) {
      if (!collections.has(name)) collections.set(name, new MemoryCollection());
      return collections.get(name);
    },
  };
}

export async function withServer(db, run) {
  const config = {
    CORS_ORIGIN: "http://localhost:5173",
    JWT_SECRET: "a-long-secret-for-local-tests-only-0123456789",
  };
  const server = createApp({ db, config }).listen(0);
  try {
    await run("http://127.0.0.1:" + server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export async function requestJson(base, path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = "Bearer " + token;
  const response = await fetch(base + "/api/v1" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
