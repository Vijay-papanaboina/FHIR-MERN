import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getMongoDb } from "./db.js";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// Named function so TypeScript infers the full return type (including additionalFields).
// auth.$Infer.Session will correctly include `role` and `fhirPatientId`.
function createAuth() {
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
