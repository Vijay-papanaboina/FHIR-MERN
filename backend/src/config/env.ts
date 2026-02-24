import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load variables from .env file into process.env before validation
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
    PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),

    MONGO_URI: z.url('MONGO_URI must be a valid URL'),
    FHIR_BASE_URL: z.url('FHIR_BASE_URL must be a valid URL'),
    FHIR_USERNAME: z.string().min(1, 'FHIR_USERNAME is required'),
    FHIR_PASSWORD: z.string().min(1, 'FHIR_PASSWORD is required'),

    BETTER_AUTH_SECRET: z.string().min(10, 'BETTER_AUTH_SECRET must be at least 10 characters long'),
    BETTER_AUTH_URL: z.url('BETTER_AUTH_URL must be a valid URL'),

    GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
    GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
});

// Infer the TypeScript type from the schema
export type EnvConfig = z.infer<typeof envSchema>;

let env: EnvConfig;

try {
    // Validate process.env against the schema
    env = envSchema.parse(process.env);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error('❌ Invalid environment variables:');
        error.issues.forEach((err) => {
            console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
        // Exit the process if environment variables are invalid
        process.exit(1);
    }
    throw error;
}

export { env };
