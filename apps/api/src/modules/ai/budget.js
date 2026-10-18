import { HttpError } from "../../shared/errors.js";

export async function reserveAiRequest(db, userId, limit = 20, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const key = `${userId}:${day}`;
  const collection = db.collection("ai_usage");
  try {
    await collection.insertOne({ _id: key, userId, day, count: 1, createdAt: now });
    return { remaining: limit - 1, limit };
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const updated = await collection.updateOne({ _id: key, count: { $lt: limit } }, { $inc: { count: 1 } });
  if (!updated.matchedCount) throw new HttpError(429, "AI_DAILY_LIMIT", "Daily AI request limit reached");
  const usage = await collection.findOne({ _id: key });
  return { remaining: Math.max(0, limit - usage.count), limit };
}
