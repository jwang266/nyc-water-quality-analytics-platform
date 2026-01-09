import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import connectDB, { disconnectDB } from './config/mongoConnection.js';
import {
  sampleSiteCollection,
  waterSampleCollection,
  boroughCollection
} from './model/index.js';
import Users from './model/user.js';
import { createOrUpdateBoroughs } from './data/boroughs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);
const SEED_LIMIT = Number(process.env.SEED_LIMIT || 5000);
const SEED_BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE || 1000);
const RESET_DB = String(process.env.RESET_DB ?? 'true').toLowerCase() === 'true';

const DEMO_USER_EMAIL =
  (process.env.DEMO_USER_EMAIL || 'test123@gmail.com').toLowerCase();
const DEMO_ADMIN_EMAIL =
  (process.env.DEMO_ADMIN_EMAIL || 'admin123@gmail.com').toLowerCase();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Password123!';

const toTime = (d) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
};

async function seed() {
  try {
    console.log('Starting database seeding');
    await connectDB();

    if (RESET_DB) {
      await sampleSiteCollection.deleteMany({});
      await waterSampleCollection.deleteMany({});
      await boroughCollection.deleteMany({});
      await Users.deleteMany({});
    }

    const sitePath = path.join(__dirname, 'seedData', 'sampleSites.json');
    const sites = JSON.parse(fs.readFileSync(sitePath, 'utf-8'));
    await sampleSiteCollection.insertMany(sites);

    const csvPath = path.join(__dirname, 'seedData', 'drinkingWaterSamples.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

    if (parsed.errors.length) {
      console.error('CSV parse errors:', parsed.errors.slice(0, 5));
      throw new Error('CSV parsing failed');
    }

    const rows = parsed.data
      .map(r => ({
        sample_number: r.sample_number,
        sample_date: r.sample_date,
        sample_time: r.sample_time?.trim(),
        sample_site: r.sample_site,
        sample_class: r.sample_class,
        residual_free_chlorine_mg_l: r.residual_free_chlorine_mg_l === '' ? null : Number(r.residual_free_chlorine_mg_l),
        turbidity_ntu: r.turbidity_ntu === '' ? null : Number(r.turbidity_ntu),
        coliform_quanti_tray_mpn_100ml: r.coliform_quanti_tray_mpn_100ml === '' ? null : Number(r.coliform_quanti_tray_mpn_100ml),
        e_coli_quanti_tray_mpn_100ml: r.e_coli_quanti_tray_mpn_100ml === '' ? null : Number(r.e_coli_quanti_tray_mpn_100ml),
        fluoride_mg_l: r.fluoride_mg_l === '' ? null : Number(r.fluoride_mg_l)
      }))
      .sort((a, b) => toTime(b.sample_date) - toTime(a.sample_date))
      .slice(0, SEED_LIMIT);

    for (let i = 0; i < rows.length; i += SEED_BATCH_SIZE) {
      await waterSampleCollection.insertMany(
        rows.slice(i, i + SEED_BATCH_SIZE)
      );
    }

    await createOrUpdateBoroughs();

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    await Users.insertMany([
      {
        fname: 'Demo',
        lname: 'User',
        lowerEmail: DEMO_USER_EMAIL,
        hashedPwd: passwordHash,
        role: 'user'
      },
      {
        fname: 'Demo',
        lname: 'Admin',
        lowerEmail: DEMO_ADMIN_EMAIL,
        hashedPwd: passwordHash,
        role: 'admin'
      }
    ]);

    console.log('Database seeding completed');
  } catch (e) {
    console.error('Seeding failed:', e?.message || e);
    if (e?.code === 11000 && e?.keyValue) {
      console.error('Duplicate key:', e.keyValue);
    }
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seed();
