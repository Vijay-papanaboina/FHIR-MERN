import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const verifyFhirConnection = async () => {
    try {
        const response = await fetch(`${env.FHIR_BASE_URL}/metadata`);
        if (response.ok) {
            logger.info('FHIR server reachable');
        } else {
            logger.warn(`FHIR server reachable but returned status: ${response.status}`);
        }
    } catch (error) {
        logger.error('Failed to reach FHIR server');
        console.error(error);
        process.exit(1);
    }
};
