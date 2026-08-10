import "server-only";

import type {
  AICompletionRequest,
  AICompletionResult,
  AIProvider,
} from "@/types/ai";

/**
 * The only provider implemented in this phase.
 *
 * It does not reason, retrieve, or call tools. It exists so the AI Command
 * Center has something to render and so the provider seam is exercised end to
 * end. Every response it returns is marked `simulated: true`, and the UI shows
 * that state prominently — nothing here should ever be mistaken for a model.
 */
export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly displayName = "Not connected";
  readonly isConfigured = false;

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const lastUserMessage =
      [...request.messages].reverse().find((message) => message.role === "user")
        ?.content ?? "";

    return {
      content: describeIntent(lastUserMessage),
      toolCalls: [],
      model: "mock",
      usage: null,
      simulated: true,
    };
  }
}

/**
 * Explains which agent and which tools WOULD handle the request. This is
 * documentation rendered in place, not an answer — it never reports data.
 */
function describeIntent(message: string): string {
  const text = message.toLowerCase();

  const routing = text.includes("exception")
    ? {
        agent: "Investigation Agent",
        tools: ["exceptions.list", "reconciliation.get"],
      }
    : text.includes("reconcil")
      ? {
          agent: "Reconciliation Agent",
          tools: ["reconciliation.summarise", "reconciliation.run"],
        }
      : text.includes("report")
        ? { agent: "Reporting Agent", tools: ["reports.generate"] }
        : text.includes("atm") || text.match(/\b\d{3,}\b/)
          ? { agent: "Data Agent", tools: ["atms.search", "atms.get"] }
          : { agent: "Orchestrator", tools: [] };

  const toolLine = routing.tools.length
    ? `\n\nPlanned tool calls: ${routing.tools.join(", ")}.`
    : "";

  return [
    "No AI provider is connected, so this is not a generated answer.",
    "",
    `Once a provider is configured, the Orchestrator would route this to the **${routing.agent}**.${toolLine}`,
    "",
    "Financial figures will always come from the deterministic reconciliation service, never from a model, and any action that changes data will require explicit approval.",
  ].join("\n");
}
