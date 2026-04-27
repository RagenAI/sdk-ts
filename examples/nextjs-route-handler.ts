/**
 * Next.js App Router streaming route handler.
 *
 * Place this file at `app/api/chat/route.ts` in a Next.js project. The client
 * `POST`s `{ messages }` and receives an SSE stream proxied straight from
 * Ragen.
 */
import { Ragen } from "@ragenai/sdk";

export const runtime = "edge";

const ragen = new Ragen({
  apiKey: process.env.RAGEN_API_KEY!,
  assistantId: process.env.RAGEN_ASSISTANT_ID!,
});

interface ChatRequestBody {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

export async function POST(req: Request): Promise<Response> {
  const { messages } = (await req.json()) as ChatRequestBody;

  const stream = ragen.chat.completions.stream({ messages });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const piece = chunk.choices[0]?.delta?.content;
          if (piece) controller.enqueue(encoder.encode(piece));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
