import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectMongo } from "./mongo.js";
import { attachLiveSignaling } from "./modules/live/signaling.js";

const config = loadConfig();
const { client, db } = await connectMongo(config);
const server = createApp({ db, config }).listen(config.PORT, () => {
  console.log("SinfLab API listening on port " + config.PORT);
});
const signaling = attachLiveSignaling(server, { db, config });

async function shutdown() {
  server.close();
  signaling.close();
  await client.close();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
