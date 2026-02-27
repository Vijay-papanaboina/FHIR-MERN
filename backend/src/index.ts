import { env } from "./config/env.js";
import { connectMongo } from "./config/db.js";
import { verifyFhirConnection } from "./config/fhir.js";
import { initAuth } from "./config/auth.js";
import { logger } from "./utils/logger.js";
import { registerFhirSubscription } from "./services/subscription.service.js";
import { createApp } from "./app.js";

const app = createApp();
const port = env.PORT;

// ── Startup ─────────────────────────────────────────────────────
const startServer = async () => {
  await connectMongo();
  initAuth();
  await verifyFhirConnection();
  await registerFhirSubscription();

  app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
  });
};

startServer().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});
