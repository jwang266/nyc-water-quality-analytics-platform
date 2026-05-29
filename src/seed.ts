import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";

import connectDB, { disconnectDB } from "./config/mongoConnection.js";
import {
  sampleSiteCollection,
  boroughCollection,
} from "./model/index.js";
import Users from "./model/user.js";
import { createOrUpdateBoroughs } from "./data/boroughs.js";

type Env = {
  SALT_ROUNDS?: string;
  RESET_DB?: string;
  DEMO_USER_EMAIL?: string;
  DEMO_ADMIN_EMAIL?: string;
  DEMO_PASSWORD?: string;
};

const env = process.env as Env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const seedDataDir = path.join(projectRoot, "seedData");

const SALT_ROUNDS = Number(env.SALT_ROUNDS ?? "10");
const RESET_DB = String(env.RESET_DB ?? "true").toLowerCase() === "true";

const DEMO_USER_EMAIL = (env.DEMO_USER_EMAIL ?? "test123@gmail.com").toLowerCase();
const DEMO_ADMIN_EMAIL = (env.DEMO_ADMIN_EMAIL ?? "admin123@gmail.com").toLowerCase();
const DEMO_PASSWORD = env.DEMO_PASSWORD ?? "Password123!";

function mustReadText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

async function seed(): Promise<void> {
  try {
    console.log("Starting database seeding...");
    await connectDB();

    if (RESET_DB) {
      console.log("RESET_DB=true -> clearing core collections (water samples preserved; use npm run data:sync)...");
      await sampleSiteCollection.deleteMany({});
      await boroughCollection.deleteMany({});
      await Users.deleteMany({});
    }

    const sitePath = path.join(seedDataDir, "sampleSites.json");
    const sitesRaw = mustReadText(sitePath);
    const sites = JSON.parse(sitesRaw) as unknown[];

    console.log(`Inserting sample sites: ${sites.length}`);
    if (sites.length > 0) {
      await sampleSiteCollection.insertMany(sites, { ordered: false });
    }

    console.log("Creating/updating borough stats...");
    await createOrUpdateBoroughs();

    console.log("Creating demo accounts...");
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    await Users.insertMany(
      [
        {
          fname: "Demo",
          lname: "User",
          lowerEmail: DEMO_USER_EMAIL,
          hashedPwd: passwordHash,
          role: "user",
        },
        {
          fname: "Demo",
          lname: "Admin",
          lowerEmail: DEMO_ADMIN_EMAIL,
          hashedPwd: passwordHash,
          role: "admin",
        },
      ],
      { ordered: false }
    );

    console.log("Database seeding completed (water samples: run npm run data:sync for NYC Open Data ingest).");
  } catch (e: unknown) {
    const err = e as { message?: string; code?: number; keyValue?: unknown };
    console.error("Seeding failed:", err?.message ?? e);

    if (err?.code === 11000 && err?.keyValue) {
      console.error("Duplicate key:", err.keyValue);
    }

    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

seed();
