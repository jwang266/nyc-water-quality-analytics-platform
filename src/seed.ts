import fs from "fs";
import path from "path";
import Papa from "papaparse";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";

import connectDB, { disconnectDB } from "./config/mongoConnection.js";
import {
  sampleSiteCollection,
  waterSampleCollection,
  boroughCollection,
} from "./model/index.js";
import Users from "./model/user.js";
import { createOrUpdateBoroughs } from "./data/boroughs.js";

type Env = {
  SALT_ROUNDS?: string;
  SEED_LIMIT?: string;
  SEED_BATCH_SIZE?: string;
  RESET_DB?: string;
  DEMO_USER_EMAIL?: string;
  DEMO_ADMIN_EMAIL?: string;
  DEMO_PASSWORD?: string;
};

type WaterSampleRow = {
  sample_number: string;
  sample_date: string;
  sample_time: string | null;
  sample_site: string;
  sample_class: string;
  residual_free_chlorine_mg_l: number | null;
  turbidity_ntu: number | null;
  coliform_quanti_tray_mpn_100ml: number | null;
  e_coli_quanti_tray_mpn_100ml: number | null;
  fluoride_mg_l: number | null;
};

const env = process.env as Env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const seedDataDir = path.join(projectRoot, "seedData");

const SALT_ROUNDS = Number(env.SALT_ROUNDS ?? "10");
const SEED_LIMIT = Number(env.SEED_LIMIT ?? "5000");
const SEED_BATCH_SIZE = Number(env.SEED_BATCH_SIZE ?? "1000");
const RESET_DB = String(env.RESET_DB ?? "true").toLowerCase() === "true";

const DEMO_USER_EMAIL = (env.DEMO_USER_EMAIL ?? "test123@gmail.com").toLowerCase();
const DEMO_ADMIN_EMAIL = (env.DEMO_ADMIN_EMAIL ?? "admin123@gmail.com").toLowerCase();
const DEMO_PASSWORD = env.DEMO_PASSWORD ?? "Password123!";

function toTime(d: string | null | undefined): number {
  if (!d) return 0;
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

function mustReadText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

async function seed(): Promise<void> {
  try {
    console.log("Starting database seeding...");
    await connectDB();

    if (RESET_DB) {
      console.log("RESET_DB=true -> clearing collections...");
      await sampleSiteCollection.deleteMany({});
      await waterSampleCollection.deleteMany({});
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

    const csvPath = path.join(seedDataDir, "drinkingWaterSamples.csv");
    const csvContent = mustReadText(csvPath);

    const parsed = Papa.parse<Record<string, unknown>>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      console.error("CSV parse errors (first 5):", parsed.errors.slice(0, 5));
      throw new Error("CSV parsing failed");
    }

    const rawRows = (parsed.data ?? []) as Record<string, unknown>[];

    const rows: WaterSampleRow[] = rawRows
      .map((r) => ({
        sample_number: String(r.sample_number ?? "").trim(),
        sample_date: String(r.sample_date ?? "").trim(),
        sample_time: String(r.sample_time ?? "").trim() || null,
        sample_site: String(r.sample_site ?? "").trim(),
        sample_class: String(r.sample_class ?? "").trim(),
        residual_free_chlorine_mg_l: toNumOrNull(r.residual_free_chlorine_mg_l),
        turbidity_ntu: toNumOrNull(r.turbidity_ntu),
        coliform_quanti_tray_mpn_100ml: toNumOrNull(r.coliform_quanti_tray_mpn_100ml),
        e_coli_quanti_tray_mpn_100ml: toNumOrNull(r.e_coli_quanti_tray_mpn_100ml),
        fluoride_mg_l: toNumOrNull(r.fluoride_mg_l),
      }))
      .filter(
        (r) =>
          r.sample_number !== "" &&
          r.sample_date !== "" &&
          r.sample_site !== ""
      )
      .sort((a, b) => toTime(b.sample_date) - toTime(a.sample_date))
      .slice(0, SEED_LIMIT);

    console.log(`Parsed water samples: ${rawRows.length}`);
    console.log(`Seeding water samples (after sort+limit): ${rows.length}`);
    console.log(`Batch size: ${SEED_BATCH_SIZE}`);

    for (let i = 0; i < rows.length; i += SEED_BATCH_SIZE) {
      const batch = rows.slice(i, i + SEED_BATCH_SIZE);
      await waterSampleCollection.insertMany(batch, { ordered: false });
      console.log(
        `Inserted ${Math.min(i + batch.length, rows.length)} / ${rows.length}`
      );
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

    console.log("Database seeding completed");
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
