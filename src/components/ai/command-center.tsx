"use client";

import { Bot, SendHorizontal, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/states";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse } from "@/types/common";
import type { SuggestedPrompt } from "@/types/ai";

interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  simulated: boolean;
}

interface ChatResult {
  conversationId: string;
  assistantMessage: { id: string; content: string };
  simulated: boolean;
}

export interface CommandCenterProps {
  connected: boolean;
  providerName: string;
  suggestions: SuggestedPrompt[];
  initialTurns: Turn[];
  initialConversationId: string | null;
}

/**
 * Conversation surface for the AI Command Center.
 *
 * Responses come from the mock provider, and each assistant turn carries a
 * "Simulated" marker sourced from the API rather than assumed by the client.
 */
export function CommandCenter({
  connected,
  providerName,
  suggestions,
  initialTurns,
  initialConversationId,
}: CommandCenterProps) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;

    setError(null);
    setBusy(true);
    setDraft("");
    setTurns((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmed, simulated: false },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });

      const result = (await response.json()) as ApiResponse<ChatResult>;

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setConversationId(result.data.conversationId);
      setTurns((current) => [
        ...current,
        {
          id: result.data.assistantMessage.id,
          role: "assistant",
          content: result.data.assistantMessage.content,
          simulated: result.data.simulated,
        },
      ]);
    } catch {
      setError("The assistant could not be reached. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex h-[calc(100dvh-11rem)] min-h-[32rem] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">EBB AI</h2>
          <p className="truncate text-xs text-fg-muted">
            Provider: {providerName}
          </p>
        </div>
        <Badge tone={connected ? "success" : "warning"} dot className="ml-auto">
          {connected ? "Connected" : "No model connected"}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-fg">
              Ask EBB anything about ATM operations
            </p>
            <p className="max-w-md text-xs text-fg-muted">
              This interface is wired end to end, but no AI provider is connected yet.
              Replies explain how a request would be routed rather than answering it.
            </p>
          </div>
        ) : (
          turns.map((turn) => (
            <div
              key={turn.id}
              className={cn(
                "flex gap-3",
                turn.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {turn.role === "assistant" ? (
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                  <Bot className="size-3.5" aria-hidden="true" />
                </span>
              ) : null}

              <div
                className={cn(
                  "max-w-[46rem] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                  turn.role === "user"
                    ? "bg-primary text-primary-fg"
                    : "border border-border-default bg-surface-muted text-fg",
                )}
              >
                {turn.content}
                {turn.role === "assistant" && turn.simulated ? (
                  <span className="mt-2 block">
                    <Badge tone="warning">Simulated — not model output</Badge>
                  </span>
                ) : null}
              </div>

              {turn.role === "user" ? (
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-fg-subtle">
                  <User className="size-3.5" aria-hidden="true" />
                </span>
              ) : null}
            </div>
          ))
        )}

        {busy ? (
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <Spinner className="size-3.5" />
            Thinking…
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      {error ? (
        <div
          role="alert"
          className="border-t border-danger/25 bg-danger-subtle px-5 py-2.5 text-xs text-fg"
        >
          {error}
        </div>
      ) : null}

      <div className="border-t border-border-default px-5 py-3">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.prompt}
              type="button"
              onClick={() => send(suggestion.prompt)}
              disabled={busy}
              className="rounded-full border border-border-default px-3 py-1 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50"
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter inserts a newline.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            rows={2}
            placeholder="Ask EBB anything about ATM operations…"
            aria-label="Message"
            className="min-h-11 resize-none"
          />
          <Button type="submit" size="icon" loading={busy} disabled={!draft.trim()}>
            {busy ? null : <SendHorizontal />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </Card>
  );
}
