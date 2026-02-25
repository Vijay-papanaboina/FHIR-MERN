import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const verifyFhirConnection = async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(`${env.FHIR_BASE_URL}/metadata`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
            logger.info('FHIR server reachable');
        } else {
            throw new Error(`FHIR server returned status ${response.status}`);
        }
    } catch (error) {
        logger.error('Failed to reach FHIR server', error);
        process.exit(1);
    }
};
