import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getMongoDb } from "./db.js";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// Named function so TypeScript infers the full return type (including additionalFields).
// auth.$Infer.Session will correctly include role and linked FHIR ids.
function createAuth() {
  const isTest = env.NODE_ENV === "test";
  const isProduction = env.NODE_ENV === "production";
  const rateLimitEnabled =
    env.BETTER_AUTH_RATE_LIMIT_ENABLED ?? (isTest ? false : true);
  const rateLimitWindow = env.BETTER_AUTH_RATE_LIMIT_WINDOW ?? 60;
  const rateLimitMax =
    env.BETTER_AUTH_RATE_LIMIT_MAX ?? (isProduction ? 60 : 300);

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.FRONTEND_URL],
    database: mongodbAdapter(getMongoDb()),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "email-password"],
      },
    },
    rateLimit: {
      enabled: rateLimitEnabled,
      window: rateLimitWindow,
      max: rateLimitMax,
    },
    user: {
      additionalFields: {
        role: {
          type: ["patient", "practitioner", "admin"] as const,
          required: false,
          defaultValue: "patient",
          input: false,
        },
        fhirPatientId: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
        fhirPractitionerId: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
      },
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
  });
}

// Initialized after MongoDB connects — call initAuth() in startServer()
export type AuthInstance = ReturnType<typeof createAuth>;
export let auth!: AuthInstance;

export const initAuth = () => {
  auth = createAuth();
  logger.info("Better-Auth initialized");
};
