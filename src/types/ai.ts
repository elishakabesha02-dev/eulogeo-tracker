import type { Entity, ISODateString, UUID } from "./common";

/**
 * AI contracts only. No model is connected in this phase — `MockAIProvider` is
 * the sole implementation and it says so in every response it returns.
 *
 * The shapes here are deliberately provider-neutral so that swapping in a real
 * provider is an implementation detail behind `AIProvider`.
 */

export type AIRole = "user" | "assistant" | "system" | "tool";

export interface AIMessage extends Entity {
  conversation_id: UUID;
  role: AIRole;
  content: string;
  /** Populated when the assistant asked for a tool to run. */
  tool_calls: AIToolCall[] | null;
  /** Provider/model that produced the message, for traceability. */
  model: string | null;
  token_usage: AITokenUsage | null;
}

export interface AITokenUsage {
  input: number;
  output: number;
}

export interface AIConversation extends Entity {
  user_id: UUID | null;
  title: string;
  /** Which agent owns the thread. See `AgentKind`. */
  agent: AgentKind;
  last_message_at: ISODateString | null;
  archived: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Tools                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A capability the orchestrator may expose to a model. Tools are declared here
 * and executed server-side only; the model never touches the database directly.
 */
export interface AITool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  /** JSON Schema describing `TInput`. Generated from a Zod schema at registration. */
  inputSchema: Record<string, unknown>;
  /**
   * Mutating tools must be gated behind explicit human approval. Financial
   * calculations are never delegated to a model — they call deterministic
   * services and the tool only relays the result.
   */
  requiresApproval: boolean;
  execute: (input: TInput, ctx: AIToolContext) => Promise<TOutput>;
}

export interface AIToolContext {
  userId: UUID | null;
  /** Set when the caller has confirmed a `requiresApproval` tool. */
  approved: boolean;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export interface AICompletionRequest {
  messages: Array<Pick<AIMessage, "role" | "content">>;
  tools?: AITool[];
  system?: string;
  maxTokens?: number;
}

export interface AICompletionResult {
  content: string;
  toolCalls: AIToolCall[];
  model: string;
  usage: AITokenUsage | null;
  /** True when the text came from the mock provider rather than a model. */
  simulated: boolean;
}

export interface AIProvider {
  readonly id: string;
  readonly displayName: string;
  /** False until a real provider is configured. Drives the UI's status banner. */
  readonly isConfigured: boolean;
  complete: (request: AICompletionRequest) => Promise<AICompletionResult>;
}

/* -------------------------------------------------------------------------- */
/*  Agents                                                                    */
/* -------------------------------------------------------------------------- */

export const AGENT_KINDS = [
  "ORCHESTRATOR",
  "DATA",
  "RECONCILIATION",
  "INVESTIGATION",
  "REPORTING",
  "COMMUNICATION",
] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];

/**
 * Declarative agent description. Registered in `services/ai/agents`, but none
 * of them reason yet — `handle` is unimplemented on every specialist agent.
 */
export interface AgentDefinition {
  kind: AgentKind;
  displayName: string;
  description: string;
  /** Names of the tools this agent is allowed to call. */
  tools: string[];
  /** False while the agent is a declaration only. */
  implemented: boolean;
}

export interface AgentRequest {
  conversationId: UUID | null;
  message: string;
  userId: UUID | null;
}

export interface AgentResponse {
  content: string;
  agent: AgentKind;
  toolCalls: AIToolCall[];
  simulated: boolean;
}

export interface Agent {
  readonly definition: AgentDefinition;
  handle: (request: AgentRequest) => Promise<AgentResponse>;
}

export interface SuggestedPrompt {
  label: string;
  prompt: string;
}
