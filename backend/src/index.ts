import { bootstrapInfra } from "./bootstrap/startup.js";
import { logger } from "./utils/logger.js";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

async function startServer() {
  try {
    await bootstrapInfra();
    app.listen(env.PORT, () => {
      logger.info(`Server running at http://localhost:${env.PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
}

startServer();
