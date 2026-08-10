import "server-only";

import { serverEnv } from "@/config/env";
import { MockAIProvider } from "@/services/ai/providers/mock.provider";
import type { AIProvider } from "@/types/ai";

/**
 * Provider registry.
 *
 * `AI_PROVIDER` may already name a real provider in configuration, but no real
 * adapter exists yet, so resolution always lands on the mock. Adding one means
 * writing a class that satisfies `AIProvider` and a case below — no caller
 * changes.
 */
let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const { aiProvider, aiApiKey } = serverEnv();

  switch (aiProvider) {
    case "anthropic":
    case "openai":
      if (aiApiKey) {
        console.warn(
          `[ai] AI_PROVIDER="${aiProvider}" is set, but no adapter is implemented yet. Falling back to the mock provider.`,
        );
      }
      cached = new MockAIProvider();
      break;
    case "mock":
    default:
      cached = new MockAIProvider();
  }

  return cached;
}
