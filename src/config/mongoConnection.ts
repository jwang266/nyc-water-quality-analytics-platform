import mongoose, { Connection, ConnectOptions, MongooseError } from "mongoose";

// Strict typing for connection events
type MongooseEvent =
  | "connected"
  | "disconnected"
  | "error"
  | "reconnected"
  | "close";

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/water_quality_app";

let isConnected = false;

export const db: { connection: Connection | null } = { connection: null };

export default async function connectDB(): Promise<Connection> {
  const uri: string = process.env.MONGODB_URI ?? DEFAULT_LOCAL_URI;

  if (isConnected && db.connection) {
    return db.connection;
  }

  try {
    await mongoose.connect(uri, {} as ConnectOptions);

    db.connection = mongoose.connection;

    // Strict types for event handlers
    db.connection.on("connected", () => {
      isConnected = true;
      // eslint-disable-next-line no-console
      console.log("MongoDB connected");
    });

    db.connection.on("disconnected", () => {
      isConnected = false;
      // eslint-disable-next-line no-console
      console.log("MongoDB disconnected");
    });

    db.connection.on("error", (err: MongooseError) => {
      // eslint-disable-next-line no-console
      console.error("MongoDB connection error:", err.message);
      process.exit(1);
    });

    // Handle Node process events for graceful shutdown
    process.on("SIGINT", async () => {
      await disconnectDB();
      // eslint-disable-next-line no-console
      console.log("MongoDB connection closed on app termination");
      process.exit(0);
    });

    return db.connection;
  } catch (err) {
    // Extra guard for unknown error type
    const error =
      err instanceof Error
        ? err
        : new Error(typeof err === "string" ? err : "Unknown Mongoose connection error");
    // eslint-disable-next-line no-console
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
  // For strict return signature
  throw new Error("Unreachable: connectDB failed before establishing connection");
}

export async function disconnectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      db.connection = null;
      isConnected = false;
      // eslint-disable-next-line no-console
      console.log("MongoDB disconnected");
    }
  } catch (err) {
    const error =
      err instanceof Error
        ? err
        : new Error(typeof err === "string" ? err : "Unknown Mongoose disconnection error");
    // eslint-disable-next-line no-console
    console.error("MongoDB disconnection failed:", error.message);
  }
}
