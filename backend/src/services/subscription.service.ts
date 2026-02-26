import { env } from "../config/env.js";
import { fhirBaseUrl, fhirPut } from "../repositories/fhir.client.js";
import { logger } from "../utils/logger.js";

/**
 * FHIR Subscription Registration
 *
 * On server startup, registers a rest-hook Subscription on HAPI FHIR
 * for Observation resources. HAPI will POST to our webhook whenever
 * an Observation is created or updated.
 */

const SUBSCRIPTION_ID = "backend-observation-sub";

/**
 * Register (or update) the FHIR Subscription.
 * Uses PUT with a fixed ID so it's idempotent — safe to call on every startup.
 *
 * Skipped if BACKEND_WEBHOOK_URL is not configured.
 */
export const registerFhirSubscription = async (): Promise<void> => {
  const webhookUrl = env.BACKEND_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn(
      "BACKEND_WEBHOOK_URL not set — skipping FHIR Subscription registration. Alerts will not work.",
    );
    return;
  }

  const webhookSecret = env.WEBHOOK_SECRET;

  const channelEndpoint = `${webhookUrl.replace(/\/+$/, "")}/api/alerts/webhook`;

  const subscription: Record<string, unknown> = {
    resourceType: "Subscription",
    id: SUBSCRIPTION_ID,
    status: "active",
    reason: "Monitor new Observations for clinical alerts",
    criteria: "Observation?",
    channel: {
      type: "rest-hook",
      endpoint: channelEndpoint,
      payload: "application/fhir+json",
      ...(webhookSecret
        ? { header: [`X-Webhook-Secret: ${webhookSecret}`] }
        : {}),
    },
  };

  try {
    await fhirPut(
      `${fhirBaseUrl()}/Subscription/${SUBSCRIPTION_ID}`,
      subscription,
    );
    logger.info(
      `FHIR Subscription registered: ${SUBSCRIPTION_ID} → ${channelEndpoint}`,
    );
  } catch (err) {
    logger.error(
      `Failed to register FHIR Subscription: %s`,
      err instanceof Error ? err.message : String(err),
    );
    // Non-fatal — server can start without alerts
  }
};
