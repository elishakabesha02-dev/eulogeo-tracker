import type { Metadata } from "next";

import { CommandCenter } from "@/components/ai/command-center";
import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  SUGGESTED_PROMPTS,
  getAIStatus,
  getConversationMessages,
  getConversations,
} from "@/services/ai/ai.service";
import { AGENT_LIST } from "@/services/ai/agents/registry";

export const metadata: Metadata = { title: "AI Command Center" };

export default async function AiCommandCenterPage() {
  const status = getAIStatus();
  const conversations = await getConversations();
  const current = conversations[0] ?? null;
  const messages = current ? await getConversationMessages(current.id) : [];

  const initialTurns = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant",
      content: message.content,
      simulated: message.role === "assistant" && !status.connected,
    }));

  return (
    <>
      <PageHeader
        title="AI Command Center"
        description="The operational surface for the future EBB agent."
        notice={
          <PhaseNotice>
            <strong>No AI provider is connected.</strong> Replies come from a mock
            provider that explains how a request would be routed — they are labelled
            &ldquo;Simulated&rdquo; and never report data. Financial figures will always
            come from the deterministic reconciliation service, and data-changing
            actions will require explicit approval.
          </PhaseNotice>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandCenter
            connected={status.connected}
            providerName={status.providerName}
            suggestions={SUGGESTED_PROMPTS}
            initialTurns={initialTurns}
            initialConversationId={current?.id ?? null}
          />
        </div>

        <Card className="self-start">
          <CardHeader
            title="Agent architecture"
            description="Declared contracts — none reason yet"
          />
          <CardBody className="space-y-4">
            {AGENT_LIST.map((agent) => (
              <div
                key={agent.kind}
                className="border-b border-border-default pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-fg">{agent.displayName}</h3>
                  <Badge tone={agent.implemented ? "success" : "neutral"}>
                    {agent.implemented ? "Implemented" : "Declared"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  {agent.description}
                </p>
                {agent.tools.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {agent.tools.map((tool) => (
                      <code
                        key={tool}
                        className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-fg-muted"
                      >
                        {tool}
                      </code>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
