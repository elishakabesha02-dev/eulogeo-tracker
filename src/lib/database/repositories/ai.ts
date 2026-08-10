import "server-only";

import { demoConversations, demoMessages } from "@/lib/database/demo/dataset";
import { newId, nowIso, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { AIConversation, AIMessage, AIRole, AgentKind } from "@/types/ai";

const CONVERSATIONS = "ai_conversations";
const MESSAGES = "ai_messages";

const demoConversationRows: AIConversation[] = [...demoConversations];
const demoMessageRows: AIMessage[] = [...demoMessages];

export async function listConversations(userId: string | null): Promise<AIConversation[]> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return sortRows(
      demoConversationRows.filter((row) => !row.archived),
      (row) => row.last_message_at ?? row.created_at,
      "desc",
    );
  }

  let builder = supabase
    .from(CONVERSATIONS)
    .select("*")
    .eq("archived", false)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (userId) builder = builder.eq("user_id", userId);

  const { data, error } = await builder;
  if (error) throw fromDatabaseError(error, "Listing conversations");
  return (data ?? []) as AIConversation[];
}

export async function createConversation(
  userId: string | null,
  title: string,
  agent: AgentKind = "ORCHESTRATOR",
): Promise<AIConversation> {
  const supabase = await getServerSupabase();
  const timestamp = nowIso();

  if (!supabase) {
    const conversation: AIConversation = {
      id: newId(),
      user_id: userId,
      title,
      agent,
      last_message_at: null,
      archived: false,
      created_at: timestamp,
      updated_at: timestamp,
    };
    demoConversationRows.unshift(conversation);
    return conversation;
  }

  const { data, error } = await supabase
    .from(CONVERSATIONS)
    .insert({ user_id: userId, title, agent })
    .select("*")
    .single();

  if (error) throw fromDatabaseError(error, "Creating conversation");
  return data as AIConversation;
}

export async function listMessages(conversationId: string): Promise<AIMessage[]> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return sortRows(
      demoMessageRows.filter((row) => row.conversation_id === conversationId),
      (row) => row.created_at,
      "asc",
    );
  }

  const { data, error } = await supabase
    .from(MESSAGES)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw fromDatabaseError(error, "Loading conversation");
  return (data ?? []) as AIMessage[];
}

export interface MessageInput {
  conversation_id: string;
  role: AIRole;
  content: string;
  model?: string | null;
}

export async function appendMessage(input: MessageInput): Promise<AIMessage> {
  const supabase = await getServerSupabase();
  const timestamp = nowIso();

  if (!supabase) {
    const index = demoConversationRows.findIndex(
      (row) => row.id === input.conversation_id,
    );
    if (index === -1) throw notFound("Conversation");

    const message: AIMessage = {
      id: newId(),
      conversation_id: input.conversation_id,
      role: input.role,
      content: input.content,
      tool_calls: null,
      model: input.model ?? null,
      token_usage: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    demoMessageRows.push(message);
    demoConversationRows[index] = {
      ...(demoConversationRows[index] as AIConversation),
      last_message_at: timestamp,
      updated_at: timestamp,
    };
    return message;
  }

  const { data, error } = await supabase
    .from(MESSAGES)
    .insert({
      conversation_id: input.conversation_id,
      role: input.role,
      content: input.content,
      model: input.model ?? null,
    })
    .select("*")
    .single();

  if (error) throw fromDatabaseError(error, "Saving message");

  await supabase
    .from(CONVERSATIONS)
    .update({ last_message_at: timestamp, updated_at: timestamp })
    .eq("id", input.conversation_id);

  return data as AIMessage;
}
