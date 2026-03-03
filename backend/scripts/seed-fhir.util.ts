export interface SeedRng {
  next: () => number;
  int: (min: number, max: number) => number;
}

const hash = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const createRng = (seed: string): SeedRng => {
  let state = hash(seed) || 1;
  const next = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) =>
    Math.floor(next() * (max - min + 1)) + min;
  return { next, int };
};

export const subjectPatientId = (subjectRef?: string): string | null => {
  if (!subjectRef) return null;
  const normalized = subjectRef.trim();
  if (normalized.startsWith("urn:uuid:")) {
    const id = normalized.slice("urn:uuid:".length).trim();
    return id || null;
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[parts.length - 2] !== "Patient") return null;
  return parts[parts.length - 1] ?? null;
};

export const referenceResourceId = (
  reference: string | undefined,
  expectedType?: string,
): string | null => {
  if (!reference) return null;
  const normalized = reference.trim();
  if (!normalized) return null;
  if (normalized.startsWith("urn:uuid:")) {
    const id = normalized.slice("urn:uuid:".length).trim();
    return id || null;
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const type = parts[parts.length - 2];
  const id = parts[parts.length - 1] ?? null;
  if (!id) return null;
  if (expectedType && type !== expectedType) return null;
  return id;
};

export const pickName = (
  name?: Array<{ given?: string[]; family?: string }>,
  fallback = "Unknown",
): string => {
  const n = name?.[0];
  if (!n) return fallback;
  const given = n.given?.filter(Boolean).join(" ") ?? "";
  const family = n.family?.trim() ?? "";
  const full = `${given} ${family}`.trim();
  return full || fallback;
};

export const normalizeEmail = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");

export const sampleByPatient = <T extends { subject?: { reference?: string } }>(
  records: T[],
  patientIds: Set<string>,
  perPatient: (rng: SeedRng) => number,
  seed: string,
): T[] => {
  const byPatient = new Map<string, T[]>();

  for (const item of records) {
    const patientId = subjectPatientId(item.subject?.reference);
    if (!patientId || !patientIds.has(patientId)) continue;
    const list = byPatient.get(patientId) ?? [];
    list.push(item);
    byPatient.set(patientId, list);
  }

  const selected: T[] = [];

  for (const [patientId, list] of byPatient.entries()) {
    const rng = createRng(`${seed}:${patientId}`);
    const target = Math.min(list.length, perPatient(rng));

    for (let i = list.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [list[i], list[j]] = [list[j] as T, list[i] as T];
    }

    selected.push(...list.slice(0, target));
  }

  return selected;
};

export const sampleByPatientId = <T>(
  records: T[],
  patientIds: Set<string>,
  getPatientId: (record: T) => string | null,
  perPatient: (rng: SeedRng) => number,
  seed: string,
): T[] => {
  const byPatient = new Map<string, T[]>();

  for (const item of records) {
    const patientId = getPatientId(item);
    if (!patientId || !patientIds.has(patientId)) continue;
    const list = byPatient.get(patientId) ?? [];
    list.push(item);
    byPatient.set(patientId, list);
  }

  const selected: T[] = [];

  for (const [patientId, list] of byPatient.entries()) {
    const rng = createRng(`${seed}:${patientId}`);
    const target = Math.min(list.length, perPatient(rng));

    for (let i = list.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [list[i], list[j]] = [list[j] as T, list[i] as T];
    }

    selected.push(...list.slice(0, target));
  }

  return selected;
};
