/**
 * Synthetic demo dataset.
 *
 * Every value here is fictional. It exists so the application is explorable
 * before a Supabase project is provisioned, and so the UI can be developed
 * against realistic shapes. It is never written to, and it is clearly labelled
 * as demo data in the interface.
 *
 * The dataset is built once at module load with a seeded generator, so a render
 * on the server and a hydration on the client see identical values.
 */

import { addDays, toBusinessDate } from "@/lib/utils/dates";
import type {
  Atm,
  AuditLog,
  Bank,
  Branch,
  Custodian,
  DailyOperation,
  Engineer,
  Notification,
  OpsException,
  Reconciliation,
  Report,
  StoredDocument,
} from "@/types/domain";
import type { AIConversation, AIMessage } from "@/types/ai";
import type { Profile } from "@/types/auth";

/* -------------------------------------------------------------------------- */
/*  Deterministic helpers                                                     */
/* -------------------------------------------------------------------------- */

/** Mulberry32 — small, fast, and reproducible from a fixed seed. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20260810);

function pick<T>(items: readonly T[]): T {
  const value = items[Math.floor(random() * items.length)];
  // `items` is always a non-empty literal in this file.
  return value as T;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Deterministic identifier that is a *valid* RFC 4122 v4-shaped UUID.
 *
 * It has to parse as a real UUID because the same Zod schemas validate demo
 * input and live input — a readable-but-invalid placeholder would make every
 * form fail validation in demo mode.
 */
function demoId(namespace: string, index: number): string {
  // FNV-1a over the namespace gives a stable 8-hex-digit prefix per entity type.
  let hash = 0x811c9dc5;
  for (let i = 0; i < namespace.length; i += 1) {
    hash ^= namespace.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const prefix = hash.toString(16).padStart(8, "0");
  const suffix = index.toString(16).padStart(12, "0");
  return `${prefix}-0000-4000-8000-${suffix}`;
}

/** Frozen "now" so the dataset does not drift between renders. */
export const DEMO_NOW = new Date();

function isoAgo(minutes: number): string {
  return new Date(DEMO_NOW.getTime() - minutes * 60_000).toISOString();
}

const TODAY = toBusinessDate(DEMO_NOW);

/* -------------------------------------------------------------------------- */
/*  Banks & branches                                                          */
/* -------------------------------------------------------------------------- */

const BANK_SEEDS = [
  { name: "Demo Bank A", code: "DBA" },
  { name: "Demo Bank B", code: "DBB" },
  { name: "Demo Bank C", code: "DBC" },
  { name: "Sandbox Trust Bank", code: "STB" },
  { name: "Testfield Cooperative", code: "TFC" },
] as const;

export const demoBanks: Bank[] = BANK_SEEDS.map((seed, index) => ({
  id: demoId("bank", index + 1),
  name: seed.name,
  code: seed.code,
  status: index === 4 ? "INACTIVE" : "ACTIVE",
  created_at: isoAgo(60 * 24 * (300 - index * 20)),
  updated_at: isoAgo(60 * 24 * (30 - index)),
}));

const CITIES = [
  "Northgate",
  "Riverside",
  "Old Town",
  "Harbour Point",
  "Westfield",
  "Greenhill",
] as const;

export const demoBranches: Branch[] = demoBanks.flatMap((bank, bankIndex) =>
  Array.from({ length: 3 }, (_, branchIndex) => {
    const index = bankIndex * 3 + branchIndex;
    const city = CITIES[index % CITIES.length] as string;
    return {
      id: demoId("branch", index + 1),
      bank_id: bank.id,
      name: `${city} Branch`,
      code: `${bank.code}-${String(branchIndex + 1).padStart(2, "0")}`,
      city,
      status: "ACTIVE" as const,
      created_at: isoAgo(60 * 24 * 280),
      updated_at: isoAgo(60 * 24 * 20),
    };
  }),
);

/* -------------------------------------------------------------------------- */
/*  People                                                                    */
/* -------------------------------------------------------------------------- */

const FIRST_NAMES = [
  "Amina",
  "Brian",
  "Catherine",
  "Daniel",
  "Esther",
  "Felix",
  "Grace",
  "Henry",
  "Irene",
  "Joseph",
  "Karen",
  "Lawrence",
] as const;

const LAST_NAMES = [
  "Achieng",
  "Bwire",
  "Cheruiyot",
  "Draku",
  "Ekwaro",
  "Farida",
  "Gumisiriza",
  "Habimana",
  "Isabirye",
  "Juma",
] as const;

function personName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length] as string;
  const last = LAST_NAMES[(index * 3) % LAST_NAMES.length] as string;
  return `${first} ${last}`;
}

/** Demo phone numbers use the reserved 555 prefix — not routable. */
function demoPhone(index: number): string {
  return `+256 700 555 ${String(100 + index).padStart(3, "0")}`;
}

export const demoCustodians: Custodian[] = Array.from({ length: 12 }, (_, i) => ({
  id: demoId("custod", i + 1),
  full_name: personName(i),
  employee_id: `CUS-${String(1000 + i)}`,
  phone: demoPhone(i),
  status: i < 10 ? ("ACTIVE" as const) : ("INACTIVE" as const),
  bank_id: (demoBanks[i % demoBanks.length] as Bank).id,
  created_at: isoAgo(60 * 24 * (200 - i * 5)),
  updated_at: isoAgo(60 * 24 * (12 - (i % 10))),
}));

const SPECIALIZATIONS = [
  "Cash dispenser",
  "Card reader",
  "Network & comms",
  "Power systems",
  "General hardware",
] as const;

export const demoEngineers: Engineer[] = Array.from({ length: 8 }, (_, i) => ({
  id: demoId("engnr", i + 1),
  full_name: personName(i + 5),
  employee_id: `ENG-${String(2000 + i)}`,
  phone: demoPhone(i + 40),
  status: i < 7 ? ("ACTIVE" as const) : ("INACTIVE" as const),
  specialization: SPECIALIZATIONS[i % SPECIALIZATIONS.length] as string,
  created_at: isoAgo(60 * 24 * (180 - i * 7)),
  updated_at: isoAgo(60 * 24 * (9 - (i % 8))),
}));

/* -------------------------------------------------------------------------- */
/*  Profiles                                                                  */
/* -------------------------------------------------------------------------- */

export const DEMO_USER_ID = demoId("user", 1);

export const demoProfiles: Profile[] = [
  {
    id: demoId("profil", 1),
    user_id: DEMO_USER_ID,
    full_name: "Demo Administrator",
    email: "admin@demo.ebb.local",
    role: "ADMIN",
    phone: demoPhone(1),
    job_title: "Operations Lead",
    avatar_url: null,
    is_active: true,
    last_seen_at: isoAgo(3),
    created_at: isoAgo(60 * 24 * 365),
    updated_at: isoAgo(60 * 24),
  },
  {
    id: demoId("profil", 2),
    user_id: demoId("user", 2),
    full_name: "Demo Supervisor",
    email: "supervisor@demo.ebb.local",
    role: "SUPERVISOR",
    phone: demoPhone(2),
    job_title: "Regional Supervisor",
    avatar_url: null,
    is_active: true,
    last_seen_at: isoAgo(95),
    created_at: isoAgo(60 * 24 * 300),
    updated_at: isoAgo(60 * 24 * 2),
  },
  {
    id: demoId("profil", 3),
    user_id: demoId("user", 3),
    full_name: "Demo Reconciliation Officer",
    email: "recon@demo.ebb.local",
    role: "RECONCILIATION_OFFICER",
    phone: demoPhone(3),
    job_title: "Reconciliation Officer",
    avatar_url: null,
    is_active: true,
    last_seen_at: isoAgo(20),
    created_at: isoAgo(60 * 24 * 240),
    updated_at: isoAgo(60 * 24 * 3),
  },
  {
    id: demoId("profil", 4),
    user_id: demoId("user", 4),
    full_name: "Demo Auditor",
    email: "auditor@demo.ebb.local",
    role: "AUDITOR",
    phone: null,
    job_title: "Internal Audit",
    avatar_url: null,
    is_active: true,
    last_seen_at: isoAgo(600),
    created_at: isoAgo(60 * 24 * 150),
    updated_at: isoAgo(60 * 24 * 5),
  },
];

/* -------------------------------------------------------------------------- */
/*  ATMs                                                                      */
/* -------------------------------------------------------------------------- */

const ATM_MODELS = ["NCR SelfServ 22", "Diebold 429", "Hyosung MX5600"] as const;

const LOCATION_SUFFIXES = [
  "Main Street Lobby",
  "Shopping Centre",
  "Airport Terminal",
  "Hospital Concourse",
  "University Campus",
  "Industrial Park",
  "Bus Terminal",
  "Market Square",
] as const;

const ATM_COUNT = 24;

export const demoAtms: Atm[] = Array.from({ length: ATM_COUNT }, (_, i) => {
  const bank = demoBanks[i % 4] as Bank;
  const branchesForBank = demoBranches.filter((b) => b.bank_id === bank.id);
  const branch = branchesForBank[i % branchesForBank.length] as Branch;
  const city = branch.city ?? "Northgate";

  // A small, fixed spread of non-active machines keeps status filters meaningful.
  const status =
    i === 6 || i === 17
      ? ("MAINTENANCE" as const)
      : i === 21
        ? ("INACTIVE" as const)
        : i === 23
          ? ("DECOMMISSIONED" as const)
          : ("ACTIVE" as const);

  return {
    id: demoId("atm", i + 1),
    atm_code: `ATM-${1001 + i}`,
    bank_id: bank.id,
    branch_id: branch.id,
    location: `${city} — ${LOCATION_SUFFIXES[i % LOCATION_SUFFIXES.length]}`,
    status,
    custodian_id: (demoCustodians[i % demoCustodians.length] as Custodian).id,
    engineer_id: (demoEngineers[i % demoEngineers.length] as Engineer).id,
    model: ATM_MODELS[i % ATM_MODELS.length] as string,
    notes: null,
    created_at: isoAgo(60 * 24 * (260 - i * 4)),
    updated_at: isoAgo(randomInt(30, 60 * 24 * 6)),
  };
});

/* -------------------------------------------------------------------------- */
/*  Daily operations                                                          */
/* -------------------------------------------------------------------------- */

const operableAtms = demoAtms.filter(
  (atm) => atm.status === "ACTIVE" || atm.status === "MAINTENANCE",
);

/** Three business days of operations: today plus the two preceding days. */
const OPERATION_DATES = [0, -1, -2].map((offset) =>
  toBusinessDate(addDays(DEMO_NOW, offset)),
);

export const demoDailyOperations: DailyOperation[] = OPERATION_DATES.flatMap(
  (date, dateIndex) =>
    operableAtms.map((atm, atmIndex) => {
      const index = dateIndex * operableAtms.length + atmIndex;
      const isToday = date === TODAY;

      // Prior days are closed out; today's spread drives the dashboard tiles.
      const operational = isToday
        ? pick(["PENDING", "PROCESSING", "COMPLETED", "COMPLETED", "EXCEPTION"] as const)
        : ("COMPLETED" as const);

      const reconciliation = isToday
        ? operational === "EXCEPTION"
          ? pick(["VARIANCE", "ESCALATED"] as const)
          : operational === "COMPLETED"
            ? "RECONCILED"
            : operational === "PROCESSING"
              ? "IN_PROGRESS"
              : "PENDING"
        : ("RECONCILED" as const);

      return {
        id: demoId("dayops", index + 1),
        operation_date: date,
        atm_id: atm.id,
        custodian_id: atm.custodian_id,
        operational_status: operational,
        reconciliation_status: reconciliation,
        notes: null,
        created_at: `${date}T06:00:00.000Z`,
        updated_at: isoAgo(randomInt(5, 600)),
      };
    }),
);

/* -------------------------------------------------------------------------- */
/*  Reconciliations                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Amounts are integer minor units. Nothing here is computed — these are static
 * sample values. The deterministic reconciliation engine arrives in a later phase.
 */
export const demoReconciliations: Reconciliation[] = demoDailyOperations
  .filter((operation) => operation.operation_date === TODAY)
  .map((operation, index) => {
    const expected = randomInt(4_000, 60_000) * 100_00;
    const hasVariance =
      operation.reconciliation_status === "VARIANCE" ||
      operation.reconciliation_status === "ESCALATED";
    const settled =
      operation.reconciliation_status === "RECONCILED" || hasVariance;

    const variance = hasVariance
      ? randomInt(1, 40) * 10_000 * (random() > 0.5 ? 1 : -1)
      : settled
        ? 0
        : null;

    return {
      id: demoId("recon", index + 1),
      reconciliation_date: operation.operation_date,
      atm_id: operation.atm_id,
      daily_operation_id: operation.id,
      currency: "UGX",
      expected_minor: settled ? expected : null,
      actual_minor: settled ? expected + (variance ?? 0) : null,
      variance_minor: variance,
      status: operation.reconciliation_status,
      performed_by: settled ? (demoProfiles[2] as Profile).user_id : null,
      completed_at:
        operation.reconciliation_status === "RECONCILED"
          ? isoAgo(randomInt(30, 480))
          : null,
      notes: null,
      created_at: `${operation.operation_date}T06:30:00.000Z`,
      updated_at: isoAgo(randomInt(5, 400)),
    };
  });

/* -------------------------------------------------------------------------- */
/*  Exceptions                                                                */
/* -------------------------------------------------------------------------- */

export const demoExceptions: OpsException[] = demoReconciliations
  .filter((reconciliation) => Boolean(reconciliation.variance_minor))
  .map((reconciliation, index) => {
    const variance = reconciliation.variance_minor ?? 0;
    const type =
      variance < 0
        ? ("SHORTAGE" as const)
        : index % 3 === 0
          ? ("GL_MISMATCH" as const)
          : ("OVERAGE" as const);

    const absolute = Math.abs(variance);
    const priority =
      absolute > 300_000
        ? ("CRITICAL" as const)
        : absolute > 150_000
          ? ("HIGH" as const)
          : absolute > 50_000
            ? ("MEDIUM" as const)
            : ("LOW" as const);

    return {
      id: demoId("excpt", index + 1),
      reference: `EXC-${String(4100 + index)}`,
      atm_id: reconciliation.atm_id,
      reconciliation_id: reconciliation.id,
      type,
      status:
        reconciliation.status === "ESCALATED"
          ? ("ESCALATED" as const)
          : pick(["OPEN", "INVESTIGATING"] as const),
      priority,
      currency: reconciliation.currency,
      amount_minor: absolute,
      description:
        type === "SHORTAGE"
          ? "Counted cash is below the expected closing balance."
          : type === "OVERAGE"
            ? "Counted cash exceeds the expected closing balance."
            : "General ledger entry does not match the terminal journal.",
      assigned_to: (demoProfiles[2] as Profile).user_id,
      resolved_at: null,
      created_at: isoAgo(randomInt(60, 900)),
      updated_at: isoAgo(randomInt(5, 60)),
    };
  });

// Two closed-out exceptions so the status filter has resolved rows to show.
demoExceptions.push(
  {
    id: demoId("excpt", 900),
    reference: "EXC-4090",
    atm_id: (demoAtms[3] as Atm).id,
    reconciliation_id: null,
    type: "JOURNAL_MISMATCH",
    status: "RESOLVED",
    priority: "MEDIUM",
    currency: "UGX",
    amount_minor: 85_000,
    description: "Journal roll gap resolved after terminal clock resync.",
    assigned_to: (demoProfiles[1] as Profile).user_id,
    resolved_at: isoAgo(60 * 26),
    created_at: isoAgo(60 * 50),
    updated_at: isoAgo(60 * 26),
  },
  {
    id: demoId("excpt", 901),
    reference: "EXC-4091",
    atm_id: (demoAtms[9] as Atm).id,
    reconciliation_id: null,
    type: "MISSING_DATA",
    status: "CLOSED",
    priority: "LOW",
    currency: "UGX",
    amount_minor: null,
    description: "Cash count sheet was submitted late; no financial impact.",
    assigned_to: (demoProfiles[1] as Profile).user_id,
    resolved_at: isoAgo(60 * 70),
    created_at: isoAgo(60 * 96),
    updated_at: isoAgo(60 * 70),
  },
);

/* -------------------------------------------------------------------------- */
/*  Documents                                                                 */
/* -------------------------------------------------------------------------- */

export const demoDocuments: StoredDocument[] = [
  {
    id: demoId("doc", 1),
    file_name: "demo-bank-a-gl-statement.csv",
    storage_path: "demo/gl/demo-bank-a-gl-statement.csv",
    mime_type: "text/csv",
    size_bytes: 184_320,
    document_type: "GL_STATEMENT",
    status: "PROCESSED",
    atm_id: null,
    bank_id: (demoBanks[0] as Bank).id,
    uploaded_by: DEMO_USER_ID,
    created_at: isoAgo(240),
    updated_at: isoAgo(200),
  },
  {
    id: demoId("doc", 2),
    file_name: "atm-1004-journal.pdf",
    storage_path: "demo/journals/atm-1004-journal.pdf",
    mime_type: "application/pdf",
    size_bytes: 1_248_576,
    document_type: "ATM_JOURNAL",
    status: "QUEUED",
    atm_id: (demoAtms[3] as Atm).id,
    bank_id: (demoBanks[3] as Bank).id,
    uploaded_by: (demoProfiles[2] as Profile).user_id,
    created_at: isoAgo(95),
    updated_at: isoAgo(95),
  },
  {
    id: demoId("doc", 3),
    file_name: "cash-count-sheet-week-32.xlsx",
    storage_path: "demo/counts/cash-count-sheet-week-32.xlsx",
    mime_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 62_914,
    document_type: "CASH_COUNT_SHEET",
    status: "UPLOADED",
    atm_id: null,
    bank_id: (demoBanks[1] as Bank).id,
    uploaded_by: (demoProfiles[1] as Profile).user_id,
    created_at: isoAgo(30),
    updated_at: isoAgo(30),
  },
  {
    id: demoId("doc", 4),
    file_name: "atm-1012-dispenser-fault.jpg",
    storage_path: "demo/incidents/atm-1012-dispenser-fault.jpg",
    mime_type: "image/jpeg",
    size_bytes: 2_097_152,
    document_type: "INCIDENT_PHOTO",
    status: "FAILED",
    atm_id: (demoAtms[11] as Atm).id,
    bank_id: (demoBanks[2] as Bank).id,
    uploaded_by: DEMO_USER_ID,
    created_at: isoAgo(1_440),
    updated_at: isoAgo(1_400),
  },
];

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

export const demoReports: Report[] = [
  {
    id: demoId("report", 1),
    name: `Daily Reconciliation — ${TODAY}`,
    type: "DAILY_RECONCILIATION",
    format: "PDF",
    status: "READY",
    period_start: TODAY,
    period_end: TODAY,
    created_by: (demoProfiles[2] as Profile).user_id,
    storage_path: "demo/reports/daily-reconciliation.pdf",
    created_at: isoAgo(120),
    updated_at: isoAgo(118),
  },
  {
    id: demoId("report", 2),
    name: "Exception Report — current week",
    type: "EXCEPTION_REPORT",
    format: "XLSX",
    status: "READY",
    period_start: toBusinessDate(addDays(DEMO_NOW, -6)),
    period_end: TODAY,
    created_by: (demoProfiles[1] as Profile).user_id,
    storage_path: "demo/reports/exception-report.xlsx",
    created_at: isoAgo(600),
    updated_at: isoAgo(590),
  },
  {
    id: demoId("report", 3),
    name: "ATM Operations Report",
    type: "ATM_OPERATIONS",
    format: "CSV",
    status: "GENERATING",
    period_start: toBusinessDate(addDays(DEMO_NOW, -29)),
    period_end: TODAY,
    created_by: DEMO_USER_ID,
    storage_path: null,
    created_at: isoAgo(9),
    updated_at: isoAgo(4),
  },
  {
    id: demoId("report", 4),
    name: "Monthly Summary — previous month",
    type: "MONTHLY_SUMMARY",
    format: "PDF",
    status: "FAILED",
    period_start: toBusinessDate(addDays(DEMO_NOW, -60)),
    period_end: toBusinessDate(addDays(DEMO_NOW, -31)),
    created_by: (demoProfiles[1] as Profile).user_id,
    storage_path: null,
    created_at: isoAgo(60 * 24 * 3),
    updated_at: isoAgo(60 * 24 * 3 - 12),
  },
];

/* -------------------------------------------------------------------------- */
/*  Notifications                                                             */
/* -------------------------------------------------------------------------- */

export const demoNotifications: Notification[] = [
  {
    id: demoId("notif", 1),
    user_id: DEMO_USER_ID,
    type: "EXCEPTION",
    title: "Critical variance detected",
    body: `A critical variance was raised on ${(demoAtms[4] as Atm).atm_code}. Review the exception queue.`,
    link: "/operations/exceptions",
    read_at: null,
    created_at: isoAgo(14),
    updated_at: isoAgo(14),
  },
  {
    id: demoId("notif", 2),
    user_id: DEMO_USER_ID,
    type: "WARNING",
    title: "Reconciliation still pending",
    body: "Several terminals have not been reconciled for today's business date.",
    link: "/operations/reconciliation",
    read_at: null,
    created_at: isoAgo(48),
    updated_at: isoAgo(48),
  },
  {
    id: demoId("notif", 3),
    user_id: DEMO_USER_ID,
    type: "SUCCESS",
    title: "Daily reconciliation report ready",
    body: "Today's reconciliation report finished generating.",
    link: "/intelligence/reports",
    read_at: isoAgo(100),
    created_at: isoAgo(118),
    updated_at: isoAgo(100),
  },
  {
    id: demoId("notif", 4),
    user_id: DEMO_USER_ID,
    type: "ERROR",
    title: "Document processing failed",
    body: "atm-1012-dispenser-fault.jpg could not be processed.",
    link: "/data/documents",
    read_at: isoAgo(1_300),
    created_at: isoAgo(1_400),
    updated_at: isoAgo(1_300),
  },
  {
    id: demoId("notif", 5),
    user_id: DEMO_USER_ID,
    type: "INFO",
    title: "New ATM registered",
    body: `${(demoAtms[22] as Atm).atm_code} was added to the estate.`,
    link: "/operations/atms",
    read_at: isoAgo(2_800),
    created_at: isoAgo(2_900),
    updated_at: isoAgo(2_800),
  },
];

/* -------------------------------------------------------------------------- */
/*  Audit log                                                                 */
/* -------------------------------------------------------------------------- */

export const demoAuditLogs: AuditLog[] = [
  {
    id: demoId("audit", 1),
    user_id: DEMO_USER_ID,
    actor_email: "admin@demo.ebb.local",
    action: "LOGIN",
    entity: "auth",
    entity_id: DEMO_USER_ID,
    metadata: { method: "password" },
    ip_address: "198.51.100.24",
    created_at: isoAgo(6),
    updated_at: isoAgo(6),
  },
  {
    id: demoId("audit", 2),
    user_id: DEMO_USER_ID,
    actor_email: "admin@demo.ebb.local",
    action: "ATM_CREATED",
    entity: "atm",
    entity_id: (demoAtms[22] as Atm).id,
    metadata: { atm_code: (demoAtms[22] as Atm).atm_code },
    ip_address: "198.51.100.24",
    created_at: isoAgo(2_900),
    updated_at: isoAgo(2_900),
  },
  {
    id: demoId("audit", 3),
    user_id: (demoProfiles[2] as Profile).user_id,
    actor_email: "recon@demo.ebb.local",
    action: "DOCUMENT_UPLOADED",
    entity: "document",
    entity_id: demoId("doc", 2),
    metadata: { file_name: "atm-1004-journal.pdf", size_bytes: 1_248_576 },
    ip_address: "198.51.100.31",
    created_at: isoAgo(95),
    updated_at: isoAgo(95),
  },
  {
    id: demoId("audit", 4),
    user_id: (demoProfiles[2] as Profile).user_id,
    actor_email: "recon@demo.ebb.local",
    action: "RECONCILIATION_STARTED",
    entity: "reconciliation",
    entity_id: (demoReconciliations[0] as Reconciliation | undefined)?.id ?? null,
    metadata: { business_date: TODAY },
    ip_address: "198.51.100.31",
    created_at: isoAgo(200),
    updated_at: isoAgo(200),
  },
  {
    id: demoId("audit", 5),
    user_id: (demoProfiles[1] as Profile).user_id,
    actor_email: "supervisor@demo.ebb.local",
    action: "EXCEPTION_CREATED",
    entity: "exception",
    entity_id: (demoExceptions[0] as OpsException | undefined)?.id ?? null,
    metadata: { reference: (demoExceptions[0] as OpsException | undefined)?.reference ?? null },
    ip_address: "203.0.113.9",
    created_at: isoAgo(150),
    updated_at: isoAgo(150),
  },
  {
    id: demoId("audit", 6),
    user_id: (demoProfiles[2] as Profile).user_id,
    actor_email: "recon@demo.ebb.local",
    action: "REPORT_CREATED",
    entity: "report",
    entity_id: demoId("report", 1),
    metadata: { type: "DAILY_RECONCILIATION", format: "PDF" },
    ip_address: "198.51.100.31",
    created_at: isoAgo(120),
    updated_at: isoAgo(120),
  },
  {
    id: demoId("audit", 7),
    user_id: DEMO_USER_ID,
    actor_email: "admin@demo.ebb.local",
    action: "ATM_DEACTIVATED",
    entity: "atm",
    entity_id: (demoAtms[21] as Atm).id,
    metadata: { atm_code: (demoAtms[21] as Atm).atm_code, reason: "Site closed" },
    ip_address: "198.51.100.24",
    created_at: isoAgo(60 * 24 * 4),
    updated_at: isoAgo(60 * 24 * 4),
  },
  {
    id: demoId("audit", 8),
    user_id: (demoProfiles[1] as Profile).user_id,
    actor_email: "supervisor@demo.ebb.local",
    action: "BANK_UPDATED",
    entity: "bank",
    entity_id: (demoBanks[4] as Bank).id,
    metadata: { status: "INACTIVE" },
    ip_address: "203.0.113.9",
    created_at: isoAgo(60 * 24 * 6),
    updated_at: isoAgo(60 * 24 * 6),
  },
];

/* -------------------------------------------------------------------------- */
/*  AI conversations                                                          */
/* -------------------------------------------------------------------------- */

export const demoConversations: AIConversation[] = [
  {
    id: demoId("aiconv", 1),
    user_id: DEMO_USER_ID,
    title: "Today's exception review",
    agent: "ORCHESTRATOR",
    last_message_at: isoAgo(35),
    archived: false,
    created_at: isoAgo(40),
    updated_at: isoAgo(35),
  },
];

export const demoMessages: AIMessage[] = [
  {
    id: demoId("aimsg", 1),
    conversation_id: demoId("aiconv", 1),
    role: "user",
    content: "Show today's exceptions",
    tool_calls: null,
    model: null,
    token_usage: null,
    created_at: isoAgo(40),
    updated_at: isoAgo(40),
  },
  {
    id: demoId("aimsg", 2),
    conversation_id: demoId("aiconv", 1),
    role: "assistant",
    content:
      "No AI provider is connected yet. Once one is configured, this thread will route to the Investigation Agent, which will read the exception queue through server-side tools and summarise it here.",
    tool_calls: null,
    model: "mock",
    token_usage: null,
    created_at: isoAgo(35),
    updated_at: isoAgo(35),
  },
];
