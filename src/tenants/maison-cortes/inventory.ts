import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

import { maisonCortesProducts } from './products';

export const SELECTION_COOKIE_NAME = 'mc-selection';
export const SELECTION_TTL_MS = 1000 * 60 * 60 * 24; // 24h

type MaisonCortesStatus = 'available' | 'reserved' | 'sold' | 'archived';

type Reservation = {
  id: string;
  quantity: number;
  expiresAt: number;
};

type InventoryRecord = {
  sku: string;
  total: number;
  sold: number;
  reservations: Reservation[];
};

type InventorySnapshot = Record<
  string,
  {
    status: MaisonCortesStatus;
    available: number;
    total: number;
    reserved: number;
    reservationIds: string[];
    reservations?: { id: string; expiresAt: number }[];
  }
>;

const productMap = new Map(maisonCortesProducts.map((item) => [item.id, item]));
const dataFile = path.join(process.cwd(), 'data', 'maison-cortes-inventory.json');
const defaultTotal = 9999;

const randomId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);

const getReservationSum = (record: InventoryRecord) => record.reservations.reduce((sum, res) => sum + res.quantity, 0);

const normalizeRecord = (record: InventoryRecord, productSku: string, productTotal: number): InventoryRecord => {
  const sold = Math.max(0, Math.min(record.sold || 0, productTotal));
  const reservations = Array.isArray(record.reservations)
    ? record.reservations
        .map((res) => ({
          id: res.id || randomId(),
          quantity: Math.max(1, res.quantity || 1),
          expiresAt: Number(res.expiresAt) || 0,
        }))
        .filter(Boolean)
    : [];

  return {
    sku: record.sku || productSku,
    total: Math.max(productTotal, sold),
    sold,
    reservations,
  };
};

const buildDefaultRecords = (): Record<string, InventoryRecord> => {
  const records: Record<string, InventoryRecord> = {};
  for (const product of maisonCortesProducts) {
    const total = product.editionSize ?? defaultTotal;
    const sold = product.status === 'sold' ? total : 0;
    records[product.id] = { sku: product.id, total, sold, reservations: [] };
  }
  return records;
};

const ensureDataDir = async () => {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
};

const readInventory = async (): Promise<{ records: Record<string, InventoryRecord>; dirty: boolean }> => {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    const incoming: InventoryRecord[] = Array.isArray(parsed)
      ? parsed
      : Object.values((parsed as { records?: Record<string, InventoryRecord> })?.records ?? parsed ?? {});

    const records: Record<string, InventoryRecord> = {};
    for (const record of incoming) {
      if (!record || typeof record !== 'object' || !('sku' in record)) continue;
      const product = productMap.get(record.sku as string);
      if (!product) continue;
      const total = product.editionSize ?? defaultTotal;
      records[record.sku] = normalizeRecord(record as InventoryRecord, record.sku, total);
    }

    let dirty = false;
    for (const product of maisonCortesProducts) {
      const total = product.editionSize ?? defaultTotal;
      const existing = records[product.id];
      if (!existing) {
        dirty = true;
        records[product.id] = { sku: product.id, total, sold: product.status === 'sold' ? total : 0, reservations: [] };
      } else if (existing.total !== total) {
        dirty = true;
        existing.total = Math.max(existing.total, total);
        if (product.status === 'sold') {
          existing.sold = existing.total;
          existing.reservations = [];
        }
      }
    }

    return { records, dirty };
  } catch {
    return { records: buildDefaultRecords(), dirty: true };
  }
};

const writeInventory = async (records: Record<string, InventoryRecord>) => {
  await ensureDataDir();
  await fs.writeFile(dataFile, JSON.stringify({ records }, null, 2), 'utf8');
};

const cleanExpiredReservations = (records: Record<string, InventoryRecord>, now: number): boolean => {
  let dirty = false;
  for (const record of Object.values(records)) {
    const before = record.reservations.length;
    record.reservations = record.reservations.filter((res) => res.expiresAt > now);
    if (record.reservations.length !== before) dirty = true;
  }
  return dirty;
};

const getStatusForRecord = (record: InventoryRecord): InventorySnapshot[string] => {
  const product = productMap.get(record.sku);
  const baseStatus = product?.status ?? 'available';
  const reserved = getReservationSum(record);
  const available = Math.max(0, record.total - record.sold - reserved);
  const reservations = record.reservations.map((res) => ({ id: res.id, expiresAt: res.expiresAt }));

  if (baseStatus === 'archived')
    return { status: 'archived', available: 0, total: record.total, reserved, reservationIds: record.reservations.map((res) => res.id), reservations };
  if (baseStatus === 'sold')
    return { status: 'sold', available: 0, total: record.total, reserved, reservationIds: record.reservations.map((res) => res.id), reservations };
  if (available <= 0 && reserved > 0)
    return { status: 'reserved', available: 0, total: record.total, reserved, reservationIds: record.reservations.map((res) => res.id), reservations };
  if (available <= 0)
    return { status: 'sold', available: 0, total: record.total, reserved, reservationIds: record.reservations.map((res) => res.id), reservations };

  return { status: 'available', available, total: record.total, reserved, reservationIds: record.reservations.map((res) => res.id), reservations };
};

const mutateInventory = async <T>(
  mutator: (records: Record<string, InventoryRecord>, now: number) => { result: T; dirty?: boolean } | Promise<{ result: T; dirty?: boolean }>
): Promise<T> => {
  const { records, dirty: initDirty } = await readInventory();
  const now = Date.now();
  let dirty = cleanExpiredReservations(records, now) || initDirty;
  const { result, dirty: mutatorDirty } = await mutator(records, now);
  if (dirty || mutatorDirty) {
    await writeInventory(records);
  }
  return result;
};

export const getMaisonCortesInventorySnapshot = async (): Promise<InventorySnapshot> =>
  mutateInventory((records) => {
    const snapshot: InventorySnapshot = {};
    for (const record of Object.values(records)) {
      snapshot[record.sku] = getStatusForRecord(record);
    }
    return { result: snapshot, dirty: false };
  });

export const reserveSelection = async (
  sku: string,
  ttlMs: number = SELECTION_TTL_MS
): Promise<{ ok: true; reservationId: string; ttlSeconds: number } | { ok: false; reason: string }> =>
  mutateInventory((records, now) => {
    const record = records[sku];
    const product = productMap.get(sku);
    if (!record || !product) return { result: { ok: false, reason: 'not_found' }, dirty: false };

    const status = getStatusForRecord(record);
    if (status.status !== 'available' || status.available <= 0) {
      return { result: { ok: false, reason: 'unavailable' }, dirty: false };
    }

    const reservationId = randomId();
    record.reservations.push({ id: reservationId, quantity: 1, expiresAt: now + ttlMs });
    return { result: { ok: true, reservationId, ttlSeconds: Math.floor(ttlMs / 1000) }, dirty: true };
  });

export const refreshReservation = async (sku: string, reservationId: string, ttlMs: number): Promise<boolean> =>
  mutateInventory((records, now) => {
    const record = records[sku];
    if (!record) return { result: false, dirty: false };
    const reservation = record.reservations.find((res) => res.id === reservationId);
    if (!reservation) return { result: false, dirty: false };
    reservation.expiresAt = now + ttlMs;
    return { result: true, dirty: true };
  });

export const releaseReservation = async (sku: string, reservationId: string): Promise<boolean> =>
  mutateInventory((records) => {
    const record = records[sku];
    if (!record) return { result: false, dirty: false };
    const before = record.reservations.length;
    record.reservations = record.reservations.filter((res) => res.id !== reservationId);
    return { result: before !== record.reservations.length, dirty: before !== record.reservations.length };
  });

export const completeReservation = async (sku: string, reservationId?: string): Promise<boolean> =>
  mutateInventory((records) => {
    const record = records[sku];
    if (!record) return { result: false, dirty: false };

    let quantity = 1;
    if (reservationId) {
      const reservation = record.reservations.find((res) => res.id === reservationId);
      if (reservation) {
        quantity = reservation.quantity;
        record.reservations = record.reservations.filter((res) => res.id !== reservationId);
      } else {
        return { result: false, dirty: false };
      }
    }

    record.sold = Math.min(record.total, record.sold + quantity);
    return { result: true, dirty: true };
  });

export type MaisonCortesSelectionEntry = { sku: string; reservationId: string | null };

export const parseSelectionCookie = (raw?: string | null): MaisonCortesSelectionEntry[] => {
  if (!raw) return [];
  const value = decodeURIComponent(raw);
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [sku, reservationId] = part.split('|');
      return { sku: (sku || '').trim(), reservationId: (reservationId || '').trim() || null };
    })
    .filter((entry) => !!entry.sku);
};

export const formatSelectionCookie = (entries: MaisonCortesSelectionEntry[]) =>
  encodeURIComponent(entries.map((entry) => `${entry.sku}|${entry.reservationId ?? ''}`).join(','));
