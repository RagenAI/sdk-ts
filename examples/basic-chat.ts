/**
 * Basic non-streaming chat completion.
 *
 *   RAGEN_API_KEY=... npx tsx examples/basic-chat.ts
 */
import { Ragen } from "../src";

async function main(): Promise<void> {
  const ragen = new Ragen({
    apiKey: process.env.RAGEN_API_KEY,
    assistantId: process.env.RAGEN_ASSISTANT_ID ?? "11111111-1111-4111-8111-111111111111",
  });

  const completion = await ragen.chat.completions.create({
    messages: [
      { role: "system", content: "You answer in one sentence." },
      { role: "user", content: "What is our refund policy?" },
    ],
  });

  console.log(completion.choices[0]?.message.content);
  console.log(`Tokens used: ${completion.usage.total_tokens}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
