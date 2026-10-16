import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectMongo } from "./mongo.js";

const config = loadConfig();
const { client, db } = await connectMongo(config);
const server = createApp({ db, config }).listen(config.PORT, () => {
  console.log("SinfLab API listening on port " + config.PORT);
});

async function shutdown() {
  server.close();
  await client.close();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
