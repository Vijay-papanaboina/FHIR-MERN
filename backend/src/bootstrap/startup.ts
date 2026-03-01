import type { Express } from "express";
import { env } from "../config/env.js";
import { connectMongo } from "../config/db.js";
import { initAuth } from "../config/auth.js";
import { verifyFhirConnection } from "../config/fhir.js";
import { registerFhirSubscription } from "../services/subscription.service.js";
import { logger } from "../utils/logger.js";

const FHIR_BOOTSTRAP_RETRY_MS = 10_000;
const CORE_BOOTSTRAP_RETRY_MS = 5_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const bootstrapFhir = async (): Promise<void> => {
  for (;;) {
    try {
      await verifyFhirConnection();
      await registerFhirSubscription();
      logger.info("FHIR bootstrap completed");
      return;
    } catch (err) {
      logger.warn(
        `FHIR bootstrap retry in ${FHIR_BOOTSTRAP_RETRY_MS / 1000}s: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await sleep(FHIR_BOOTSTRAP_RETRY_MS);
    }
  }
};

const bootstrapMongo = async (): Promise<void> => {
  for (;;) {
    try {
      await connectMongo();
      return;
    } catch (err) {
      logger.warn(
        `Mongo bootstrap retry in ${CORE_BOOTSTRAP_RETRY_MS / 1000}s: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await sleep(CORE_BOOTSTRAP_RETRY_MS);
    }
  }
};

export const bootstrapInfra = async (): Promise<void> => {
  await bootstrapMongo();
  initAuth();
  await bootstrapFhir();
};
