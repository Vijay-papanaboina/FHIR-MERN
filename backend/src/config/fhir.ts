import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const verifyFhirConnection = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        const baseUrl = env.FHIR_BASE_URL.replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/metadata`, {
            signal: controller.signal,
        });

        // Consume the response body to release the socket
        await response.text();

        if (response.ok) {
            logger.info('FHIR server reachable');
        } else {
            throw new Error(`FHIR server returned status ${response.status}`);
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.error('FHIR request timed out (10s)');
        } else if (error instanceof Error) {
            logger.error(`FHIR connection error: ${error.message}`);
        } else {
            logger.error('Failed to reach FHIR server', error);
        }
        clearTimeout(timeout);
        process.exit(1);
    } finally {
        clearTimeout(timeout);
    }
};
