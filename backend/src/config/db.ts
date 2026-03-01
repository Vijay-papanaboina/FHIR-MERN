import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectMongo = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info("MongoDB connected");
  } catch (error) {
    logger.error("Failed to connect to MongoDB", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to connect to MongoDB");
  }
};

// Export the raw MongoDB Db instance for Better-Auth's mongodbAdapter
export const getMongoDb = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected. Call connectMongo() first.");
  }
  return mongoose.connection.db!;
};
