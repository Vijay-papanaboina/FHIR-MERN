import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectMongo = async () => {
    try {
        await mongoose.connect(env.MONGO_URI);
        logger.info('MongoDB connected');
    } catch (error) {
        logger.error('Failed to connect to MongoDB');
        console.error(error);
        process.exit(1);
    }
};

// Export the raw MongoDB Db instance for Better-Auth's mongodbAdapter
export const getMongoDb = () => {
    return mongoose.connection.getClient().db();
};
