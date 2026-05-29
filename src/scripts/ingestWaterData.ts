import dotenv from 'dotenv';
import mongoose, { type Schema } from 'mongoose';

import connectDB, { disconnectDB } from '../config/mongoConnection.js';
import waterSampleCollection from '../model/waterSample.js';

dotenv.config();

const SOCRATA_RESOURCE_URL = 'https://data.cityofnewyork.us/resource/bkwf-xfky.json';
const PAGE_LIMIT = 10_000;
const INSERT_BATCH_SIZE = 1_000;

const SKIPPED_SCHEMA_PATHS = new Set(['_id', '__v', 'createdAt', 'updatedAt']);

type SchemaFieldKind = 'string' | 'number' | 'date';

interface SchemaFieldMeta {
  name: string;
  kind: SchemaFieldKind;
  required: boolean;
}

function calculateRollingThreshold(): { threshold: Date; isoPrefix: string } {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const isoPrefix = twoYearsAgo.toISOString().slice(0, 19);
  return { threshold: twoYearsAgo, isoPrefix };
}

function inspectSchemaFields(schema: Schema): SchemaFieldMeta[] {
  const fields: SchemaFieldMeta[] = [];

  for (const [path, schemaType] of Object.entries(schema.paths)) {
    if (SKIPPED_SCHEMA_PATHS.has(path)) continue;

    let kind: SchemaFieldKind;
    switch (schemaType.instance) {
      case 'Number':
        kind = 'number';
        break;
      case 'Date':
        kind = 'date';
        break;
      default:
        kind = 'string';
        break;
    }

    fields.push({
      name: path,
      kind,
      required: Boolean(schemaType.isRequired)
    });
  }

  return fields;
}

function getDateFilterField(fields: SchemaFieldMeta[]): string {
  const dateField = fields.find((field) => field.kind === 'date');
  if (!dateField) {
    throw new Error('No Date field found on WaterSample schema for SoQL filtering.');
  }
  return dateField.name;
}

function buildSocrataUrl(dateField: string, isoPrefix: string, offset: number): string {
  const params = new URLSearchParams({
    $where: `${dateField} >= '${isoPrefix}'`,
    $limit: String(PAGE_LIMIT),
    $offset: String(offset)
  });

  return `${SOCRATA_RESOURCE_URL}?${params.toString()}`;
}

function resolveRawValue(raw: Record<string, unknown>, fieldName: string): unknown {
  if (Object.prototype.hasOwnProperty.call(raw, fieldName)) {
    return raw[fieldName];
  }

  const matchedKey = Object.keys(raw).find(
    (key) => key.toLowerCase() === fieldName.toLowerCase()
  );

  return matchedKey ? raw[matchedKey] : undefined;
}

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (trimmed === '<1') return 0;

    if (trimmed.startsWith('<') || trimmed.startsWith('>')) {
      const bounded = Number(trimmed.slice(1));
      return Number.isFinite(bounded) ? bounded : null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function coerceFieldValue(
  value: unknown,
  field: SchemaFieldMeta
): string | number | Date | null | undefined {
  if (value === undefined || value === null || value === '') {
    if (field.required) return undefined;
    return field.kind === 'number' ? null : undefined;
  }

  switch (field.kind) {
    case 'string':
      return String(value).trim();
    case 'number':
      return parseNumericValue(value);
    case 'date': {
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    default:
      return undefined;
  }
}

function mapRawRecord(
  raw: Record<string, unknown>,
  fields: SchemaFieldMeta[]
): Record<string, unknown> | null {
  const mapped: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = resolveRawValue(raw, field.name);
    const coerced = coerceFieldValue(rawValue, field);

    if (coerced === undefined) {
      if (field.required) return null;
      continue;
    }

    mapped[field.name] = coerced;
  }

  return mapped;
}

async function fetchRollingWindowPayload(isoPrefix: string, dateField: string): Promise<Record<string, unknown>[]> {
  const allRecords: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const url = buildSocrataUrl(dateField, isoPrefix, offset);
    console.log(`[ingest] Fetching NYC Open Data page (offset ${offset})...`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Socrata API request failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();

    if (!Array.isArray(payload)) {
      throw new Error('Socrata API returned a non-array payload.');
    }

    if (payload.length === 0) {
      break;
    }

    allRecords.push(...(payload as Record<string, unknown>[]));
    console.log(
      `[ingest] Retrieved ${payload.length} records (running total: ${allRecords.length}).`
    );

    if (payload.length < PAGE_LIMIT) {
      break;
    }

    offset += PAGE_LIMIT;
  }

  return allRecords;
}

async function insertInBatches(records: Record<string, unknown>[]): Promise<number> {
  let inserted = 0;

  for (let index = 0; index < records.length; index += INSERT_BATCH_SIZE) {
    const batch = records.slice(index, index + INSERT_BATCH_SIZE);
    await waterSampleCollection.insertMany(batch, { ordered: false });
    inserted += batch.length;
    console.log(`[ingest] Inserted ${inserted} / ${records.length} records...`);
  }

  return inserted;
}

async function ingestWaterData(): Promise<void> {
  const { threshold, isoPrefix } = calculateRollingThreshold();
  const schemaFields = inspectSchemaFields(waterSampleCollection.schema);
  const dateField = getDateFilterField(schemaFields);

  console.log('[ingest] NYC Water Sample ingestion started.');
  console.log(`[ingest] Rolling 24-month threshold: ${threshold.toISOString()}`);
  console.log(`[ingest] SoQL filter field: ${dateField}`);
  console.log(`[ingest] SoQL timestamp prefix: ${isoPrefix}`);

  try {
    await connectDB();

    const rawRecords = await fetchRollingWindowPayload(isoPrefix, dateField);
    console.log(`[ingest] Total records downloaded from NYC Open Data: ${rawRecords.length}`);

    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
      console.error('[ingest] Aborting: API returned no records. Existing database left unchanged.');
      return;
    }

    const parsedRecords: Record<string, unknown>[] = [];
    let skipped = 0;

    for (const rawRecord of rawRecords) {
      if (!rawRecord || typeof rawRecord !== 'object') {
        skipped += 1;
        continue;
      }

      const mapped = mapRawRecord(rawRecord as Record<string, unknown>, schemaFields);
      if (!mapped) {
        skipped += 1;
        continue;
      }

      parsedRecords.push(mapped);
    }

    if (parsedRecords.length === 0) {
      console.error(
        '[ingest] Aborting: no valid records after schema mapping. Existing database left unchanged.'
      );
      return;
    }

    const deduped = new Map<string, Record<string, unknown>>();
    for (const record of parsedRecords) {
      const sampleNumber = String(record.sample_number ?? '').trim();
      if (!sampleNumber) continue;
      deduped.set(sampleNumber, record);
    }

    const recordsToInsert = Array.from(deduped.values());
    console.log(
      `[ingest] Parsed ${parsedRecords.length} records (${skipped} skipped, ${recordsToInsert.length} unique sample_number values).`
    );

    console.log('[ingest] Valid payload confirmed. Clearing legacy WaterSample collection...');
    const deleteResult = await waterSampleCollection.deleteMany({});
    console.log(`[ingest] Removed ${deleteResult.deletedCount ?? 0} legacy records.`);

    const insertedCount = await insertInBatches(recordsToInsert);
    console.log(`[ingest] Successfully inserted ${insertedCount} fresh rolling-window records.`);
    console.log('[ingest] NYC Water Sample ingestion completed.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ingest] Ingestion failed:', message);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    await mongoose.connection.close().catch(() => undefined);
  }
}

void ingestWaterData();
