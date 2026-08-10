import "server-only";

import { AGENT_REGISTRY } from "@/services/ai/agents/registry";
import { getAIProvider } from "@/services/ai/providers";
import type { AgentKind, AgentRequest, AgentResponse } from "@/types/ai";

/**
 * Orchestrator.
 *
 * Today it does one real thing — pick which agent WOULD own a request — and
 * then delegates the text to the provider. Routing is keyword-based on purpose:
 * a heuristic that is obviously a heuristic is better than a stub that looks
 * like a classifier. When a model is connected, `route()` becomes a real
 * classification step and nothing else in the call path changes.
 */
export async function runOrchestrator(
  request: AgentRequest,
): Promise<AgentResponse> {
  const agent = route(request.message);
  const provider = getAIProvider();

  const result = await provider.complete({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: request.message }],
  });

  return {
    content: result.content,
    agent,
    toolCalls: result.toolCalls,
    simulated: result.simulated,
  };
}

export function route(message: string): AgentKind {
  const text = message.toLowerCase();

  if (/(exception|variance|shortage|overage|discrepan|investigat)/.test(text)) {
    return "INVESTIGATION";
  }
  if (/(reconcil|gl |journal|cash count|balance)/.test(text)) {
    return "RECONCILIATION";
  }
  if (/(report|summary|export)/.test(text)) {
    return "REPORTING";
  }
  if (/(message|notify|escalate to|whatsapp|email|draft)/.test(text)) {
    return "COMMUNICATION";
  }
  if (/(atm|bank|custodian|engineer|terminal|branch)/.test(text)) {
    return "DATA";
  }
  return "ORCHESTRATOR";
}

/**
 * The operating rules the future agents inherit. Stated here now so the
 * constraints are part of the foundation rather than an afterthought.
 */
const SYSTEM_PROMPT = `You are EBB, an ATM operations assistant.

Rules:
- Never compute or estimate a financial figure. Call the reconciliation service and report exactly what it returns.
- Never take an action that changes data without explicit human approval.
- If you do not have data, say so. Do not guess an ATM ID, an amount, or a status.
- Keep answers short and operational.`;

export function describeAgent(kind: AgentKind) {
  return AGENT_REGISTRY[kind];
}
