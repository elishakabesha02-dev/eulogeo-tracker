import "server-only";

import { requirePermission } from "@/lib/auth/session";
import {
  appendMessage,
  createConversation,
  listConversations,
  listMessages,
} from "@/lib/database/repositories/ai";
import { ServiceError } from "@/lib/database/errors";
import { runOrchestrator } from "@/services/ai/orchestrator";
import { getAIProvider } from "@/services/ai/providers";
import { fieldErrors } from "@/lib/validation/common";
import { aiMessageSchema } from "@/lib/validation/schemas";
import type { AIConversation, AIMessage, SuggestedPrompt } from "@/types/ai";

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { label: "Show today's exceptions", prompt: "Show today's exceptions" },
  { label: "Show pending reconciliations", prompt: "Show pending reconciliations" },
  { label: "Find ATM 1042", prompt: "Find ATM 1042" },
  { label: "Generate today's report", prompt: "Generate today's report" },
];

export interface AIStatus {
  providerId: string;
  providerName: string;
  connected: boolean;
}

export function getAIStatus(): AIStatus {
  const provider = getAIProvider();
  return {
    providerId: provider.id,
    providerName: provider.displayName,
    connected: provider.isConfigured,
  };
}

export async function getConversations(): Promise<AIConversation[]> {
  const user = await requirePermission("ai:use");
  return listConversations(user.id);
}

export async function getConversationMessages(
  conversationId: string,
): Promise<AIMessage[]> {
  await requirePermission("ai:use");
  return listMessages(conversationId);
}

export interface SendMessageResult {
  conversationId: string;
  userMessage: AIMessage;
  assistantMessage: AIMessage;
  /** True while the mock provider is in use. Rendered as a banner, not hidden. */
  simulated: boolean;
}

/**
 * Persists a user turn, runs the orchestrator, and persists the reply.
 *
 * The reply currently comes from the mock provider. It is stored like any other
 * message and flagged `simulated` so the transcript stays honest about what
 * produced it.
 */
export async function sendMessage(input: unknown): Promise<SendMessageResult> {
  const user = await requirePermission("ai:use");

  const parsed = aiMessageSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check your message.", {
      details: fieldErrors(parsed.error),
    });
  }

  const conversationId =
    parsed.data.conversationId ??
    (await createConversation(user.id, deriveTitle(parsed.data.message))).id;

  const userMessage = await appendMessage({
    conversation_id: conversationId,
    role: "user",
    content: parsed.data.message,
  });

  const response = await runOrchestrator({
    conversationId,
    message: parsed.data.message,
    userId: user.id,
  });

  const assistantMessage = await appendMessage({
    conversation_id: conversationId,
    role: "assistant",
    content: response.content,
    model: getAIProvider().id,
  });

  return {
    conversationId,
    userMessage,
    assistantMessage,
    simulated: response.simulated,
  };
}

function deriveTitle(message: string): string {
  const trimmed = message.trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
}
