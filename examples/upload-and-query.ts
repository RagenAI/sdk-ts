/**
 * Upload a document, wait for processing, then query it.
 *
 *   RAGEN_API_KEY=... npx tsx examples/upload-and-query.ts ./handbook.pdf
 */
import { Ragen } from "../src";

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: tsx examples/upload-and-query.ts <path-to-file>");
    process.exit(1);
  }

  const ragen = new Ragen({
    apiKey: process.env.RAGEN_API_KEY,
    assistantId: process.env.RAGEN_ASSISTANT_ID ?? "11111111-1111-4111-8111-111111111111",
  });

  console.log(`Uploading ${path}...`);
  const file = await ragen.files.uploadAndWait(path);
  console.log(`File ${file.id} processed in status=${file.status}.`);

  const completion = await ragen.chat.completions.create({
    messages: [{ role: "user", content: "Summarize the document I just uploaded." }],
  });
  console.log(completion.choices[0]?.message.content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
