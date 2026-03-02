import { env } from "../config/env.js";
import { fhirBaseUrl, fhirPut } from "../repositories/fhir.client.js";
import { logger } from "../utils/logger.js";

interface SubscriptionConfig {
  id: string;
  reason: string;
  criteria: string;
}

const SUBSCRIPTIONS: SubscriptionConfig[] = [
  {
    id: "backend-vitals-observation-sub",
    reason: "Monitor vital-sign observations for clinical alerts",
    criteria: "Observation?category=vital-signs",
  },
  {
    id: "backend-diagnostic-report-sub",
    reason: "Monitor diagnostic report lifecycle updates",
    criteria: "DiagnosticReport?",
  },
  {
    id: "backend-diagnostic-observation-sub",
    reason:
      "Monitor laboratory observations for diagnostic result notifications",
    criteria: "Observation?category=laboratory",
  },
];

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

  for (const item of SUBSCRIPTIONS) {
    const subscription: Record<string, unknown> = {
      resourceType: "Subscription",
      id: item.id,
      status: "active",
      reason: item.reason,
      criteria: item.criteria,
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
      await fhirPut(`${fhirBaseUrl()}/Subscription/${item.id}`, subscription);
      logger.info(
        `FHIR Subscription registered: ${item.id} → ${channelEndpoint}`,
      );
    } catch (err) {
      logger.error(
        `Failed to register FHIR Subscription ${item.id}: %s`,
        err instanceof Error ? err.message : String(err),
      );
      // Non-fatal — server can start without alerts
    }
  }
};
