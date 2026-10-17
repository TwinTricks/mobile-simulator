import { z } from "zod";

import { cspModeSchema } from "@/shared/schemas";

// Requests travel from the popup and the simulator page to the service worker. They are parsed
// rather than trusted, so a message the worker does not know is ignored instead of half-handled.
const requestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open-simulator"), url: z.string() }),
  z.object({ type: z.literal("get-active-url") }),
  z.object({ type: z.literal("set-csp-mode"), mode: cspModeSchema }),
  /** Lays the simulator over a website's tab, the active one unless a tab is named. */
  z.object({ type: z.literal("open-full-screen"), tabId: z.number().optional() }),
  /** Draws the inline phone in the active tab's page, allowing the site first. */
  z.object({ type: z.literal("open-inline") }),
  /** From the inline phone: the User-Agent rule its frame needs, before the frame loads. */
  z.object({ type: z.literal("inline-rules"), deviceId: z.string() }),
  /** From the inline phone, after a click on its Allow button: adds the page's site. */
  z.object({ type: z.literal("inline-allow") }),
  /** From the full-screen simulator as it takes itself off the page. */
  z.object({ type: z.literal("overlay-closed") }),
  /** From the simulator: a stream id for recording its own tab, where Chrome allows it. */
  z.object({ type: z.literal("tab-capture") }),
]);

/** Sent to a tab's inline trigger script to draw the phone. */
export type InlineTabMessage = { __msimInline: "open" };

export type ExtensionRequest = z.infer<typeof requestSchema>;

export type ExtensionResponse =
  { ok: true; tabId?: number; url?: string; streamId?: string } | { ok: false; error: string };

export function readRequest(raw: unknown): ExtensionRequest | null {
  const parsed = requestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function sendRequest(request: ExtensionRequest): Promise<ExtensionResponse> {
  try {
    const response = (await chrome.runtime.sendMessage(request)) as ExtensionResponse | undefined;
    return response ?? { ok: false, error: "No response from the extension." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
