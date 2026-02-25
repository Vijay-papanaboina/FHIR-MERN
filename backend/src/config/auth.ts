import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { getMongoDb } from './db.js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Initialized after MongoDB connects — call initAuth() in startServer()
export let auth: ReturnType<typeof betterAuth>;

export const initAuth = () => {
    auth = betterAuth({
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
                trustedProviders: ['google', 'email-password'],
            },
        },
        user: {
            additionalFields: {
                role: {
                    type: ['patient', 'practitioner', 'admin'] as const,
                    required: false,
                    defaultValue: 'patient',
                    input: false,
                },
                fhirPatientId: {
                    type: 'string',
                    required: false,
                    defaultValue: null,
                },
            },
        },
    });
    logger.info('Better-Auth initialized');
};
