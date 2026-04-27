/**
 * Streaming chat completion with token usage reporting.
 *
 *   RAGEN_API_KEY=... npx tsx examples/streaming-chat.ts
 */
import { Ragen } from "../src";

async function main(): Promise<void> {
  const ragen = new Ragen({
    apiKey: process.env.RAGEN_API_KEY,
    assistantId: process.env.RAGEN_ASSISTANT_ID ?? "11111111-1111-4111-8111-111111111111",
  });

  const stream = ragen.chat.completions.stream({
    messages: [{ role: "user", content: "Explain our onboarding process." }],
    stream_options: { include_usage: true },
  });

  let tokensSeen = 0;
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content;
    if (piece) {
      process.stdout.write(piece);
      tokensSeen += 1;
    }
    if (chunk.usage) {
      process.stdout.write(
        `\n\n[usage: ${chunk.usage.total_tokens} total tokens, ${tokensSeen} chunks]\n`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
