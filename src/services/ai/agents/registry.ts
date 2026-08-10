import type { AgentDefinition, AgentKind } from "@/types/ai";

/**
 * Agent declarations.
 *
 *      Orchestrator
 *            |
 *   ┌────────┼────────┬──────────────┬───────────┐
 *  Data  Reconciliation  Investigation  Reporting  Communication
 *
 * These are contracts, not implementations. `implemented: false` on every
 * specialist is the honest state of the system today; the UI reads this flag
 * rather than hard-coding "coming soon" strings.
 */
export const AGENT_REGISTRY: Record<AgentKind, AgentDefinition> = {
  ORCHESTRATOR: {
    kind: "ORCHESTRATOR",
    displayName: "Orchestrator",
    description:
      "Classifies a request, routes it to the right specialist, and assembles the reply. Holds no domain logic of its own.",
    tools: [],
    implemented: false,
  },
  DATA: {
    kind: "DATA",
    displayName: "Data Agent",
    description:
      "Answers questions about the estate — ATMs, banks, custodians, engineers and daily operations — through read-only tools.",
    tools: ["atms.search", "atms.get", "banks.list", "operations.list"],
    implemented: false,
  },
  RECONCILIATION: {
    kind: "RECONCILIATION",
    displayName: "Reconciliation Agent",
    description:
      "Explains and summarises reconciliation results. It never computes figures itself — it calls the deterministic engine and reports what comes back.",
    tools: ["reconciliation.summarise", "reconciliation.get", "reconciliation.run"],
    implemented: false,
  },
  INVESTIGATION: {
    kind: "INVESTIGATION",
    displayName: "Investigation Agent",
    description:
      "Works exception queues: gathers context across GL, journal and cash-count records and proposes a likely cause for a human to confirm.",
    tools: ["exceptions.list", "exceptions.get", "documents.search"],
    implemented: false,
  },
  REPORTING: {
    kind: "REPORTING",
    displayName: "Reporting Agent",
    description:
      "Assembles operational and reconciliation reports from stored records and queues them for rendering.",
    tools: ["reports.generate", "reports.list"],
    implemented: false,
  },
  COMMUNICATION: {
    kind: "COMMUNICATION",
    displayName: "Communication Agent",
    description:
      "Drafts operational messages — escalations, custodian follow-ups, shift summaries. Drafts only; sending stays a human action.",
    tools: ["messages.draft"],
    implemented: false,
  },
};

export const AGENT_LIST: AgentDefinition[] = Object.values(AGENT_REGISTRY);
